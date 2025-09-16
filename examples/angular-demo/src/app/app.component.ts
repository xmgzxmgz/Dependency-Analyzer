import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, TrackByFunction } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject, takeUntil, catchError, of, retry, debounceTime, fromEvent } from 'rxjs';
import { TaskService } from './services/task.service';
import { UserService } from './services/user.service';
import { Task, TaskStats } from './models/task.model';
import { User } from './models/user.model';

/**
 * 主应用组件
 * 管理任务和用户数据，包含错误处理、性能优化和无障碍功能
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private retryCount = 0;
  private maxRetries = 3;

  title = 'Angular Demo App';
  tasks: Task[] = [];
  users: User[] = [];
  selectedTask: Task | null = null;
  selectedUser: User | null = null;
  loading = true;
  error: string | null = null;
  showDemo = false;
  
  // 演示数据
  demoData = {
    buttonText: 'Click Me',
    cardTitle: 'Demo Card',
    cardContent: 'This is an Angular component demo card.',
    notifications: [] as string[]
  };

  // 性能优化：TrackBy函数
  trackByTaskId: TrackByFunction<Task> = (index: number, task: Task) => task.id;
  trackByUserId: TrackByFunction<User> = (index: number, user: User) => user.id;
  trackByNotification: TrackByFunction<string> = (index: number, notification: string) => notification;

  constructor(
    private taskService: TaskService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {
    this.setupKeyboardNavigation();
  }

  async ngOnInit(): Promise<void> {
    await this.loadData();
    this.setupErrorRecovery();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 设置键盘导航
   */
  private setupKeyboardNavigation(): void {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        debounceTime(100),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        if (event.key === 'Escape') {
          this.clearSelection();
        }
      });
  }

  /**
   * 设置错误恢复机制
   */
  private setupErrorRecovery(): void {
    // 监听网络状态变化
    fromEvent(window, 'online')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.error) {
          this.loadData();
        }
      });
  }

  /**
   * 加载初始数据
   */
  async loadData(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      this.cdr.markForCheck();

      const [tasks, users] = await Promise.all([
        this.taskService.getTasks().pipe(
          retry(this.maxRetries),
          catchError(error => {
            console.error('Failed to load tasks:', error);
            throw new Error('无法加载任务数据');
          })
        ).toPromise(),
        this.userService.getUsers().pipe(
          retry(this.maxRetries),
          catchError(error => {
            console.error('Failed to load users:', error);
            throw new Error('无法加载用户数据');
          })
        ).toPromise()
      ]);

      this.tasks = tasks || [];
      this.users = users || [];
      this.retryCount = 0;
      
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: Error): void {
    console.error('Application error:', error);
    this.error = error.message || '发生未知错误';
    this.retryCount++;
    
    // 添加错误通知
    this.addNotification(`错误: ${this.error}`);
    
    // 如果重试次数未达到上限，自动重试
    if (this.retryCount < this.maxRetries) {
      setTimeout(() => {
        this.loadData();
      }, 2000 * this.retryCount); // 指数退避
    }
  }

  /**
   * 清除选择
   */
  private clearSelection(): void {
    this.selectedTask = null;
    this.selectedUser = null;
    this.cdr.markForCheck();
  }

  /**
   * 选择任务
   * @param task 任务对象
   */
  onTaskSelect(task: Task): void {
    try {
      this.selectedTask = task;
      this.selectedUser = this.users.find(user => user.id === task.assigneeId) || null;
      this.cdr.markForCheck();
      
      // 无障碍：宣布选择
      this.announceToScreenReader(`已选择任务: ${task.title}`);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 创建新任务
   * @param taskData 任务数据
   */
  async onTaskCreate(taskData: Partial<Task>): Promise<void> {
    try {
      // 输入验证
      if (!taskData.title?.trim()) {
        throw new Error('任务标题不能为空');
      }

      const newTask = await this.taskService.createTask(taskData).pipe(
        catchError(error => {
          console.error('Error creating task:', error);
          throw new Error('创建任务失败');
        })
      ).toPromise();

      if (newTask) {
        this.tasks = [...this.tasks, newTask];
        this.addNotification('任务创建成功');
        this.cdr.markForCheck();
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 更新任务
   * @param task 更新的任务
   */
  async onTaskUpdate(task: Task): Promise<void> {
    try {
      // 输入验证
      if (!task.title?.trim()) {
        throw new Error('任务标题不能为空');
      }

      const updatedTask = await this.taskService.updateTask(task).pipe(
        catchError(error => {
          console.error('Error updating task:', error);
          throw new Error('更新任务失败');
        })
      ).toPromise();

      if (updatedTask) {
        this.tasks = this.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        this.selectedTask = updatedTask;
        this.addNotification('任务更新成功');
        this.cdr.markForCheck();
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 删除任务
   * @param taskId 任务ID
   */
  async onTaskDelete(taskId: number): Promise<void> {
    try {
      // 确认删除
      if (!confirm('确定要删除这个任务吗？')) {
        return;
      }

      await this.taskService.deleteTask(taskId).pipe(
        catchError(error => {
          console.error('Error deleting task:', error);
          throw new Error('删除任务失败');
        })
      ).toPromise();

      this.tasks = this.tasks.filter(t => t.id !== taskId);
      if (this.selectedTask?.id === taskId) {
        this.clearSelection();
      }
      this.addNotification('任务删除成功');
      this.cdr.markForCheck();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 切换任务状态
   * @param task 任务对象
   */
  async onTaskToggle(task: Task): Promise<void> {
    try {
      const updatedTask = {
        ...task,
        completed: !task.completed,
        completedAt: !task.completed ? new Date() : undefined
      };
      await this.onTaskUpdate(updatedTask);
      
      // 无障碍：宣布状态变化
      const status = updatedTask.completed ? '已完成' : '未完成';
      this.announceToScreenReader(`任务 ${task.title} 状态已更改为 ${status}`);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 选择用户
   * @param user 用户对象
   */
  onUserSelect(user: User): void {
    try {
      this.selectedUser = user;
      // 显示该用户的任务
      const userTasks = this.tasks.filter(task => task.assigneeId === user.id);
      if (userTasks.length > 0) {
        this.selectedTask = userTasks[0];
      }
      this.cdr.markForCheck();
      
      // 无障碍：宣布选择
      this.announceToScreenReader(`已选择用户: ${user.name}`);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 切换演示显示
   */
  toggleDemo(): void {
    this.showDemo = !this.showDemo;
    this.cdr.markForCheck();
    
    // 无障碍：宣布状态变化
    const status = this.showDemo ? '显示' : '隐藏';
    this.announceToScreenReader(`演示区域已${status}`);
  }

  /**
   * 处理演示按钮点击
   */
  onDemoButtonClick(): void {
    this.demoData.buttonText = this.demoData.buttonText === 'Click Me' ? 'Clicked!' : 'Click Me';
    this.addNotification('演示按钮已点击');
    this.cdr.markForCheck();
  }

  /**
   * 处理图片加载错误
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default-avatar.png';
  }

  /**
   * 获取用户名称
   * @param userId 用户ID
   */
  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user?.name || '未知用户';
  }

  /**
   * 添加通知
   * @param message 通知消息
   */
  private addNotification(message: string): void {
    this.demoData.notifications.unshift(message);
    if (this.demoData.notifications.length > 5) {
      this.demoData.notifications.pop();
    }
    
    // 3秒后自动移除通知
    setTimeout(() => {
      const index = this.demoData.notifications.indexOf(message);
      if (index > -1) {
        this.demoData.notifications.splice(index, 1);
        this.cdr.markForCheck();
      }
    }, 3000);

    // 无障碍：宣布通知
    this.announceToScreenReader(message);
  }

  /**
   * 获取任务统计
   */
  getTaskStats(): TaskStats {
    const completed = this.tasks.filter(task => task.completed).length;
    const pending = this.tasks.length - completed;
    const overdue = this.tasks.filter(task => 
      !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
    ).length;

    return { completed, pending, overdue, total: this.tasks.length };
  }

  /**
   * 获取用户任务数量
   * @param userId 用户ID
   */
  getUserTaskCount(userId: number): number {
    return this.tasks.filter(task => task.assigneeId === userId).length;
  }

  /**
   * 无障碍：向屏幕阅读器宣布消息
   * @param message 要宣布的消息
   */
  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // 1秒后移除元素
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
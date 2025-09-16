import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { Task, CreateTaskDto, UpdateTaskDto } from '../models/task.model';

/**
 * 任务服务
 * 处理任务相关的数据操作，使用Observable进行响应式编程
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasks: Task[] = [
    {
      id: 1,
      title: '设计用户界面',
      description: '为新功能设计用户界面原型',
      completed: false,
      priority: 'high',
      assigneeId: 1,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      dueDate: new Date('2024-02-01'),
      tags: ['design', 'ui', 'frontend']
    },
    {
      id: 2,
      title: '实现API接口',
      description: '开发后端API接口',
      completed: true,
      priority: 'medium',
      assigneeId: 2,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-20'),
      completedAt: new Date('2024-01-20'),
      tags: ['backend', 'api', 'development']
    },
    {
      id: 3,
      title: '编写测试用例',
      description: '为新功能编写单元测试和集成测试',
      completed: false,
      priority: 'medium',
      assigneeId: 3,
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-12'),
      dueDate: new Date('2024-01-30'),
      tags: ['testing', 'quality']
    },
    {
      id: 4,
      title: '部署到生产环境',
      description: '将应用部署到生产服务器',
      completed: false,
      priority: 'low',
      assigneeId: 1,
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-18'),
      tags: ['deployment', 'production']
    }
  ];

  private nextId = 5;

  constructor() {}

  /**
   * 获取所有任务
   * @returns Observable<Task[]>
   */
  getTasks(): Observable<Task[]> {
    return of([...this.tasks]).pipe(delay(500));
  }

  /**
   * 根据ID获取任务
   * @param id 任务ID
   * @returns Observable<Task | null>
   */
  getTaskById(id: number): Observable<Task | null> {
    const task = this.tasks.find(task => task.id === id) || null;
    return of(task).pipe(delay(300));
  }

  /**
   * 创建新任务
   * @param taskData 任务数据
   * @returns Observable<Task>
   */
  createTask(taskData: Partial<Task>): Observable<Task> {
    // 输入验证
    if (!taskData.title?.trim()) {
      return throwError(() => new Error('任务标题不能为空'));
    }

    const newTask: Task = {
      id: this.nextId++,
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      completed: false,
      priority: taskData.priority || 'medium',
      assigneeId: taskData.assigneeId || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: taskData.dueDate,
      tags: taskData.tags || []
    };

    this.tasks.push(newTask);
    return of(newTask).pipe(delay(600));
  }

  /**
   * 更新任务
   * @param task 更新的任务数据
   * @returns Observable<Task>
   */
  updateTask(task: Task): Observable<Task> {
    // 输入验证
    if (!task.title?.trim()) {
      return throwError(() => new Error('任务标题不能为空'));
    }

    const index = this.tasks.findIndex(t => t.id === task.id);
    if (index === -1) {
      return throwError(() => new Error('任务不存在'));
    }

    const updatedTask = {
      ...task,
      title: task.title.trim(),
      description: task.description?.trim() || '',
      updatedAt: new Date()
    };

    this.tasks[index] = updatedTask;
    return of(updatedTask).pipe(delay(400));
  }

  /**
   * 删除任务
   * @param id 任务ID
   * @returns Observable<boolean>
   */
  deleteTask(id: number): Observable<boolean> {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index === -1) {
      return throwError(() => new Error('任务不存在'));
    }

    this.tasks.splice(index, 1);
    return of(true).pipe(delay(300));
  }

  /**
   * 根据用户ID获取任务
   * @param assigneeId 用户ID
   * @returns Observable<Task[]>
   */
  getTasksByAssignee(assigneeId: number): Observable<Task[]> {
    const userTasks = this.tasks.filter(task => task.assigneeId === assigneeId);
    return of(userTasks).pipe(delay(400));
  }

  /**
   * 根据状态获取任务
   * @param completed 完成状态
   * @returns Observable<Task[]>
   */
  getTasksByStatus(completed: boolean): Observable<Task[]> {
    const statusTasks = this.tasks.filter(task => task.completed === completed);
    return of(statusTasks).pipe(delay(400));
  }

  /**
   * 搜索任务
   * @param query 搜索关键词
   * @returns Observable<Task[]>
   */
  searchTasks(query: string): Observable<Task[]> {
    if (!query.trim()) {
      return this.getTasks();
    }

    const searchQuery = query.toLowerCase().trim();
    const filteredTasks = this.tasks.filter(task =>
      task.title.toLowerCase().includes(searchQuery) ||
      task.description.toLowerCase().includes(searchQuery) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchQuery))
    );

    return of(filteredTasks).pipe(delay(300));
  }

  /**
   * 批量更新任务状态
   * @param taskIds 任务ID数组
   * @param completed 完成状态
   * @returns Observable<Task[]>
   */
  batchUpdateTaskStatus(taskIds: number[], completed: boolean): Observable<Task[]> {
    const updatedTasks: Task[] = [];

    taskIds.forEach(id => {
      const index = this.tasks.findIndex(task => task.id === id);
      if (index !== -1) {
        this.tasks[index] = {
          ...this.tasks[index],
          completed,
          completedAt: completed ? new Date() : undefined,
          updatedAt: new Date()
        };
        updatedTasks.push(this.tasks[index]);
      }
    });

    return of(updatedTasks).pipe(delay(500));
  }
}
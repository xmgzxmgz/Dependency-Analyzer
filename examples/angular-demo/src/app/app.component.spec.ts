import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AppComponent } from './app.component';
import { TaskService } from './services/task.service';
import { UserService } from './services/user.service';
import { Task, User } from './models/task.model';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let taskService: jasmine.SpyObj<TaskService>;
  let userService: jasmine.SpyObj<UserService>;

  const mockTasks: Task[] = [
    {
      id: '1',
      title: '测试任务1',
      description: '测试描述1',
      completed: false,
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['测试']
    },
    {
      id: '2',
      title: '测试任务2',
      description: '测试描述2',
      completed: true,
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['完成']
    }
  ];

  const mockUsers: User[] = [
    {
      id: '1',
      name: '张三',
      email: 'zhangsan@example.com',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      preferences: {
        theme: 'light',
        language: 'zh-CN',
        notifications: true,
        emailUpdates: false
      }
    }
  ];

  beforeEach(async () => {
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'getTasks',
      'createTask',
      'updateTask',
      'deleteTask'
    ]);
    const userServiceSpy = jasmine.createSpyObj('UserService', [
      'getUsers',
      'createUser',
      'updateUser',
      'deleteUser'
    ]);

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: UserService, useValue: userServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  it('应该创建组件', () => {
    expect(component).toBeTruthy();
  });

  it('应该初始化默认值', () => {
    expect(component.title).toBe('Angular 依赖分析演示');
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.tasks).toEqual([]);
    expect(component.users).toEqual([]);
  });

  describe('任务管理', () => {
    beforeEach(() => {
      taskService.getTasks.and.returnValue(of(mockTasks));
      userService.getUsers.and.returnValue(of(mockUsers));
    });

    it('应该在初始化时加载任务和用户', () => {
      component.ngOnInit();
      
      expect(taskService.getTasks).toHaveBeenCalled();
      expect(userService.getUsers).toHaveBeenCalled();
      expect(component.tasks).toEqual(mockTasks);
      expect(component.users).toEqual(mockUsers);
    });

    it('应该正确计算统计数据', () => {
      component.tasks = mockTasks;
      
      expect(component.completedTasksCount).toBe(1);
      expect(component.pendingTasksCount).toBe(1);
      expect(component.highPriorityTasksCount).toBe(1);
    });

    it('应该能够添加新任务', () => {
      const newTask: Task = {
        id: '3',
        title: '新任务',
        description: '新任务描述',
        completed: false,
        priority: 'low',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: []
      };

      taskService.createTask.and.returnValue(of(newTask));
      
      component.addTask('新任务', '新任务描述', 'low');
      
      expect(taskService.createTask).toHaveBeenCalledWith({
        title: '新任务',
        description: '新任务描述',
        priority: 'low',
        tags: []
      });
    });

    it('应该能够更新任务状态', () => {
      const updatedTask = { ...mockTasks[0], completed: true };
      taskService.updateTask.and.returnValue(of(updatedTask));
      
      component.tasks = [...mockTasks];
      component.toggleTaskCompletion('1');
      
      expect(taskService.updateTask).toHaveBeenCalledWith('1', { completed: true });
    });

    it('应该能够删除任务', () => {
      taskService.deleteTask.and.returnValue(of(undefined));
      
      component.tasks = [...mockTasks];
      component.deleteTask('1');
      
      expect(taskService.deleteTask).toHaveBeenCalledWith('1');
    });

    it('应该处理加载错误', () => {
      const errorMessage = '加载失败';
      taskService.getTasks.and.returnValue(throwError(() => new Error(errorMessage)));
      
      component.loadTasks();
      
      expect(component.error).toBe(`加载任务失败: ${errorMessage}`);
      expect(component.loading).toBeFalse();
    });
  });

  describe('用户管理', () => {
    beforeEach(() => {
      userService.getUsers.and.returnValue(of(mockUsers));
    });

    it('应该能够添加新用户', () => {
      const newUser: User = {
        id: '2',
        name: '李四',
        email: 'lisi@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        preferences: {
          theme: 'dark',
          language: 'zh-CN',
          notifications: true,
          emailUpdates: true
        }
      };

      userService.createUser.and.returnValue(of(newUser));
      
      component.addUser('李四', 'lisi@example.com', 'user');
      
      expect(userService.createUser).toHaveBeenCalledWith({
        name: '李四',
        email: 'lisi@example.com',
        role: 'user'
      });
    });

    it('应该能够删除用户', () => {
      userService.deleteUser.and.returnValue(of(undefined));
      
      component.users = [...mockUsers];
      component.deleteUser('1');
      
      expect(userService.deleteUser).toHaveBeenCalledWith('1');
    });
  });

  describe('表单验证', () => {
    it('应该验证任务标题', () => {
      expect(component.validateTaskTitle('')).toBe('任务标题不能为空');
      expect(component.validateTaskTitle('a'.repeat(101))).toBe('任务标题不能超过100个字符');
      expect(component.validateTaskTitle('有效标题')).toBeNull();
    });

    it('应该验证用户邮箱', () => {
      expect(component.validateEmail('')).toBe('邮箱不能为空');
      expect(component.validateEmail('invalid-email')).toBe('请输入有效的邮箱地址');
      expect(component.validateEmail('valid@example.com')).toBeNull();
    });
  });

  describe('无障碍功能', () => {
    it('应该正确设置ARIA标签', () => {
      fixture.detectChanges();
      
      const taskList = fixture.nativeElement.querySelector('[role="list"]');
      expect(taskList).toBeTruthy();
      expect(taskList.getAttribute('aria-label')).toBe('任务列表');
    });

    it('应该支持键盘导航', () => {
      const button = fixture.nativeElement.querySelector('button');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      
      spyOn(component, 'handleKeyboardNavigation');
      button.dispatchEvent(event);
      
      expect(component.handleKeyboardNavigation).toHaveBeenCalled();
    });
  });

  describe('性能优化', () => {
    it('应该正确跟踪任务列表', () => {
      const task = mockTasks[0];
      const index = 0;
      
      expect(component.trackByTaskId(index, task)).toBe(task.id);
    });

    it('应该正确跟踪用户列表', () => {
      const user = mockUsers[0];
      const index = 0;
      
      expect(component.trackByUserId(index, user)).toBe(user.id);
    });
  });

  describe('错误处理', () => {
    it('应该显示错误消息', () => {
      const errorMessage = '测试错误';
      component.showError(errorMessage);
      
      expect(component.error).toBe(errorMessage);
    });

    it('应该清除错误消息', () => {
      component.error = '测试错误';
      component.clearError();
      
      expect(component.error).toBeNull();
    });

    it('应该处理网络错误', () => {
      taskService.getTasks.and.returnValue(throwError(() => new Error('Network Error')));
      
      component.loadTasks();
      
      expect(component.error).toContain('Network Error');
    });
  });
});
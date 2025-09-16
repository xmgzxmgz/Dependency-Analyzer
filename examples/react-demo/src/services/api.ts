import { Task, CreateTaskDto, UpdateTaskDto, User, CreateUserDto, UpdateUserDto, ApiResponse, PaginatedResponse } from '../types';

/**
 * API基础配置
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * HTTP客户端类
 * 提供统一的API请求处理，包含错误处理、重试机制和性能优化
 */
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * 通用请求方法
   * @param endpoint - API端点
   * @param options - 请求选项
   * @returns Promise<T>
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// 创建API客户端实例
const apiClient = new ApiClient(API_BASE_URL);

/**
 * 任务相关API服务
 */
export const taskService = {
  /**
   * 获取所有任务
   */
  async getTasks(): Promise<ApiResponse<Task[]>> {
    return apiClient.get<ApiResponse<Task[]>>('/tasks');
  },

  /**
   * 根据ID获取任务
   */
  async getTask(id: string): Promise<ApiResponse<Task>> {
    return apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
  },

  /**
   * 创建新任务
   */
  async createTask(task: CreateTaskDto): Promise<ApiResponse<Task>> {
    // 输入验证
    if (!task.title || task.title.trim().length === 0) {
      throw new Error('任务标题不能为空');
    }
    if (task.title.length > 100) {
      throw new Error('任务标题不能超过100个字符');
    }

    return apiClient.post<ApiResponse<Task>>('/tasks', task);
  },

  /**
   * 更新任务
   */
  async updateTask(id: string, task: UpdateTaskDto): Promise<ApiResponse<Task>> {
    if (!id) {
      throw new Error('任务ID不能为空');
    }

    return apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, task);
  },

  /**
   * 删除任务
   */
  async deleteTask(id: string): Promise<ApiResponse<void>> {
    if (!id) {
      throw new Error('任务ID不能为空');
    }

    return apiClient.delete<ApiResponse<void>>(`/tasks/${id}`);
  },

  /**
   * 分页获取任务
   */
  async getTasksPaginated(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<Task>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<Task>>>(`/tasks?page=${page}&pageSize=${pageSize}`);
  }
};

/**
 * 用户相关API服务
 */
export const userService = {
  /**
   * 获取所有用户
   */
  async getUsers(): Promise<ApiResponse<User[]>> {
    return apiClient.get<ApiResponse<User[]>>('/users');
  },

  /**
   * 根据ID获取用户
   */
  async getUser(id: string): Promise<ApiResponse<User>> {
    return apiClient.get<ApiResponse<User>>(`/users/${id}`);
  },

  /**
   * 创建新用户
   */
  async createUser(user: CreateUserDto): Promise<ApiResponse<User>> {
    // 输入验证
    if (!user.name || user.name.trim().length === 0) {
      throw new Error('用户名不能为空');
    }
    if (!user.email || !this.isValidEmail(user.email)) {
      throw new Error('请输入有效的邮箱地址');
    }

    return apiClient.post<ApiResponse<User>>('/users', user);
  },

  /**
   * 更新用户
   */
  async updateUser(id: string, user: UpdateUserDto): Promise<ApiResponse<User>> {
    if (!id) {
      throw new Error('用户ID不能为空');
    }

    // 验证邮箱格式（如果提供）
    if (user.email && !this.isValidEmail(user.email)) {
      throw new Error('请输入有效的邮箱地址');
    }

    return apiClient.put<ApiResponse<User>>(`/users/${id}`, user);
  },

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    if (!id) {
      throw new Error('用户ID不能为空');
    }

    return apiClient.delete<ApiResponse<void>>(`/users/${id}`);
  },

  /**
   * 验证邮箱格式
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

/**
 * 模拟数据生成器（用于开发和测试）
 */
export const mockDataService = {
  /**
   * 生成模拟任务数据
   */
  generateMockTasks(count: number = 10): Task[] {
    const tasks: Task[] = [];
    const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const tags = ['前端', '后端', '测试', '设计', '文档', '优化'];

    for (let i = 1; i <= count; i++) {
      tasks.push({
        id: `task-${i}`,
        title: `任务 ${i}`,
        description: `这是第 ${i} 个任务的描述`,
        completed: Math.random() > 0.5,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        assigneeId: Math.random() > 0.3 ? `user-${Math.floor(Math.random() * 5) + 1}` : undefined,
        tags: tags.slice(0, Math.floor(Math.random() * 3) + 1)
      });
    }

    return tasks;
  },

  /**
   * 生成模拟用户数据
   */
  generateMockUsers(count: number = 5): User[] {
    const users: User[] = [];
    const roles: Array<'admin' | 'user' | 'guest'> = ['admin', 'user', 'guest'];
    const names = ['张三', '李四', '王五', '赵六', '钱七'];

    for (let i = 1; i <= count; i++) {
      users.push({
        id: `user-${i}`,
        name: names[i - 1] || `用户 ${i}`,
        email: `user${i}@example.com`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`,
        role: roles[Math.floor(Math.random() * roles.length)],
        isActive: Math.random() > 0.2,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastLoginAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
        preferences: {
          theme: Math.random() > 0.5 ? 'light' : 'dark',
          language: 'zh-CN',
          notifications: Math.random() > 0.3,
          emailUpdates: Math.random() > 0.5
        }
      });
    }

    return users;
  }
};
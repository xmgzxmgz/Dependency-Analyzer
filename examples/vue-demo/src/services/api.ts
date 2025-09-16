import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { Task, CreateTaskDto, UpdateTaskDto, User, CreateUserDto, UpdateUserDto, ApiResponse, PaginatedResponse } from '../types';

/**
 * API配置
 */
const API_CONFIG = {
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * HTTP客户端类
 * 提供统一的API请求处理，包含拦截器、错误处理和性能优化
 */
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create(API_CONFIG);
    this.setupInterceptors();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证token（如果存在）
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // 添加请求时间戳
        config.metadata = { startTime: new Date() };
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // 计算请求耗时
        const endTime = new Date();
        const duration = endTime.getTime() - response.config.metadata?.startTime?.getTime();
        console.log(`API请求耗时: ${duration}ms - ${response.config.url}`);
        
        return response;
      },
      (error: AxiosError) => {
        // 统一错误处理
        if (error.response?.status === 401) {
          // 处理认证失败
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * 通用GET请求
   */
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 通用POST请求
   */
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 通用PUT请求
   */
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 通用DELETE请求
   */
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 错误处理
   */
  private handleError<T>(error: any): ApiResponse<T> {
    console.error('API请求错误:', error);
    
    if (error.response) {
      // 服务器响应错误
      return {
        success: false,
        error: error.response.data?.message || `服务器错误 (${error.response.status})`,
      };
    } else if (error.request) {
      // 网络错误
      return {
        success: false,
        error: '网络连接失败，请检查网络设置',
      };
    } else {
      // 其他错误
      return {
        success: false,
        error: error.message || '未知错误',
      };
    }
  }
}

// 创建API客户端实例
const apiClient = new ApiClient();

/**
 * 任务相关API服务
 */
export const taskApi = {
  /**
   * 获取所有任务
   */
  async getTasks(): Promise<ApiResponse<Task[]>> {
    return apiClient.get<Task[]>('/tasks');
  },

  /**
   * 根据ID获取任务
   */
  async getTask(id: string): Promise<ApiResponse<Task>> {
    if (!id) {
      return { success: false, error: '任务ID不能为空' };
    }
    return apiClient.get<Task>(`/tasks/${id}`);
  },

  /**
   * 创建新任务
   */
  async createTask(task: CreateTaskDto): Promise<ApiResponse<Task>> {
    // 输入验证
    const validation = this.validateTaskInput(task);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    return apiClient.post<Task>('/tasks', task);
  },

  /**
   * 更新任务
   */
  async updateTask(id: string, task: UpdateTaskDto): Promise<ApiResponse<Task>> {
    if (!id) {
      return { success: false, error: '任务ID不能为空' };
    }

    return apiClient.put<Task>(`/tasks/${id}`, task);
  },

  /**
   * 删除任务
   */
  async deleteTask(id: string): Promise<ApiResponse<void>> {
    if (!id) {
      return { success: false, error: '任务ID不能为空' };
    }

    return apiClient.delete<void>(`/tasks/${id}`);
  },

  /**
   * 分页获取任务
   */
  async getTasksPaginated(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<Task>>> {
    return apiClient.get<PaginatedResponse<Task>>('/tasks', { page, pageSize });
  },

  /**
   * 搜索任务
   */
  async searchTasks(query: string): Promise<ApiResponse<Task[]>> {
    if (!query.trim()) {
      return { success: false, error: '搜索关键词不能为空' };
    }

    return apiClient.get<Task[]>('/tasks/search', { q: query });
  },

  /**
   * 验证任务输入
   */
  validateTaskInput(task: CreateTaskDto): { isValid: boolean; error?: string } {
    if (!task.title || task.title.trim().length === 0) {
      return { isValid: false, error: '任务标题不能为空' };
    }
    
    if (task.title.length > 100) {
      return { isValid: false, error: '任务标题不能超过100个字符' };
    }
    
    if (task.description && task.description.length > 1000) {
      return { isValid: false, error: '任务描述不能超过1000个字符' };
    }
    
    if (!['low', 'medium', 'high'].includes(task.priority)) {
      return { isValid: false, error: '任务优先级必须是 low、medium 或 high' };
    }

    return { isValid: true };
  }
};

/**
 * 用户相关API服务
 */
export const userApi = {
  /**
   * 获取所有用户
   */
  async getUsers(): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>('/users');
  },

  /**
   * 根据ID获取用户
   */
  async getUser(id: string): Promise<ApiResponse<User>> {
    if (!id) {
      return { success: false, error: '用户ID不能为空' };
    }
    return apiClient.get<User>(`/users/${id}`);
  },

  /**
   * 创建新用户
   */
  async createUser(user: CreateUserDto): Promise<ApiResponse<User>> {
    // 输入验证
    const validation = this.validateUserInput(user);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    return apiClient.post<User>('/users', user);
  },

  /**
   * 更新用户
   */
  async updateUser(id: string, user: UpdateUserDto): Promise<ApiResponse<User>> {
    if (!id) {
      return { success: false, error: '用户ID不能为空' };
    }

    // 验证邮箱格式（如果提供）
    if (user.email && !this.isValidEmail(user.email)) {
      return { success: false, error: '请输入有效的邮箱地址' };
    }

    return apiClient.put<User>(`/users/${id}`, user);
  },

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    if (!id) {
      return { success: false, error: '用户ID不能为空' };
    }

    return apiClient.delete<void>(`/users/${id}`);
  },

  /**
   * 验证用户输入
   */
  validateUserInput(user: CreateUserDto): { isValid: boolean; error?: string } {
    if (!user.name || user.name.trim().length === 0) {
      return { isValid: false, error: '用户名不能为空' };
    }
    
    if (user.name.length > 50) {
      return { isValid: false, error: '用户名不能超过50个字符' };
    }
    
    if (!user.email || !this.isValidEmail(user.email)) {
      return { isValid: false, error: '请输入有效的邮箱地址' };
    }
    
    if (user.role && !['admin', 'user', 'guest'].includes(user.role)) {
      return { isValid: false, error: '用户角色必须是 admin、user 或 guest' };
    }

    return { isValid: true };
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
 * 模拟数据服务
 */
export const mockDataApi = {
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
        description: `这是第 ${i} 个任务的详细描述，包含了任务的具体要求和实现细节。`,
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

export default apiClient;
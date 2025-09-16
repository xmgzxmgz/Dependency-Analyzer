/**
 * 任务相关类型定义
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  assigneeId?: string;
  tags: string[];
}

export interface CreateTaskDto {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
}

/**
 * 用户相关类型定义
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'guest';
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  emailUpdates: boolean;
}

export interface CreateUserDto {
  name: string;
  email: string;
  role?: 'admin' | 'user' | 'guest';
  avatar?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  avatar?: string;
  role?: 'admin' | 'user' | 'guest';
  isActive?: boolean;
  preferences?: Partial<UserPreferences>;
}

/**
 * API响应类型
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 应用状态类型
 */
export interface AppState {
  loading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  user: User | null;
}

/**
 * 表单验证类型
 */
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  values: T;
  errors: ValidationError[];
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}
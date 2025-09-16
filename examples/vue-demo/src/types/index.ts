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
 * Vuex状态类型
 */
export interface RootState {
  loading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  user: User | null;
}

export interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
}

export interface UserState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * 表单验证类型
 */
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean | string;
}

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

/**
 * 组件Props类型
 */
export interface TaskItemProps {
  task: Task;
  onUpdate?: (task: Task) => void;
  onDelete?: (id: string) => void;
  readonly?: boolean;
}

export interface UserItemProps {
  user: User;
  onUpdate?: (user: User) => void;
  onDelete?: (id: string) => void;
  readonly?: boolean;
}

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  overlay?: boolean;
}

export interface ErrorProps {
  message: string;
  retry?: () => void;
  dismissible?: boolean;
}

/**
 * 路由类型
 */
export interface RouteMetadata {
  title?: string;
  requiresAuth?: boolean;
  roles?: string[];
  layout?: string;
}

/**
 * 事件类型
 */
export interface CustomEvent<T = any> {
  type: string;
  payload: T;
  timestamp: number;
}
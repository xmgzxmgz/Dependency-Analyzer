/**
 * 用户模型定义
 * 包含用户的所有属性和相关接口
 */

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'manager';
  department: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

/**
 * 创建用户的数据传输对象
 */
export interface CreateUserDto {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'manager';
  department: string;
  avatar?: string;
}

/**
 * 更新用户的数据传输对象
 */
export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: 'admin' | 'user' | 'manager';
  department?: string;
  avatar?: string;
  isActive?: boolean;
}

/**
 * 用户统计信息
 */
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    admin: number;
    user: number;
    manager: number;
  };
  byDepartment: Record<string, number>;
}

/**
 * 用户过滤选项
 */
export interface UserFilter {
  role?: 'admin' | 'user' | 'manager';
  department?: string;
  isActive?: boolean;
}

/**
 * 用户排序选项
 */
export interface UserSort {
  field: 'name' | 'email' | 'role' | 'department' | 'createdAt';
  direction: 'asc' | 'desc';
}
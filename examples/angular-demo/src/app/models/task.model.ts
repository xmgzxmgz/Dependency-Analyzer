/**
 * 任务模型定义
 * 包含任务的所有属性和相关接口
 */

export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  assigneeId: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  tags: string[];
}

/**
 * 创建任务的数据传输对象
 */
export interface CreateTaskDto {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: number;
  dueDate?: Date;
  tags?: string[];
}

/**
 * 更新任务的数据传输对象
 */
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: number;
  dueDate?: Date;
  tags?: string[];
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  completed: number;
  pending: number;
  overdue: number;
  total: number;
}

/**
 * 任务过滤选项
 */
export interface TaskFilter {
  status?: 'all' | 'completed' | 'pending';
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: number;
  tags?: string[];
}

/**
 * 任务排序选项
 */
export interface TaskSort {
  field: 'title' | 'priority' | 'createdAt' | 'dueDate';
  direction: 'asc' | 'desc';
}
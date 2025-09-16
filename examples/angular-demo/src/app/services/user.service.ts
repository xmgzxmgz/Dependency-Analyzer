import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { User, CreateUserDto, UpdateUserDto } from '../models/user.model';

/**
 * 用户服务
 * 处理用户相关的数据操作，使用Observable进行响应式编程
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private users: User[] = [
    {
      id: 1,
      name: '张三',
      email: 'zhangsan@example.com',
      role: 'admin',
      department: '技术部',
      isActive: true,
      createdAt: new Date('2023-01-15'),
      lastLoginAt: new Date('2024-01-20'),
      avatar: 'https://via.placeholder.com/100x100'
    },
    {
      id: 2,
      name: '李四',
      email: 'lisi@example.com',
      role: 'user',
      department: '产品部',
      isActive: true,
      createdAt: new Date('2023-02-20'),
      lastLoginAt: new Date('2024-01-19'),
      avatar: 'https://via.placeholder.com/100x100'
    },
    {
      id: 3,
      name: '王五',
      email: 'wangwu@example.com',
      role: 'manager',
      department: '技术部',
      isActive: true,
      createdAt: new Date('2023-03-10'),
      lastLoginAt: new Date('2024-01-18'),
      avatar: 'https://via.placeholder.com/100x100'
    },
    {
      id: 4,
      name: '赵六',
      email: 'zhaoliu@example.com',
      role: 'user',
      department: '设计部',
      isActive: false,
      createdAt: new Date('2023-04-05'),
      lastLoginAt: new Date('2024-01-10'),
      avatar: 'https://via.placeholder.com/100x100'
    }
  ];

  private nextId = 5;

  constructor() {}

  /**
   * 获取所有用户
   * @returns Observable<User[]>
   */
  getUsers(): Observable<User[]> {
    return of([...this.users]).pipe(delay(600));
  }

  /**
   * 根据ID获取用户
   * @param id 用户ID
   * @returns Observable<User | null>
   */
  getUserById(id: number): Observable<User | null> {
    const user = this.users.find(user => user.id === id) || null;
    return of(user).pipe(delay(300));
  }

  /**
   * 创建新用户
   * @param userData 用户数据
   * @returns Observable<User>
   */
  createUser(userData: CreateUserDto): Observable<User> {
    // 输入验证
    if (!userData.name?.trim()) {
      return throwError(() => new Error('用户名不能为空'));
    }

    if (!userData.email?.trim() || !this.isValidEmail(userData.email)) {
      return throwError(() => new Error('请输入有效的邮箱地址'));
    }

    // 检查邮箱是否已存在
    if (this.users.some(user => user.email.toLowerCase() === userData.email.toLowerCase())) {
      return throwError(() => new Error('邮箱地址已存在'));
    }

    const newUser: User = {
      id: this.nextId++,
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      role: userData.role,
      department: userData.department.trim(),
      avatar: userData.avatar,
      isActive: true,
      createdAt: new Date()
    };

    this.users.push(newUser);
    return of(newUser).pipe(delay(700));
  }

  /**
   * 更新用户
   * @param id 用户ID
   * @param userData 更新的用户数据
   * @returns Observable<User>
   */
  updateUser(id: number, userData: UpdateUserDto): Observable<User> {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) {
      return throwError(() => new Error('用户不存在'));
    }

    // 输入验证
    if (userData.name !== undefined && !userData.name.trim()) {
      return throwError(() => new Error('用户名不能为空'));
    }

    if (userData.email !== undefined && (!userData.email.trim() || !this.isValidEmail(userData.email))) {
      return throwError(() => new Error('请输入有效的邮箱地址'));
    }

    // 检查邮箱是否已被其他用户使用
    if (userData.email && this.users.some(user => 
      user.id !== id && user.email.toLowerCase() === userData.email!.toLowerCase())) {
      return throwError(() => new Error('邮箱地址已被其他用户使用'));
    }

    const updatedUser = {
      ...this.users[index],
      ...userData,
      name: userData.name?.trim() || this.users[index].name,
      email: userData.email?.toLowerCase().trim() || this.users[index].email,
      department: userData.department?.trim() || this.users[index].department
    };

    this.users[index] = updatedUser;
    return of(updatedUser).pipe(delay(500));
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns Observable<boolean>
   */
  deleteUser(id: number): Observable<boolean> {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) {
      return throwError(() => new Error('用户不存在'));
    }

    this.users.splice(index, 1);
    return of(true).pipe(delay(400));
  }

  /**
   * 根据部门获取用户
   * @param department 部门名称
   * @returns Observable<User[]>
   */
  getUsersByDepartment(department: string): Observable<User[]> {
    const departmentUsers = this.users.filter(user => 
      user.department.toLowerCase() === department.toLowerCase());
    return of(departmentUsers).pipe(delay(400));
  }

  /**
   * 根据角色获取用户
   * @param role 用户角色
   * @returns Observable<User[]>
   */
  getUsersByRole(role: 'admin' | 'user' | 'manager'): Observable<User[]> {
    const roleUsers = this.users.filter(user => user.role === role);
    return of(roleUsers).pipe(delay(400));
  }

  /**
   * 获取活跃用户
   * @returns Observable<User[]>
   */
  getActiveUsers(): Observable<User[]> {
    const activeUsers = this.users.filter(user => user.isActive);
    return of(activeUsers).pipe(delay(400));
  }

  /**
   * 搜索用户
   * @param query 搜索关键词
   * @returns Observable<User[]>
   */
  searchUsers(query: string): Observable<User[]> {
    if (!query.trim()) {
      return this.getUsers();
    }

    const searchQuery = query.toLowerCase().trim();
    const filteredUsers = this.users.filter(user =>
      user.name.toLowerCase().includes(searchQuery) ||
      user.email.toLowerCase().includes(searchQuery) ||
      user.department.toLowerCase().includes(searchQuery)
    );

    return of(filteredUsers).pipe(delay(300));
  }

  /**
   * 批量更新用户状态
   * @param userIds 用户ID数组
   * @param isActive 活跃状态
   * @returns Observable<User[]>
   */
  batchUpdateUserStatus(userIds: number[], isActive: boolean): Observable<User[]> {
    const updatedUsers: User[] = [];

    userIds.forEach(id => {
      const index = this.users.findIndex(user => user.id === id);
      if (index !== -1) {
        this.users[index] = {
          ...this.users[index],
          isActive
        };
        updatedUsers.push(this.users[index]);
      }
    });

    return of(updatedUsers).pipe(delay(500));
  }

  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   * @returns boolean
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
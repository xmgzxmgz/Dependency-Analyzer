import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from './App';
import { taskService, userService } from './services/api';
import { Task, User } from './types';

// Mock API services
jest.mock('./services/api');
const mockTaskService = taskService as jest.Mocked<typeof taskService>;
const mockUserService = userService as jest.Mocked<typeof userService>;

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

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockTaskService.getTasks.mockResolvedValue({
      success: true,
      data: mockTasks
    });
    
    mockUserService.getUsers.mockResolvedValue({
      success: true,
      data: mockUsers
    });
  });

  it('应该渲染应用标题', () => {
    render(<App />);
    expect(screen.getByText(/React 依赖分析演示/i)).toBeInTheDocument();
  });

  it('应该显示加载状态', async () => {
    // Mock delayed response
    mockTaskService.getTasks.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        data: mockTasks
      }), 100))
    );

    render(<App />);
    
    expect(screen.getByText(/加载中/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/加载中/i)).not.toBeInTheDocument();
    });
  });

  it('应该加载并显示任务列表', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('测试任务1')).toBeInTheDocument();
      expect(screen.getByText('测试任务2')).toBeInTheDocument();
    });
    
    expect(mockTaskService.getTasks).toHaveBeenCalledTimes(1);
  });

  it('应该加载并显示用户列表', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('zhangsan@example.com')).toBeInTheDocument();
    });
    
    expect(mockUserService.getUsers).toHaveBeenCalledTimes(1);
  });

  it('应该显示正确的统计数据', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('总任务: 2')).toBeInTheDocument();
      expect(screen.getByText('已完成: 1')).toBeInTheDocument();
      expect(screen.getByText('待处理: 1')).toBeInTheDocument();
      expect(screen.getByText('高优先级: 1')).toBeInTheDocument();
    });
  });

  describe('任务管理', () => {
    it('应该能够添加新任务', async () => {
      const user = userEvent.setup();
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

      mockTaskService.createTask.mockResolvedValue({
        success: true,
        data: newTask
      });

      render(<App />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('测试任务1')).toBeInTheDocument();
      });

      // Fill form and submit
      const titleInput = screen.getByLabelText(/任务标题/i);
      const descriptionInput = screen.getByLabelText(/任务描述/i);
      const submitButton = screen.getByText(/添加任务/i);

      await user.type(titleInput, '新任务');
      await user.type(descriptionInput, '新任务描述');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTaskService.createTask).toHaveBeenCalledWith({
          title: '新任务',
          description: '新任务描述',
          priority: 'medium',
          tags: []
        });
      });
    });

    it('应该能够切换任务完成状态', async () => {
      const user = userEvent.setup();
      const updatedTask = { ...mockTasks[0], completed: true };
      
      mockTaskService.updateTask.mockResolvedValue({
        success: true,
        data: updatedTask
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('测试任务1')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /测试任务1/i });
      await user.click(checkbox);

      await waitFor(() => {
        expect(mockTaskService.updateTask).toHaveBeenCalledWith('1', {
          completed: true
        });
      });
    });

    it('应该能够删除任务', async () => {
      const user = userEvent.setup();
      
      mockTaskService.deleteTask.mockResolvedValue({
        success: true
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('测试任务1')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /删除.*测试任务1/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockTaskService.deleteTask).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('用户管理', () => {
    it('应该能够添加新用户', async () => {
      const user = userEvent.setup();
      const newUser: User = {
        id: '2',
        name: '李四',
        email: 'lisi@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        preferences: {
          theme: 'light',
          language: 'zh-CN',
          notifications: true,
          emailUpdates: false
        }
      };

      mockUserService.createUser.mockResolvedValue({
        success: true,
        data: newUser
      });

      render(<App />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument();
      });

      // Fill form and submit
      const nameInput = screen.getByLabelText(/用户名/i);
      const emailInput = screen.getByLabelText(/邮箱/i);
      const submitButton = screen.getByText(/添加用户/i);

      await user.type(nameInput, '李四');
      await user.type(emailInput, 'lisi@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUserService.createUser).toHaveBeenCalledWith({
          name: '李四',
          email: 'lisi@example.com',
          role: 'user'
        });
      });
    });
  });

  describe('错误处理', () => {
    it('应该显示任务加载错误', async () => {
      mockTaskService.getTasks.mockRejectedValue(new Error('网络错误'));

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/加载任务失败/i)).toBeInTheDocument();
      });
    });

    it('应该显示用户加载错误', async () => {
      mockUserService.getUsers.mockRejectedValue(new Error('网络错误'));

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/加载用户失败/i)).toBeInTheDocument();
      });
    });

    it('应该处理API错误响应', async () => {
      mockTaskService.getTasks.mockResolvedValue({
        success: false,
        error: '服务器错误'
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/服务器错误/i)).toBeInTheDocument();
      });
    });
  });

  describe('表单验证', () => {
    it('应该验证任务标题不能为空', async () => {
      const user = userEvent.setup();
      
      render(<App />);
      
      const submitButton = screen.getByText(/添加任务/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/任务标题不能为空/i)).toBeInTheDocument();
      });
    });

    it('应该验证邮箱格式', async () => {
      const user = userEvent.setup();
      
      render(<App />);
      
      const nameInput = screen.getByLabelText(/用户名/i);
      const emailInput = screen.getByLabelText(/邮箱/i);
      const submitButton = screen.getByText(/添加用户/i);

      await user.type(nameInput, '测试用户');
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/请输入有效的邮箱地址/i)).toBeInTheDocument();
      });
    });
  });

  describe('无障碍功能', () => {
    it('应该有正确的ARIA标签', async () => {
      render(<App />);
      
      await waitFor(() => {
        const taskList = screen.getByRole('list', { name: /任务列表/i });
        expect(taskList).toBeInTheDocument();
      });
    });

    it('应该支持键盘导航', async () => {
      const user = userEvent.setup();
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('测试任务1')).toBeInTheDocument();
      });

      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      
      expect(firstButton).toHaveFocus();
      
      await user.keyboard('{Tab}');
      
      const nextElement = document.activeElement;
      expect(nextElement).not.toBe(firstButton);
    });
  });

  describe('性能优化', () => {
    it('应该防抖搜索输入', async () => {
      const user = userEvent.setup();
      
      render(<App />);
      
      const searchInput = screen.getByPlaceholderText(/搜索任务/i);
      
      // Type quickly
      await user.type(searchInput, 'test');
      
      // Should not trigger search immediately
      expect(mockTaskService.getTasks).toHaveBeenCalledTimes(1); // Only initial load
      
      // Wait for debounce
      await waitFor(() => {
        expect(mockTaskService.getTasks).toHaveBeenCalledTimes(2);
      }, { timeout: 1000 });
    });
  });
});
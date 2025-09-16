import { mount, VueWrapper } from '@vue/test-utils';
import { createStore } from 'vuex';
import App from '@/App.vue';
import { Task, User, RootState } from '@/types';
import { taskApi, userApi } from '@/services/api';

// Mock API services
jest.mock('@/services/api');
const mockTaskApi = taskApi as jest.Mocked<typeof taskApi>;
const mockUserApi = userApi as jest.Mocked<typeof userApi>;

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

// Create mock store
const createMockStore = (initialState: Partial<RootState> = {}) => {
  return createStore({
    state: {
      loading: false,
      error: null,
      theme: 'light',
      user: null,
      ...initialState
    },
    mutations: {
      SET_LOADING(state, loading: boolean) {
        state.loading = loading;
      },
      SET_ERROR(state, error: string | null) {
        state.error = error;
      },
      SET_THEME(state, theme: 'light' | 'dark') {
        state.theme = theme;
      }
    },
    actions: {
      async loadTasks({ commit }) {
        commit('SET_LOADING', true);
        try {
          const response = await mockTaskApi.getTasks();
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          commit('SET_ERROR', error instanceof Error ? error.message : '加载失败');
          throw error;
        } finally {
          commit('SET_LOADING', false);
        }
      },
      async loadUsers({ commit }) {
        commit('SET_LOADING', true);
        try {
          const response = await mockUserApi.getUsers();
          if (response.success) {
            return response.data;
          } else {
            throw new Error(response.error);
          }
        } catch (error) {
          commit('SET_ERROR', error instanceof Error ? error.message : '加载失败');
          throw error;
        } finally {
          commit('SET_LOADING', false);
        }
      }
    }
  });
};

describe('App.vue', () => {
  let wrapper: VueWrapper<any>;
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockTaskApi.getTasks.mockResolvedValue({
      success: true,
      data: mockTasks
    });
    
    mockUserApi.getUsers.mockResolvedValue({
      success: true,
      data: mockUsers
    });

    store = createMockStore();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  const createWrapper = (props = {}) => {
    return mount(App, {
      global: {
        plugins: [store]
      },
      props
    });
  };

  it('应该渲染应用标题', () => {
    wrapper = createWrapper();
    expect(wrapper.text()).toContain('Vue 依赖分析演示');
  });

  it('应该显示加载状态', async () => {
    // Mock delayed response
    mockTaskApi.getTasks.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        data: mockTasks
      }), 100))
    );

    wrapper = createWrapper();
    
    // Trigger loading
    await wrapper.vm.loadTasks();
    
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('应该加载并显示任务列表', async () => {
    wrapper = createWrapper();
    
    await wrapper.vm.loadTasks();
    await wrapper.vm.$nextTick();
    
    expect(wrapper.text()).toContain('测试任务1');
    expect(wrapper.text()).toContain('测试任务2');
    expect(mockTaskApi.getTasks).toHaveBeenCalledTimes(1);
  });

  it('应该加载并显示用户列表', async () => {
    wrapper = createWrapper();
    
    await wrapper.vm.loadUsers();
    await wrapper.vm.$nextTick();
    
    expect(wrapper.text()).toContain('张三');
    expect(wrapper.text()).toContain('zhangsan@example.com');
    expect(mockUserApi.getUsers).toHaveBeenCalledTimes(1);
  });

  describe('任务管理', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('应该能够添加新任务', async () => {
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

      mockTaskApi.createTask.mockResolvedValue({
        success: true,
        data: newTask
      });

      await wrapper.vm.addTask('新任务', '新任务描述', 'low');

      expect(mockTaskApi.createTask).toHaveBeenCalledWith({
        title: '新任务',
        description: '新任务描述',
        priority: 'low',
        tags: []
      });
    });

    it('应该能够更新任务', async () => {
      const updatedTask = { ...mockTasks[0], completed: true };
      
      mockTaskApi.updateTask.mockResolvedValue({
        success: true,
        data: updatedTask
      });

      await wrapper.vm.updateTask('1', { completed: true });

      expect(mockTaskApi.updateTask).toHaveBeenCalledWith('1', {
        completed: true
      });
    });

    it('应该能够删除任务', async () => {
      mockTaskApi.deleteTask.mockResolvedValue({
        success: true
      });

      await wrapper.vm.deleteTask('1');

      expect(mockTaskApi.deleteTask).toHaveBeenCalledWith('1');
    });
  });

  describe('用户管理', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('应该能够添加新用户', async () => {
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

      mockUserApi.createUser.mockResolvedValue({
        success: true,
        data: newUser
      });

      await wrapper.vm.addUser('李四', 'lisi@example.com', 'user');

      expect(mockUserApi.createUser).toHaveBeenCalledWith({
        name: '李四',
        email: 'lisi@example.com',
        role: 'user'
      });
    });

    it('应该能够删除用户', async () => {
      mockUserApi.deleteUser.mockResolvedValue({
        success: true
      });

      await wrapper.vm.deleteUser('1');

      expect(mockUserApi.deleteUser).toHaveBeenCalledWith('1');
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('应该处理任务加载错误', async () => {
      mockTaskApi.getTasks.mockRejectedValue(new Error('网络错误'));

      try {
        await wrapper.vm.loadTasks();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(store.state.error).toBe('网络错误');
    });

    it('应该处理用户加载错误', async () => {
      mockUserApi.getUsers.mockRejectedValue(new Error('网络错误'));

      try {
        await wrapper.vm.loadUsers();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(store.state.error).toBe('网络错误');
    });

    it('应该处理API错误响应', async () => {
      mockTaskApi.getTasks.mockResolvedValue({
        success: false,
        error: '服务器错误'
      });

      try {
        await wrapper.vm.loadTasks();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(store.state.error).toBe('服务器错误');
    });
  });

  describe('表单验证', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('应该验证任务标题', () => {
      expect(wrapper.vm.validateTaskTitle('')).toBe('任务标题不能为空');
      expect(wrapper.vm.validateTaskTitle('a'.repeat(101))).toBe('任务标题不能超过100个字符');
      expect(wrapper.vm.validateTaskTitle('有效标题')).toBeNull();
    });

    it('应该验证用户邮箱', () => {
      expect(wrapper.vm.validateEmail('')).toBe('邮箱不能为空');
      expect(wrapper.vm.validateEmail('invalid-email')).toBe('请输入有效的邮箱地址');
      expect(wrapper.vm.validateEmail('valid@example.com')).toBeNull();
    });
  });

  describe('响应式设计', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('应该在移动设备上正确显示', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.isMobile).toBe(true);
    });

    it('应该在桌面设备上正确显示', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.isMobile).toBe(false);
    });
  });

  describe('主题切换', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('应该能够切换主题', async () => {
      await wrapper.vm.toggleTheme();
      
      expect(store.state.theme).toBe('dark');
      
      await wrapper.vm.toggleTheme();
      
      expect(store.state.theme).toBe('light');
    });
  });

  describe('性能优化', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('应该正确跟踪列表项', () => {
      const task = mockTasks[0];
      expect(wrapper.vm.trackByTaskId(task)).toBe(task.id);
      
      const user = mockUsers[0];
      expect(wrapper.vm.trackByUserId(user)).toBe(user.id);
    });

    it('应该防抖搜索输入', async () => {
      const searchInput = wrapper.find('input[type="search"]');
      
      // Simulate rapid typing
      await searchInput.setValue('test');
      await searchInput.setValue('testing');
      await searchInput.setValue('testing123');
      
      // Should only trigger search once after debounce
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(mockTaskApi.getTasks).toHaveBeenCalledTimes(1);
    });
  });
});
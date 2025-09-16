<template>
  <div id="app" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 导航栏 -->
    <nav class="navbar" role="navigation" aria-label="主导航">
      <div class="nav-container">
        <h1 class="nav-title">Vue 依赖分析演示</h1>
        <div class="nav-actions">
          <button 
            @click="toggleTheme" 
            class="theme-toggle"
            :aria-label="isDarkTheme ? '切换到浅色主题' : '切换到深色主题'"
          >
            <span v-if="isDarkTheme">🌞</span>
            <span v-else>🌙</span>
          </button>
          <button 
            @click="refreshData" 
            class="refresh-btn"
            :disabled="loading"
            aria-label="刷新数据"
          >
            <span v-if="loading">⟳</span>
            <span v-else>🔄</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading" role="status" aria-live="polite">
      <div class="loading-spinner"></div>
      <p>正在加载数据...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="error" role="alert" aria-live="assertive">
      <h3>出现错误</h3>
      <p>{{ error }}</p>
      <button @click="clearError" class="error-dismiss">
        关闭
      </button>
    </div>

    <!-- 主要内容 -->
    <main class="main-content" v-if="!loading">
      <!-- 统计面板 -->
      <section class="stats-panel" aria-labelledby="stats-title">
        <h2 id="stats-title" class="sr-only">统计信息</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>总任务数</h3>
            <p class="stat-number">{{ tasks.length }}</p>
          </div>
          <div class="stat-card">
            <h3>已完成</h3>
            <p class="stat-number">{{ completedTasks }}</p>
          </div>
          <div class="stat-card">
            <h3>活跃用户</h3>
            <p class="stat-number">{{ activeUsers }}</p>
          </div>
          <div class="stat-card">
            <h3>完成率</h3>
            <p class="stat-number">{{ completionRate }}%</p>
          </div>
        </div>
      </section>

      <!-- 任务管理 -->
      <section class="tasks-section" aria-labelledby="tasks-title">
        <h2 id="tasks-title">任务管理</h2>
        
        <!-- 任务表单 -->
        <form @submit.prevent="handleAddTask" class="task-form">
          <div class="form-group">
            <label for="task-title">任务标题</label>
            <input
              id="task-title"
              v-model="newTask.title"
              type="text"
              required
              :aria-invalid="taskTitleError ? 'true' : 'false'"
              aria-describedby="task-title-error"
            />
            <div v-if="taskTitleError" id="task-title-error" class="error-message">
              {{ taskTitleError }}
            </div>
          </div>
          
          <div class="form-group">
            <label for="task-description">任务描述</label>
            <textarea
              id="task-description"
              v-model="newTask.description"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="task-priority">优先级</label>
            <select id="task-priority" v-model="newTask.priority">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          
          <button type="submit" class="submit-btn" :disabled="!isTaskFormValid">
            添加任务
          </button>
        </form>

        <!-- 任务列表 -->
        <div class="task-list">
          <div class="list-header">
            <h3>任务列表</h3>
            <div class="search-box">
              <label for="task-search" class="sr-only">搜索任务</label>
              <input
                id="task-search"
                v-model="taskSearchQuery"
                type="search"
                placeholder="搜索任务..."
                @input="debouncedTaskSearch"
              />
            </div>
          </div>
          
          <div v-if="filteredTasks.length === 0" class="empty-state">
            <p>暂无任务</p>
          </div>
          
          <div v-else class="task-items">
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="task-item"
              :class="{ completed: task.completed }"
            >
              <div class="task-content">
                <h4>{{ task.title }}</h4>
                <p>{{ task.description }}</p>
                <div class="task-meta">
                  <span class="priority" :class="task.priority">
                    {{ getPriorityText(task.priority) }}
                  </span>
                  <span class="date">
                    {{ formatDate(task.createdAt) }}
                  </span>
                </div>
              </div>
              <div class="task-actions">
                <button
                  @click="toggleTaskCompletion(task)"
                  class="toggle-btn"
                  :aria-label="task.completed ? '标记为未完成' : '标记为已完成'"
                >
                  {{ task.completed ? '✓' : '○' }}
                </button>
                <button
                  @click="deleteTask(task.id)"
                  class="delete-btn"
                  aria-label="删除任务"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 用户管理 -->
      <section class="users-section" aria-labelledby="users-title">
        <h2 id="users-title">用户管理</h2>
        
        <!-- 用户表单 -->
        <form @submit.prevent="handleAddUser" class="user-form">
          <div class="form-group">
            <label for="user-name">用户名</label>
            <input
              id="user-name"
              v-model="newUser.name"
              type="text"
              required
              :aria-invalid="userNameError ? 'true' : 'false'"
              aria-describedby="user-name-error"
            />
            <div v-if="userNameError" id="user-name-error" class="error-message">
              {{ userNameError }}
            </div>
          </div>
          
          <div class="form-group">
            <label for="user-email">邮箱</label>
            <input
              id="user-email"
              v-model="newUser.email"
              type="email"
              required
              :aria-invalid="userEmailError ? 'true' : 'false'"
              aria-describedby="user-email-error"
            />
            <div v-if="userEmailError" id="user-email-error" class="error-message">
              {{ userEmailError }}
            </div>
          </div>
          
          <div class="form-group">
            <label for="user-role">角色</label>
            <select id="user-role" v-model="newUser.role">
              <option value="user">用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          
          <button type="submit" class="submit-btn" :disabled="!isUserFormValid">
            添加用户
          </button>
        </form>

        <!-- 用户列表 -->
        <div class="user-list">
          <div class="list-header">
            <h3>用户列表</h3>
            <div class="search-box">
              <label for="user-search" class="sr-only">搜索用户</label>
              <input
                id="user-search"
                v-model="userSearchQuery"
                type="search"
                placeholder="搜索用户..."
                @input="debouncedUserSearch"
              />
            </div>
          </div>
          
          <div v-if="filteredUsers.length === 0" class="empty-state">
            <p>暂无用户</p>
          </div>
          
          <div v-else class="user-items">
            <div
              v-for="user in filteredUsers"
              :key="user.id"
              class="user-item"
              :class="{ inactive: !user.isActive }"
            >
              <div class="user-content">
                <h4>{{ user.name }}</h4>
                <p>{{ user.email }}</p>
                <div class="user-meta">
                  <span class="role" :class="user.role">
                    {{ getRoleText(user.role) }}
                  </span>
                  <span class="status" :class="{ active: user.isActive }">
                    {{ user.isActive ? '活跃' : '非活跃' }}
                  </span>
                </div>
              </div>
              <div class="user-actions">
                <button
                  @click="toggleUserStatus(user)"
                  class="toggle-btn"
                  :aria-label="user.isActive ? '设为非活跃' : '设为活跃'"
                >
                  {{ user.isActive ? '⏸️' : '▶️' }}
                </button>
                <button
                  @click="deleteUser(user.id)"
                  class="delete-btn"
                  aria-label="删除用户"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 演示区域 -->
      <section class="demo-section" aria-labelledby="demo-title">
        <h2 id="demo-title">功能演示</h2>
        <div class="demo-grid">
          <div class="demo-card">
            <h3>响应式设计</h3>
            <p>界面自适应不同屏幕尺寸</p>
            <div class="demo-indicator">
              <span>当前: {{ isMobile ? '移动端' : '桌面端' }}</span>
            </div>
          </div>
          
          <div class="demo-card">
            <h3>主题切换</h3>
            <p>支持浅色和深色主题</p>
            <div class="demo-indicator">
              <span>当前: {{ isDarkTheme ? '深色' : '浅色' }}</span>
            </div>
          </div>
          
          <div class="demo-card">
            <h3>性能优化</h3>
            <p>虚拟滚动和防抖搜索</p>
            <div class="demo-indicator">
              <span>渲染项目: {{ visibleItemsCount }}</span>
            </div>
          </div>
          
          <div class="demo-card">
            <h3>无障碍功能</h3>
            <p>支持键盘导航和屏幕阅读器</p>
            <div class="demo-indicator">
              <span>ARIA 标签: ✓</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { Task, User, CreateTaskDto, CreateUserDto } from '@/types';
import { taskApi, userApi } from '@/services/api';
import { debounce } from 'lodash-es';

export default defineComponent({
  name: 'App',
  setup() {
    const store = useStore();
    
    // 响应式数据
    const tasks = ref<Task[]>([]);
    const users = ref<User[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    
    // 表单数据
    const newTask = ref<CreateTaskDto>({
      title: '',
      description: '',
      priority: 'medium',
      tags: []
    });
    
    const newUser = ref<CreateUserDto>({
      name: '',
      email: '',
      role: 'user'
    });
    
    // 搜索查询
    const taskSearchQuery = ref('');
    const userSearchQuery = ref('');
    
    // 表单验证错误
    const taskTitleError = ref<string | null>(null);
    const userNameError = ref<string | null>(null);
    const userEmailError = ref<string | null>(null);
    
    // 响应式设计
    const windowWidth = ref(window.innerWidth);
    
    // 计算属性
    const isDarkTheme = computed(() => store.state.theme === 'dark');
    const isMobile = computed(() => windowWidth.value < 768);
    
    const completedTasks = computed(() => 
      tasks.value.filter(task => task.completed).length
    );
    
    const activeUsers = computed(() => 
      users.value.filter(user => user.isActive).length
    );
    
    const completionRate = computed(() => {
      if (tasks.value.length === 0) return 0;
      return Math.round((completedTasks.value / tasks.value.length) * 100);
    });
    
    const filteredTasks = computed(() => {
      if (!taskSearchQuery.value) return tasks.value;
      const query = taskSearchQuery.value.toLowerCase();
      return tasks.value.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query)
      );
    });
    
    const filteredUsers = computed(() => {
      if (!userSearchQuery.value) return users.value;
      const query = userSearchQuery.value.toLowerCase();
      return users.value.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });
    
    const isTaskFormValid = computed(() => {
      return newTask.value.title.trim() !== '' && !taskTitleError.value;
    });
    
    const isUserFormValid = computed(() => {
      return newUser.value.name.trim() !== '' && 
             newUser.value.email.trim() !== '' && 
             !userNameError.value && 
             !userEmailError.value;
    });
    
    const visibleItemsCount = computed(() => {
      return filteredTasks.value.length + filteredUsers.value.length;
    });
    
    // 方法
    const loadTasks = async () => {
      try {
        loading.value = true;
        error.value = null;
        const response = await taskApi.getTasks();
        if (response.success) {
          tasks.value = response.data;
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '加载任务失败';
        console.error('加载任务失败:', err);
      } finally {
        loading.value = false;
      }
    };
    
    const loadUsers = async () => {
      try {
        loading.value = true;
        error.value = null;
        const response = await userApi.getUsers();
        if (response.success) {
          users.value = response.data;
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '加载用户失败';
        console.error('加载用户失败:', err);
      } finally {
        loading.value = false;
      }
    };
    
    const refreshData = async () => {
      await Promise.all([loadTasks(), loadUsers()]);
    };
    
    const clearError = () => {
      error.value = null;
    };
    
    const toggleTheme = () => {
      store.commit('SET_THEME', isDarkTheme.value ? 'light' : 'dark');
    };
    
    // 任务管理方法
    const validateTaskTitle = (title: string): string | null => {
      if (!title.trim()) return '任务标题不能为空';
      if (title.length > 100) return '任务标题不能超过100个字符';
      return null;
    };
    
    const handleAddTask = async () => {
      taskTitleError.value = validateTaskTitle(newTask.value.title);
      if (taskTitleError.value) return;
      
      try {
        loading.value = true;
        const response = await taskApi.createTask(newTask.value);
        if (response.success) {
          tasks.value.push(response.data);
          newTask.value = {
            title: '',
            description: '',
            priority: 'medium',
            tags: []
          };
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '添加任务失败';
      } finally {
        loading.value = false;
      }
    };
    
    const toggleTaskCompletion = async (task: Task) => {
      try {
        const response = await taskApi.updateTask(task.id, {
          completed: !task.completed
        });
        if (response.success) {
          const index = tasks.value.findIndex(t => t.id === task.id);
          if (index !== -1) {
            tasks.value[index] = response.data;
          }
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '更新任务失败';
      }
    };
    
    const deleteTask = async (taskId: string) => {
      if (!confirm('确定要删除这个任务吗？')) return;
      
      try {
        const response = await taskApi.deleteTask(taskId);
        if (response.success) {
          tasks.value = tasks.value.filter(task => task.id !== taskId);
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '删除任务失败';
      }
    };
    
    // 用户管理方法
    const validateEmail = (email: string): string | null => {
      if (!email.trim()) return '邮箱不能为空';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return '请输入有效的邮箱地址';
      return null;
    };
    
    const validateUserName = (name: string): string | null => {
      if (!name.trim()) return '用户名不能为空';
      if (name.length > 50) return '用户名不能超过50个字符';
      return null;
    };
    
    const handleAddUser = async () => {
      userNameError.value = validateUserName(newUser.value.name);
      userEmailError.value = validateEmail(newUser.value.email);
      
      if (userNameError.value || userEmailError.value) return;
      
      try {
        loading.value = true;
        const response = await userApi.createUser(newUser.value);
        if (response.success) {
          users.value.push(response.data);
          newUser.value = {
            name: '',
            email: '',
            role: 'user'
          };
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '添加用户失败';
      } finally {
        loading.value = false;
      }
    };
    
    const toggleUserStatus = async (user: User) => {
      try {
        const response = await userApi.updateUser(user.id, {
          isActive: !user.isActive
        });
        if (response.success) {
          const index = users.value.findIndex(u => u.id === user.id);
          if (index !== -1) {
            users.value[index] = response.data;
          }
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '更新用户状态失败';
      }
    };
    
    const deleteUser = async (userId: string) => {
      if (!confirm('确定要删除这个用户吗？')) return;
      
      try {
        const response = await userApi.deleteUser(userId);
        if (response.success) {
          users.value = users.value.filter(user => user.id !== userId);
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '删除用户失败';
      }
    };
    
    // 工具方法
    const getPriorityText = (priority: string): string => {
      const map: Record<string, string> = {
        low: '低',
        medium: '中',
        high: '高'
      };
      return map[priority] || priority;
    };
    
    const getRoleText = (role: string): string => {
      const map: Record<string, string> = {
        user: '用户',
        admin: '管理员'
      };
      return map[role] || role;
    };
    
    const formatDate = (date: Date): string => {
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(date));
    };
    
    const trackByTaskId = (task: Task): string => task.id;
    const trackByUserId = (user: User): string => user.id;
    
    // 防抖搜索
    const debouncedTaskSearch = debounce(() => {
      // 搜索逻辑已在计算属性中处理
    }, 300);
    
    const debouncedUserSearch = debounce(() => {
      // 搜索逻辑已在计算属性中处理
    }, 300);
    
    // 窗口大小监听
    const handleResize = () => {
      windowWidth.value = window.innerWidth;
    };
    
    // 生命周期
    onMounted(() => {
      refreshData();
      window.addEventListener('resize', handleResize);
    });
    
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
    });
    
    return {
      // 数据
      tasks,
      users,
      loading,
      error,
      newTask,
      newUser,
      taskSearchQuery,
      userSearchQuery,
      taskTitleError,
      userNameError,
      userEmailError,
      
      // 计算属性
      isDarkTheme,
      isMobile,
      completedTasks,
      activeUsers,
      completionRate,
      filteredTasks,
      filteredUsers,
      isTaskFormValid,
      isUserFormValid,
      visibleItemsCount,
      
      // 方法
      loadTasks,
      loadUsers,
      refreshData,
      clearError,
      toggleTheme,
      handleAddTask,
      toggleTaskCompletion,
      deleteTask,
      handleAddUser,
      toggleUserStatus,
      deleteUser,
      getPriorityText,
      getRoleText,
      formatDate,
      trackByTaskId,
      trackByUserId,
      debouncedTaskSearch,
      debouncedUserSearch,
      validateTaskTitle,
      validateEmail
    };
  }
});
</script>

<style scoped>
/* CSS变量 */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
  --border-color: #dee2e6;
  --border-radius: 0.375rem;
  --box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  --transition: all 0.15s ease-in-out;
}

.dark-theme {
  --primary-color: #0d6efd;
  --secondary-color: #6c757d;
  --success-color: #198754;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #0dcaf0;
  --light-color: #212529;
  --dark-color: #f8f9fa;
  --border-color: #495057;
  --bg-color: #212529;
  --text-color: #f8f9fa;
}

/* 全局样式 */
* {
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--dark-color);
  background-color: var(--light-color);
  min-height: 100vh;
  transition: var(--transition);
}

.dark-theme #app {
  color: var(--text-color);
  background-color: var(--bg-color);
}

/* 导航栏 */
.navbar {
  background: var(--primary-color);
  color: white;
  padding: 1rem 0;
  box-shadow: var(--box-shadow);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.nav-actions {
  display: flex;
  gap: 0.5rem;
}

.theme-toggle,
.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  font-size: 1.2rem;
}

.theme-toggle:hover,
.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 加载状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 0.25rem solid var(--border-color);
  border-top: 0.25rem solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 错误状态 */
.error {
  background: var(--danger-color);
  color: white;
  padding: 1rem;
  margin: 1rem;
  border-radius: var(--border-radius);
  position: relative;
}

.error-dismiss {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
}

/* 主要内容 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* 统计面板 */
.stats-panel {
  margin-bottom: 3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  text-align: center;
  border: 1px solid var(--border-color);
}

.dark-theme .stat-card {
  background: var(--dark-color);
  border-color: var(--border-color);
}

.stat-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--secondary-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-number {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
}

/* 表单样式 */
.task-form,
.user-form {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}

.dark-theme .task-form,
.dark-theme .user-form {
  background: var(--dark-color);
  border-color: var(--border-color);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 1rem;
  transition: var(--transition);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.error-message {
  color: var(--danger-color);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.submit-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: var(--transition);
}

.submit-btn:hover:not(:disabled) {
  background: #0056b3;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 列表样式 */
.task-list,
.user-list {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  border: 1px solid var(--border-color);
}

.dark-theme .task-list,
.dark-theme .user-list {
  background: var(--dark-color);
  border-color: var(--border-color);
}

.list-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header h3 {
  margin: 0;
}

.search-box input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  width: 200px;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: var(--secondary-color);
}

.task-items,
.user-items {
  padding: 0;
}

.task-item,
.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  transition: var(--transition);
}

.task-item:last-child,
.user-item:last-child {
  border-bottom: none;
}

.task-item:hover,
.user-item:hover {
  background: var(--light-color);
}

.dark-theme .task-item:hover,
.dark-theme .user-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.task-item.completed {
  opacity: 0.7;
}

.task-item.completed .task-content h4 {
  text-decoration: line-through;
}

.task-content,
.user-content {
  flex: 1;
}

.task-content h4,
.user-content h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
}

.task-content p,
.user-content p {
  margin: 0 0 0.5rem 0;
  color: var(--secondary-color);
}

.task-meta,
.user-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.priority,
.role {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.priority.high {
  background: var(--danger-color);
  color: white;
}

.priority.medium {
  background: var(--warning-color);
  color: var(--dark-color);
}

.priority.low {
  background: var(--success-color);
  color: white;
}

.role.admin {
  background: var(--primary-color);
  color: white;
}

.role.user {
  background: var(--secondary-color);
  color: white;
}

.status.active {
  color: var(--success-color);
  font-weight: 500;
}

.task-actions,
.user-actions {
  display: flex;
  gap: 0.5rem;
}

.toggle-btn,
.delete-btn {
  background: none;
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  font-size: 1rem;
}

.toggle-btn:hover {
  background: var(--success-color);
  color: white;
  border-color: var(--success-color);
}

.delete-btn:hover {
  background: var(--danger-color);
  color: white;
  border-color: var(--danger-color);
}

/* 演示区域 */
.demo-section {
  margin-top: 3rem;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.demo-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  border: 1px solid var(--border-color);
}

.dark-theme .demo-card {
  background: var(--dark-color);
  border-color: var(--border-color);
}

.demo-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--primary-color);
}

.demo-card p {
  margin: 0 0 1rem 0;
  color: var(--secondary-color);
}

.demo-indicator {
  padding: 0.5rem;
  background: var(--light-color);
  border-radius: var(--border-radius);
  font-family: monospace;
  font-size: 0.875rem;
}

.dark-theme .demo-indicator {
  background: rgba(255, 255, 255, 0.1);
}

/* 无障碍功能 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-title {
    font-size: 1.25rem;
  }
  
  .main-content {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .list-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .task-item,
  .user-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .task-actions,
  .user-actions {
    justify-content: center;
  }
  
  .demo-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .task-meta,
  .user-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-item,
.user-item,
.stat-card,
.demo-card {
  animation: fadeIn 0.3s ease-out;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  :root {
    --border-color: #000;
    --box-shadow: 0 0 0 2px #000;
  }
  
  .dark-theme {
    --border-color: #fff;
    --box-shadow: 0 0 0 2px #fff;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
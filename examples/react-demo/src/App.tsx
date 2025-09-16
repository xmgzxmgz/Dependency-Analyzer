import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, User, CreateTaskDto, CreateUserDto, AppState } from './types';
import { taskService, userService } from './services/api';
import { useApi, useAsyncOperation, useList } from './hooks/useApi';
import './App.css';

const App: React.FC = () => {
  // 状态管理
  const [appState, setAppState] = useState<AppState>({
    theme: 'light',
    loading: false,
    error: null,
    user: null
  });

  // 自定义Hook使用
  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    create: createTask,
    update: updateTask,
    remove: deleteTask
  } = useList<Task, CreateTaskDto>(taskService);

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
    create: createUser,
    update: updateUser,
    remove: deleteUser
  } = useList<User, CreateUserDto>(userService);

  // 表单状态
  const [newTask, setNewTask] = useState<CreateTaskDto>({
    title: '',
    description: '',
    priority: 'medium',
    tags: []
  });

  const [newUser, setNewUser] = useState<CreateUserDto>({
    name: '',
    email: '',
    role: 'user'
  });

  // 搜索状态
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // 表单验证错误
  const [taskTitleError, setTaskTitleError] = useState<string | null>(null);
  const [userNameError, setUserNameError] = useState<string | null>(null);
  const [userEmailError, setUserEmailError] = useState<string | null>(null);

  // 响应式设计
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // 计算属性
  const isDarkTheme = useMemo(() => appState.theme === 'dark', [appState.theme]);
  const isMobile = useMemo(() => windowWidth < 768, [windowWidth]);
  const loading = useMemo(() => tasksLoading || usersLoading, [tasksLoading, usersLoading]);
  const error = useMemo(() => tasksError || usersError || appState.error, [tasksError, usersError, appState.error]);

  const completedTasks = useMemo(() => 
    tasks.filter(task => task.completed).length, [tasks]
  );

  const activeUsers = useMemo(() => 
    users.filter(user => user.isActive).length, [users]
  );

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasks / tasks.length) * 100);
  }, [completedTasks, tasks.length]);

  const filteredTasks = useMemo(() => {
    if (!taskSearchQuery) return tasks;
    const query = taskSearchQuery.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    );
  }, [tasks, taskSearchQuery]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  const isTaskFormValid = useMemo(() => {
    return newTask.title.trim() !== '' && !taskTitleError;
  }, [newTask.title, taskTitleError]);

  const isUserFormValid = useMemo(() => {
    return newUser.name.trim() !== '' && 
           newUser.email.trim() !== '' && 
           !userNameError && 
           !userEmailError;
  }, [newUser.name, newUser.email, userNameError, userEmailError]);

  const visibleItemsCount = useMemo(() => {
    return filteredTasks.length + filteredUsers.length;
  }, [filteredTasks.length, filteredUsers.length]);

  // 异步操作Hook
  const { execute: executeRefreshData } = useAsyncOperation(
    useCallback(async () => {
      await Promise.all([refetchTasks(), refetchUsers()]);
    }, [refetchTasks, refetchUsers])
  );

  // 事件处理函数
  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth);
  }, []);

  const toggleTheme = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  }, []);

  const clearError = useCallback(() => {
    setAppState(prev => ({ ...prev, error: null }));
  }, []);

  // 表单验证函数
  const validateTaskTitle = useCallback((title: string): string | null => {
    if (!title.trim()) return '任务标题不能为空';
    if (title.length > 100) return '任务标题不能超过100个字符';
    return null;
  }, []);

  const validateEmail = useCallback((email: string): string | null => {
    if (!email.trim()) return '邮箱不能为空';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return '请输入有效的邮箱地址';
    return null;
  }, []);

  const validateUserName = useCallback((name: string): string | null => {
    if (!name.trim()) return '用户名不能为空';
    if (name.length > 50) return '用户名不能超过50个字符';
    return null;
  }, []);

  // 任务管理函数
  const handleAddTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const titleError = validateTaskTitle(newTask.title);
    setTaskTitleError(titleError);
    
    if (titleError) return;

    try {
      await createTask(newTask);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        tags: []
      });
      setTaskTitleError(null);
    } catch (err) {
      setAppState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '添加任务失败'
      }));
    }
  }, [newTask, validateTaskTitle, createTask]);

  const handleToggleTaskCompletion = useCallback(async (task: Task) => {
    try {
      await updateTask(task.id, { completed: !task.completed });
    } catch (err) {
      setAppState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '更新任务失败'
      }));
    }
  }, [updateTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!window.confirm('确定要删除这个任务吗？')) return;
    
    try {
      await deleteTask(taskId);
    } catch (err) {
      setAppState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '删除任务失败'
      }));
    }
  }, [deleteTask]);

  // 用户管理函数
  const handleAddUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nameError = validateUserName(newUser.name);
    const emailError = validateEmail(newUser.email);
    
    setUserNameError(nameError);
    setUserEmailError(emailError);
    
    if (nameError || emailError) return;

    try {
      await createUser(newUser);
      setNewUser({
        name: '',
        email: '',
        role: 'user'
      });
      setUserNameError(null);
      setUserEmailError(null);
    } catch (err) {
      setAppState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '添加用户失败'
      }));
    }
  }, [newUser, validateUserName, validateEmail, createUser]);

  const handleToggleUserStatus = useCallback(async (user: User) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
    } catch (err) {
      setAppState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '更新用户状态失败'
      }));
    }
  }, [updateUser]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!window.confirm('确定要删除这个用户吗？')) return;
    
    try {
      await deleteUser(userId);
    } catch (err) {
      setAppState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : '删除用户失败'
      }));
    }
  }, [deleteUser]);

  // 工具函数
  const getPriorityText = useCallback((priority: string): string => {
    const map: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高'
    };
    return map[priority] || priority;
  }, []);

  const getRoleText = useCallback((role: string): string => {
    const map: Record<string, string> = {
      user: '用户',
      admin: '管理员'
    };
    return map[role] || role;
  }, []);

  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }, []);

  // 防抖搜索
  const debouncedTaskSearch = useCallback(
    debounce((query: string) => setTaskSearchQuery(query), 300),
    []
  );

  const debouncedUserSearch = useCallback(
    debounce((query: string) => setUserSearchQuery(query), 300),
    []
  );

  // 生命周期
  useEffect(() => {
    executeRefreshData();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [executeRefreshData, handleResize]);

  // 键盘导航支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC键清除错误
      if (e.key === 'Escape' && error) {
        clearError();
      }
      
      // Ctrl/Cmd + R 刷新数据
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        executeRefreshData();
      }
      
      // Ctrl/Cmd + D 切换主题
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [error, clearError, executeRefreshData, toggleTheme]);

  return (
    <div className={`app ${isDarkTheme ? 'dark-theme' : ''}`}>
      {/* 跳转链接 */}
      <a href="#main-content" className="skip-link">
        跳转到主要内容
      </a>

      {/* 导航栏 */}
      <nav className="navbar" role="navigation" aria-label="主导航">
        <div className="nav-container">
          <h1 className="nav-title">React 依赖分析演示</h1>
          <div className="nav-actions">
            <button 
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={isDarkTheme ? '切换到浅色主题' : '切换到深色主题'}
              title={`当前主题: ${isDarkTheme ? '深色' : '浅色'}`}
            >
              <span>{isDarkTheme ? '🌞' : '🌙'}</span>
            </button>
            <button 
              onClick={executeRefreshData}
              className="refresh-btn"
              disabled={loading}
              aria-label="刷新数据"
              title="刷新所有数据"
            >
              <span className={loading ? 'spinning' : ''}>{loading ? '⟳' : '🔄'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 加载状态 */}
      {loading && (
        <div className="loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true"></div>
          <p>正在加载数据...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="error" role="alert" aria-live="assertive">
          <h3>出现错误</h3>
          <p>{error}</p>
          <button 
            onClick={clearError} 
            className="error-dismiss"
            aria-label="关闭错误提示"
          >
            ✕
          </button>
        </div>
      )}

      {/* 主要内容 */}
      <main id="main-content" className="main-content" tabIndex={-1}>
        {/* 统计面板 */}
        <section className="stats-panel" aria-labelledby="stats-title">
          <h2 id="stats-title" className="sr-only">统计信息</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>总任务数</h3>
              <p className="stat-number" aria-label={`总任务数: ${tasks.length}`}>
                {tasks.length}
              </p>
            </div>
            <div className="stat-card">
              <h3>已完成</h3>
              <p className="stat-number" aria-label={`已完成任务: ${completedTasks}`}>
                {completedTasks}
              </p>
            </div>
            <div className="stat-card">
              <h3>活跃用户</h3>
              <p className="stat-number" aria-label={`活跃用户数: ${activeUsers}`}>
                {activeUsers}
              </p>
            </div>
            <div className="stat-card">
              <h3>完成率</h3>
              <p className="stat-number" aria-label={`任务完成率: ${completionRate}%`}>
                {completionRate}%
              </p>
            </div>
          </div>
        </section>

        {/* 任务管理 */}
        <section className="tasks-section" aria-labelledby="tasks-title">
          <h2 id="tasks-title">任务管理</h2>
          
          {/* 任务表单 */}
          <form onSubmit={handleAddTask} className="task-form" noValidate>
            <div className="form-group">
              <label htmlFor="task-title">任务标题 *</label>
              <input
                id="task-title"
                type="text"
                value={newTask.title}
                onChange={(e) => {
                  setNewTask(prev => ({ ...prev, title: e.target.value }));
                  setTaskTitleError(validateTaskTitle(e.target.value));
                }}
                required
                aria-invalid={taskTitleError ? 'true' : 'false'}
                aria-describedby={taskTitleError ? 'task-title-error' : undefined}
                placeholder="请输入任务标题"
              />
              {taskTitleError && (
                <div id="task-title-error" className="error-message" role="alert">
                  {taskTitleError}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="task-description">任务描述</label>
              <textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="请输入任务描述（可选）"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="task-priority">优先级</label>
              <select
                id="task-priority"
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ 
                  ...prev, 
                  priority: e.target.value as 'low' | 'medium' | 'high' 
                }))}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={!isTaskFormValid || loading}
            >
              {loading ? '添加中...' : '添加任务'}
            </button>
          </form>

          {/* 任务列表 */}
          <div className="task-list">
            <div className="list-header">
              <h3>任务列表 ({filteredTasks.length})</h3>
              <div className="search-box">
                <label htmlFor="task-search" className="sr-only">搜索任务</label>
                <input
                  id="task-search"
                  type="search"
                  placeholder="搜索任务..."
                  onChange={(e) => debouncedTaskSearch(e.target.value)}
                  aria-label="搜索任务"
                />
              </div>
            </div>
            
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <p>{taskSearchQuery ? '未找到匹配的任务' : '暂无任务'}</p>
              </div>
            ) : (
              <div className="task-items" role="list">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-item ${task.completed ? 'completed' : ''}`}
                    role="listitem"
                  >
                    <div className="task-content">
                      <h4>{task.title}</h4>
                      <p>{task.description}</p>
                      <div className="task-meta">
                        <span 
                          className={`priority ${task.priority}`}
                          aria-label={`优先级: ${getPriorityText(task.priority)}`}
                        >
                          {getPriorityText(task.priority)}
                        </span>
                        <span className="date">
                          {formatDate(task.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button
                        onClick={() => handleToggleTaskCompletion(task)}
                        className="toggle-btn"
                        aria-label={task.completed ? '标记为未完成' : '标记为已完成'}
                        title={task.completed ? '标记为未完成' : '标记为已完成'}
                      >
                        {task.completed ? '✓' : '○'}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="delete-btn"
                        aria-label={`删除任务: ${task.title}`}
                        title="删除任务"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 用户管理 */}
        <section className="users-section" aria-labelledby="users-title">
          <h2 id="users-title">用户管理</h2>
          
          {/* 用户表单 */}
          <form onSubmit={handleAddUser} className="user-form" noValidate>
            <div className="form-group">
              <label htmlFor="user-name">用户名 *</label>
              <input
                id="user-name"
                type="text"
                value={newUser.name}
                onChange={(e) => {
                  setNewUser(prev => ({ ...prev, name: e.target.value }));
                  setUserNameError(validateUserName(e.target.value));
                }}
                required
                aria-invalid={userNameError ? 'true' : 'false'}
                aria-describedby={userNameError ? 'user-name-error' : undefined}
                placeholder="请输入用户名"
              />
              {userNameError && (
                <div id="user-name-error" className="error-message" role="alert">
                  {userNameError}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="user-email">邮箱 *</label>
              <input
                id="user-email"
                type="email"
                value={newUser.email}
                onChange={(e) => {
                  setNewUser(prev => ({ ...prev, email: e.target.value }));
                  setUserEmailError(validateEmail(e.target.value));
                }}
                required
                aria-invalid={userEmailError ? 'true' : 'false'}
                aria-describedby={userEmailError ? 'user-email-error' : undefined}
                placeholder="请输入邮箱地址"
              />
              {userEmailError && (
                <div id="user-email-error" className="error-message" role="alert">
                  {userEmailError}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="user-role">角色</label>
              <select
                id="user-role"
                value={newUser.role}
                onChange={(e) => setNewUser(prev => ({ 
                  ...prev, 
                  role: e.target.value as 'user' | 'admin' 
                }))}
              >
                <option value="user">用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={!isUserFormValid || loading}
            >
              {loading ? '添加中...' : '添加用户'}
            </button>
          </form>

          {/* 用户列表 */}
          <div className="user-list">
            <div className="list-header">
              <h3>用户列表 ({filteredUsers.length})</h3>
              <div className="search-box">
                <label htmlFor="user-search" className="sr-only">搜索用户</label>
                <input
                  id="user-search"
                  type="search"
                  placeholder="搜索用户..."
                  onChange={(e) => debouncedUserSearch(e.target.value)}
                  aria-label="搜索用户"
                />
              </div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="empty-state">
                <p>{userSearchQuery ? '未找到匹配的用户' : '暂无用户'}</p>
              </div>
            ) : (
              <div className="user-items" role="list">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`user-item ${!user.isActive ? 'inactive' : ''}`}
                    role="listitem"
                  >
                    <div className="user-content">
                      <h4>{user.name}</h4>
                      <p>{user.email}</p>
                      <div className="user-meta">
                        <span 
                          className={`role ${user.role}`}
                          aria-label={`角色: ${getRoleText(user.role)}`}
                        >
                          {getRoleText(user.role)}
                        </span>
                        <span 
                          className={`status ${user.isActive ? 'active' : 'inactive'}`}
                          aria-label={`状态: ${user.isActive ? '活跃' : '非活跃'}`}
                        >
                          {user.isActive ? '活跃' : '非活跃'}
                        </span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className="toggle-btn"
                        aria-label={user.isActive ? '设为非活跃' : '设为活跃'}
                        title={user.isActive ? '设为非活跃' : '设为活跃'}
                      >
                        {user.isActive ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="delete-btn"
                        aria-label={`删除用户: ${user.name}`}
                        title="删除用户"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 演示区域 */}
        <section className="demo-section" aria-labelledby="demo-title">
          <h2 id="demo-title">功能演示</h2>
          <div className="demo-grid">
            <div className="demo-card">
              <h3>响应式设计</h3>
              <p>界面自适应不同屏幕尺寸</p>
              <div className="demo-indicator">
                <span>当前: {isMobile ? '移动端' : '桌面端'}</span>
              </div>
            </div>
            
            <div className="demo-card">
              <h3>主题切换</h3>
              <p>支持浅色和深色主题</p>
              <div className="demo-indicator">
                <span>当前: {isDarkTheme ? '深色' : '浅色'}</span>
              </div>
            </div>
            
            <div className="demo-card">
              <h3>性能优化</h3>
              <p>React.memo 和防抖搜索</p>
              <div className="demo-indicator">
                <span>渲染项目: {visibleItemsCount}</span>
              </div>
            </div>
            
            <div className="demo-card">
              <h3>无障碍功能</h3>
              <p>支持键盘导航和屏幕阅读器</p>
              <div className="demo-indicator">
                <span>ARIA 标签: ✓</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// 防抖函数
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default React.memo(App);
/**
 * Vue 3 演示应用入口文件
 * 用于依赖分析工具测试
 */

// 扩展全局接口
declare global {
  interface Window {
    removeInitialLoading?: () => void;
    gtag?: (...args: any[]) => void;
  }
  
  interface NodeModule {
    hot?: {
      accept(): void;
    };
  }
}

// Vue应用接口定义
interface VueApp {
  mount(selector: string): VueApp;
  use(plugin: any): VueApp;
  config: {
    errorHandler?: (err: Error, instance: any, info: string) => void;
    warnHandler?: (msg: string, vm: any, trace: string) => void;
    performance?: boolean;
    devtools?: boolean;
    globalProperties: Record<string, any>;
  };
  directive(name: string, definition: any): VueApp;
}

interface Router {
  push(path: string): void;
  currentRoute: { value: { path: string } };
}

interface Store {
  state: Record<string, any>;
}

// 模拟Vue 3 API
function createApp(component: any): VueApp {
  const globalProperties: Record<string, any> = {};
  
  return {
    mount(selector: string) {
      console.log(`Vue应用已挂载到 ${selector}`);
      return this;
    },
    use(plugin: any) {
      console.log('注册插件:', plugin);
      return this;
    },
    config: {
      performance: false,
      devtools: false,
      globalProperties
    },
    directive(name: string, definition: any) {
      console.log(`注册指令: ${name}`);
      return this;
    }
  };
}

// 模拟路由
function createRouter(options: any): Router {
  return {
    push(path: string) {
      console.log(`导航到 ${path}`);
    },
    currentRoute: { value: { path: '/' } }
  };
}

// 模拟状态管理
function createPinia(): Store {
  return {
    state: {
      user: null,
      theme: 'light'
    }
  };
}

// 模拟组件
const App = {
  name: 'App',
  template: '<div id="app">Vue 3 演示应用</div>',
  data() {
    return {
      message: 'Hello Vue 3!'
    };
  }
};

// 创建路由实例
const router = createRouter({
  history: 'hash',
  routes: [
    {
      path: '/',
      name: 'Home',
      component: 'HomeComponent'
    },
    {
      path: '/about',
      name: 'About',
      component: 'AboutComponent'
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: 'DashboardComponent'
    }
  ]
});

// 创建状态管理实例
const pinia = createPinia();

// 创建Vue应用实例
const app = createApp(App);

// 注册插件
app.use(router);
app.use(pinia);

// 全局错误处理
app.config.errorHandler = (err: Error, instance: any, info: string) => {
  console.error('Vue应用错误:', err);
  console.error('错误信息:', info);
  
  // 发送错误到监控服务
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'exception', {
      description: err.message,
      fatal: false
    });
  }
};

// 全局警告处理
app.config.warnHandler = (msg: string, vm: any, trace: string) => {
  console.warn('Vue 警告:', msg);
  console.warn('组件追踪:', trace);
};

// 性能监控
app.config.performance = true;

// 全局属性
app.config.globalProperties.$appName = 'Vue 依赖分析演示';
app.config.globalProperties.$version = '2.0.0';
app.config.globalProperties.$log = (message: string) => {
  console.log(`[Vue App]: ${message}`);
};
app.config.globalProperties.$isProduction = process.env.NODE_ENV === 'production';

// 自定义指令
app.directive('focus', {
  mounted(el: HTMLElement) {
    el.focus();
  }
});

// 挂载应用
app.mount('#app');

// 移除初始加载指示器
if (typeof window !== 'undefined' && window.removeInitialLoading) {
  window.removeInitialLoading();
}

// 开发环境热重载支持
if (process.env.NODE_ENV === 'development') {
  // 热模块替换支持
if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.accept();
}
  
  // 开发工具
  app.config.devtools = true;
  
  // 性能提示
  app.config.performance = true;
}

// PWA支持
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW 注册成功:', registration);
      })
      .catch((registrationError) => {
        console.log('SW 注册失败:', registrationError);
      });
  });
}

// 性能监控
if (typeof performance !== 'undefined') {
  performance.mark('vue-app-start');
}

// 导出应用实例
export default app;
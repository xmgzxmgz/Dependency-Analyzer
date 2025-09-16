/**
 * React 18 演示应用入口文件
 * 用于依赖分析工具测试
 */

// 扩展全局接口
declare global {
  interface NodeModule {
    hot?: {
      accept(path?: string, callback?: () => void): void;
    };
  }
}

// 模拟React API
interface ReactElement {
  type: string | Function;
  props: any;
  key?: string | number;
}

interface ReactRoot {
  render(element: ReactElement): void;
}

// 模拟React组件
const React = {
  StrictMode: ({ children }: { children: any }) => children,
  createElement: (type: any, props: any, ...children: any[]): ReactElement => ({
    type,
    props: { ...props, children },
  })
};

// 模拟createRoot
function createRoot(container: Element): ReactRoot {
  return {
    render(element: ReactElement) {
      console.log('React应用已渲染到:', container);
      console.log('渲染元素:', element);
    }
  };
}

// 模拟App组件
const App = () => ({
  type: 'div',
  props: {
    children: 'React 18 演示应用'
  }
});

// 获取根元素
const container = document.getElementById('root');
if (!container) {
  throw new Error('找不到根元素 #root');
}

// 创建React根实例
const root = createRoot(container);

// 渲染应用
root.render(
  React.createElement(React.StrictMode, null,
    React.createElement(App, null)
  )
);

// 性能监控函数
function sendToAnalytics(metric: any) {
  console.log('性能指标:', metric);
  
  // 模拟发送到分析服务
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'web_vitals', {
      event_category: 'performance',
      event_label: metric.name,
      value: Math.round(metric.value)
    });
  }
}

// 模拟性能监控
function mockPerformanceMonitoring() {
  // 模拟CLS (Cumulative Layout Shift)
  setTimeout(() => {
    sendToAnalytics({ name: 'CLS', value: 0.1 });
  }, 1000);
  
  // 模拟FID (First Input Delay)
  setTimeout(() => {
    sendToAnalytics({ name: 'FID', value: 50 });
  }, 2000);
  
  // 模拟FCP (First Contentful Paint)
  setTimeout(() => {
    sendToAnalytics({ name: 'FCP', value: 1200 });
  }, 500);
}

// 启动性能监控
mockPerformanceMonitoring();

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  
  // 发送错误到监控服务
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'exception', {
      description: event.error?.message || 'Unknown error',
      fatal: false
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
  
  // 发送错误到监控服务
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'exception', {
      description: event.reason?.message || 'Unhandled promise rejection',
      fatal: false
    });
  }
});

// 热模块替换支持
if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.accept();
}

// PWA支持
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker注册成功:', registration);
        })
        .catch((error) => {
          console.log('Service Worker注册失败:', error);
        });
    });
  }
}

// 性能标记
if (typeof performance !== 'undefined') {
  performance.mark('react-app-start');
}

// 导出用于测试
export { App, root };
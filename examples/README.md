# 前端框架演示项目

本目录包含三个现代前端框架的演示项目，用于展示依赖分析工具的功能。

## 项目结构

```
examples/
├── angular-demo/     # Angular 演示项目
├── react-demo/       # React 演示项目
├── vue-demo/         # Vue.js 演示项目
└── README.md         # 本文件
```

## 项目特性

每个演示项目都包含以下特性：

### 🚀 现代开发体验
- TypeScript 支持
- 热模块替换 (HMR)
- 代码分割和懒加载
- 源码映射 (Source Maps)

### 🎨 用户界面
- 响应式设计
- 深色主题支持
- 无障碍功能 (a11y)
- 现代 UI 组件

### 🧪 测试覆盖
- 单元测试
- 集成测试
- 端到端测试
- 代码覆盖率报告

### 📦 构建优化
- 代码压缩
- 资源优化
- Bundle 分析
- 性能监控

### 🔧 开发工具
- ESLint 代码检查
- Prettier 代码格式化
- Husky Git 钩子
- 提交规范化

## 快速开始

### Angular 项目

```bash
cd angular-demo
npm install
npm start
```

访问: http://localhost:4200

### React 项目

```bash
cd react-demo
npm install
npm start
```

访问: http://localhost:3000

### Vue.js 项目

```bash
cd vue-demo
npm install
npm run serve
```

访问: http://localhost:8080

## 可用脚本

每个项目都支持以下脚本：

- `npm start` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm test` - 运行测试
- `npm run lint` - 代码检查
- `npm run format` - 代码格式化

## 技术栈

### Angular 项目
- Angular 16+
- TypeScript
- RxJS
- NgRx (状态管理)
- Angular Material
- Jasmine + Karma (测试)

### React 项目
- React 18+
- TypeScript
- Redux Toolkit
- React Router
- React Query
- Jest + Testing Library (测试)

### Vue.js 项目
- Vue 3+
- TypeScript
- Pinia (状态管理)
- Vue Router
- VueUse
- Jest + Vue Test Utils (测试)

## 依赖分析

这些项目专门设计用于演示依赖分析工具的各种功能：

1. **依赖关系图** - 可视化模块间的依赖关系
2. **循环依赖检测** - 识别潜在的循环依赖问题
3. **未使用依赖** - 发现项目中未使用的依赖包
4. **版本冲突** - 检测依赖版本冲突
5. **安全漏洞** - 扫描已知的安全漏洞
6. **Bundle 分析** - 分析打包后的文件大小

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。
# 前端组件库依赖关系可视化与冗余代码分析工具

一个用于分析前端组件库（React、Vue）的依赖关系、生成可视化图表并识别冗余代码的完整解决方案，涵盖命令行工具、可编程接口与可选的 Web 服务。

## ✨ 项目介绍

- 核心功能与价值定位
  - 基于 AST 的静态分析，构建组件级依赖图谱，识别架构问题与冗余代码，产出可视化报告与结构化数据，助力重构与性能优化。
  - 适配 React/Vue 项目，支持大型代码库的高并发解析与渐进式反馈。
- 适用用户与场景
  - 前端架构师：评估依赖健康度、定位循环依赖与枢纽组件。
  - 团队工程师：在迭代中持续审视孤立组件、未使用的 Props。
  - 技术负责人：在评审/重构阶段用报告辅助决策。
- 技术栈与主要依赖
  - 运行环境：Node.js ≥ 16
  - 解析分析：`@babel/parser`、`@babel/traverse`、`@babel/types`、`@vue/compiler-sfc`
  - CLI 与工具：`commander`、`glob`、`fs-extra`、`ora`、`p-limit`
  - 可视化报告：D3.js（浏览器端）
  - Web API（可选）：`express`、`cors`

## 🛠️ 使用指南

### 安装与配置

```bash
# 全局安装（推荐）
npm install -g frontend-dependency-analyzer

# 或在项目中本地安装
npm install frontend-dependency-analyzer --save-dev

# 初始化配置文件（可选）
dep-analyzer init . --format json   # 生成 .dep-analyzer.json
dep-analyzer init . --format js     # 生成 dep-analyzer.config.js
```

建议将输出目录置于 `.gitignore`，避免报告产物入库。

### 命令行使用

```bash
# 基本分析（React）
dep-analyzer analyze ./src -f react -o ./reports/dep-graph.html -j ./reports/graph-data.json

# 基本分析（Vue）
dep-analyzer analyze ./src -f vue -o ./reports/dep-graph.html -j ./reports/graph-data.json

# 排除多类文件（可重复传入模式）
dep-analyzer analyze ./src -f react --exclude "**/*.test.*" "**/__mocks__/**"
```

选项说明：

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--framework <type>` | `-f` | 项目框架类型（`react`/`vue`） | 必填 |
| `--output <path>` | `-o` | HTML 报告输出路径 | `./dep-graph.html` |
| `--json <path>` | `-j` | JSON 数据输出路径 | 不生成 |
| `--exclude <patterns...>` |  | 排除文件/目录的 glob 模式 | 见默认排除 |
| `--config <path>` | `-c` | 指定配置文件（`.json`/`.js`） | 自动发现 |
| `--help` | `-h` | 显示帮助信息 |  |
| `--version` | `-v` | 显示版本号 |  |

默认排除模式（可在配置文件 `exclude` 覆盖）：

- `**/node_modules/**`
- `**/*.test.*`、`**/*.spec.*`
- `**/dist/**`、`**/build/**`

### 可编程 API（Node.js）

```js
// 在 Node.js 中以库方式使用
const DependencyAnalyzer = require('frontend-dependency-analyzer');

async function run() {
  const analyzer = new DependencyAnalyzer({
    projectPath: './src',
    framework: 'react',
    outputPath: './reports/dep-graph.html',
    jsonPath: './reports/graph-data.json',
    excludePatterns: ['**/*.test.*', '**/__mocks__/**']
  });

  const summary = await analyzer.analyze();
  console.log('分析概览:', summary);
}

run().catch(console.error);
```

### Web API（可选服务）

启动服务：

```bash
node web/server.js   # 默认监听 http://localhost:3000
```

主要接口：

- `POST /api/analyze`
  - 请求体：
    ```json
    {
      "projectPath": "examples/react-demo/src",
      "config": {
        "framework": "react",
        "outputPath": "test-output/dependency-graph.html",
        "jsonPath": "test-output/graph-data.json",
        "excludePatterns": ["**/*.test.*"]
      }
    }
    ```
  - 响应示例：
    ```json
    {
      "success": true,
      "result": {
        "totalComponents": 42,
        "totalDependencies": 128,
        "orphanComponents": 3,
        "unusedProps": 7,
        "reportPath": "test-output/dependency-graph.html",
        "jsonPath": "test-output/graph-data.json"
      }
    }
    ```
- `GET /api/projects` 获取内置示例项目列表
- `POST /api/init` 生成默认配置文件（`json`/`js`）
- `GET /api/reports` 列出已生成的报告
- `DELETE /api/reports/:id` 删除指定报告
- `GET /api/system` 获取运行环境信息
- `GET /api/health` 健康检查

### 报告格式

- HTML 可视化报告：交互式 D3 力导图、统计面板、优化建议、显示控制面板。
- JSON 数据：`nodes`、`edges`、`metadata`、`analysis`，便于二次处理与集成。

```json
{
  "nodes": {"/abs/path/ComponentA.tsx": {"inDegree": 2, "outDegree": 1}},
  "edges": [{"source": "A", "target": "B"}],
  "metadata": {"generatedAt": "2025-01-01T00:00:00.000Z", "framework": "react"},
  "analysis": {"summary": {"totalComponents": 42}}
}
```

## 🔍 分析能力

### 依赖关系分析
- 导入/导出与 JSX 组件引用关系
- 依赖深度与广度、图密度、枢纽节点识别

### 冗余检测
- 孤岛组件（入度 0）与潜在死代码
- 未使用的 Props 与接口冗余
- 循环依赖定位与修复建议

### 复杂度画像
- 圈复杂度、连接度、关联性与多维复杂度评分

## 🏗️ 项目结构

```
frontend-dependency-analyzer/
├── bin/cli.js                  # CLI 入口
├── src/index.js                # 主分析器（可编程 API）
├── src/modules/                # 文件扫描/AST/图构建/分析/报告
├── web/server.js               # 可选 Web 服务与 REST API
├── examples/                   # 示例项目与报告
├── tests/                      # 单元/集成/E2E 测试
└── package.json
```

## 🔧 开发与测试

```bash
# 克隆并安装
git clone <repository-url>
cd frontend-dependency-analyzer
npm install

# 本地链接 CLI
npm link

# 运行单测/覆盖率/代码质量
npm test
npm run test:coverage
npm run lint
```

## 🐛 常见问题与故障排除

### 解析错误（Unexpected token）
- 请确认语法配置与 Babel/TypeScript 设置一致；第三方宏/实验语法需要对应插件。

### 内存不足（JavaScript heap out of memory）
```bash
node --max-old-space-size=4096 $(which dep-analyzer) analyze ./src -f react
```

### 路径/导入解析失败
- 统一相对路径与别名设置；必要时在 `exclude` 中剔除生成产物。



## 🗺️ 未来规划

### 短期路线（1–3 个月）
- 自动框架检测与更智能的入口发现
- 报告模板多主题与导出（PNG/PDF）
- CLI 性能优化与缓存命中率提升
- 更丰富的分析维度（状态/异步/数据流）

### 中长期路线（3–12 个月）
- 插件化架构，支持自定义规则与语言扩展
- Angular/Svelte 等框架支持
- IDE 集成与交互式热分析
- 团队协作与趋势看板（历史对比）

欢迎通过 Issue 参与路线讨论与投票优先级。

## 🤝 社区参与与贡献指南

- 代码风格：遵循 `eslint` 规则；保持函数/模块职责单一。
- 测试要求：新增功能需附带单元/集成测试，覆盖核心路径。
- 提交规范：清晰的 Commit 信息与 PR 描述，附可复现实例。
- 安全与隐私：严禁提交任何密钥或敏感配置。

## 📄 许可证

本项目采用 MIT 许可证。可自由使用、修改与分发，但需保留版权声明与许可条款。

## 📞 联系方式与支持

- 问题反馈：在本仓库的 Issues 提交问题/建议
- 邮件支持：maintainers@example.com（请附问题复现步骤）
- 安全反馈：security@example.com（仅处理安全相关）

## 🔗 相关资源与参考

- Babel（解析器）：https://babeljs.io/
- D3.js（可视化）：https://d3js.org/
- Commander.js（CLI）：https://github.com/tj/commander.js/
- Vue SFC 编译器：https://github.com/vuejs/core/tree/main/packages/compiler-sfc

---

让依赖分析与架构优化变得简单高效 🚀
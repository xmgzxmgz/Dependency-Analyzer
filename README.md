# 前端组件库依赖关系可视化与冗余代码分析工具

一个强大的命令行工具，用于分析前端组件库（React、Vue）的依赖关系，生成可视化图表，并识别冗余代码。

## ✨ 特性

- 🔍 **智能代码分析**: 基于AST的静态代码分析，支持JavaScript、TypeScript、JSX、Vue SFC
- 📊 **可视化图表**: 生成交互式D3.js力导向图，直观展示组件依赖关系
- 🎯 **冗余代码检测**: 识别孤岛组件、未使用的Props、循环依赖等问题
- 🚀 **多框架支持**: 支持React和Vue项目
- 📈 **详细报告**: 提供HTML可视化报告和JSON数据导出
- ⚡ **高性能**: 异步处理，支持大型项目

## 🛠️ 安装

```bash
# 全局安装
npm install -g frontend-dependency-analyzer

# 或者本地安装
npm install frontend-dependency-analyzer
```

## 🚀 快速开始

### 基本用法

```bash
# 分析React项目
frontend-dep-analyzer analyze ./src --framework react

# 分析Vue项目
frontend-dep-analyzer analyze ./src --framework vue
```

### 完整命令示例

```bash
frontend-dep-analyzer analyze ./src \
  --framework react \
  --output ./reports/dependency-graph.html \
  --json ./reports/graph-data.json \
  --exclude "**/*.test.*" "**/stories/**"
```

## 📋 命令行选项

### 主命令

```bash
frontend-dep-analyzer analyze <directory>
```

### 选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--framework <type>` | `-f` | 项目框架类型 (react/vue) | **必需** |
| `--output <path>` | `-o` | HTML报告输出路径 | `./dep-graph.html` |
| `--json <path>` | `-j` | JSON数据输出路径 | 无 |
| `--exclude <patterns>` | | 排除文件模式 (可重复) | 见默认排除列表 |
| `--help` | `-h` | 显示帮助信息 | |
| `--version` | `-v` | 显示版本号 | |

### 默认排除模式

- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`
- `**/*.test.*`
- `**/*.spec.*`
- `**/__tests__/**`
- `**/__mocks__/**`

## 📊 分析报告

### HTML可视化报告

生成的HTML报告包含：

1. **交互式依赖图**: D3.js力导向图，支持缩放、拖拽、点击查看详情
2. **统计概览**: 组件总数、依赖关系、问题统计等
3. **优化建议**: 基于分析结果的具体优化建议
4. **控制面板**: 调整图表显示参数

### JSON数据报告

包含完整的图谱数据和分析结果，便于进一步处理：

```json
{
  "graph": {
    "nodes": {...},
    "edges": [...],
    "metadata": {...}
  },
  "analysis": {
    "summary": {...},
    "orphanComponents": [...],
    "unusedProps": [...],
    "circularDependencies": [...],
    "recommendations": [...]
  },
  "metadata": {
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "projectPath": "/path/to/project",
    "framework": "react"
  }
}
```

## 🔍 分析功能

### 1. 依赖关系分析

- 组件间的导入/导出关系
- 组件使用关系（JSX中的组件引用）
- 依赖深度和广度分析

### 2. 冗余代码检测

#### 孤岛组件
- 入度为0的组件（未被其他组件使用）
- 可能的死代码

#### 未使用Props
- 组件声明但未实际使用的Props
- 接口冗余分析

#### 循环依赖
- 检测组件间的循环引用
- 潜在的架构问题

### 3. 复杂度分析

- 组件复杂度评分
- 依赖密度计算
- 枢纽组件识别

## 🏗️ 项目结构

```
frontend-dependency-analyzer/
├── bin/
│   └── cli.js                 # CLI入口
├── src/
│   ├── index.js              # 主分析器
│   ├── modules/
│   │   ├── FileScanner.js    # 文件扫描器
│   │   ├── ASTAnalyzer.js    # AST分析器
│   │   ├── GraphBuilder.js   # 图谱构建器
│   │   ├── AnalysisEngine.js # 分析引擎
│   │   └── VisualizationGenerator.js # 可视化生成器
│   └── utils/
│       └── index.js          # 工具函数
├── package.json
└── README.md
```

## 🔧 开发

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd frontend-dependency-analyzer

# 安装依赖
npm install

# 链接到全局
npm link

# 测试
frontend-dep-analyzer analyze ./test-project --framework react
```

### 运行测试

```bash
npm test
```

### 构建

```bash
npm run build
```

## 📝 使用示例

### React项目分析

```bash
# 基本分析
frontend-dep-analyzer analyze ./src --framework react

# 生成详细报告
frontend-dep-analyzer analyze ./src \
  --framework react \
  --output ./reports/react-deps.html \
  --json ./reports/react-data.json

# 排除测试文件
frontend-dep-analyzer analyze ./src \
  --framework react \
  --exclude "**/*.test.*" "**/*.stories.*"
```

### Vue项目分析

```bash
# 分析Vue项目
frontend-dep-analyzer analyze ./src --framework vue

# 包含TypeScript支持
frontend-dep-analyzer analyze ./src \
  --framework vue \
  --output ./vue-analysis.html
```

## 🎯 最佳实践

### 1. 定期分析

建议在CI/CD流程中集成依赖分析：

```yaml
# .github/workflows/dependency-analysis.yml
name: Dependency Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install -g frontend-dependency-analyzer
      - run: frontend-dep-analyzer analyze ./src --framework react --json ./analysis.json
      - uses: actions/upload-artifact@v2
        with:
          name: dependency-analysis
          path: analysis.json
```

### 2. 优化建议

根据分析结果进行优化：

- **清理孤岛组件**: 删除未使用的组件
- **简化Props接口**: 移除未使用的Props
- **解决循环依赖**: 重构组件架构
- **拆分复杂组件**: 降低组件复杂度

### 3. 监控指标

关注以下关键指标：

- 组件总数变化趋势
- 依赖密度
- 孤岛组件比例
- 平均组件复杂度

## 🐛 故障排除

### 常见问题

#### 1. 解析错误

```
Error: Unexpected token
```

**解决方案**: 确保项目使用标准的JavaScript/TypeScript语法，检查Babel配置。

#### 2. 内存不足

```
JavaScript heap out of memory
```

**解决方案**: 
```bash
# 增加Node.js内存限制
node --max-old-space-size=4096 $(which frontend-dep-analyzer) analyze ./src --framework react
```

#### 3. 文件未找到

```
Error: Cannot resolve import
```

**解决方案**: 检查导入路径是否正确，确保相对路径解析正确。

### 调试模式

```bash
# 启用详细日志
DEBUG=frontend-dep-analyzer:* frontend-dep-analyzer analyze ./src --framework react
```

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Babel](https://babeljs.io/) - JavaScript编译器
- [D3.js](https://d3js.org/) - 数据可视化库
- [Commander.js](https://github.com/tj/commander.js/) - 命令行界面
- [Vue Compiler](https://github.com/vuejs/core/tree/main/packages/compiler-sfc) - Vue单文件组件编译器

## 📞 支持

如有问题或建议，请：

- 创建 [Issue](https://github.com/your-repo/issues)
- 发送邮件至 support@example.com
- 查看 [文档](https://docs.example.com)

---

**让代码分析变得简单高效！** 🚀
const os = require("os");
const path = require("path");
const FileScanner = require("./modules/FileScanner");
const ASTAnalyzer = require("./modules/ASTAnalyzer");
const GraphBuilder = require("./modules/GraphBuilder");
const AnalysisEngine = require("./modules/AnalysisEngine");
const VisualizationGenerator = require("./modules/VisualizationGenerator");
const chalk = require("chalk");
const pLimit = require("p-limit");
const oraPkg = require("ora");
const ora = oraPkg && oraPkg.default ? oraPkg.default : oraPkg;
const { performance } = require("perf_hooks");

/**
 * 依赖关系分析器主类
 * 协调各个模块完成完整的分析流程
 */
class DependencyAnalyzer {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   * @param {string} config.projectPath - 项目根目录路径
   * @param {string} config.framework - 框架类型 (react|vue)
   * @param {string} config.outputPath - HTML输出路径
   * @param {string} config.jsonPath - JSON输出路径（可选）
   * @param {Array} config.excludePatterns - 排除模式数组
   * @param {number} [config.concurrency] - 并发处理文件数，默认为CPU核心数
   */
  constructor(config) {
    this.config = config;
    // 延迟初始化，确保在 analyze 中进行路径归一化与验证
    this.fileScanner = null;
    this.astAnalyzer = null;
    this.graphBuilder = new GraphBuilder();
    this.analysisEngine = new AnalysisEngine();
    this.visualizationGenerator = null;
  }

  /**
   * 执行完整的依赖分析流程
   * @returns {Object} 分析结果统计
   */
  async analyze() {
    console.log(chalk.blue("📁 扫描项目文件..."));

    // 路径归一化，防止路径遍历等安全问题
    const projectPath = path.resolve(this.config.projectPath);
    const outputPath = path.resolve(this.config.outputPath);
    const jsonPath = this.config.jsonPath
      ? path.resolve(this.config.jsonPath)
      : null;

    // 规范化后的配置对象
    const normalizedConfig = {
      ...this.config,
      projectPath,
      outputPath,
      jsonPath,
    };

    // 初始化依赖模块（使用规范化配置）
    if (!this.fileScanner) this.fileScanner = new FileScanner(normalizedConfig);
    if (!this.astAnalyzer) this.astAnalyzer = new ASTAnalyzer(normalizedConfig);
    if (!this.visualizationGenerator)
      this.visualizationGenerator = new VisualizationGenerator(normalizedConfig);

    // 1. 文件发现与过滤
    const files = await this.fileScanner.scanFiles();
    console.log(chalk.gray(`发现 ${files.length} 个源文件`));

    // 2. AST解析与信息提取
    console.log(chalk.blue("🔍 解析源代码..."));
    const startTime = performance.now();
    let processedCount = 0;
    const concurrency = normalizedConfig.concurrency || os.cpus().length;
    const limit = pLimit(concurrency); // 根据配置或CPU核心数限制并发
    const spinner = ora(`解析源代码 (0/${files.length})`).start();

    const analysisPromises = files.map((file) =>
      limit(async () => {
        try {
          const result = await this.astAnalyzer.analyzeFile(file);
          processedCount++;
          // 实时更新进度
          process.stdout.write(
            chalk.gray(`\r已处理 ${processedCount}/${files.length} 个文件`)
          );
          spinner.text = `解析源代码 (${
            analysisPromises.length - limit.pendingCount
          }/${files.length})`;
          return result;
        } catch (error) {
          spinner.warn(chalk.yellow(`解析文件失败: ${file} - ${error.message}`));
          console.warn(
            chalk.yellow(`\n⚠️  解析文件失败: ${file} - ${error.message}`)
          );
          return null;
        }
      })
    );

    const results = await Promise.all(analysisPromises);
    spinner.succeed(chalk.gray(`成功解析 ${results.filter(Boolean).length} 个组件文件`));
    const analysisResults = results.filter(Boolean);

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    process.stdout.write("\n"); // 换行
    console.log(chalk.gray(`成功解析 ${analysisResults.length} 个组件文件`));

    // 3. 构建依赖图谱
    console.log(chalk.blue("🕸️  构建依赖图谱..."));
    const dependencyGraph = this.graphBuilder.buildGraph(analysisResults);

    // 4. 执行分析算法
    console.log(chalk.blue("🔬 执行依赖分析..."));
    const analysisReport = this.analysisEngine.analyze(dependencyGraph);

    // 5. 生成可视化报告
    console.log(chalk.blue("📊 生成可视化报告..."));
    await this.visualizationGenerator.generateReport(
      dependencyGraph,
      analysisReport
    );

    // 返回统计结果
    return {
      totalComponents: dependencyGraph.nodes.size,
      totalDependencies: dependencyGraph.edges.length,
      orphanComponents: analysisReport.orphanComponents.length,
      unusedProps: analysisReport.unusedProps.reduce(
        (total, component) => total + component.unusedProps.length,
        0
      ),
    };
  }
}

module.exports = DependencyAnalyzer;

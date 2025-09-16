const FileScanner = require('./modules/FileScanner');
const ASTAnalyzer = require('./modules/ASTAnalyzer');
const GraphBuilder = require('./modules/GraphBuilder');
const AnalysisEngine = require('./modules/AnalysisEngine');
const VisualizationGenerator = require('./modules/VisualizationGenerator');
const chalk = require('chalk');

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
   */
  constructor(config) {
    this.config = config;
    this.fileScanner = new FileScanner(config);
    this.astAnalyzer = new ASTAnalyzer(config);
    this.graphBuilder = new GraphBuilder();
    this.analysisEngine = new AnalysisEngine();
    this.visualizationGenerator = new VisualizationGenerator(config);
  }

  /**
   * 执行完整的依赖分析流程
   * @returns {Object} 分析结果统计
   */
  async analyze() {
    console.log(chalk.blue('📁 扫描项目文件...'));
    
    // 1. 文件发现与过滤
    const files = await this.fileScanner.scanFiles();
    console.log(chalk.gray(`发现 ${files.length} 个源文件`));
    
    // 2. AST解析与信息提取
    console.log(chalk.blue('🔍 解析源代码...'));
    const analysisResults = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.astAnalyzer.analyzeFile(file);
        if (result) {
          analysisResults.push(result);
        }
        
        // 显示进度
        if ((i + 1) % 10 === 0 || i === files.length - 1) {
          console.log(chalk.gray(`已处理 ${i + 1}/${files.length} 个文件`));
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  解析文件失败: ${file} - ${error.message}`));
      }
    }
    
    console.log(chalk.gray(`成功解析 ${analysisResults.length} 个组件文件`));
    
    // 3. 构建依赖图谱
    console.log(chalk.blue('🕸️  构建依赖图谱...'));
    const dependencyGraph = this.graphBuilder.buildGraph(analysisResults);
    
    // 4. 执行分析算法
    console.log(chalk.blue('🔬 执行依赖分析...'));
    const analysisReport = this.analysisEngine.analyze(dependencyGraph);
    
    // 5. 生成可视化报告
    console.log(chalk.blue('📊 生成可视化报告...'));
    await this.visualizationGenerator.generateReport(dependencyGraph, analysisReport);
    
    // 返回统计结果
    return {
      totalComponents: dependencyGraph.nodes.size,
      totalDependencies: dependencyGraph.edges.length,
      orphanComponents: analysisReport.orphanComponents.length,
      unusedProps: analysisReport.unusedProps.reduce((total, component) => 
        total + component.unusedProps.length, 0
      )
    };
  }
}

module.exports = DependencyAnalyzer;
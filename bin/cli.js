#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs-extra");
const DependencyAnalyzer = require("../src/index");
const ConfigManager = require("../src/modules/ConfigManager");

const program = new Command();

/**
 * CLI程序入口
 * 配置命令行参数和选项，处理用户输入验证
 */
program
  .name("dep-analyzer")
  .description("前端组件库依赖关系可视化与冗余代码分析工具")
  .version("1.0.0");

/**
 * 主分析命令
 * @param {string} directory - 待分析的项目根目录
 * @param {Object} options - 命令行选项
 */
program
  .command("analyze <directory>")
  .description("分析指定目录的前端组件依赖关系")
  .requiredOption("-f, --framework <type>", "指定项目框架 (react|vue)")
  .option("-o, --output <path>", "指定HTML报告输出路径", "./dep-graph.html")
  .option("-j, --json <path>", "将原始图谱数据保存为JSON格式")
  .option("--exclude <patterns...>", "排除特定文件或目录的glob模式")
  .option("-c, --config <path>", "指定配置文件路径（.json 或 .js）")
  .action(async (directory, options) => {
    try {
      // 输入验证
      await validateInputs(directory, options);

      console.log(chalk.blue("🔍 开始分析项目依赖关系..."));
      console.log(chalk.gray(`目录: ${path.resolve(directory)}`));
      console.log(chalk.gray(`框架: ${options.framework}`));

      // 创建分析器实例
      const analyzer = new DependencyAnalyzer({
        projectPath: path.resolve(directory),
        framework: options.framework,
        outputPath: options.output,
        jsonPath: options.json,
        excludePatterns: options.exclude || [],
        configPath: options.config || null,
      });

      // 执行分析
      const result = await analyzer.analyze();

      // 输出结果
      console.log(chalk.green("✅ 分析完成!"));
      console.log(chalk.yellow(`📊 发现组件: ${result.totalComponents}`));
      console.log(chalk.yellow(`🔗 依赖关系: ${result.totalDependencies}`));
      console.log(chalk.red(`🏝️  孤岛组件: ${result.orphanComponents}`));
      console.log(chalk.red(`❌ 未使用Props: ${result.unusedProps}`));
      console.log(chalk.blue(`📄 HTML报告: ${path.resolve(options.output)}`));

      if (options.json) {
        console.log(chalk.blue(`📋 JSON数据: ${path.resolve(options.json)}`));
      }
    } catch (error) {
      console.error(chalk.red("❌ 分析失败:"), error.message);
      process.exit(1);
    }
  });

/**
 * 初始化配置文件命令
 */
program
  .command("init [directory]")
  .description("在指定目录初始化配置文件")
  .option("-f, --format <type>", "配置文件格式 (json|js)", "json")
  .action(async (directory = ".", options) => {
    try {
      const targetDir = path.resolve(directory);
      await fs.ensureDir(targetDir);

      const manager = new ConfigManager();
      const defaultCfg = manager.getDefaultConfig();

      let targetPath;
      if (options.format === "js") {
        targetPath = path.join(targetDir, "dep-analyzer.config.js");
        const jsContent = `module.exports = ${JSON.stringify(
          defaultCfg,
          null,
          2
        )};\n`;
        if (await fs.pathExists(targetPath)) {
          console.log(chalk.yellow(`⚠️ 配置文件已存在: ${targetPath}`));
        } else {
          await fs.writeFile(targetPath, jsContent, "utf-8");
          console.log(chalk.green(`✅ 已创建配置文件: ${targetPath}`));
        }
      } else {
        targetPath = path.join(targetDir, ".dep-analyzer.json");
        if (await fs.pathExists(targetPath)) {
          console.log(chalk.yellow(`⚠️ 配置文件已存在: ${targetPath}`));
        } else {
          await fs.writeJson(targetPath, defaultCfg, { spaces: 2 });
          console.log(chalk.green(`✅ 已创建配置文件: ${targetPath}`));
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ 初始化配置失败:"), error.message);
      process.exit(1);
    }
  });

/**
 * 验证用户输入参数
 * @param {string} directory - 目录路径
 * @param {Object} options - 选项对象
 */
async function validateInputs(directory, options) {
  // 验证目录存在
  const resolvedPath = path.resolve(directory);
  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(`目录不存在: ${resolvedPath}`);
  }

  // 验证是否为目录
  const stat = await fs.stat(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error(`路径不是目录: ${resolvedPath}`);
  }

  // 验证框架类型
  const validFrameworks = ["react", "vue"];
  if (!validFrameworks.includes(options.framework)) {
    throw new Error(
      `不支持的框架类型: ${
        options.framework
      }。支持的框架: ${validFrameworks.join(", ")}`
    );
  }

  // 验证输出目录是否可写
  const outputDir = path.dirname(path.resolve(options.output));
  try {
    await fs.ensureDir(outputDir);
  } catch (error) {
    throw new Error(`无法创建输出目录: ${outputDir}`);
  }

  // 如果指定了JSON输出，验证JSON输出目录
  if (options.json) {
    const jsonDir = path.dirname(path.resolve(options.json));
    try {
      await fs.ensureDir(jsonDir);
    } catch (error) {
      throw new Error(`无法创建JSON输出目录: ${jsonDir}`);
    }
  }
}

// 全局错误处理
process.on("uncaughtException", (error) => {
  console.error(chalk.red("💥 未捕获的异常:"), error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(chalk.red("💥 未处理的Promise拒绝:"), reason);
  process.exit(1);
});

program.parse();
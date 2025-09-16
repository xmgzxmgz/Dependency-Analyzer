const { describe, it, beforeEach, afterEach } = require("mocha");
const { expect } = require("chai");
const fs = require("fs-extra");
const path = require("path");
const DependencyAnalyzer = require("../../src/index");
const PerformanceMonitor = require("../../src/modules/PerformanceMonitor");

describe("性能基准测试", () => {
  let testProjectDir;
  let outputDir;
  let performanceMonitor;

  beforeEach(async () => {
    testProjectDir = path.join(__dirname, "../fixtures/perf-test-project");
    outputDir = path.join(__dirname, "../fixtures/perf-output");

    await fs.ensureDir(testProjectDir);
    await fs.ensureDir(outputDir);

    performanceMonitor = new PerformanceMonitor();
  });

  afterEach(async () => {
    await fs.remove(testProjectDir);
    await fs.remove(outputDir);
    performanceMonitor.cleanup();
  });

  async function createLargeProject(componentCount = 100) {
    console.log(`创建包含 ${componentCount} 个组件的测试项目...`);

    const components = [];

    for (let i = 0; i < componentCount; i++) {
      const componentName = `Component${i}`;
      const dependencies = [];

      // 随机添加依赖关系
      const depCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < depCount && j < i; j++) {
        const depIndex = Math.floor(Math.random() * i);
        dependencies.push(`Component${depIndex}`);
      }

      const componentCode = `
import React from 'react';
${dependencies.map((dep) => `import ${dep} from './${dep}';`).join("\n")}

const ${componentName} = ({ 
  title, 
  data, 
  config, 
  unused1, 
  unused2 
}) => {
  return (
    <div className="${componentName.toLowerCase()}">
      <h2>{title}</h2>
      <div>{data}</div>
      ${dependencies.map((dep) => `<${dep} />`).join("\n      ")}
    </div>
  );
};

export default ${componentName};
      `;

      components.push({
        name: componentName,
        code: componentCode,
      });
    }

    // 写入组件文件
    for (const component of components) {
      await fs.writeFile(
        path.join(testProjectDir, `${component.name}.jsx`),
        component.code
      );
    }

    // 创建入口文件
    const indexCode = `
import React from 'react';
${components
  .slice(0, 10)
  .map((c) => `import ${c.name} from './${c.name}';`)
  .join("\n")}

const App = () => {
  return (
    <div>
      ${components
        .slice(0, 10)
        .map((c) => `<${c.name} title="Test" data="Sample" />`)
        .join("\n      ")}
    </div>
  );
};

export default App;
    `;

    await fs.writeFile(path.join(testProjectDir, "index.js"), indexCode);

    // 创建package.json
    const packageJson = {
      name: "perf-test-project",
      version: "1.0.0",
      dependencies: {
        react: "^18.0.0",
      },
    };
    await fs.writeJson(path.join(testProjectDir, "package.json"), packageJson);

    console.log(`测试项目创建完成，包含 ${componentCount} 个组件`);
  }

  describe("小型项目性能 (10个组件)", () => {
    it("应该在1秒内完成分析", async function () {
      this.timeout(10000);

      await createLargeProject(10);

      performanceMonitor.startTimer("small-project-analysis");
      performanceMonitor.startSystemMonitoring(1000);

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "small-project.html"),
        excludePatterns: [],
      });

      const result = await analyzer.analyze();

      const timing = performanceMonitor.endTimer("small-project-analysis");
      performanceMonitor.stopSystemMonitoring();

      expect(timing.duration).to.be.below(1000); // 1秒
      expect(result.totalComponents).to.equal(10);

      const report = performanceMonitor.getPerformanceReport();
      console.log(`小型项目分析耗时: ${timing.duration.toFixed(2)}ms`);
      console.log(
        `内存使用: ${(report.memory.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
    });
  });

  describe("中型项目性能 (50个组件)", () => {
    it("应该在5秒内完成分析", async function () {
      this.timeout(30000);

      await createLargeProject(50);

      performanceMonitor.startTimer("medium-project-analysis");
      performanceMonitor.startSystemMonitoring(1000);

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "medium-project.html"),
        excludePatterns: [],
      });

      const result = await analyzer.analyze();

      const timing = performanceMonitor.endTimer("medium-project-analysis");
      performanceMonitor.stopSystemMonitoring();

      expect(timing.duration).to.be.below(5000); // 5秒
      expect(result.totalComponents).to.equal(50);

      const report = performanceMonitor.getPerformanceReport();
      console.log(`中型项目分析耗时: ${timing.duration.toFixed(2)}ms`);
      console.log(
        `内存使用: ${(report.memory.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );
    });
  });

  describe("大型项目性能 (100个组件)", () => {
    it("应该在10秒内完成分析", async function () {
      this.timeout(60000);

      await createLargeProject(100);

      performanceMonitor.startTimer("large-project-analysis");
      performanceMonitor.startSystemMonitoring(1000);

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "large-project.html"),
        excludePatterns: [],
      });

      const result = await analyzer.analyze();

      const timing = performanceMonitor.endTimer("large-project-analysis");
      performanceMonitor.stopSystemMonitoring();

      expect(timing.duration).to.be.below(10000); // 10秒
      expect(result.totalComponents).to.equal(100);

      const report = performanceMonitor.getPerformanceReport();
      console.log(`大型项目分析耗时: ${timing.duration.toFixed(2)}ms`);
      console.log(
        `内存使用: ${(report.memory.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`
      );

      // 验证内存使用不超过500MB
      expect(report.memory.delta.heapUsed).to.be.below(500 * 1024 * 1024);
    });
  });

  describe("内存使用测试", () => {
    it("应该有效管理内存使用", async function () {
      this.timeout(30000);

      await createLargeProject(50);

      const initialMemory = process.memoryUsage();
      performanceMonitor.startSystemMonitoring(500);

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "memory-test.html"),
        excludePatterns: [],
      });

      await analyzer.analyze();

      performanceMonitor.stopSystemMonitoring();

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // 内存增长应该在合理范围内（小于100MB）
      expect(memoryIncrease).to.be.below(100 * 1024 * 1024);
    });
  });

  describe("并发处理性能", () => {
    it("应该支持并发文件处理", async function () {
      this.timeout(30000);

      await createLargeProject(30);

      // 串行处理
      performanceMonitor.startTimer("serial-processing");
      const serialAnalyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "serial.html"),
        excludePatterns: [],
      });
      await serialAnalyzer.analyze();
      const serialTiming = performanceMonitor.endTimer("serial-processing");

      // 并行处理（如果支持）
      performanceMonitor.startTimer("parallel-processing");
      const parallelAnalyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "parallel.html"),
        excludePatterns: [],
      });
      await parallelAnalyzer.analyze();
      const parallelTiming = performanceMonitor.endTimer("parallel-processing");

      console.log(`串行处理耗时: ${serialTiming.duration.toFixed(2)}ms`);
      console.log(`并行处理耗时: ${parallelTiming.duration.toFixed(2)}ms`);

      // 并行处理应该不会显著慢于串行处理
      expect(parallelTiming.duration).to.be.below(serialTiming.duration * 1.5);
    });
  });

  describe("缓存性能测试", () => {
    it("缓存应该显著提升重复分析性能", async function () {
      this.timeout(30000);

      await createLargeProject(30);

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "cache-test.html"),
        excludePatterns: [],
      });

      // 第一次分析（无缓存）
      performanceMonitor.startTimer("first-analysis");
      await analyzer.analyze();
      const firstTiming = performanceMonitor.endTimer("first-analysis");

      // 第二次分析（有缓存）
      performanceMonitor.startTimer("cached-analysis");
      await analyzer.analyze();
      const cachedTiming = performanceMonitor.endTimer("cached-analysis");

      console.log(`首次分析耗时: ${firstTiming.duration.toFixed(2)}ms`);
      console.log(`缓存分析耗时: ${cachedTiming.duration.toFixed(2)}ms`);

      // 缓存分析应该显著快于首次分析
      expect(cachedTiming.duration).to.be.below(firstTiming.duration * 0.5);
    });
  });

  describe("输出文件大小测试", () => {
    it("输出文件大小应该在合理范围内", async function () {
      this.timeout(30000);

      await createLargeProject(50);

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "size-test.html"),
        jsonPath: path.join(outputDir, "size-test.json"),
        excludePatterns: [],
      });

      await analyzer.analyze();

      const htmlStats = await fs.stat(path.join(outputDir, "size-test.html"));
      const jsonStats = await fs.stat(path.join(outputDir, "size-test.json"));

      console.log(`HTML文件大小: ${(htmlStats.size / 1024).toFixed(2)}KB`);
      console.log(`JSON文件大小: ${(jsonStats.size / 1024).toFixed(2)}KB`);

      // HTML文件应该小于5MB
      expect(htmlStats.size).to.be.below(5 * 1024 * 1024);

      // JSON文件应该小于1MB
      expect(jsonStats.size).to.be.below(1 * 1024 * 1024);
    });
  });

  describe("压力测试", () => {
    it("应该处理深层嵌套的依赖关系", async function () {
      this.timeout(60000);

      // 创建深层嵌套的组件链
      const depth = 20;
      for (let i = 0; i < depth; i++) {
        const componentName = `DeepComponent${i}`;
        const nextComponent = i < depth - 1 ? `DeepComponent${i + 1}` : null;

        const componentCode = `
import React from 'react';
${nextComponent ? `import ${nextComponent} from './${nextComponent}';` : ""}

const ${componentName} = ({ data, unused1, unused2, unused3 }) => {
  return (
    <div>
      <h3>Level ${i}: {data}</h3>
      ${nextComponent ? `<${nextComponent} data={data} />` : ""}
    </div>
  );
};

export default ${componentName};
        `;

        await fs.writeFile(
          path.join(testProjectDir, `${componentName}.jsx`),
          componentCode
        );
      }

      // 创建入口文件
      const indexCode = `
import React from 'react';
import DeepComponent0 from './DeepComponent0';

const App = () => {
  return <DeepComponent0 data="Deep nesting test" />;
};

export default App;
      `;

      await fs.writeFile(path.join(testProjectDir, "index.js"), indexCode);

      performanceMonitor.startTimer("deep-nesting-analysis");

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "deep-nesting.html"),
        excludePatterns: [],
      });

      const result = await analyzer.analyze();

      const timing = performanceMonitor.endTimer("deep-nesting-analysis");

      expect(result.totalComponents).to.equal(depth);
      expect(timing.duration).to.be.below(15000); // 15秒

      console.log(`深层嵌套分析耗时: ${timing.duration.toFixed(2)}ms`);
    });
  });
});

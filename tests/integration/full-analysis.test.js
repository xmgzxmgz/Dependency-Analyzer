const { describe, it, beforeEach, afterEach } = require("mocha");
const { expect } = require("chai");
const fs = require("fs-extra");
const path = require("path");
const DependencyAnalyzer = require("../../src/index");

describe("完整分析流程集成测试", () => {
  let testProjectDir;
  let outputDir;

  beforeEach(async () => {
    testProjectDir = path.join(__dirname, "../fixtures/test-project");
    outputDir = path.join(__dirname, "../fixtures/output");

    await fs.ensureDir(testProjectDir);
    await fs.ensureDir(outputDir);

    // 创建测试项目结构
    await createTestProject();
  });

  afterEach(async () => {
    await fs.remove(testProjectDir);
    await fs.remove(outputDir);
  });

  async function createTestProject() {
    // 创建React组件（基础依赖 + 孤岛 + 循环）
    const componentA = `
import React from 'react';
import ComponentB from './ComponentB';

const ComponentA = ({ title, unused }) => {
  return (
    <div>
      <h1>{title}</h1>
      <ComponentB />
    </div>
  );
};

export default ComponentA;
    `;

    const componentB = `
import React from 'react';
import ComponentC from './ComponentC';

const ComponentB = () => {
  return (
    <div>
      <ComponentC />
    </div>
  );
};

export default ComponentB;
    `;

    const componentC = `
import React from 'react';

const ComponentC = ({ data }) => {
  return <div>{data}</div>;
};

export default ComponentC;
    `;

    // 孤岛组件
    const orphanComponent = `
import React from 'react';

const OrphanComponent = () => {
  return <div>I am alone</div>;
};

export default OrphanComponent;
    `;

    // 循环依赖组件
    const circularA = `
import React from 'react';
import CircularB from './CircularB';

const CircularA = () => {
  return <CircularB />;
};

export default CircularA;
    `;

    const circularB = `
import React from 'react';
import CircularA from './CircularA';

const CircularB = () => {
  return <CircularA />;
};

export default CircularB;
    `;

    // 入口文件
    const indexFile = `
import React from 'react';
import ComponentA from './ComponentA';

const App = () => {
  return <ComponentA title="Hello World" />;
};

export default App;
    `;

    // 写入文件
    await fs.writeFile(path.join(testProjectDir, "ComponentA.jsx"), componentA);
    await fs.writeFile(path.join(testProjectDir, "ComponentB.jsx"), componentB);
    await fs.writeFile(path.join(testProjectDir, "ComponentC.jsx"), componentC);
    await fs.writeFile(
      path.join(testProjectDir, "OrphanComponent.jsx"),
      orphanComponent
    );
    await fs.writeFile(path.join(testProjectDir, "CircularA.jsx"), circularA);
    await fs.writeFile(path.join(testProjectDir, "CircularB.jsx"), circularB);
    await fs.writeFile(path.join(testProjectDir, "index.js"), indexFile);

    // 动态导入与 Suspense
    const lazyComp = `
import React from 'react';

export default function LazyComp(){
  return <div>Lazy Loaded</div>;
}
`;
    const dynamicLoader = `
import React, { Suspense } from 'react';
const LazyComp = React.lazy(() => import('./LazyComp'));

export default function DynamicLoader(){
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComp />
    </Suspense>
  );
}
`;

    // CommonJS require 示例
    const commonjsUtil = `
module.exports = function util(x){
  return x * 2;
}
`;
    const requireUser = `
const util = require('./utils/commonjsUtil');
export default function RequireUser(){
  return util(21);
}
`;

    // re-export 示例
    const utilEsModule = `
export const Util = (x) => x + 1;
`;
    const reexportIndex = `
export { Util } from '../utils/Util.js';
`;

    // TS 路径别名示例（@components/*）
    const tsconfig = {
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@components/*": ["components/*"],
        },
      },
    };
    const aliasComp = `
import React from 'react';
export default function AliasComp(){
  return <span>Alias</span>;
}
`;
    const aliasEntry = `
import React from 'react';
import AliasComp from '@components/AliasComp';
export default function AliasEntry(){
  return <AliasComp />;
}
`;

    // 写入扩展文件结构
    await fs.writeFile(path.join(testProjectDir, "LazyComp.jsx"), lazyComp);
    await fs.writeFile(
      path.join(testProjectDir, "DynamicLoader.jsx"),
      dynamicLoader
    );
    await fs.ensureDir(path.join(testProjectDir, "utils"));
    await fs.writeFile(
      path.join(testProjectDir, "utils", "commonjsUtil.js"),
      commonjsUtil
    );
    await fs.writeFile(
      path.join(testProjectDir, "RequireUser.js"),
      requireUser
    );
    await fs.writeFile(
      path.join(testProjectDir, "utils", "Util.js"),
      utilEsModule
    );
    await fs.ensureDir(path.join(testProjectDir, "reexports"));
    await fs.writeFile(
      path.join(testProjectDir, "reexports", "index.js"),
      reexportIndex
    );
    await fs.writeJson(path.join(testProjectDir, "tsconfig.json"), tsconfig);
    await fs.ensureDir(path.join(testProjectDir, "components"));
    await fs.writeFile(
      path.join(testProjectDir, "components", "AliasComp.tsx"),
      aliasComp
    );
    await fs.writeFile(path.join(testProjectDir, "AliasEntry.tsx"), aliasEntry);

    // 创建package.json
    const packageJson = {
      name: "test-project",
      version: "1.0.0",
      dependencies: {
        react: "^18.0.0",
        vue: "^3.4.0",
      },
    };
    await fs.writeJson(path.join(testProjectDir, "package.json"), packageJson);
  }

  describe("React项目分析", () => {
    it("应该成功分析React项目", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "react-analysis.html"),
        jsonPath: path.join(outputDir, "react-data.json"),
        excludePatterns: [],
      });

      const result = await analyzer.analyze();

      // 验证基本统计
      expect(result).to.have.property("totalComponents");
      expect(result).to.have.property("totalDependencies");
      expect(result).to.have.property("orphanComponents");
      expect(result).to.have.property("unusedProps");

      expect(result.totalComponents).to.be.above(0);
      expect(result.orphanComponents).to.be.above(0); // 应该检测到孤岛组件
      expect(result.unusedProps).to.be.above(0); // 应该检测到未使用的props

      // 验证输出文件
      expect(await fs.pathExists(path.join(outputDir, "react-analysis.html")))
        .to.be.true;
      expect(await fs.pathExists(path.join(outputDir, "react-data.json"))).to.be
        .true;

      // 验证JSON数据结构
      const jsonData = await fs.readJson(
        path.join(outputDir, "react-data.json")
      );
      expect(jsonData).to.have.property("nodes");
      expect(jsonData).to.have.property("edges");
      expect(jsonData).to.have.property("metadata");
      expect(jsonData).to.have.property("analysis");
    });

    it("应该检测到循环依赖", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "circular-analysis.html"),
        excludePatterns: [],
      });

      const result = await analyzer.analyze();
      const jsonData = await fs.readJson(
        path.join(outputDir, "circular-analysis.html").replace(".html", ".json")
      );

      // 应该检测到CircularA和CircularB之间的循环依赖
      expect(jsonData.analysis.circularDependencies).to.be.an("array");
      expect(jsonData.analysis.circularDependencies.length).to.be.above(0);
    });

    it("应该检测到孤岛组件", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "orphan-analysis.html"),
        excludePatterns: [],
      });

      const result = await analyzer.analyze();

      // OrphanComponent应该被检测为孤岛组件
      expect(result.orphanComponents).to.be.above(0);
    });

    it("应该检测到未使用的Props", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "props-analysis.html"),
        excludePatterns: [],
      });

      const result = await analyzer.analyze();

      // ComponentA中的unused prop应该被检测到
      expect(result.unusedProps).to.be.above(0);
    });

    it("应该分析动态导入与require以及re-export与路径别名", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "advanced-react.html"),
        jsonPath: path.join(outputDir, "advanced-react.json"),
        excludePatterns: [],
      });

      await analyzer.analyze();
      const jsonData = await fs.readJson(
        path.join(outputDir, "advanced-react.json")
      );

      // 节点应包含动态加载组件与别名组件
      const nodeKeys = Object.keys(jsonData.nodes || {});
      expect(nodeKeys.some((k) => k.endsWith("LazyComp.jsx"))).to.be.true;
      expect(nodeKeys.some((k) => k.endsWith("components/AliasComp.tsx"))).to.be
        .true;
      expect(nodeKeys.some((k) => k.endsWith("utils/commonjsUtil.js"))).to.be
        .true;
      // re-export 来源文件也应参与图谱
      expect(nodeKeys.some((k) => k.endsWith("reexports/index.js"))).to.be.true;

      // 边应包含到 LazyComp 的依赖（动态导入）
      const edges = jsonData.edges || [];
      expect(
        edges.some(
          (e) =>
            typeof e.target === "string" && e.target.endsWith("LazyComp.jsx")
        )
      ).to.be.true;
    });
  });

  describe("Vue项目分析", () => {
    it("应该成功分析Vue项目并生成报告", async () => {
      // 创建简单的 Vue 结构
      const vueDir = path.join(testProjectDir, "vue");
      await fs.ensureDir(vueDir);
      const appVue = `<template><div><Child /></div></template>
<script setup>
import Child from './components/Child.vue';
</script>`;
      const childVue = `<template><span>Child</span></template>`;
      const orphanVue = `<template><div>Orphan Vue</div></template>`;

      await fs.ensureDir(path.join(vueDir, "components"));
      await fs.writeFile(path.join(vueDir, "App.vue"), appVue);
      await fs.writeFile(
        path.join(vueDir, "components", "Child.vue"),
        childVue
      );
      await fs.writeFile(path.join(vueDir, "Orphan.vue"), orphanVue);

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "vue",
        outputPath: path.join(outputDir, "vue-analysis.html"),
        jsonPath: path.join(outputDir, "vue-data.json"),
        excludePatterns: [],
      });

      const report = await analyzer.analyze();
      expect(report.totalComponents).to.be.above(0);
      expect(await fs.pathExists(path.join(outputDir, "vue-analysis.html"))).to
        .be.true;
      expect(await fs.pathExists(path.join(outputDir, "vue-data.json"))).to.be
        .true;
    });
  });

  describe("排除模式", () => {
    it("应该正确排除指定文件", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "exclude-analysis.html"),
        excludePatterns: ["**/Orphan*"],
      });

      const result = await analyzer.analyze();
      const jsonData = await fs.readJson(
        path.join(outputDir, "exclude-analysis.html").replace(".html", ".json")
      );

      // OrphanComponent应该被排除
      const nodeIds = Object.keys(jsonData.nodes);
      const hasOrphanComponent = nodeIds.some((id) => id.includes("Orphan"));
      expect(hasOrphanComponent).to.be.false;
    });
  });

  describe("错误处理", () => {
    it("应该处理不存在的目录", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: "/nonexistent/path",
        framework: "react",
        outputPath: path.join(outputDir, "error-analysis.html"),
        excludePatterns: [],
      });

      try {
        await analyzer.analyze();
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it("应该处理无效的框架类型", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "invalid",
        outputPath: path.join(outputDir, "invalid-analysis.html"),
        excludePatterns: [],
      });

      try {
        await analyzer.analyze();
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });

  describe("性能测试", () => {
    it("应该在合理时间内完成分析", async () => {
      const startTime = Date.now();

      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "performance-analysis.html"),
        excludePatterns: [],
      });

      await analyzer.analyze();

      const duration = Date.now() - startTime;

      // 小项目应该在5秒内完成
      expect(duration).to.be.below(5000);
    });
  });

  describe("输出验证", () => {
    it("HTML报告应该包含必要元素", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "html-validation.html"),
        excludePatterns: [],
      });

      await analyzer.analyze();

      const htmlContent = await fs.readFile(
        path.join(outputDir, "html-validation.html"),
        "utf8"
      );

      // 验证HTML结构
      expect(htmlContent).to.include("<html");
      expect(htmlContent).to.include("<head>");
      expect(htmlContent).to.include("<body>");
      expect(htmlContent).to.include("依赖关系图谱");
      expect(htmlContent).to.include("d3.js"); // 应该包含D3.js
    });

    it("JSON数据应该有正确的结构", async () => {
      const analyzer = new DependencyAnalyzer({
        projectPath: testProjectDir,
        framework: "react",
        outputPath: path.join(outputDir, "json-validation.html"),
        jsonPath: path.join(outputDir, "json-validation.json"),
        excludePatterns: [],
      });

      await analyzer.analyze();

      const jsonData = await fs.readJson(
        path.join(outputDir, "json-validation.json")
      );

      // 验证JSON结构
      expect(jsonData).to.have.property("nodes");
      expect(jsonData).to.have.property("edges");
      expect(jsonData).to.have.property("metadata");
      expect(jsonData).to.have.property("analysis");

      expect(jsonData.nodes).to.be.an("object");
      expect(jsonData.edges).to.be.an("array");
      expect(jsonData.metadata).to.be.an("object");
      expect(jsonData.analysis).to.be.an("object");

      // 验证分析结果结构
      expect(jsonData.analysis).to.have.property("summary");
      expect(jsonData.analysis).to.have.property("orphanComponents");
      expect(jsonData.analysis).to.have.property("unusedProps");
      expect(jsonData.analysis).to.have.property("circularDependencies");
    });
  });
});

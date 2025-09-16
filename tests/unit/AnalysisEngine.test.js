const { expect } = require("chai");
const sinon = require("sinon");
const fs = require("fs");
const path = require("path");
const AnalysisEngine = require("../../src/modules/AnalysisEngine");

describe("AnalysisEngine 单元测试", function () {
  let analysisEngine;
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    analysisEngine = new AnalysisEngine({
      projectPath: "/test/project",
      outputPath: "/test/output",
      excludePatterns: ["node_modules", "*.test.js"],
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe("构造函数", function () {
    it("应该正确初始化分析结果", function () {
      expect(analysisEngine.analysisResults).to.be.an("object");
      expect(Object.keys(analysisEngine.analysisResults)).to.have.length(0);
    });

    it("应该创建新实例", function () {
      const engine = new AnalysisEngine();
      expect(engine).to.be.instanceOf(AnalysisEngine);
      expect(engine.analysisResults).to.be.an("object");
    });
  });

  describe("findOrphanComponents 方法", function () {
    it("应该找到孤立组件", function () {
      const nodes = new Map();
      nodes.set("/test/Component1.js", {
        name: "Component1",
        inDegree: 0,
        outDegree: 0,
      });
      nodes.set("/test/Component2.js", {
        name: "Component2",
        inDegree: 1,
        outDegree: 0,
      });

      const orphans = analysisEngine.findOrphanComponents(nodes);

      expect(orphans).to.have.length(1);
      expect(orphans[0].id).to.equal("/test/Component1.js");
      expect(orphans[0].name).to.equal("Component1");
    });
  });

  describe("findUnusedProps 方法", function () {
    it("应该找到未使用的属性", function () {
      const nodes = new Map();

      const mockNode = {
        name: "Component",
        propsDeclared: new Set(["prop1", "prop2", "prop3"]),
        propsUsedInBody: new Set(["prop1", "prop2"]),
        getUnusedProps() {
          const unused = [];
          for (const prop of this.propsDeclared) {
            if (!this.propsUsedInBody.has(prop)) {
              unused.push(prop);
            }
          }
          return unused;
        },
      };

      nodes.set("/test/Component.js", mockNode);

      const unusedProps = analysisEngine.findUnusedProps(nodes);

      expect(unusedProps).to.have.length(1);
      expect(unusedProps[0].unusedProps).to.include("prop3");
      expect(unusedProps[0].name).to.equal("Component");
    });
  });

  describe("findCircularDependencies 方法", function () {
    it("应该检测循环依赖", function () {
      const nodes = new Map();

      nodes.set("/test/A.js", {
        name: "A",
        dependencies: new Map([["/test/B.js", {}]]),
      });
      nodes.set("/test/B.js", {
        name: "B",
        dependencies: new Map([["/test/C.js", {}]]),
      });
      nodes.set("/test/C.js", {
        name: "C",
        dependencies: new Map([["/test/A.js", {}]]),
      });

      const edges = [
        { from: "/test/A.js", to: "/test/B.js" },
        { from: "/test/B.js", to: "/test/C.js" },
        { from: "/test/C.js", to: "/test/A.js" },
      ];

      const cycles = analysisEngine.findCircularDependencies(nodes, edges);

      expect(cycles).to.have.length.greaterThan(0);
      expect(cycles[0].cycle).to.include("/test/A.js");
    });
  });

  describe("analyze 方法", function () {
    it("应该生成完整的分析报告", function () {
      const dependencyGraph = {
        nodes: new Map(),
        edges: [],
        metadata: {
          nodeCount: 2,
          edgeCount: 1,
          density: 0.5,
        },
      };

      const report = analysisEngine.analyze(dependencyGraph);

      expect(report).to.have.property("summary");
      expect(report).to.have.property("orphanComponents");
      expect(report).to.have.property("unusedProps");
      expect(report).to.have.property("circularDependencies");
      expect(report).to.have.property("recommendations");
    });
  });

  describe("错误处理", function () {
    it("应该处理无效的依赖图谱", function () {
      expect(() => {
        analysisEngine.analyze(null);
      }).to.throw();
    });

    it("应该处理缺少节点的依赖图谱", function () {
      const invalidGraph = {
        edges: [],
        metadata: { nodeCount: 0, edgeCount: 0, density: 0 },
      };

      expect(() => {
        analysisEngine.analyze(invalidGraph);
      }).to.throw();
    });
  });
});

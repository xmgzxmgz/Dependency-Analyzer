const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const AnalysisEngine = require('../../src/modules/AnalysisEngine');

describe('AnalysisEngine 单元测试', function() {
  let analysisEngine;
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    analysisEngine = new AnalysisEngine({
      projectPath: '/test/project',
      outputPath: '/test/output',
      excludePatterns: ['node_modules', '*.test.js']
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('构造函数', function() {
    it('应该正确初始化配置', function() {
      expect(analysisEngine.config.projectPath).to.equal('/test/project');
      expect(analysisEngine.config.outputPath).to.equal('/test/output');
      expect(analysisEngine.config.excludePatterns).to.deep.equal(['node_modules', '*.test.js']);
    });

    it('应该使用默认配置', function() {
      const engine = new AnalysisEngine();
      expect(engine.config.projectPath).to.equal(process.cwd());
      expect(engine.config.outputPath).to.equal('./analysis-output');
    });
  });

  describe('analyze 方法', function() {
    beforeEach(function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'mkdirSync');
      sandbox.stub(fs, 'writeFileSync');
      sandbox.stub(analysisEngine, 'scanFiles').returns([
        '/test/project/src/Component1.js',
        '/test/project/src/Component2.js'
      ]);
      sandbox.stub(analysisEngine, 'analyzeFile').returns({
        dependencies: ['react', 'lodash'],
        exports: ['Component1'],
        imports: ['react']
      });
      sandbox.stub(analysisEngine, 'generateReport').returns({
        summary: { totalFiles: 2, totalDependencies: 2 }
      });
    });

    it('应该成功执行完整分析流程', async function() {
      const result = await analysisEngine.analyze();
      
      expect(result).to.have.property('summary');
      expect(result.summary.totalFiles).to.equal(2);
      expect(analysisEngine.scanFiles.calledOnce).to.be.true;
      expect(analysisEngine.generateReport.calledOnce).to.be.true;
    });

    it('应该处理项目路径不存在的情况', async function() {
      fs.existsSync.returns(false);
      
      try {
        await analysisEngine.analyze();
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error.message).to.include('项目路径不存在');
      }
    });
  });

  describe('scanFiles 方法', function() {
    beforeEach(function() {
      sandbox.stub(fs, 'readdirSync').returns(['file1.js', 'file2.jsx', 'file3.ts']);
      sandbox.stub(fs, 'statSync').returns({ isDirectory: () => false });
    });

    it('应该扫描指定扩展名的文件', function() {
      const files = analysisEngine.scanFiles('/test/path');
      
      expect(files).to.be.an('array');
      expect(fs.readdirSync.calledWith('/test/path')).to.be.true;
    });

    it('应该排除匹配模式的文件', function() {
      analysisEngine.config.excludePatterns = ['*.test.js'];
      fs.readdirSync.returns(['component.js', 'component.test.js']);
      
      const files = analysisEngine.scanFiles('/test/path');
      
      expect(files).to.not.include(path.join('/test/path', 'component.test.js'));
    });
  });

  describe('analyzeFile 方法', function() {
    const mockFileContent = `
      import React from 'react';
      import { useState } from 'react';
      import lodash from 'lodash';
      
      export default function Component() {
        return <div>Test</div>;
      }
    `;

    beforeEach(function() {
      sandbox.stub(fs, 'readFileSync').returns(mockFileContent);
    });

    it('应该正确解析文件依赖', function() {
      const result = analysisEngine.analyzeFile('/test/Component.js');
      
      expect(result).to.have.property('dependencies');
      expect(result).to.have.property('exports');
      expect(result).to.have.property('imports');
      expect(result.dependencies).to.include('react');
      expect(result.dependencies).to.include('lodash');
    });

    it('应该处理文件读取错误', function() {
      fs.readFileSync.throws(new Error('文件不存在'));
      
      const result = analysisEngine.analyzeFile('/test/nonexistent.js');
      
      expect(result.dependencies).to.be.empty;
      expect(result.exports).to.be.empty;
    });
  });

  describe('findOrphanComponents 方法', function() {
    it('应该找到孤立组件', function() {
      const analysisData = {
        files: {
          '/test/Component1.js': { exports: ['Component1'], usedBy: [] },
          '/test/Component2.js': { exports: ['Component2'], usedBy: ['/test/App.js'] }
        }
      };

      const orphans = analysisEngine.findOrphanComponents(analysisData);
      
      expect(orphans).to.have.length(1);
      expect(orphans[0]).to.include('Component1.js');
    });
  });

  describe('findUnusedProps 方法', function() {
    it('应该找到未使用的属性', function() {
      const analysisData = {
        files: {
          '/test/Component.js': {
            props: ['prop1', 'prop2', 'prop3'],
            usedProps: ['prop1', 'prop2']
          }
        }
      };

      const unusedProps = analysisEngine.findUnusedProps(analysisData);
      
      expect(unusedProps).to.have.length(1);
      expect(unusedProps[0].unusedProps).to.include('prop3');
    });
  });

  describe('findCircularDependencies 方法', function() {
    it('应该检测循环依赖', function() {
      const analysisData = {
        files: {
          '/test/A.js': { dependencies: ['/test/B.js'] },
          '/test/B.js': { dependencies: ['/test/C.js'] },
          '/test/C.js': { dependencies: ['/test/A.js'] }
        }
      };

      const circular = analysisEngine.findCircularDependencies(analysisData);
      
      expect(circular).to.have.length.greaterThan(0);
    });
  });

  describe('generateReport 方法', function() {
    it('应该生成完整的分析报告', function() {
      const analysisData = {
        files: {
          '/test/Component1.js': { dependencies: ['react'], exports: ['Component1'] },
          '/test/Component2.js': { dependencies: ['lodash'], exports: ['Component2'] }
        }
      };

      const report = analysisEngine.generateReport(analysisData);
      
      expect(report).to.have.property('summary');
      expect(report).to.have.property('orphanComponents');
      expect(report).to.have.property('unusedProps');
      expect(report).to.have.property('circularDependencies');
      expect(report.summary.totalFiles).to.equal(2);
    });
  });

  describe('错误处理', function() {
    it('应该处理无效的项目路径', function() {
      expect(() => {
        new AnalysisEngine({ projectPath: null });
      }).to.throw();
    });

    it('应该处理文件系统错误', async function() {
      sandbox.stub(fs, 'existsSync').throws(new Error('文件系统错误'));
      
      try {
        await analysisEngine.analyze();
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error.message).to.include('文件系统错误');
      }
    });
  });
});
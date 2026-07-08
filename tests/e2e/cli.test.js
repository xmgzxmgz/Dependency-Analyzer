const { expect } = require('chai');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('CLI 端到端测试', function() {
  let tempDir;
  let testProjectDir;

  beforeEach(function() {
    // 创建临时测试目录
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'dependency-analyzer-test-')
    );
    testProjectDir = path.join(tempDir, 'test-project');
    fs.mkdirSync(testProjectDir, { recursive: true });

    // 创建测试项目结构
    createTestProject(testProjectDir);
  });

  afterEach(function() {
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createTestProject(projectDir) {
    // 创建 package.json
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        lodash: '^4.17.21'
      }
    };
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // 创建源码目录
    const srcDir = path.join(projectDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // 创建测试组件
    const component1 = `
import React from 'react';
import { useState } from 'react';
import _ from 'lodash';

export default function Component1({ title, description, unused }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}
`;

    const component2 = `
import React from 'react';
import Component1 from './Component1';

export default function Component2() {
  return (
    <div>
      <Component1 title="测试标题" description="测试描述" />
    </div>
  );
}
`;

    const orphanComponent = `
import React from 'react';

export default function OrphanComponent() {
  return <div>我是孤立组件</div>;
}
`;

    fs.writeFileSync(path.join(srcDir, 'Component1.js'), component1);
    fs.writeFileSync(path.join(srcDir, 'Component2.js'), component2);
    fs.writeFileSync(path.join(srcDir, 'OrphanComponent.js'), orphanComponent);
  }

  function runCLI(args, options = {}) {
    const cliPath = path.resolve('./bin/cli.js');
    const command = `node ${cliPath} ${args}`;

    try {
      const result = execSync(command, {
        cwd: options.cwd || process.cwd(),
        encoding: 'utf8',
        timeout: 30000,
        ...options
      });
      return { success: true, output: result, error: null };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      };
    }
  }

  describe('基本CLI功能', function() {
    it('应该显示帮助信息', function() {
      const result = runCLI('--help');

      expect(result.success).to.equal(true);
      expect(result.output).to.include('Usage:');
      expect(result.output).to.include('Options:');
      expect(result.output).to.include('analyze');
      expect(result.output).to.include('init');
    });

    it('应该显示版本信息', function() {
      const result = runCLI('--version');

      expect(result.success).to.equal(true);
      expect(result.output).to.match(/\d+\.\d+\.\d+/);
    });

    it('应该处理无效参数', function() {
      const result = runCLI('--invalid-option');

      expect(result.success).to.equal(false);
      expect(result.error).to.include('unknown option');
    });
  });

  describe('项目分析功能', function() {
    it('应该成功分析测试项目', function() {
      this.timeout(30000);

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}"`
      );

      expect(result.success).to.equal(true);
      expect(result.output).to.include('分析完成');

      // 检查输出文件是否生成
      expect(fs.existsSync(path.join(outputDir, 'graph-data.json'))).to.equal(
        true
      );
    });

    it('应该检测孤立组件', function() {
      this.timeout(30000);

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}"`
      );

      expect(result.success).to.equal(true);

      const reportPath = path.join(outputDir, 'graph-data.json');
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

      // 验证存在孤岛组件
      const orphanCount =
        report.analysis && report.analysis.orphanComponents
          ? report.analysis.orphanComponents.length
          : 0;
      expect(orphanCount).to.be.greaterThan(0);
    });

    it('应该检测未使用的属性', function() {
      this.timeout(30000);

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}"`
      );

      expect(result.success).to.equal(true);

      const reportPath = path.join(outputDir, 'graph-data.json');
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

      const unusedPropsCount =
        report.analysis && report.analysis.unusedProps
          ? report.analysis.unusedProps.reduce(
            (sum, c) =>
              sum +
                (Array.isArray(c.unusedProps) ? c.unusedProps.length : 0),
            0
          )
          : 0;
      expect(unusedPropsCount).to.be.greaterThan(0);
    });

    it('应该处理不存在的项目路径', function() {
      const result = runCLI('analyze "/nonexistent/path" -f react');

      expect(result.success).to.equal(false);
      expect(result.output + result.error).to.include('目录不存在');
    });
  });

  describe('输出格式选项', function() {
    it('应该支持JSON格式输出', function() {
      this.timeout(30000);

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}"`
      );

      expect(result.success).to.equal(true);

      const reportPath = path.join(outputDir, 'graph-data.json');
      expect(fs.existsSync(reportPath)).to.equal(true);

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      expect(report).to.have.property('nodes');
      expect(report).to.have.property('edges');
      expect(report).to.have.property('metadata');
      expect(report).to.have.property('analysis');
    });

    it('应该支持HTML格式输出', function() {
      this.timeout(30000);

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const htmlPath = path.join(outputDir, 'dep-graph.html');
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${htmlPath}"`
      );

      expect(result.success).to.equal(true);

      expect(fs.existsSync(htmlPath)).to.equal(true);

      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      expect(htmlContent).to.include('<html');
      expect(htmlContent).to.include('依赖');
    });
  });

  describe('排除模式功能', function() {
    it('应该支持排除特定文件模式', function() {
      this.timeout(30000);

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}" --exclude "**/*Orphan*"`
      );

      expect(result.success).to.equal(true);

      const reportPath = path.join(outputDir, 'graph-data.json');
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

      // 孤立组件应该被排除，所以不应该出现在报告中
      const nodeIds = Object.keys(report.nodes || {});
      const hasOrphanComponent = nodeIds.some((id) =>
        id.includes('OrphanComponent')
      );
      expect(hasOrphanComponent).to.equal(false);
    });

    it('应该支持多个排除模式', function() {
      this.timeout(30000);

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}" --exclude "**/*Orphan*" "**/*Component2*"`
      );

      expect(result.success).to.equal(true);

      const reportPath = path.join(outputDir, 'graph-data.json');
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

      const totalFiles = report.metadata ? report.metadata.nodeCount : 0;
      expect(totalFiles).to.be.lessThan(3);
    });
  });

  describe('配置文件支持', function() {
    it('应该支持从配置文件读取选项', function() {
      this.timeout(30000);

      const configPath = path.join(testProjectDir, 'src', '.dep-analyzer.json');
      const config = {
        exclude: ['**/*Orphan*']
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const outputDir = path.join(tempDir, 'config-output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}"`
      );

      expect(result.success).to.equal(true);
      expect(fs.existsSync(path.join(outputDir, 'graph-data.json'))).to.equal(
        true
      );
    });
  });

  describe('错误处理', function() {
    it('应该处理损坏的JavaScript文件', function() {
      this.timeout(30000);

      // 创建一个语法错误的文件
      const brokenFile = path.join(testProjectDir, 'src', 'Broken.js');
      fs.writeFileSync(brokenFile, 'import React from react; // 语法错误');

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}"`
      );

      // 应该继续执行，损坏的文件会被跳过但分析仍完成
      expect(result.success).to.equal(true);
    });
  });

  describe('性能测试', function() {
    it('应该在合理时间内完成小项目分析', function() {
      this.timeout(10000);

      const startTime = Date.now();
      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}"`
      );
      const endTime = Date.now();

      expect(result.success).to.equal(true);
      expect(endTime - startTime).to.be.lessThan(8000); // 8秒内完成
    });

    it('应该处理大量文件而不崩溃', function() {
      this.timeout(60000);

      // 创建大量测试文件
      const srcDir = path.join(testProjectDir, 'src');
      for (let i = 0; i < 50; i++) {
        const content = `
import React from 'react';
export default function Component${i}() {
  return <div>Component ${i}</div>;
}
`;
        fs.writeFileSync(path.join(srcDir, `Component${i}.js`), content);
      }

      const outputDir = path.join(tempDir, 'output');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = runCLI(
        `analyze "${path.join(testProjectDir, 'src')}" -f react -o "${path.join(outputDir, 'dep-graph.html')}" -j "${path.join(outputDir, 'graph-data.json')}"`
      );

      expect(result.success).to.equal(true);

      const reportPath = path.join(outputDir, 'graph-data.json');
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const totalFiles = report.metadata ? report.metadata.nodeCount : 0;
      expect(totalFiles).to.be.greaterThan(50);
    });
  });
});

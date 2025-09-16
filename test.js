#!/usr/bin/env node

/**
 * 测试脚本
 * 用于验证前端依赖分析工具的功能
 */

const path = require('path');
const fs = require('fs-extra');
const DependencyAnalyzer = require('./src/index');

async function runTest() {
  console.log('🚀 开始测试前端依赖分析工具...');
  
  try {
    // 测试配置
    const testConfig = {
      projectPath: path.join(__dirname, 'examples/react-demo/src'),
      framework: 'react',
      outputPath: path.join(__dirname, 'test-output/dependency-graph.html'),
      jsonPath: path.join(__dirname, 'test-output/graph-data.json'),
      excludePatterns: [
        '**/node_modules/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    };
    
    // 确保输出目录存在
    await fs.ensureDir(path.dirname(testConfig.outputPath));
    
    console.log('📁 项目路径:', testConfig.projectPath);
    console.log('🔧 框架类型:', testConfig.framework);
    console.log('📄 输出路径:', testConfig.outputPath);
    
    // 创建分析器实例
    const analyzer = new DependencyAnalyzer(testConfig);
    
    // 执行分析
    console.log('\n🔍 开始分析...');
    const startTime = Date.now();
    
    const result = await analyzer.analyze();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n✅ 分析完成!');
    console.log(`⏱️  耗时: ${duration}ms`);
    
    // 输出分析结果摘要
    console.log('\n📊 分析结果摘要:');
    if (result && result.summary) {
      console.log(`   组件总数: ${result.summary.totalComponents}`);
      console.log(`   依赖关系: ${result.summary.totalDependencies}`);
      console.log(`   孤岛组件: ${result.summary.orphanCount}`);
      console.log(`   未使用Props: ${result.summary.unusedPropsCount}`);
      console.log(`   循环依赖: ${result.summary.circularDependenciesCount}`);
      console.log(`   图密度: ${(result.summary.density * 100).toFixed(2)}%`);
    } else {
      console.log('   结果数据格式异常');
      console.log('   实际结果:', JSON.stringify(result, null, 2));
    }
    
    // 检查输出文件
    const htmlExists = await fs.pathExists(testConfig.outputPath);
    const jsonExists = await fs.pathExists(testConfig.jsonPath);
    
    console.log('\n📁 输出文件:');
    console.log(`   HTML报告: ${htmlExists ? '✅' : '❌'} ${testConfig.outputPath}`);
    console.log(`   JSON数据: ${jsonExists ? '✅' : '❌'} ${testConfig.jsonPath}`);
    
    // 显示优化建议
    if (result.recommendations && result.recommendations.length > 0) {
      console.log('\n🎯 优化建议:');
      result.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`      ${rec.description}`);
      });
    }
    
    // 显示孤岛组件
    if (result.orphanComponents && result.orphanComponents.length > 0) {
      console.log('\n🏝️  孤岛组件:');
      result.orphanComponents.forEach(component => {
        console.log(`   - ${component.name} (${component.relativePath})`);
      });
    }
    
    // 显示未使用Props
    if (result.unusedProps && result.unusedProps.length > 0) {
      console.log('\n🔧 未使用Props:');
      result.unusedProps.slice(0, 5).forEach(item => {
        console.log(`   - ${item.component}: ${item.props.join(', ')}`);
      });
    }
    
    console.log('\n🎉 测试完成!');
    console.log(`\n💡 提示: 打开 ${testConfig.outputPath} 查看可视化报告`);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTest();
}

module.exports = runTest;
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

/**
 * 工具类集合
 * 提供文件处理、路径解析、配置验证等实用功能
 */
class Utils {
  /**
   * 验证项目目录是否存在
   * @param {string} projectPath - 项目路径
   * @returns {boolean} 是否存在
   */
  static async validateProjectPath(projectPath) {
    try {
      const stats = await fs.stat(projectPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * 规范化文件路径
   * @param {string} filePath - 文件路径
   * @returns {string} 规范化后的路径
   */
  static normalizePath(filePath) {
    return path.resolve(filePath).replace(/\\/g, '/');
  }

  /**
   * 获取相对路径
   * @param {string} from - 起始路径
   * @param {string} to - 目标路径
   * @returns {string} 相对路径
   */
  static getRelativePath(from, to) {
    return path.relative(from, to).replace(/\\/g, '/');
  }

  /**
   * 检查文件是否为支持的类型
   * @param {string} filePath - 文件路径
   * @param {string} framework - 框架类型
   * @returns {boolean} 是否支持
   */
  static isSupportedFile(filePath, framework) {
    const ext = path.extname(filePath).toLowerCase();
    
    const supportedExtensions = {
      react: ['.js', '.jsx', '.ts', '.tsx'],
      vue: ['.vue', '.js', '.ts']
    };
    
    return supportedExtensions[framework]?.includes(ext) || false;
  }

  /**
   * 解析导入路径
   * @param {string} importPath - 导入路径
   * @param {string} currentFile - 当前文件路径
   * @param {string} projectRoot - 项目根路径
   * @returns {string|null} 解析后的绝对路径
   */
  static resolveImportPath(importPath, currentFile, projectRoot) {
    // 跳过node_modules导入
    if (!importPath.startsWith('.')) {
      return null;
    }
    
    const currentDir = path.dirname(currentFile);
    let resolvedPath = path.resolve(currentDir, importPath);
    
    // 尝试添加常见扩展名
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
    
    // 如果路径已经有扩展名，直接检查
    if (path.extname(resolvedPath)) {
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    }
    
    // 尝试添加扩展名
    for (const ext of extensions) {
      const pathWithExt = resolvedPath + ext;
      if (fs.existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }
    
    // 尝试index文件
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }

  /**
   * 提取组件名称
   * @param {string} filePath - 文件路径
   * @returns {string} 组件名称
   */
  static extractComponentName(filePath) {
    const basename = path.basename(filePath, path.extname(filePath));
    
    // 如果是index文件，使用父目录名
    if (basename.toLowerCase() === 'index') {
      return path.basename(path.dirname(filePath));
    }
    
    return basename;
  }

  /**
   * 生成唯一ID
   * @param {string} prefix - 前缀
   * @returns {string} 唯一ID
   */
  static generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 深度合并对象
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   * @returns {Object} 合并后的对象
   */
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 计算代码复杂度评分
   * @param {Object} componentInfo - 组件信息
   * @returns {number} 复杂度评分 (0-100)
   */
  static calculateComplexityScore(componentInfo) {
    let score = 0;
    
    // 基于依赖数量
    const dependencyCount = Object.keys(componentInfo.dependencies || {}).length;
    score += Math.min(dependencyCount * 5, 30);
    
    // 基于Props数量
    const propsCount = (componentInfo.propsDeclared || []).length;
    score += Math.min(propsCount * 3, 20);
    
    // 基于未使用Props比例
    const unusedPropsRatio = componentInfo.getUnusedProps ? 
      componentInfo.getUnusedProps().length / Math.max(propsCount, 1) : 0;
    score += unusedPropsRatio * 25;
    
    // 基于文件大小（如果有）
    if (componentInfo.fileSize) {
      const sizeScore = Math.min(componentInfo.fileSize / 1000, 25);
      score += sizeScore;
    }
    
    return Math.min(Math.round(score), 100);
  }

  /**
   * 验证配置对象
   * @param {Object} config - 配置对象
   * @returns {Object} 验证结果
   */
  static validateConfig(config) {
    const errors = [];
    const warnings = [];
    
    // 必需字段验证
    if (!config.projectPath) {
      errors.push('项目路径不能为空');
    }
    
    if (!config.framework || !['react', 'vue'].includes(config.framework)) {
      errors.push('框架类型必须是 react 或 vue');
    }
    
    if (!config.outputPath) {
      errors.push('输出路径不能为空');
    }
    
    // 路径验证
    if (config.outputPath && !path.isAbsolute(config.outputPath)) {
      warnings.push('建议使用绝对路径作为输出路径');
    }
    
    // 排除模式验证
    if (config.excludePatterns && !Array.isArray(config.excludePatterns)) {
      errors.push('排除模式必须是数组');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 创建默认配置
   * @param {Object} overrides - 覆盖配置
   * @returns {Object} 默认配置
   */
  static createDefaultConfig(overrides = {}) {
    const defaultConfig = {
      framework: 'react',
      outputPath: './dep-graph.html',
      jsonPath: null,
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        '**/__mocks__/**'
      ],
      maxFileSize: 1024 * 1024, // 1MB
      enableCache: true,
      verbose: false
    };
    
    return this.deepMerge(defaultConfig, overrides);
  }

  /**
   * 记录性能指标
   * @param {string} operation - 操作名称
   * @param {Function} fn - 要执行的函数
   * @returns {Promise<any>} 函数执行结果
   */
  static async measurePerformance(operation, fn) {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await fn();
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      console.log(`[性能] ${operation}: ${duration.toFixed(2)}ms, 内存变化: ${this.formatFileSize(memoryDelta)}`);
      
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      console.error(`[性能] ${operation} 失败: ${duration.toFixed(2)}ms`);
      throw error;
    }
  }

  /**
   * 创建进度条
   * @param {number} total - 总数
   * @param {string} label - 标签
   * @returns {Object} 进度条对象
   */
  static createProgressBar(total, label = '处理中') {
    let current = 0;
    
    return {
      update(increment = 1) {
        current += increment;
        const percentage = Math.round((current / total) * 100);
        const filled = Math.round(percentage / 2);
        const empty = 50 - filled;
        
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        const info = `${label}: [${bar}] ${percentage}% (${current}/${total})`;
        
        process.stdout.write(`\r${info}`);
        
        if (current >= total) {
          process.stdout.write('\n');
        }
      },
      
      finish() {
        current = total;
        this.update(0);
      }
    };
  }

  /**
   * 安全的JSON解析
   * @param {string} jsonString - JSON字符串
   * @param {any} defaultValue - 默认值
   * @returns {any} 解析结果
   */
  static safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间
   * @returns {Function} 防抖后的函数
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} limit - 限制时间
   * @returns {Function} 节流后的函数
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

module.exports = Utils;
const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

/**
 * 文件系统扫描器
 * 负责发现项目中的相关源文件并应用过滤规则
 */
class FileScanner {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   * @param {string} config.projectPath - 项目根目录
   * @param {string} config.framework - 框架类型
   * @param {Array} config.excludePatterns - 排除模式
   */
  constructor(config) {
    this.projectPath = config.projectPath;
    this.framework = config.framework;
    this.excludePatterns = config.excludePatterns || [];
    
    // 根据框架定义文件扩展名
    this.fileExtensions = this.getFileExtensions();
    
    // 默认排除模式
    this.defaultExcludes = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts'
    ];
  }

  /**
   * 根据框架类型获取文件扩展名
   * @returns {Array} 文件扩展名数组
   */
  getFileExtensions() {
    switch (this.framework) {
      case 'react':
        return ['.js', '.jsx', '.ts', '.tsx'];
      case 'vue':
        return ['.vue', '.js', '.ts'];
      default:
        throw new Error(`不支持的框架: ${this.framework}`);
    }
  }

  /**
   * 扫描项目文件
   * @returns {Array} 文件路径数组
   */
  async scanFiles() {
    const patterns = this.buildGlobPatterns();
    const excludePatterns = [...this.defaultExcludes, ...this.excludePatterns];
    
    const files = [];
    
    for (const pattern of patterns) {
      const matchedFiles = await glob(pattern, {
        cwd: this.projectPath,
        absolute: true,
        ignore: excludePatterns,
        nodir: true
      });
      
      files.push(...matchedFiles);
    }
    
    // 去重并排序
    const uniqueFiles = [...new Set(files)];
    uniqueFiles.sort();
    
    // 过滤掉不存在的文件
    const existingFiles = [];
    for (const file of uniqueFiles) {
      if (await fs.pathExists(file)) {
        existingFiles.push(file);
      }
    }
    
    return existingFiles;
  }

  /**
   * 构建glob模式
   * @returns {Array} glob模式数组
   */
  buildGlobPatterns() {
    const patterns = [];
    
    for (const ext of this.fileExtensions) {
      patterns.push(`**/*${ext}`);
    }
    
    return patterns;
  }

  /**
   * 检查文件是否应该被分析
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否应该分析
   */
  shouldAnalyzeFile(filePath) {
    const ext = path.extname(filePath);
    return this.fileExtensions.includes(ext);
  }

  /**
   * 获取文件的相对路径
   * @param {string} filePath - 绝对文件路径
   * @returns {string} 相对路径
   */
  getRelativePath(filePath) {
    return path.relative(this.projectPath, filePath);
  }

  /**
   * 解析导入路径为绝对路径
   * @param {string} importPath - 导入路径
   * @param {string} currentFile - 当前文件路径
   * @returns {string|null} 解析后的绝对路径，如果无法解析则返回null
   */
  resolveImportPath(importPath, currentFile) {
    // 跳过node_modules中的包
    if (!importPath.startsWith('.')) {
      return null;
    }
    
    const currentDir = path.dirname(currentFile);
    let resolvedPath = path.resolve(currentDir, importPath);
    
    // 尝试添加文件扩展名
    for (const ext of this.fileExtensions) {
      const pathWithExt = resolvedPath + ext;
      if (fs.existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }
    
    // 尝试index文件
    for (const ext of this.fileExtensions) {
      const indexPath = path.join(resolvedPath, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    // 如果已经有扩展名，直接检查
    if (path.extname(resolvedPath) && fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
    
    return null;
  }

  /**
   * 检查路径是否在项目范围内
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否在项目范围内
   */
  isInProjectScope(filePath) {
    const relativePath = path.relative(this.projectPath, filePath);
    return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  }
}

module.exports = FileScanner;
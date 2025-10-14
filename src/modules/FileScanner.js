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
    this.tsConfig = this.loadTSConfig();
    this.aliasResolver = this.buildAliasResolver();
    
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
    // 优先处理 TS 路径别名（如 @/、~、自定义别名）
    const aliasResolved = this.resolveAliasImport(importPath);
    if (aliasResolved) {
      const resolvedWithFs = this.tryResolveWithExtensions(aliasResolved);
      if (resolvedWithFs) return resolvedWithFs;
    }

    // 跳过第三方包（node_modules）
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }
    
    const currentDir = path.dirname(currentFile);
    let resolvedPath = path.resolve(currentDir, importPath);
    
    // 尝试添加文件扩展名
    const withExt = this.tryResolveWithExtensions(resolvedPath);
    if (withExt) return withExt;
    
    // 尝试index文件
    const asIndex = this.tryResolveIndexFile(resolvedPath);
    if (asIndex) return asIndex;
    
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

  /**
   * 读取 tsconfig.json（如存在）
   */
  loadTSConfig() {
    const tsConfigPath = path.join(this.projectPath, 'tsconfig.json');
    try {
      if (fs.existsSync(tsConfigPath)) {
        return fs.readJsonSync(tsConfigPath);
      }
    } catch (e) {
      // 忽略读取错误
    }
    return null;
  }

  /**
   * 构建别名解析器
   */
  buildAliasResolver() {
    const resolver = [];
    const cfg = this.tsConfig?.compilerOptions || {};
    const baseUrl = cfg.baseUrl ? path.resolve(this.projectPath, cfg.baseUrl) : this.projectPath;
    const paths = cfg.paths || {};

    for (const [alias, targets] of Object.entries(paths)) {
      // alias e.g. "@/*" or "@/components/*"
      const hasWildcard = alias.includes('*');
      const aliasPrefix = hasWildcard ? alias.split('*')[0] : alias;
      const targetList = Array.isArray(targets) ? targets : [targets];
      for (const target of targetList) {
        const targetHasWildcard = String(target).includes('*');
        const targetPrefix = targetHasWildcard ? String(target).split('*')[0] : String(target);
        const absoluteTargetPrefix = path.resolve(baseUrl, targetPrefix);
        resolver.push({ aliasPrefix, hasWildcard, absoluteTargetPrefix });
      }
    }
    return resolver;
  }

  /**
   * 解析别名导入到绝对路径（不含扩展名）
   */
  resolveAliasImport(importPath) {
    for (const rule of this.aliasResolver) {
      if (importPath.startsWith(rule.aliasPrefix)) {
        const suffix = importPath.slice(rule.aliasPrefix.length);
        const candidate = path.join(rule.absoluteTargetPrefix, suffix);
        return candidate;
      }
    }
    return null;
  }

  /**
   * 尝试为给定路径添加扩展名进行解析
   */
  tryResolveWithExtensions(resolvedPath) {
    // 如果已经包含扩展名
    if (path.extname(resolvedPath)) {
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    }
    for (const ext of this.fileExtensions) {
      const pathWithExt = resolvedPath + ext;
      if (fs.existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }
    return null;
  }

  /**
   * 尝试解析为目录下的 index 文件
   */
  tryResolveIndexFile(resolvedPath) {
    for (const ext of this.fileExtensions) {
      const indexPath = path.join(resolvedPath, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    return null;
  }
}

module.exports = FileScanner;
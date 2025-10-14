const fs = require("fs-extra");
const path = require("path");

/**
 * 缓存管理器
 * 负责读取和写入分析结果缓存，以加速重复分析
 */
class CacheManager {
  constructor(config) {
    this.cachePath = path.join(config.projectPath, ".dep-analyzer-cache.json");
    this.cache = this.loadCache();
  }

  /**
   * 加载缓存文件
   * @returns {Object} 缓存数据
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        return fs.readJsonSync(this.cachePath);
      }
    } catch (error) {
      console.warn(`⚠️  加载缓存失败: ${error.message}`);
    }
    return { files: {} };
  }

  /**
   * 保存缓存
   */
  saveCache() {
    try {
      fs.writeJsonSync(this.cachePath, this.cache, { spaces: 2 });
    } catch (error) {
      console.warn(`⚠️  保存缓存失败: ${error.message}`);
    }
  }

  /**
   * 获取文件的缓存结果
   * @param {string} filePath - 文件路径
   * @returns {Object|null} 缓存的分析结果，如果无效则返回null
   */
  get(filePath) {
    const fileCache = this.cache.files[filePath];
    if (!fileCache) return null;

    const stat = fs.statSync(filePath);
    // 如果文件修改时间未变，则缓存有效
    if (stat.mtime.getTime() === fileCache.mtime) {
      return fileCache.result;
    }

    return null;
  }

  /**
   * 设置文件的缓存结果
   * @param {string} filePath - 文件路径
   * @param {Object} result - 分析结果
   */
  set(filePath, result) {
    const stat = fs.statSync(filePath);
    this.cache.files[filePath] = {
      mtime: stat.mtime.getTime(),
      result,
    };
  }
}

module.exports = CacheManager;

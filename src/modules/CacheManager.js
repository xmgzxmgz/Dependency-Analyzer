const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

/**
 * 缓存管理器
 * 支持文件系统缓存和内存缓存，提高分析性能
 */
class CacheManager {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      ttl: config.ttl || 3600000, // 1小时
      directory: config.directory || ".dep-analyzer-cache",
      maxMemoryItems: config.maxMemoryItems || 1000,
      ...config,
    };

    this.memoryCache = new Map();
    this.cacheDir = null;
    this.initialized = false;
  }

  /**
   * 初始化缓存系统
   * @param {string} projectPath - 项目根目录
   */
  async initialize(projectPath) {
    if (!this.config.enabled || this.initialized) {
      return;
    }

    this.cacheDir = path.join(projectPath, this.config.directory);
    await fs.ensureDir(this.cacheDir);

    // 清理过期缓存
    await this.cleanExpiredCache();

    this.initialized = true;
  }

  /**
   * 生成缓存键
   * @param {string} key - 原始键
   * @param {Object} data - 相关数据（用于生成哈希）
   * @returns {string} 缓存键
   */
  generateCacheKey(key, data = {}) {
    const hash = crypto.createHash("md5");
    hash.update(key);
    hash.update(JSON.stringify(data));
    return hash.digest("hex");
  }

  /**
   * 获取文件修改时间
   * @param {string} filePath - 文件路径
   * @returns {number} 修改时间戳
   */
  async getFileModTime(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime.getTime();
    } catch (error) {
      return 0;
    }
  }

  /**
   * 检查缓存是否有效
   * @param {Object} cacheData - 缓存数据
   * @param {string} filePath - 源文件路径
   * @returns {boolean} 是否有效
   */
  async isCacheValid(cacheData, filePath) {
    if (!cacheData || !cacheData.timestamp) {
      return false;
    }

    // 检查TTL
    const now = Date.now();
    if (now - cacheData.timestamp > this.config.ttl) {
      return false;
    }

    // 检查文件修改时间
    if (filePath) {
      const fileModTime = await this.getFileModTime(filePath);
      if (fileModTime > cacheData.fileModTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * 从内存缓存获取数据
   * @param {string} key - 缓存键
   * @returns {*} 缓存数据或null
   */
  getFromMemory(key) {
    const item = this.memoryCache.get(key);
    if (!item) {
      return null;
    }

    // 检查过期
    if (Date.now() - item.timestamp > this.config.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 存储到内存缓存
   * @param {string} key - 缓存键
   * @param {*} data - 数据
   */
  setToMemory(key, data) {
    // 检查内存缓存大小限制
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      // 删除最老的项目
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 从文件缓存获取数据
   * @param {string} key - 缓存键
   * @param {string} filePath - 源文件路径（用于验证）
   * @returns {*} 缓存数据或null
   */
  async getFromFile(key, filePath = null) {
    if (!this.initialized) {
      return null;
    }

    const cacheFile = path.join(this.cacheDir, `${key}.json`);

    try {
      if (!(await fs.pathExists(cacheFile))) {
        return null;
      }

      const cacheData = await fs.readJson(cacheFile);

      if (await this.isCacheValid(cacheData, filePath)) {
        return cacheData.data;
      } else {
        // 删除无效缓存
        await fs.remove(cacheFile);
        return null;
      }
    } catch (error) {
      // 缓存文件损坏，删除
      await fs.remove(cacheFile).catch(() => {});
      return null;
    }
  }

  /**
   * 存储到文件缓存
   * @param {string} key - 缓存键
   * @param {*} data - 数据
   * @param {string} filePath - 源文件路径
   */
  async setToFile(key, data, filePath = null) {
    if (!this.initialized) {
      return;
    }

    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    const fileModTime = filePath ? await this.getFileModTime(filePath) : 0;

    const cacheData = {
      data,
      timestamp: Date.now(),
      fileModTime,
    };

    try {
      await fs.writeJson(cacheFile, cacheData);
    } catch (error) {
      // 忽略写入错误
    }
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @param {string} filePath - 源文件路径
   * @returns {*} 缓存数据或null
   */
  async get(key, filePath = null) {
    if (!this.config.enabled) {
      return null;
    }

    const cacheKey = this.generateCacheKey(key, { filePath });

    // 先尝试内存缓存
    let data = this.getFromMemory(cacheKey);
    if (data !== null) {
      return data;
    }

    // 再尝试文件缓存
    data = await this.getFromFile(cacheKey, filePath);
    if (data !== null) {
      // 回填到内存缓存
      this.setToMemory(cacheKey, data);
      return data;
    }

    return null;
  }

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {*} data - 数据
   * @param {string} filePath - 源文件路径
   */
  async set(key, data, filePath = null) {
    if (!this.config.enabled) {
      return;
    }

    const cacheKey = this.generateCacheKey(key, { filePath });

    // 存储到内存缓存
    this.setToMemory(cacheKey, data);

    // 存储到文件缓存
    await this.setToFile(cacheKey, data, filePath);
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  async delete(key) {
    const cacheKey = this.generateCacheKey(key);

    // 从内存缓存删除
    this.memoryCache.delete(cacheKey);

    // 从文件缓存删除
    if (this.initialized) {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.remove(cacheFile).catch(() => {});
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache() {
    if (!this.initialized) {
      return;
    }

    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith(".json")) {
          continue;
        }

        const filePath = path.join(this.cacheDir, file);

        try {
          const cacheData = await fs.readJson(filePath);

          if (
            !cacheData.timestamp ||
            now - cacheData.timestamp > this.config.ttl
          ) {
            await fs.remove(filePath);
          }
        } catch (error) {
          // 文件损坏，删除
          await fs.remove(filePath);
        }
      }
    } catch (error) {
      // 忽略清理错误
    }
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    // 清空内存缓存
    this.memoryCache.clear();

    // 清空文件缓存
    if (this.initialized) {
      await fs.emptyDir(this.cacheDir).catch(() => {});
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  async getStats() {
    const stats = {
      memoryItems: this.memoryCache.size,
      fileItems: 0,
      totalSize: 0,
    };

    if (this.initialized) {
      try {
        const files = await fs.readdir(this.cacheDir);
        stats.fileItems = files.filter((f) => f.endsWith(".json")).length;

        for (const file of files) {
          const filePath = path.join(this.cacheDir, file);
          const stat = await fs.stat(filePath);
          stats.totalSize += stat.size;
        }
      } catch (error) {
        // 忽略统计错误
      }
    }

    return stats;
  }
}

module.exports = CacheManager;

const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

/**
 * 缓存管理器
 * 支持内存缓存、文件缓存、TTL过期、缓存键生成、统计信息等
 */
class CacheManager {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      ttl: config.ttl || 3600000, // 默认1小时
      directory: config.directory || ".dep-analyzer-cache",
      maxMemoryItems: config.maxMemoryItems || 1000,
      projectPath: config.projectPath || null,
    };

    this.memoryCache = new Map();
    this.cacheDir = null;
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * 初始化缓存管理器
   * @param {string} projectPath - 项目根目录
   */
  async initialize(projectPath) {
    if (!this.config.projectPath) {
      this.config.projectPath = projectPath;
    }
    this.cacheDir = path.join(
      this.config.projectPath,
      this.config.directory
    );
    await fs.ensureDir(this.cacheDir);
  }

  /**
   * 生成缓存键
   * @param {string} key - 基础键
   * @param {Object} params - 附加参数
   * @returns {string} MD5哈希缓存键
   */
  generateCacheKey(key, params = {}) {
    const data = JSON.stringify({ key, params });
    return crypto.createHash("md5").update(data).digest("hex");
  }

  /**
   * 设置内存缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   */
  setToMemory(key, value) {
    // 限制内存缓存大小
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      // 移除最早的条目
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取内存缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值，过期或不存在返回null
   */
  getFromMemory(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.memoryCache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * 设置文件缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {string} filePath - 关联文件路径（可选，用于mtime校验）
   */
  async setToFile(key, value, filePath = null) {
    if (!this.cacheDir) return;

    const cacheData = {
      value,
      timestamp: Date.now(),
      filePath: filePath || null,
      mtime: filePath ? fs.statSync(filePath).mtime.getTime() : null,
    };

    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    await fs.writeJson(cacheFile, cacheData, { spaces: 2 });
  }

  /**
   * 获取文件缓存
   * @param {string} key - 缓存键
   * @param {string} filePath - 关联文件路径（可选，用于mtime校验）
   * @returns {*} 缓存值，过期或不存在返回null
   */
  async getFromFile(key, filePath = null) {
    if (!this.cacheDir) return null;

    const cacheFile = path.join(this.cacheDir, `${key}.json`);

    try {
      if (!(await fs.pathExists(cacheFile))) {
        return null;
      }

      const cacheData = await fs.readJson(cacheFile);

      // 检查TTL过期
      if (Date.now() - cacheData.timestamp > this.config.ttl) {
        return null;
      }

      // 检查文件修改时间
      if (filePath && cacheData.mtime !== null) {
        const stat = fs.statSync(filePath);
        if (stat.mtime.getTime() !== cacheData.mtime) {
          return null;
        }
      }

      return cacheData.value;
    } catch (error) {
      return null;
    }
  }

  /**
   * 统一缓存接口 - 获取
   * @param {string} key - 缓存键
   * @param {string} filePath - 关联文件路径（可选）
   * @returns {*} 缓存值
   */
  async get(key, filePath = null) {
    if (!this.config.enabled) return null;

    const cacheKey = this.generateCacheKey(key, { filePath });

    // 优先从内存缓存获取
    const memoryResult = this.getFromMemory(cacheKey);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // 回退到文件缓存
    const fileResult = await this.getFromFile(cacheKey, filePath);
    if (fileResult !== null) {
      // 回填到内存缓存
      this.setToMemory(cacheKey, fileResult);
      return fileResult;
    }

    return null;
  }

  /**
   * 统一缓存接口 - 设置
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {string} filePath - 关联文件路径（可选）
   */
  async set(key, value, filePath = null) {
    if (!this.config.enabled) return;

    const cacheKey = this.generateCacheKey(key, { filePath });

    // 同时存储到内存和文件缓存
    this.setToMemory(cacheKey, value);
    await this.setToFile(cacheKey, value, filePath);
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @param {string} filePath - 关联文件路径（可选）
   */
  async delete(key, filePath = null) {
    const cacheKey = this.generateCacheKey(key, { filePath });
    this.memoryCache.delete(cacheKey);

    if (this.cacheDir) {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.remove(cacheFile).catch(() => {});
    }
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    this.memoryCache.clear();

    if (this.cacheDir && (await fs.pathExists(this.cacheDir))) {
      await fs.remove(this.cacheDir);
      await fs.ensureDir(this.cacheDir);
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache() {
    if (!this.cacheDir || !(await fs.pathExists(this.cacheDir))) return;

    const files = await fs.readdir(this.cacheDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(this.cacheDir, file);
      try {
        const cacheData = await fs.readJson(filePath);
        if (Date.now() - cacheData.timestamp > this.config.ttl) {
          await fs.remove(filePath);
        }
      } catch (error) {
        // 读取失败的缓存文件也删除
        await fs.remove(filePath).catch(() => {});
      }
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  async getStats() {
    let fileItems = 0;

    if (this.cacheDir && (await fs.pathExists(this.cacheDir))) {
      const files = await fs.readdir(this.cacheDir);
      fileItems = files.filter((f) => f.endsWith(".json")).length;
    }

    const memorySize = JSON.stringify([...this.memoryCache.entries()]).length;

    return {
      memoryItems: this.memoryCache.size,
      fileItems,
      totalSize: memorySize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate:
        this.stats.hits + this.stats.misses > 0
          ? (
              (this.stats.hits / (this.stats.hits + this.stats.misses)) *
              100
            ).toFixed(2) + "%"
          : "0%",
    };
  }
}

module.exports = CacheManager;

const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

/**
 * 日志记录器
 * 支持多级别日志、文件输出和日志轮转
 */
class Logger {
  constructor(config = {}) {
    this.config = {
      level: config.level || "info",
      file: config.file || null,
      maxSize: config.maxSize || 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles || 5,
      timestamp: config.timestamp !== false,
      colors: config.colors !== false,
      ...config,
    };

    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4,
    };

    this.colors = {
      error: chalk.red,
      warn: chalk.yellow,
      info: chalk.blue,
      debug: chalk.gray,
      trace: chalk.dim,
    };

    this.currentLogFile = null;
    this.initializeLogFile();
  }

  /**
   * 初始化日志文件
   */
  async initializeLogFile() {
    if (this.config.file) {
      this.currentLogFile = path.resolve(this.config.file);
      await fs.ensureDir(path.dirname(this.currentLogFile));

      // 检查文件大小，必要时轮转
      await this.rotateLogIfNeeded();
    }
  }

  /**
   * 检查并轮转日志文件
   */
  async rotateLogIfNeeded() {
    if (!this.currentLogFile) return;

    try {
      const stats = await fs.stat(this.currentLogFile);
      if (stats.size >= this.config.maxSize) {
        await this.rotateLog();
      }
    } catch (error) {
      // 文件不存在，无需轮转
    }
  }

  /**
   * 轮转日志文件
   */
  async rotateLog() {
    const logDir = path.dirname(this.currentLogFile);
    const logName = path.basename(
      this.currentLogFile,
      path.extname(this.currentLogFile)
    );
    const logExt = path.extname(this.currentLogFile);

    // 移动现有日志文件
    for (let i = this.config.maxFiles - 1; i > 0; i--) {
      const oldFile = path.join(logDir, `${logName}.${i}${logExt}`);
      const newFile = path.join(logDir, `${logName}.${i + 1}${logExt}`);

      if (await fs.pathExists(oldFile)) {
        if (i === this.config.maxFiles - 1) {
          await fs.remove(oldFile); // 删除最老的文件
        } else {
          await fs.move(oldFile, newFile);
        }
      }
    }

    // 移动当前日志文件
    const firstRotated = path.join(logDir, `${logName}.1${logExt}`);
    if (await fs.pathExists(this.currentLogFile)) {
      await fs.move(this.currentLogFile, firstRotated);
    }
  }

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 消息内容
   * @param {Object} meta - 元数据
   * @returns {string} 格式化后的消息
   */
  formatMessage(level, message, meta = {}) {
    let formatted = "";

    if (this.config.timestamp) {
      const timestamp = new Date().toISOString();
      formatted += `[${timestamp}] `;
    }

    formatted += `[${level.toUpperCase()}] ${message}`;

    if (Object.keys(meta).length > 0) {
      formatted += ` ${JSON.stringify(meta)}`;
    }

    return formatted;
  }

  /**
   * 写入日志
   * @param {string} level - 日志级别
   * @param {string} message - 消息内容
   * @param {Object} meta - 元数据
   */
  async log(level, message, meta = {}) {
    const levelNum = this.levels[level];
    const configLevelNum = this.levels[this.config.level];

    if (levelNum > configLevelNum) {
      return; // 级别不够，不记录
    }

    const formatted = this.formatMessage(level, message, meta);

    // 控制台输出
    if (this.config.colors && this.colors[level]) {
      console.log(this.colors[level](formatted));
    } else {
      console.log(formatted);
    }

    // 文件输出
    if (this.currentLogFile) {
      await this.rotateLogIfNeeded();
      await fs.appendFile(this.currentLogFile, formatted + "\n");
    }
  }

  /**
   * 错误日志
   * @param {string} message - 消息内容
   * @param {Object} meta - 元数据
   */
  async error(message, meta = {}) {
    await this.log("error", message, meta);
  }

  /**
   * 警告日志
   * @param {string} message - 消息内容
   * @param {Object} meta - 元数据
   */
  async warn(message, meta = {}) {
    await this.log("warn", message, meta);
  }

  /**
   * 信息日志
   * @param {string} message - 消息内容
   * @param {Object} meta - 元数据
   */
  async info(message, meta = {}) {
    await this.log("info", message, meta);
  }

  /**
   * 调试日志
   * @param {string} message - 消息内容
   * @param {Object} meta - 元数据
   */
  async debug(message, meta = {}) {
    await this.log("debug", message, meta);
  }

  /**
   * 跟踪日志
   * @param {string} message - 消息内容
   * @param {Object} meta - 元数据
   */
  async trace(message, meta = {}) {
    await this.log("trace", message, meta);
  }

  /**
   * 性能计时开始
   * @param {string} label - 计时标签
   */
  time(label) {
    console.time(label);
  }

  /**
   * 性能计时结束
   * @param {string} label - 计时标签
   */
  timeEnd(label) {
    console.timeEnd(label);
  }

  /**
   * 创建子日志器
   * @param {Object} options - 子日志器选项
   * @returns {Logger} 子日志器实例
   */
  child(options = {}) {
    return new Logger({
      ...this.config,
      ...options,
    });
  }
}

module.exports = Logger;

const fs = require("fs-extra");
const path = require("path");

/**
 * 配置管理器
 * 负责加载、验证和管理应用程序配置
 */
class ConfigManager {
  constructor() {
    this.config = {};
    this.configPaths = [
      ".dep-analyzer.json",
      ".dep-analyzer.js",
      "dep-analyzer.config.js",
    ];
  }

  /**
   * 加载配置文件
   * @param {string} projectPath - 项目根目录
   * @returns {Object} 合并后的配置对象
   */
  async loadConfig(projectPath) {
    const defaultConfig = this.getDefaultConfig();
    let userConfig = {};

    // 尝试加载用户配置文件
    for (const configPath of this.configPaths) {
      const fullPath = path.join(projectPath, configPath);
      if (await fs.pathExists(fullPath)) {
        try {
          if (configPath.endsWith(".json")) {
            userConfig = await fs.readJson(fullPath);
          } else {
            delete require.cache[require.resolve(fullPath)];
            userConfig = require(fullPath);
          }
          break;
        } catch (error) {
          console.warn(`配置文件加载失败: ${configPath}`, error.message);
        }
      }
    }

    // 合并环境变量配置
    const envConfig = this.loadEnvConfig();

    this.config = {
      ...defaultConfig,
      ...userConfig,
      ...envConfig,
    };

    return this.config;
  }

  /**
   * 获取默认配置
   * @returns {Object} 默认配置对象
   */
  getDefaultConfig() {
    return {
      // 分析配置
      analysis: {
        maxFileSize: 1024 * 1024, // 1MB
        timeout: 30000, // 30秒
        parallel: true,
        maxConcurrency: 4,
      },

      // 缓存配置
      cache: {
        enabled: true,
        ttl: 3600000, // 1小时
        directory: ".dep-analyzer-cache",
      },

      // 日志配置
      logging: {
        level: "info",
        file: "dep-analyzer.log",
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      },

      // 输出配置
      output: {
        format: "html",
        template: "default",
        includeSourceMaps: false,
      },

      // 排除模式
      exclude: [
        "**/node_modules/**",
        "**/*.test.*",
        "**/*.spec.*",
        "**/dist/**",
        "**/build/**",
      ],

      // 框架特定配置
      frameworks: {
        react: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
          componentPatterns: ["**/*Component.*", "**/components/**/*"],
        },
        vue: {
          extensions: [".vue", ".js", ".ts"],
          componentPatterns: ["**/*.vue", "**/components/**/*"],
        },
      },
    };
  }

  /**
   * 从环境变量加载配置
   * @returns {Object} 环境变量配置
   */
  loadEnvConfig() {
    const envConfig = {};

    if (process.env.DEP_ANALYZER_LOG_LEVEL) {
      envConfig.logging = { level: process.env.DEP_ANALYZER_LOG_LEVEL };
    }

    if (process.env.DEP_ANALYZER_CACHE_DISABLED) {
      envConfig.cache = { enabled: false };
    }

    if (process.env.DEP_ANALYZER_MAX_CONCURRENCY) {
      envConfig.analysis = {
        maxConcurrency: parseInt(process.env.DEP_ANALYZER_MAX_CONCURRENCY),
      };
    }

    return envConfig;
  }

  /**
   * 验证配置有效性
   * @param {Object} config - 配置对象
   * @returns {boolean} 是否有效
   */
  validateConfig(config) {
    const required = ["analysis", "cache", "logging", "output"];

    for (const key of required) {
      if (!config[key]) {
        throw new Error(`缺少必需的配置项: ${key}`);
      }
    }

    // 验证数值范围
    if (
      config.analysis.maxConcurrency < 1 ||
      config.analysis.maxConcurrency > 16
    ) {
      throw new Error("maxConcurrency 必须在 1-16 之间");
    }

    if (config.cache.ttl < 0) {
      throw new Error("缓存TTL不能为负数");
    }

    return true;
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键（支持点号分隔）
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(key, defaultValue = null) {
    const keys = key.split(".");
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 设置配置值
   * @param {string} key - 配置键
   * @param {*} value - 配置值
   */
  set(key, value) {
    const keys = key.split(".");
    let target = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k] || typeof target[k] !== "object") {
        target[k] = {};
      }
      target = target[k];
    }

    target[keys[keys.length - 1]] = value;
  }
}

module.exports = ConfigManager;

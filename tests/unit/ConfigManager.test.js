const { describe, it, beforeEach, afterEach } = require("mocha");
const { expect } = require("chai");
const fs = require("fs-extra");
const path = require("path");
const ConfigManager = require("../../src/modules/ConfigManager");

describe("ConfigManager", () => {
  let configManager;
  let testDir;

  beforeEach(async () => {
    configManager = new ConfigManager();
    testDir = path.join(__dirname, "../fixtures/config-test");
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe("构造函数", () => {
    it("应该创建ConfigManager实例", () => {
      expect(configManager).to.be.instanceOf(ConfigManager);
      expect(configManager.config).to.be.an("object");
    });
  });

  describe("getDefaultConfig", () => {
    it("应该返回默认配置", () => {
      const defaultConfig = configManager.getDefaultConfig();

      expect(defaultConfig).to.have.property("analysis");
      expect(defaultConfig).to.have.property("cache");
      expect(defaultConfig).to.have.property("logging");
      expect(defaultConfig).to.have.property("output");
      expect(defaultConfig).to.have.property("exclude");
      expect(defaultConfig).to.have.property("frameworks");

      expect(defaultConfig.analysis.maxConcurrency).to.equal(4);
      expect(defaultConfig.cache.enabled).to.be.true;
      expect(defaultConfig.logging.level).to.equal("info");
    });
  });

  describe("loadEnvConfig", () => {
    it("应该从环境变量加载配置", () => {
      // 设置环境变量
      process.env.DEP_ANALYZER_LOG_LEVEL = "debug";
      process.env.DEP_ANALYZER_CACHE_DISABLED = "true";
      process.env.DEP_ANALYZER_MAX_CONCURRENCY = "8";

      const envConfig = configManager.loadEnvConfig();

      expect(envConfig.logging.level).to.equal("debug");
      expect(envConfig.cache.enabled).to.be.false;
      expect(envConfig.analysis.maxConcurrency).to.equal(8);

      // 清理环境变量
      delete process.env.DEP_ANALYZER_LOG_LEVEL;
      delete process.env.DEP_ANALYZER_CACHE_DISABLED;
      delete process.env.DEP_ANALYZER_MAX_CONCURRENCY;
    });
  });

  describe("loadConfig", () => {
    it("应该加载JSON配置文件", async () => {
      const configData = {
        analysis: {
          maxConcurrency: 2,
        },
        logging: {
          level: "debug",
        },
      };

      const configFile = path.join(testDir, ".dep-analyzer.json");
      await fs.writeJson(configFile, configData);

      const config = await configManager.loadConfig(testDir);

      expect(config.analysis.maxConcurrency).to.equal(2);
      expect(config.logging.level).to.equal("debug");
      expect(config.cache.enabled).to.be.true; // 默认值保持
    });

    it("应该加载JS配置文件", async () => {
      const configContent = `
        module.exports = {
          analysis: {
            maxConcurrency: 6
          },
          output: {
            format: 'json'
          }
        };
      `;

      const configFile = path.join(testDir, "dep-analyzer.config.js");
      await fs.writeFile(configFile, configContent);

      const config = await configManager.loadConfig(testDir);

      expect(config.analysis.maxConcurrency).to.equal(6);
      expect(config.output.format).to.equal("json");
    });

    it("应该处理不存在的配置文件", async () => {
      const config = await configManager.loadConfig(testDir);

      // 应该返回默认配置
      expect(config.analysis.maxConcurrency).to.equal(4);
      expect(config.cache.enabled).to.be.true;
    });

    it("应该处理损坏的配置文件", async () => {
      const configFile = path.join(testDir, ".dep-analyzer.json");
      await fs.writeFile(configFile, "{ invalid json }");

      const config = await configManager.loadConfig(testDir);

      // 应该回退到默认配置
      expect(config.analysis.maxConcurrency).to.equal(4);
    });
  });

  describe("validateConfig", () => {
    it("应该验证有效配置", () => {
      const validConfig = configManager.getDefaultConfig();
      expect(() => configManager.validateConfig(validConfig)).to.not.throw();
    });

    it("应该拒绝缺少必需字段的配置", () => {
      const invalidConfig = { analysis: {} };
      expect(() => configManager.validateConfig(invalidConfig)).to.throw(
        "缺少必需的配置项"
      );
    });

    it("应该验证数值范围", () => {
      const invalidConfig = configManager.getDefaultConfig();
      invalidConfig.analysis.maxConcurrency = 20;

      expect(() => configManager.validateConfig(invalidConfig)).to.throw(
        "maxConcurrency 必须在 1-16 之间"
      );
    });

    it("应该验证缓存TTL", () => {
      const invalidConfig = configManager.getDefaultConfig();
      invalidConfig.cache.ttl = -1;

      expect(() => configManager.validateConfig(invalidConfig)).to.throw(
        "缓存TTL不能为负数"
      );
    });
  });

  describe("get/set", () => {
    beforeEach(async () => {
      await configManager.loadConfig(testDir);
    });

    it("应该获取配置值", () => {
      expect(configManager.get("analysis.maxConcurrency")).to.equal(4);
      expect(configManager.get("cache.enabled")).to.be.true;
      expect(configManager.get("nonexistent", "default")).to.equal("default");
    });

    it("应该设置配置值", () => {
      configManager.set("analysis.maxConcurrency", 8);
      configManager.set("custom.value", "test");

      expect(configManager.get("analysis.maxConcurrency")).to.equal(8);
      expect(configManager.get("custom.value")).to.equal("test");
    });

    it("应该处理嵌套路径", () => {
      configManager.set("deep.nested.value", 42);
      expect(configManager.get("deep.nested.value")).to.equal(42);
    });
  });

  describe("配置优先级", () => {
    it("环境变量应该覆盖文件配置", async () => {
      // 创建配置文件
      const configData = {
        logging: { level: "info" },
      };
      const configFile = path.join(testDir, ".dep-analyzer.json");
      await fs.writeJson(configFile, configData);

      // 设置环境变量
      process.env.DEP_ANALYZER_LOG_LEVEL = "debug";

      const config = await configManager.loadConfig(testDir);

      expect(config.logging.level).to.equal("debug");

      // 清理
      delete process.env.DEP_ANALYZER_LOG_LEVEL;
    });
  });
});

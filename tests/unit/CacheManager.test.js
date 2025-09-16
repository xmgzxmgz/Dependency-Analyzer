const { describe, it, beforeEach, afterEach } = require("mocha");
const { expect } = require("chai");
const fs = require("fs-extra");
const path = require("path");
const CacheManager = require("../../src/modules/CacheManager");

describe("CacheManager", () => {
  let cacheManager;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(__dirname, "../fixtures/cache-test");
    await fs.ensureDir(testDir);

    cacheManager = new CacheManager({
      enabled: true,
      ttl: 1000, // 1秒，便于测试
      directory: ".test-cache",
    });

    await cacheManager.initialize(testDir);
  });

  afterEach(async () => {
    await cacheManager.clear();
    await fs.remove(testDir);
  });

  describe("构造函数", () => {
    it("应该创建CacheManager实例", () => {
      expect(cacheManager).to.be.instanceOf(CacheManager);
      expect(cacheManager.config.enabled).to.be.true;
      expect(cacheManager.config.ttl).to.equal(1000);
    });

    it("应该支持禁用缓存", () => {
      const disabledCache = new CacheManager({ enabled: false });
      expect(disabledCache.config.enabled).to.be.false;
    });
  });

  describe("generateCacheKey", () => {
    it("应该生成一致的缓存键", () => {
      const key1 = cacheManager.generateCacheKey("test", { a: 1 });
      const key2 = cacheManager.generateCacheKey("test", { a: 1 });

      expect(key1).to.equal(key2);
      expect(key1).to.be.a("string");
      expect(key1).to.have.length(32); // MD5哈希长度
    });

    it("不同输入应该生成不同的键", () => {
      const key1 = cacheManager.generateCacheKey("test1", { a: 1 });
      const key2 = cacheManager.generateCacheKey("test2", { a: 1 });
      const key3 = cacheManager.generateCacheKey("test1", { a: 2 });

      expect(key1).to.not.equal(key2);
      expect(key1).to.not.equal(key3);
      expect(key2).to.not.equal(key3);
    });
  });

  describe("内存缓存", () => {
    it("应该存储和获取数据", () => {
      const testData = { message: "hello world" };

      cacheManager.setToMemory("test-key", testData);
      const retrieved = cacheManager.getFromMemory("test-key");

      expect(retrieved).to.deep.equal(testData);
    });

    it("应该处理不存在的键", () => {
      const result = cacheManager.getFromMemory("nonexistent");
      expect(result).to.be.null;
    });

    it("应该处理过期数据", async () => {
      const testData = { message: "hello world" };

      cacheManager.setToMemory("test-key", testData);

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = cacheManager.getFromMemory("test-key");
      expect(result).to.be.null;
    });

    it("应该限制内存缓存大小", () => {
      const limitedCache = new CacheManager({ maxMemoryItems: 2 });

      limitedCache.setToMemory("key1", "data1");
      limitedCache.setToMemory("key2", "data2");
      limitedCache.setToMemory("key3", "data3"); // 应该移除key1

      expect(limitedCache.getFromMemory("key1")).to.be.null;
      expect(limitedCache.getFromMemory("key2")).to.equal("data2");
      expect(limitedCache.getFromMemory("key3")).to.equal("data3");
    });
  });

  describe("文件缓存", () => {
    it("应该存储和获取数据", async () => {
      const testData = { message: "hello world" };

      await cacheManager.setToFile("test-key", testData);
      const retrieved = await cacheManager.getFromFile("test-key");

      expect(retrieved).to.deep.equal(testData);
    });

    it("应该处理不存在的文件", async () => {
      const result = await cacheManager.getFromFile("nonexistent");
      expect(result).to.be.null;
    });

    it("应该处理过期文件", async () => {
      const testData = { message: "hello world" };

      await cacheManager.setToFile("test-key", testData);

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await cacheManager.getFromFile("test-key");
      expect(result).to.be.null;
    });

    it("应该验证文件修改时间", async () => {
      const testFile = path.join(testDir, "test.js");
      await fs.writeFile(testFile, 'console.log("test");');

      const testData = { parsed: true };
      await cacheManager.setToFile("test-key", testData, testFile);

      // 修改文件
      await new Promise((resolve) => setTimeout(resolve, 10));
      await fs.writeFile(testFile, 'console.log("modified");');

      const result = await cacheManager.getFromFile("test-key", testFile);
      expect(result).to.be.null; // 应该因为文件修改而失效
    });
  });

  describe("统一缓存接口", () => {
    it("应该优先使用内存缓存", async () => {
      const testData = { message: "hello world" };
      const testFile = path.join(testDir, "test.js");

      // 先存储到文件缓存
      const cacheKey = cacheManager.generateCacheKey("test-key", {
        filePath: testFile,
      });
      await cacheManager.setToFile(cacheKey, testData);

      // 再存储到内存缓存（不同数据）
      const memoryData = { message: "from memory" };
      cacheManager.setToMemory(cacheKey, memoryData);

      const result = await cacheManager.get("test-key", testFile);
      expect(result).to.deep.equal(memoryData);
    });

    it("应该回退到文件缓存", async () => {
      const testData = { message: "hello world" };
      const testFile = path.join(testDir, "test.js");

      // 创建测试文件
      await fs.writeFile(testFile, 'console.log("test");');

      // 等待一下确保文件写入完成
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cacheKey = cacheManager.generateCacheKey("test-key", {
        filePath: testFile,
      });
      await cacheManager.setToFile(cacheKey, testData, testFile);

      const result = await cacheManager.get("test-key", testFile);
      expect(result).to.deep.equal(testData);

      // 验证数据已回填到内存缓存
      const memoryResult = cacheManager.getFromMemory(cacheKey);
      expect(memoryResult).to.deep.equal(testData);
    });

    it("应该同时存储到内存和文件", async () => {
      const testData = { message: "hello world" };
      const testFile = path.join(testDir, "test.js");

      // 创建测试文件
      await fs.writeFile(testFile, 'console.log("test");');

      await cacheManager.set("test-key", testData, testFile);

      const cacheKey = cacheManager.generateCacheKey("test-key", {
        filePath: testFile,
      });
      const memoryResult = cacheManager.getFromMemory(cacheKey);
      const fileResult = await cacheManager.getFromFile(cacheKey, testFile);

      expect(memoryResult).to.deep.equal(testData);
      expect(fileResult).to.deep.equal(testData);
    });
  });

  describe("缓存管理", () => {
    it("应该删除缓存", async () => {
      const testData = { message: "hello world" };
      const testFile = path.join(testDir, "test.js");

      // 创建测试文件
      await fs.writeFile(testFile, 'console.log("test");');

      // 先设置缓存
      await cacheManager.set("test-key", testData, testFile);

      // 验证缓存存在
      let result = await cacheManager.get("test-key", testFile);
      expect(result).to.deep.equal(testData);

      // 删除缓存 - 直接删除内存和文件缓存
      const cacheKey = cacheManager.generateCacheKey("test-key", {
        filePath: testFile,
      });
      cacheManager.memoryCache.delete(cacheKey);
      const cacheFile = path.join(cacheManager.cacheDir, `${cacheKey}.json`);
      await fs.remove(cacheFile).catch(() => {});

      // 验证缓存已删除
      result = await cacheManager.get("test-key", testFile);
      expect(result).to.be.null;
    });

    it("应该清空所有缓存", async () => {
      await cacheManager.set("key1", "data1");
      await cacheManager.set("key2", "data2");

      await cacheManager.clear();

      expect(await cacheManager.get("key1")).to.be.null;
      expect(await cacheManager.get("key2")).to.be.null;
    });

    it("应该清理过期缓存", async () => {
      const testData = { message: "hello world" };

      await cacheManager.setToFile("test-key", testData);

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await cacheManager.cleanExpiredCache();

      // 验证过期文件已被删除
      const cacheFile = path.join(
        cacheManager.cacheDir,
        `${cacheManager.generateCacheKey("test-key")}.json`
      );
      expect(await fs.pathExists(cacheFile)).to.be.false;
    });
  });

  describe("统计信息", () => {
    it("应该返回缓存统计", async () => {
      await cacheManager.set("key1", "data1");
      await cacheManager.set("key2", "data2");

      const stats = await cacheManager.getStats();

      expect(stats.memoryItems).to.equal(2);
      expect(stats.fileItems).to.equal(2);
      expect(stats.totalSize).to.be.above(0);
    });
  });

  describe("禁用缓存", () => {
    it("禁用时应该跳过所有操作", async () => {
      const disabledCache = new CacheManager({ enabled: false });

      await disabledCache.set("test-key", "data");
      const result = await disabledCache.get("test-key");

      expect(result).to.be.null;
    });
  });
});

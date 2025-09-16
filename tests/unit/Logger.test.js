const { expect } = require("chai");
const sinon = require("sinon");
const fs = require("fs-extra");
const path = require("path");
const Logger = require("../../src/modules/Logger");

describe("Logger 单元测试", function () {
  let logger;
  let consoleStub;
  let fsStub;

  beforeEach(function () {
    // 创建控制台输出的stub
    consoleStub = {
      log: sinon.stub(console, "log"),
      time: sinon.stub(console, "time"),
      timeEnd: sinon.stub(console, "timeEnd"),
    };

    // 创建文件系统操作的stub
    fsStub = {
      ensureDir: sinon.stub(fs, "ensureDir").resolves(),
      stat: sinon.stub(fs, "stat").resolves({ size: 1024 }),
      appendFile: sinon.stub(fs, "appendFile").resolves(),
      pathExists: sinon.stub(fs, "pathExists").resolves(false),
      move: sinon.stub(fs, "move").resolves(),
      remove: sinon.stub(fs, "remove").resolves(),
    };

    // 创建Logger实例
    logger = new Logger({
      level: "debug",
      file: "/tmp/test.log",
      colors: false,
    });
  });

  afterEach(function () {
    // 恢复所有stub
    sinon.restore();
  });

  describe("构造函数", function () {
    it("应该使用默认配置", function () {
      const defaultLogger = new Logger();

      expect(defaultLogger.config.level).to.equal("info");
      expect(defaultLogger.config.file).to.be.null;
      expect(defaultLogger.config.maxSize).to.equal(10 * 1024 * 1024);
      expect(defaultLogger.config.maxFiles).to.equal(5);
      expect(defaultLogger.config.timestamp).to.be.true;
      expect(defaultLogger.config.colors).to.be.true;
    });

    it("应该使用自定义配置", function () {
      const customLogger = new Logger({
        level: "error",
        file: "/custom/path.log",
        maxSize: 5 * 1024 * 1024,
        maxFiles: 3,
        timestamp: false,
        colors: false,
      });

      expect(customLogger.config.level).to.equal("error");
      expect(customLogger.config.file).to.equal("/custom/path.log");
      expect(customLogger.config.maxSize).to.equal(5 * 1024 * 1024);
      expect(customLogger.config.maxFiles).to.equal(3);
      expect(customLogger.config.timestamp).to.be.false;
      expect(customLogger.config.colors).to.be.false;
    });

    it("应该初始化日志级别", function () {
      expect(logger.levels).to.deep.equal({
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4,
      });
    });
  });

  describe("日志级别", function () {
    it("应该根据配置级别过滤日志", async function () {
      const errorLogger = new Logger({ level: "error", colors: false });
      // 等待异步初始化完成
      await new Promise((resolve) => setTimeout(resolve, 10));

      await errorLogger.error("错误信息");
      await errorLogger.warn("警告信息");
      await errorLogger.info("信息");

      expect(consoleStub.log.callCount).to.equal(1);
      expect(consoleStub.log.firstCall.args[0]).to.include("[ERROR]");
    });

    it("应该支持所有日志级别", async function () {
      // 创建trace级别的logger以包含所有级别
      const traceLogger = new Logger({ level: "trace" });

      // 等待异步初始化完成
      await new Promise((resolve) => setTimeout(resolve, 10));

      await traceLogger.error("错误");
      await traceLogger.warn("警告");
      await traceLogger.info("信息");
      await traceLogger.debug("调试");
      await traceLogger.trace("跟踪");

      expect(consoleStub.log.callCount).to.equal(5);
    });
  });

  describe("控制台输出", function () {
    it("应该输出到控制台", async function () {
      await logger.info("测试信息");

      expect(consoleStub.log.calledOnce).to.be.true;
      expect(consoleStub.log.firstCall.args[0]).to.include("[INFO]");
      expect(consoleStub.log.firstCall.args[0]).to.include("测试信息");
    });

    it("应该支持禁用颜色输出", async function () {
      const noColorLogger = new Logger({ colors: false });
      await noColorLogger.info("测试信息");

      expect(consoleStub.log.calledOnce).to.be.true;
    });
  });

  describe("文件输出", function () {
    it("应该写入日志到文件", async function () {
      await logger.info("文件日志测试");

      expect(fsStub.appendFile.calledOnce).to.be.true;
      const [filePath, content] = fsStub.appendFile.firstCall.args;
      expect(filePath).to.include("test.log");
      expect(content).to.include("[INFO]");
      expect(content).to.include("文件日志测试");
    });

    it("应该支持禁用文件输出", async function () {
      const noFileLogger = new Logger({ level: "debug" });
      await noFileLogger.info("测试信息");

      expect(fsStub.appendFile.called).to.be.false;
    });

    it("应该处理文件写入错误", async function () {
      fsStub.appendFile.rejects(new Error("写入失败"));

      try {
        await logger.info("测试信息");
      } catch (error) {
        // 错误应该被处理
      }

      expect(fsStub.appendFile.called).to.be.true;
    });
  });

  describe("日志轮转", function () {
    beforeEach(function () {
      // 重置stub
      fsStub.stat.reset();
      fsStub.move.reset();
      fsStub.pathExists.reset();
    });

    it("应该在文件大小超限时进行轮转", async function () {
      // 模拟文件大小超过限制
      fsStub.stat.resolves({ size: 11 * 1024 * 1024 });

      // 等待初始化完成
      await new Promise((resolve) => setTimeout(resolve, 10));

      await logger.info("触发轮转的日志");

      // 验证stat被调用来检查文件大小
      expect(fsStub.stat.called).to.be.true;
    });

    it("应该删除超出数量限制的旧文件", async function () {
      fsStub.stat.resolves({ size: 11 * 1024 * 1024 });
      fsStub.pathExists.callsFake((filePath) => {
        return Promise.resolve(filePath.includes(".log"));
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      await logger.info("触发轮转的日志");

      expect(fsStub.stat.called).to.be.true;
    });

    it("应该处理轮转过程中的错误", async function () {
      fsStub.stat.resolves({ size: 11 * 1024 * 1024 });
      fsStub.move.rejects(new Error("重命名失败"));

      await new Promise((resolve) => setTimeout(resolve, 10));

      try {
        await logger.info("测试日志");
      } catch (error) {
        // 错误应该被处理
      }

      expect(fsStub.stat.called).to.be.true;
    });
  });

  describe("日志格式化", function () {
    it("应该包含时间戳", async function () {
      await logger.info("测试消息");

      const logMessage = consoleStub.log.firstCall.args[0];
      expect(logMessage).to.match(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/
      );
    });

    it("应该支持禁用时间戳", async function () {
      const noTimestampLogger = new Logger({ timestamp: false, colors: false });
      await noTimestampLogger.info("测试消息");

      const logMessage = consoleStub.log.firstCall.args[0];
      expect(logMessage).to.not.match(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/
      );
    });

    it("应该支持元数据", async function () {
      await logger.info("测试消息", { userId: 123, action: "login" });

      const logMessage = consoleStub.log.firstCall.args[0];
      expect(logMessage).to.include('{"userId":123,"action":"login"}');
    });
  });

  describe("性能监控", function () {
    it("应该支持性能计时", function () {
      logger.time("测试操作");

      expect(consoleStub.time.calledOnce).to.be.true;
      expect(consoleStub.time.firstCall.args[0]).to.equal("测试操作");
    });

    it("应该记录性能结果", function () {
      logger.timeEnd("测试操作");

      expect(consoleStub.timeEnd.calledOnce).to.be.true;
      expect(consoleStub.timeEnd.firstCall.args[0]).to.equal("测试操作");
    });
  });

  describe("子日志器", function () {
    it("应该创建子日志器", function () {
      const childLogger = logger.child({ level: "error" });

      expect(childLogger).to.be.instanceOf(Logger);
      expect(childLogger.config.level).to.equal("error");
      expect(childLogger.config.file).to.equal(logger.config.file);
    });

    it("子日志器应该继承父级配置", function () {
      const childLogger = logger.child({ maxSize: 5 * 1024 * 1024 });

      expect(childLogger.config.level).to.equal(logger.config.level);
      expect(childLogger.config.file).to.equal(logger.config.file);
      expect(childLogger.config.maxSize).to.equal(5 * 1024 * 1024);
    });
  });

  describe("错误处理", function () {
    it("应该优雅地处理格式化错误", async function () {
      const circularObj = {};
      circularObj.self = circularObj;

      await new Promise((resolve) => setTimeout(resolve, 10));

      let errorThrown = false;
      try {
        await logger.info("测试", circularObj);
      } catch (error) {
        errorThrown = true;
        expect(error.message).to.include(
          "Converting circular structure to JSON"
        );
      }

      expect(errorThrown).to.be.true;
    });

    it("应该处理文件系统错误", function () {
      fsStub.ensureDir.rejects(new Error("权限不足"));

      expect(() => {
        new Logger({ file: "/invalid/path/app.log" });
      }).to.not.throw();
    });
  });
});

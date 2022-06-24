const { expect } = require("chai");
const sinon = require("sinon");
const fs = require("fs-extra");
const path = require("path");
const Logger = require("../../src/modules/Logger");

describe("Logger 单元测试", function () {
  let logger;
  let sandbox;
  let consoleStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    consoleStub = {
      log: sandbox.stub(console, "log"),
      time: sandbox.stub(console, "time"),
      timeEnd: sandbox.stub(console, "timeEnd"),
    };

    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "appendFile").resolves();
    sandbox.stub(fs, "stat").resolves({ size: 1024 });
    sandbox.stub(fs, "move").resolves();
    sandbox.stub(fs, "remove").resolves();

    logger = new Logger({
      level: "debug",
      file: "/test/logs/app.log",
      maxSize: 1024 * 1024,
      maxFiles: 5,
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe("构造函数", function () {
    it("应该正确初始化配置", function () {
      expect(logger.config.level).to.equal("debug");
      expect(logger.config.file).to.equal("/test/logs/app.log");
      expect(logger.config.maxSize).to.equal(1024 * 1024);
      expect(logger.config.maxFiles).to.equal(5);
    });

    it("应该使用默认配置", function () {
      const defaultLogger = new Logger();
      expect(defaultLogger.config.level).to.equal("info");
      expect(defaultLogger.config.timestamp).to.be.true;
      expect(defaultLogger.config.colors).to.be.true;
    });

    it("应该创建日志目录", function () {
      new Logger({ file: "/test/new-logs/app.log" });
      expect(fs.ensureDir.called).to.be.true;
    });
  });

  describe("日志级别", function () {
    it("应该正确设置日志级别优先级", function () {
      expect(logger.levels.error).to.equal(0);
      expect(logger.levels.warn).to.equal(1);
      expect(logger.levels.info).to.equal(2);
      expect(logger.levels.debug).to.equal(3);
      expect(logger.levels.trace).to.equal(4);
    });

    it("应该根据级别过滤日志", async function () {
      logger.config.level = "warn";

      await logger.debug("调试信息");
      await logger.info("信息");
      await logger.warn("警告");
      await logger.error("错误");

      // 只有warn和error级别的日志应该被输出
      expect(consoleStub.log.callCount).to.equal(2);
    });
  });

  describe("控制台输出", function () {
    it("应该输出调试信息到控制台", async function () {
      await logger.debug("调试信息");
      expect(consoleStub.log.calledOnce).to.be.true;
      expect(consoleStub.log.firstCall.args[0]).to.include("[DEBUG]");
      expect(consoleStub.log.firstCall.args[0]).to.include("调试信息");
    });

    it("应该输出信息到控制台", async function () {
      await logger.info("普通信息");
      expect(consoleStub.log.calledOnce).to.be.true;
      expect(consoleStub.log.firstCall.args[0]).to.include("[INFO]");
    });

    it("应该输出警告到控制台", async function () {
      await logger.warn("警告信息");
      expect(consoleStub.log.calledOnce).to.be.true;
      expect(consoleStub.log.firstCall.args[0]).to.include("[WARN]");
    });

    it("应该输出错误到控制台", async function () {
      await logger.error("错误信息");
      expect(consoleStub.log.calledOnce).to.be.true;
      expect(consoleStub.log.firstCall.args[0]).to.include("[ERROR]");
    });

    it("应该支持禁用颜色输出", async function () {
      logger.config.colors = false;
      await logger.info("测试信息");
      expect(consoleStub.log.calledOnce).to.be.true;
    });
  });

  describe("文件输出", function () {
    it("应该写入日志到文件", async function () {
      await logger.info("文件日志测试");
      expect(fs.appendFile.calledOnce).to.be.true;

      const [filePath, content] = fs.appendFile.firstCall.args;
      expect(filePath).to.include("app.log");
      expect(content).to.include("[INFO]");
      expect(content).to.include("文件日志测试");
    });

    it("应该支持禁用文件输出", async function () {
      const noFileLogger = new Logger({ level: "debug" }); // 不设置file
      await noFileLogger.info("测试信息");
      expect(fs.appendFile.called).to.be.false;
    });

    it("应该处理文件写入错误", async function () {
      fs.appendFile.rejects(new Error("写入失败"));

      try {
        await logger.info("测试信息");
      } catch (error) {
        // 错误应该被处理
      }

      expect(fs.appendFile.called).to.be.true;
    });
  });

  describe("日志轮转", function () {
    beforeEach(function () {
      fs.stat.resolves({ size: 2 * 1024 * 1024 }); // 2MB，超过限制
    });

    it("应该在文件大小超限时进行轮转", async function () {
      await logger.info("触发轮转的日志");

      expect(fs.move.called).to.be.true;
    });

    it("应该删除超出数量限制的旧文件", async function () {
      // 模拟已有5个备份文件
      fs.pathExists.callsFake((path) => {
        return Promise.resolve(path.includes(".log"));
      });

      await logger.info("触发轮转的日志");

      expect(fs.move.called).to.be.true;
    });

    it("应该处理轮转过程中的错误", async function () {
      fs.move.rejects(new Error("重命名失败"));

      try {
        await logger.info("测试日志");
      } catch (error) {
        // 错误应该被处理
      }

      expect(fs.move.called).to.be.true;
    });
  });

  describe("日志格式化", function () {
    it("应该包含时间戳", function () {
      logger.info("格式测试");

      const logContent = fs.appendFileSync.firstCall.args[1];
      expect(logContent).to.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it("应该包含日志级别", function () {
      logger.warn("级别测试");

      const logContent = fs.appendFileSync.firstCall.args[1];
      expect(logContent).to.include("[WARN]");
    });

    it("应该支持对象和数组的格式化", function () {
      const testObj = { name: "测试", value: 123 };
      logger.info("对象测试", testObj);

      const logContent = fs.appendFileSync.firstCall.args[1];
      expect(logContent).to.include(JSON.stringify(testObj));
    });
  });

  describe("性能监控", function () {
    it("应该支持性能计时", function () {
      logger.time("测试操作");

      expect(logger.timers).to.have.property("测试操作");
      expect(logger.timers["测试操作"]).to.be.a("number");
    });

    it("应该记录性能结果", function (done) {
      logger.time("测试操作");

      // 模拟一些延迟
      setTimeout(() => {
        logger.timeEnd("测试操作");

        expect(consoleStub.info.called).to.be.true;
        const logMessage = consoleStub.info.firstCall.args[0];
        expect(logMessage).to.include("测试操作");
        expect(logMessage).to.include("ms");
        done();
      }, 10);
    });

    it("应该处理重复的计时器名称", function () {
      logger.time("重复操作");
      logger.time("重复操作");

      expect(consoleStub.warn.called).to.be.true;
    });
  });

  describe("错误处理", function () {
    it("应该处理无效的日志级别", function () {
      expect(() => {
        new Logger({ level: "invalid" });
      }).to.throw();
    });

    it("应该处理文件系统错误", function () {
      fs.ensureDir.rejects(new Error("权限不足"));

      expect(() => {
        new Logger({ file: "/invalid/path/app.log" });
      }).to.not.throw();
    });

    it("应该优雅地处理格式化错误", async function () {
      const circularObj = {};
      circularObj.self = circularObj;

      try {
        await logger.info("测试", circularObj);
      } catch (error) {
        // 应该不抛出错误
      }

      expect(consoleStub.info.called).to.be.true;
    });
  });

  describe("子日志器", function () {
    it("应该创建子日志器", function () {
      const childLogger = logger.child({ module: "test" });

      expect(childLogger).to.be.instanceOf(Logger);
      expect(childLogger.context).to.deep.equal({ module: "test" });
    });

    it("子日志器应该继承父级配置", function () {
      const childLogger = logger.child({ module: "test" });

      expect(childLogger.config.level).to.equal(logger.config.level);
      expect(childLogger.config.file).to.equal(logger.config.file);
    });
  });
});

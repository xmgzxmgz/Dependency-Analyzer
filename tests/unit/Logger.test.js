const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs-extra');
const path = require('path');
const Logger = require('../../src/modules/Logger');

describe('Logger 单元测试', function() {
  let logger;
  let sandbox;
  let consoleStub;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    consoleStub = {
      log: sandbox.stub(console, 'log'),
      time: sandbox.stub(console, 'time'),
      timeEnd: sandbox.stub(console, 'timeEnd')
    };
    
    sandbox.stub(fs, 'pathExists').resolves(true);
    sandbox.stub(fs, 'ensureDir').resolves();
    sandbox.stub(fs, 'appendFile').resolves();
    sandbox.stub(fs, 'stat').resolves({ size: 1024 });
    sandbox.stub(fs, 'move').resolves();
    sandbox.stub(fs, 'remove').resolves();
    
    logger = new Logger({
      level: 'debug',
      file: '/test/logs/app.log',
      maxSize: 1024 * 1024,
      maxFiles: 5
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('构造函数', function() {
    it('应该正确初始化配置', function() {
      expect(logger.config.level).to.equal('debug');
      expect(logger.config.file).to.equal('/test/logs/app.log');
      expect(logger.config.maxSize).to.equal(1024 * 1024);
      expect(logger.config.maxFiles).to.equal(5);
    });

    it('应该使用默认配置', function() {
      const defaultLogger = new Logger();
      expect(defaultLogger.config.level).to.equal('info');
      expect(defaultLogger.config.timestamp).to.be.true;
      expect(defaultLogger.config.colors).to.be.true;
    });

    it('应该创建日志目录', function() {
      new Logger({ file: '/test/new-logs/app.log' });
      expect(fs.ensureDir.called).to.be.true;
    });
  });

  describe('日志级别', function() {
    it('应该正确设置日志级别优先级', function() {
      expect(logger.levels.error).to.equal(0);
      expect(logger.levels.warn).to.equal(1);
      expect(logger.levels.info).to.equal(2);
      expect(logger.levels.debug).to.equal(3);
    });

    it('应该根据级别过滤日志', function() {
      logger.config.level = 'warn';
      
      logger.debug('调试信息');
      logger.info('信息');
      logger.warn('警告');
      logger.error('错误');
      
      expect(consoleStub.log.called).to.be.false;
      expect(consoleStub.info.called).to.be.false;
      expect(consoleStub.warn.calledOnce).to.be.true;
      expect(consoleStub.error.calledOnce).to.be.true;
    });
  });

  describe('控制台输出', function() {
    it('应该输出调试信息到控制台', function() {
      logger.debug('调试信息');
      expect(consoleStub.log.calledOnce).to.be.true;
      expect(consoleStub.log.firstCall.args[0]).to.include('[DEBUG]');
      expect(consoleStub.log.firstCall.args[0]).to.include('调试信息');
    });

    it('应该输出信息到控制台', function() {
      logger.info('普通信息');
      expect(consoleStub.info.calledOnce).to.be.true;
      expect(consoleStub.info.firstCall.args[0]).to.include('[INFO]');
    });

    it('应该输出警告到控制台', function() {
      logger.warn('警告信息');
      expect(consoleStub.warn.calledOnce).to.be.true;
      expect(consoleStub.warn.firstCall.args[0]).to.include('[WARN]');
    });

    it('应该输出错误到控制台', function() {
      logger.error('错误信息');
      expect(consoleStub.error.calledOnce).to.be.true;
      expect(consoleStub.error.firstCall.args[0]).to.include('[ERROR]');
    });

    it('应该支持禁用控制台输出', function() {
      logger.config.enableConsole = false;
      logger.info('测试信息');
      expect(consoleStub.info.called).to.be.false;
    });
  });

  describe('文件输出', function() {
    it('应该写入日志到文件', function() {
      logger.info('文件日志测试');
      expect(fs.appendFileSync.calledOnce).to.be.true;
      
      const [filePath, content] = fs.appendFileSync.firstCall.args;
      expect(filePath).to.include('app.log');
      expect(content).to.include('[INFO]');
      expect(content).to.include('文件日志测试');
    });

    it('应该支持禁用文件输出', function() {
      logger.config.enableFile = false;
      logger.info('测试信息');
      expect(fs.appendFileSync.called).to.be.false;
    });

    it('应该处理文件写入错误', function() {
      fs.appendFileSync.throws(new Error('写入失败'));
      
      expect(() => {
        logger.info('测试信息');
      }).to.not.throw();
      
      expect(consoleStub.error.called).to.be.true;
    });
  });

  describe('日志轮转', function() {
    beforeEach(function() {
      fs.statSync.returns({ size: 2 * 1024 * 1024 }); // 2MB，超过限制
    });

    it('应该在文件大小超限时进行轮转', function() {
      logger.info('触发轮转的日志');
      
      expect(fs.renameSync.called).to.be.true;
      expect(fs.renameSync.firstCall.args[1]).to.include('.1');
    });

    it('应该删除超出数量限制的旧文件', function() {
      // 模拟已有5个备份文件
      for (let i = 1; i <= 5; i++) {
        fs.existsSync.withArgs(sinon.match(`.${i}`)).returns(true);
      }
      
      logger.info('触发轮转的日志');
      
      expect(fs.unlinkSync.called).to.be.true;
    });

    it('应该处理轮转过程中的错误', function() {
      fs.renameSync.throws(new Error('重命名失败'));
      
      expect(() => {
        logger.info('测试日志');
      }).to.not.throw();
    });
  });

  describe('日志格式化', function() {
    it('应该包含时间戳', function() {
      logger.info('格式测试');
      
      const logContent = fs.appendFileSync.firstCall.args[1];
      expect(logContent).to.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('应该包含日志级别', function() {
      logger.warn('级别测试');
      
      const logContent = fs.appendFileSync.firstCall.args[1];
      expect(logContent).to.include('[WARN]');
    });

    it('应该支持对象和数组的格式化', function() {
      const testObj = { name: '测试', value: 123 };
      logger.info('对象测试', testObj);
      
      const logContent = fs.appendFileSync.firstCall.args[1];
      expect(logContent).to.include(JSON.stringify(testObj));
    });
  });

  describe('性能监控', function() {
    it('应该记录性能指标', function() {
      const metrics = {
        duration: 1500,
        memoryUsage: 50.5,
        cpuUsage: 25.3
      };
      
      logger.performance('分析完成', metrics);
      
      expect(fs.appendFileSync.calledOnce).to.be.true;
      const logContent = fs.appendFileSync.firstCall.args[1];
      expect(logContent).to.include('duration: 1500ms');
      expect(logContent).to.include('memory: 50.5MB');
      expect(logContent).to.include('cpu: 25.3%');
    });
  });

  describe('错误处理', function() {
    it('应该处理无效的日志级别', function() {
      expect(() => {
        new Logger({ level: 'invalid' });
      }).to.throw('无效的日志级别');
    });

    it('应该处理日志目录创建失败', function() {
      fs.mkdirSync.throws(new Error('创建目录失败'));
      
      expect(() => {
        new Logger({ logDir: '/invalid/path' });
      }).to.throw('创建目录失败');
    });
  });

  describe('清理功能', function() {
    it('应该清理过期的日志文件', function() {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8); // 8天前
      
      fs.statSync.returns({ 
        size: 1024,
        mtime: oldDate
      });
      
      logger.cleanup();
      
      expect(fs.unlinkSync.called).to.be.true;
    });
  });
});
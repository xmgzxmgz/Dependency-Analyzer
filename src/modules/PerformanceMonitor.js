const os = require("os");
const process = require("process");

/**
 * 性能监控器
 * 监控分析过程中的性能指标，包括内存使用、CPU使用率、执行时间等
 */
class PerformanceMonitor {
  constructor(logger = null) {
    this.logger = logger;
    this.metrics = new Map();
    this.timers = new Map();
    this.intervals = new Map();
    this.startTime = Date.now();
    this.initialMemory = process.memoryUsage();
  }

  /**
   * 开始计时
   * @param {string} label - 计时标签
   */
  startTimer(label) {
    this.timers.set(label, {
      start: process.hrtime.bigint(),
      startTime: Date.now(),
    });

    if (this.logger) {
      this.logger.debug(`开始计时: ${label}`);
    }
  }

  /**
   * 结束计时
   * @param {string} label - 计时标签
   * @returns {Object} 计时结果
   */
  endTimer(label) {
    const timer = this.timers.get(label);
    if (!timer) {
      throw new Error(`计时器不存在: ${label}`);
    }

    const end = process.hrtime.bigint();
    const duration = Number(end - timer.start) / 1000000; // 转换为毫秒

    const result = {
      label,
      duration,
      startTime: timer.startTime,
      endTime: Date.now(),
    };

    this.timers.delete(label);
    this.recordMetric(`timer.${label}`, result);

    if (this.logger) {
      this.logger.debug(`计时结束: ${label} - ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * 记录指标
   * @param {string} name - 指标名称
   * @param {*} value - 指标值
   * @param {Object} metadata - 元数据
   */
  recordMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name).push(metric);
  }

  /**
   * 获取当前内存使用情况
   * @returns {Object} 内存使用信息
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
    };

    return {
      process: {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
      },
      system: systemMemory,
      percentage: {
        rss: (usage.rss / systemMemory.total) * 100,
        heap: (usage.heapUsed / usage.heapTotal) * 100,
      },
    };
  }

  /**
   * 获取CPU使用情况
   * @returns {Object} CPU使用信息
   */
  getCPUUsage() {
    const cpus = os.cpus();
    const usage = process.cpuUsage();

    return {
      count: cpus.length,
      model: cpus[0]?.model || "Unknown",
      speed: cpus[0]?.speed || 0,
      process: {
        user: usage.user,
        system: usage.system,
        total: usage.user + usage.system,
      },
      loadAverage: os.loadavg(),
    };
  }

  /**
   * 开始系统监控
   * @param {number} interval - 监控间隔（毫秒）
   */
  startSystemMonitoring(interval = 5000) {
    if (this.intervals.has("system")) {
      return; // 已经在监控
    }

    const intervalId = setInterval(() => {
      const memory = this.getMemoryUsage();
      const cpu = this.getCPUUsage();

      this.recordMetric("system.memory", memory);
      this.recordMetric("system.cpu", cpu);

      // 检查内存泄漏
      if (memory.process.heapUsed > this.initialMemory.heapUsed * 2) {
        if (this.logger) {
          this.logger.warn("检测到可能的内存泄漏", {
            current: memory.process.heapUsed,
            initial: this.initialMemory.heapUsed,
            ratio: memory.process.heapUsed / this.initialMemory.heapUsed,
          });
        }
      }
    }, interval);

    this.intervals.set("system", intervalId);
  }

  /**
   * 停止系统监控
   */
  stopSystemMonitoring() {
    const intervalId = this.intervals.get("system");
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete("system");
    }
  }

  /**
   * 记录文件处理性能
   * @param {string} filePath - 文件路径
   * @param {number} size - 文件大小
   * @param {number} duration - 处理时间
   */
  recordFileProcessing(filePath, size, duration) {
    this.recordMetric("file.processing", {
      filePath,
      size,
      duration,
      throughput: size / duration, // 字节/毫秒
    });
  }

  /**
   * 记录分析阶段性能
   * @param {string} phase - 阶段名称
   * @param {Object} stats - 统计信息
   */
  recordPhaseStats(phase, stats) {
    this.recordMetric(`phase.${phase}`, stats);
  }

  /**
   * 获取性能报告
   * @returns {Object} 性能报告
   */
  getPerformanceReport() {
    const totalDuration = Date.now() - this.startTime;
    const currentMemory = this.getMemoryUsage();
    const currentCPU = this.getCPUUsage();

    // 计算各阶段耗时
    const phaseTimings = {};
    for (const [name, metrics] of this.metrics) {
      if (name.startsWith("timer.")) {
        const phaseName = name.replace("timer.", "");
        phaseTimings[phaseName] =
          metrics[metrics.length - 1]?.value?.duration || 0;
      }
    }

    // 计算文件处理统计
    const fileMetrics = this.metrics.get("file.processing") || [];
    const fileStats = {
      totalFiles: fileMetrics.length,
      totalSize: fileMetrics.reduce((sum, m) => sum + m.value.size, 0),
      totalTime: fileMetrics.reduce((sum, m) => sum + m.value.duration, 0),
      averageSize:
        fileMetrics.length > 0
          ? fileMetrics.reduce((sum, m) => sum + m.value.size, 0) /
            fileMetrics.length
          : 0,
      averageTime:
        fileMetrics.length > 0
          ? fileMetrics.reduce((sum, m) => sum + m.value.duration, 0) /
            fileMetrics.length
          : 0,
    };

    // 内存使用变化
    const memoryDelta = {
      rss: currentMemory.process.rss - this.initialMemory.rss,
      heapUsed: currentMemory.process.heapUsed - this.initialMemory.heapUsed,
      heapTotal: currentMemory.process.heapTotal - this.initialMemory.heapTotal,
    };

    return {
      summary: {
        totalDuration,
        startTime: this.startTime,
        endTime: Date.now(),
      },
      phases: phaseTimings,
      files: fileStats,
      memory: {
        initial: this.initialMemory,
        current: currentMemory.process,
        delta: memoryDelta,
        peak: this.getPeakMemoryUsage(),
      },
      cpu: currentCPU,
      recommendations: this.generatePerformanceRecommendations(),
    };
  }

  /**
   * 获取峰值内存使用
   * @returns {Object} 峰值内存信息
   */
  getPeakMemoryUsage() {
    const memoryMetrics = this.metrics.get("system.memory") || [];

    if (memoryMetrics.length === 0) {
      return this.getMemoryUsage().process;
    }

    return memoryMetrics.reduce((peak, metric) => {
      const memory = metric.value.process;
      return {
        rss: Math.max(peak.rss || 0, memory.rss),
        heapUsed: Math.max(peak.heapUsed || 0, memory.heapUsed),
        heapTotal: Math.max(peak.heapTotal || 0, memory.heapTotal),
      };
    }, {});
  }

  /**
   * 生成性能优化建议
   * @returns {Array} 建议列表
   */
  generatePerformanceRecommendations() {
    const recommendations = [];
    const report = this.getPerformanceReport();

    // 内存使用建议
    if (report.memory.delta.heapUsed > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push({
        type: "memory",
        level: "warning",
        message: "内存使用量较高，建议启用缓存或减少并发处理数量",
      });
    }

    // 文件处理效率建议
    if (report.files.averageTime > 1000) {
      // 1秒
      recommendations.push({
        type: "performance",
        level: "info",
        message: "文件处理速度较慢，建议检查文件大小或启用并行处理",
      });
    }

    // 阶段耗时建议
    const slowPhases = Object.entries(report.phases)
      .filter(([_, duration]) => duration > 10000) // 10秒
      .map(([phase, _]) => phase);

    if (slowPhases.length > 0) {
      recommendations.push({
        type: "performance",
        level: "info",
        message: `以下阶段耗时较长: ${slowPhases.join(
          ", "
        )}，建议优化算法或启用缓存`,
      });
    }

    return recommendations;
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 停止所有监控
    for (const [name, intervalId] of this.intervals) {
      clearInterval(intervalId);
    }
    this.intervals.clear();

    // 清理计时器
    this.timers.clear();
  }

  /**
   * 导出指标数据
   * @param {string} format - 导出格式 (json|csv)
   * @returns {string} 导出的数据
   */
  exportMetrics(format = "json") {
    const data = {};

    for (const [name, metrics] of this.metrics) {
      data[name] = metrics;
    }

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    } else if (format === "csv") {
      // 简单的CSV导出
      let csv = "metric,timestamp,value\n";
      for (const [name, metrics] of this.metrics) {
        for (const metric of metrics) {
          csv += `${name},${metric.timestamp},${JSON.stringify(
            metric.value
          )}\n`;
        }
      }
      return csv;
    }

    throw new Error(`不支持的导出格式: ${format}`);
  }
}

module.exports = PerformanceMonitor;

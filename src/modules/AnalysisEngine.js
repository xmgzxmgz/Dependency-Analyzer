/**
 * 分析引擎
 * 在构建好的依赖图谱上执行各种分析算法
 */
class AnalysisEngine {
  constructor() {
    this.analysisResults = {};
  }

  /**
   * 执行完整的依赖分析
   * @param {Object} dependencyGraph - 依赖图谱对象
   * @returns {Object} 分析报告
   */
  analyze(dependencyGraph) {
    // 输入校验，确保依赖图结构正确
    this.validateGraph(dependencyGraph);
    const { nodes, edges, metadata } = dependencyGraph;

    // 执行各种分析算法
    const orphanComponents = this.findOrphanComponents(nodes);
    const unusedProps = this.findUnusedProps(nodes);
    const circularDependencies = this.findCircularDependencies(nodes, edges);
    const componentComplexity = this.analyzeComponentComplexity(nodes);
    const dependencyDepth = this.analyzeDependencyDepth(nodes);
    const hubComponents = this.findHubComponents(nodes);
    const deadCode = this.findDeadCode(nodes);
    const couplingAnalysis = this.analyzeCoupling(nodes, edges);

    const report = {
      summary: {
        totalComponents: metadata.nodeCount,
        totalDependencies: metadata.edgeCount,
        orphanCount: orphanComponents.length,
        unusedPropsCount: unusedProps.reduce(
          (total, comp) => total + comp.unusedProps.length,
          0
        ),
        circularDependenciesCount: circularDependencies.length,
        deadCodeCount: deadCode.length,
        density: metadata.density,
      },
      orphanComponents,
      unusedProps,
      circularDependencies,
      componentComplexity,
      dependencyDepth,
      hubComponents,
      deadCode,
      couplingAnalysis,
      recommendations: this.generateRecommendations({
        orphanComponents,
        unusedProps,
        circularDependencies,
        hubComponents,
        deadCode,
        couplingAnalysis,
      }),
    };

    this.analysisResults = report;
    return report;
  }

  /**
   * 校验依赖图谱输入结构
   * @param {Object} graph
   */
  validateGraph(graph) {
    if (!graph || typeof graph !== 'object') {
      throw new Error('Invalid dependency graph: expected an object.');
    }
    const { nodes, edges, metadata } = graph;

    // 基本结构
    if (!(nodes instanceof Map)) {
      throw new Error('Invalid graph: nodes must be a Map.');
    }
    if (!Array.isArray(edges)) {
      throw new Error('Invalid graph: edges must be an Array.');
    }
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Invalid graph: metadata must be an object.');
    }

    // metadata 字段
    const requiredMeta = ['nodeCount', 'edgeCount', 'density'];
    for (const key of requiredMeta) {
      if (!(key in metadata)) {
        throw new Error(`Invalid graph metadata: missing ${key}.`);
      }
      if (typeof metadata[key] !== 'number' || Number.isNaN(metadata[key])) {
        throw new Error(`Invalid graph metadata: ${key} must be a number.`);
      }
    }

    // 节点基本字段校验
    for (const [id, node] of nodes) {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid node id: must be a non-empty string.');
      }
      if (!node || typeof node !== 'object') {
        throw new Error(`Invalid node for id ${id}: must be an object.`);
      }
      if (typeof node.name !== 'string') {
        throw new Error(`Invalid node name for id ${id}: must be a string.`);
      }
      if (typeof node.inDegree !== 'number' || typeof node.outDegree !== 'number') {
        throw new Error(`Invalid node degrees for id ${id}: inDegree/outDegree must be numbers.`);
      }
    }

    // 边基本字段校验（宽松）
    for (const edge of edges) {
      if (!edge || typeof edge !== 'object') {
        throw new Error('Invalid edge: must be an object.');
      }
      if (!('source' in edge) || !('target' in edge)) {
        throw new Error('Invalid edge: missing source/target.');
      }
    }
  }

  /**
   * 查找孤岛组件（入度为0的组件）
   * @param {Map} nodes - 组件节点映射
   * @returns {Array} 孤岛组件列表
   */
  findOrphanComponents(nodes) {
    const orphans = [];

    for (const [nodeId, node] of nodes) {
      if (node.inDegree === 0) {
        orphans.push({
          id: nodeId,
          name: node.name,
          outDegree: node.outDegree,
          reason: node.outDegree === 0 ? "isolated" : "entry_point",
        });
      }
    }

    return orphans.sort((a, b) => b.outDegree - a.outDegree);
  }

  /**
   * 查找未使用的Props
   * @param {Map} nodes - 组件节点映射
   * @returns {Array} 未使用Props列表
   */
  findUnusedProps(nodes) {
    const unusedPropsList = [];

    for (const [nodeId, node] of nodes) {
      const unusedProps = node.getUnusedProps();

      // 如果组件使用了 ...rest 操作符，我们无法准确判断 props 是否未使用
      if (node.usesRestSpread) {
        continue;
      }

      if (unusedProps.length > 0) {
        unusedPropsList.push({
          id: nodeId,
          name: node.name,
          unusedProps,
          totalProps: node.propsDeclared.size,
          usageRate:
            (node.propsUsedInBody.size / node.propsDeclared.size) * 100,
        });
      }
    }

    return unusedPropsList.sort(
      (a, b) => b.unusedProps.length - a.unusedProps.length
    );
  }

  /**
   * 查找循环依赖
   * @param {Map} nodes - 组件节点映射
   * @param {Array} edges - 依赖边数组
   * @returns {Array} 循环依赖列表
   */
  findCircularDependencies(nodes, edges) {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    // 深度优先搜索检测循环
    const dfs = (nodeId, path) => {
      if (recursionStack.has(nodeId)) {
        // 找到循环，提取循环路径
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart);
        cycle.push(nodeId); // 闭合循环
        cycles.push({
          cycle,
          length: cycle.length - 1,
          severity: this.calculateCycleSeverity(cycle, nodes),
        });
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = nodes.get(nodeId);
      if (node) {
        for (const dependencyId of node.dependencies.keys()) {
          dfs(dependencyId, [...path]);
        }
      }

      recursionStack.delete(nodeId);
    };

    // 对每个节点执行DFS
    for (const [nodeId] of nodes) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    // 去重并排序
    const uniqueCycles = this.deduplicateCycles(cycles);
    return uniqueCycles.sort((a, b) => b.severity - a.severity);
  }

  /**
   * 计算循环依赖的严重程度
   * @param {Array} cycle - 循环路径
   * @param {Map} nodes - 组件节点映射
   * @returns {number} 严重程度分数
   */
  calculateCycleSeverity(cycle, nodes) {
    let severity = 0;

    // 循环长度影响
    severity += cycle.length * 10;

    // 涉及组件的复杂度影响
    for (const nodeId of cycle) {
      const node = nodes.get(nodeId);
      if (node) {
        severity += node.inDegree + node.outDegree;
      }
    }

    return severity;
  }

  /**
   * 去重循环依赖
   * @param {Array} cycles - 循环列表
   * @returns {Array} 去重后的循环列表
   */
  deduplicateCycles(cycles) {
    const seen = new Set();
    const unique = [];

    for (const cycle of cycles) {
      // 标准化循环表示（从最小元素开始）
      const normalized = this.normalizeCycle(cycle.cycle);
      const key = normalized.join("->");

      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          ...cycle,
          cycle: normalized,
        });
      }
    }

    return unique;
  }

  /**
   * 标准化循环表示
   * @param {Array} cycle - 循环路径
   * @returns {Array} 标准化的循环路径
   */
  normalizeCycle(cycle) {
    if (cycle.length <= 1) return cycle;

    // 找到最小元素的索引
    let minIndex = 0;
    for (let i = 1; i < cycle.length - 1; i++) {
      if (cycle[i] < cycle[minIndex]) {
        minIndex = i;
      }
    }

    // 从最小元素开始重新排列
    const normalized = [
      ...cycle.slice(minIndex, cycle.length - 1),
      ...cycle.slice(0, minIndex),
      cycle[minIndex], // 闭合循环
    ];

    return normalized;
  }

  /**
   * 分析组件复杂度
   * @param {Map} nodes - 组件节点映射
   * @returns {Array} 组件复杂度列表
   */
  analyzeComponentComplexity(nodes) {
    const complexityList = [];

    for (const [nodeId, node] of nodes) {
      const complexity = this.calculateComplexity(node);

      complexityList.push({
        id: nodeId,
        name: node.name,
        complexity,
        inDegree: node.inDegree,
        outDegree: node.outDegree,
        propsCount: node.propsDeclared.size,
        category: this.categorizeComplexity(complexity),
      });
    }

    return complexityList.sort((a, b) => b.complexity - a.complexity);
  }

  /**
   * 计算组件复杂度
   * @param {Object} node - 组件节点
   * @returns {number} 复杂度分数
   */
  calculateComplexity(node) {
    let complexity = 0;

    // 依赖复杂度
    complexity += node.outDegree * 2;

    // 被依赖复杂度
    complexity += node.inDegree * 1.5;

    // Props复杂度
    complexity += node.propsDeclared.size * 0.5;

    // 未使用Props惩罚
    complexity += node.getUnusedProps().length * 1;

    return Math.round(complexity * 100) / 100;
  }

  /**
   * 分类复杂度等级
   * @param {number} complexity - 复杂度分数
   * @returns {string} 复杂度等级
   */
  categorizeComplexity(complexity) {
    if (complexity >= 20) return "very_high";
    if (complexity >= 15) return "high";
    if (complexity >= 10) return "medium";
    if (complexity >= 5) return "low";
    return "very_low";
  }

  /**
   * 分析依赖深度
   * @param {Map} nodes - 组件节点映射
   * @returns {Object} 依赖深度分析结果
   */
  analyzeDependencyDepth(nodes) {
    const depthMap = new Map();
    const maxDepths = [];

    // 计算每个节点的最大依赖深度
    for (const [nodeId] of nodes) {
      const depth = this.calculateMaxDepth(nodeId, nodes, new Set());
      depthMap.set(nodeId, depth);
      maxDepths.push(depth);
    }

    // 统计信息
    const avgDepth =
      maxDepths.reduce((sum, d) => sum + d, 0) / maxDepths.length;
    const maxDepth = Math.max(...maxDepths);

    // 找出深度最大的组件
    const deepestComponents = [];
    for (const [nodeId, depth] of depthMap) {
      if (depth >= maxDepth * 0.8) {
        // 深度超过80%最大值的组件
        const node = nodes.get(nodeId);
        deepestComponents.push({
          id: nodeId,
          name: node.name,
          depth,
          outDegree: node.outDegree,
        });
      }
    }

    return {
      averageDepth: Math.round(avgDepth * 100) / 100,
      maxDepth,
      deepestComponents: deepestComponents.sort((a, b) => b.depth - a.depth),
      depthDistribution: this.calculateDepthDistribution(maxDepths),
    };
  }

  /**
   * 计算最大依赖深度
   * @param {string} nodeId - 节点ID
   * @param {Map} nodes - 组件节点映射
   * @param {Set} visited - 已访问节点集合
   * @returns {number} 最大深度
   */
  calculateMaxDepth(nodeId, nodes, visited) {
    if (visited.has(nodeId)) {
      return 0; // 避免循环依赖导致的无限递归
    }

    visited.add(nodeId);
    const node = nodes.get(nodeId);

    if (!node || node.dependencies.size === 0) {
      visited.delete(nodeId);
      return 0;
    }

    let maxDepth = 0;
    for (const dependencyId of node.dependencies.keys()) {
      const depth = this.calculateMaxDepth(dependencyId, nodes, visited);
      maxDepth = Math.max(maxDepth, depth + 1);
    }

    visited.delete(nodeId);
    return maxDepth;
  }

  /**
   * 计算深度分布
   * @param {Array} depths - 深度数组
   * @returns {Object} 深度分布
   */
  calculateDepthDistribution(depths) {
    const distribution = {};

    for (const depth of depths) {
      distribution[depth] = (distribution[depth] || 0) + 1;
    }

    return distribution;
  }

  /**
   * 查找枢纽组件（高度连接的组件）
   * @param {Map} nodes - 组件节点映射
   * @returns {Array} 枢纽组件列表
   */
  findHubComponents(nodes) {
    const hubs = [];
    const degrees = [];

    // 收集所有度数
    for (const [, node] of nodes) {
      degrees.push(node.inDegree + node.outDegree);
    }

    // 计算阈值（平均值 + 标准差）
    const avgDegree = degrees.reduce((sum, d) => sum + d, 0) / degrees.length;
    const variance =
      degrees.reduce((sum, d) => sum + Math.pow(d - avgDegree, 2), 0) /
      degrees.length;
    const stdDev = Math.sqrt(variance);
    const threshold = avgDegree + stdDev;

    // 找出枢纽组件
    for (const [nodeId, node] of nodes) {
      const totalDegree = node.inDegree + node.outDegree;

      if (totalDegree >= threshold) {
        hubs.push({
          id: nodeId,
          name: node.name,
          totalDegree,
          inDegree: node.inDegree,
          outDegree: node.outDegree,
          centrality: node.degreeCentrality || 0,
          impact: this.calculateHubImpact(node, nodes),
        });
      }
    }

    return hubs.sort((a, b) => b.totalDegree - a.totalDegree);
  }

  /**
   * 计算枢纽组件的影响力
   * @param {Object} hubNode - 枢纽节点
   * @param {Map} nodes - 所有节点
   * @returns {number} 影响力分数
   */
  calculateHubImpact(hubNode, nodes) {
    let impact = 0;

    // 直接影响：依赖此组件的组件数量
    impact += hubNode.inDegree * 2;

    // 间接影响：通过依赖链影响的组件
    const visited = new Set();
    const calculateIndirectImpact = (nodeId, depth) => {
      if (depth > 3 || visited.has(nodeId)) return 0; // 限制深度避免无限递归

      visited.add(nodeId);
      const node = nodes.get(nodeId);
      if (!node) return 0;

      let indirectImpact = 0;
      for (const dependentId of node.dependents) {
        indirectImpact += 1 / (depth + 1); // 距离越远影响越小
        indirectImpact += calculateIndirectImpact(dependentId, depth + 1);
      }

      return indirectImpact;
    };

    impact += calculateIndirectImpact(hubNode.id, 0);

    return Math.round(impact * 100) / 100;
  }

  /**
   * 查找死代码（未被使用的组件）
   * @param {Map} nodes - 组件节点映射
   * @returns {Array} 死代码列表
   */
  findDeadCode(nodes) {
    const deadCode = [];

    for (const [nodeId, node] of nodes) {
      // 入度为0且出度为0的组件可能是死代码
      if (node.inDegree === 0 && node.outDegree === 0) {
        deadCode.push({
          id: nodeId,
          name: node.name,
          reason: "isolated_component",
          confidence: 0.9,
        });
      }
      // 入度为0但有出度的可能是入口点，需要进一步分析
      else if (node.inDegree === 0 && node.outDegree > 0) {
        // 检查是否是真正的入口点（如页面组件、路由组件等）
        const isLikelyEntryPoint = this.isLikelyEntryPoint(node);

        if (!isLikelyEntryPoint) {
          deadCode.push({
            id: nodeId,
            name: node.name,
            reason: "unused_entry_point",
            confidence: 0.6,
            outDegree: node.outDegree,
          });
        }
      }
    }

    return deadCode.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 判断是否可能是入口点
   * @param {Object} node - 组件节点
   * @returns {boolean} 是否可能是入口点
   */
  isLikelyEntryPoint(node) {
    const entryPointPatterns = [
      /page/i,
      /route/i,
      /app/i,
      /main/i,
      /index/i,
      /layout/i,
    ];

    return entryPointPatterns.some((pattern) => pattern.test(node.name));
  }

  /**
   * 分析耦合度
   * @param {Map} nodes - 组件节点映射
   * @param {Array} edges - 依赖边数组
   * @returns {Object} 耦合度分析结果
   */
  analyzeCoupling(nodes, edges) {
    const couplingMetrics = {
      afferentCoupling: new Map(), // 传入耦合
      efferentCoupling: new Map(), // 传出耦合
      instability: new Map(), // 不稳定性
      abstractness: new Map(), // 抽象性
    };

    // 计算耦合度指标
    for (const [nodeId, node] of nodes) {
      const ca = node.inDegree; // 传入耦合
      const ce = node.outDegree; // 传出耦合
      const instability = ca + ce > 0 ? ce / (ca + ce) : 0; // 不稳定性

      couplingMetrics.afferentCoupling.set(nodeId, ca);
      couplingMetrics.efferentCoupling.set(nodeId, ce);
      couplingMetrics.instability.set(nodeId, instability);
    }

    // 找出高耦合组件
    const highCouplingComponents = [];
    for (const [nodeId, node] of nodes) {
      const totalCoupling = node.inDegree + node.outDegree;
      const instability = couplingMetrics.instability.get(nodeId);

      if (totalCoupling >= 5) {
        // 阈值可调整
        highCouplingComponents.push({
          id: nodeId,
          name: node.name,
          afferentCoupling: node.inDegree,
          efferentCoupling: node.outDegree,
          totalCoupling,
          instability,
          category: this.categorizeCoupling(totalCoupling),
        });
      }
    }

    return {
      metrics: couplingMetrics,
      highCouplingComponents: highCouplingComponents.sort(
        (a, b) => b.totalCoupling - a.totalCoupling
      ),
      averageCoupling: this.calculateAverageCoupling(nodes),
      couplingDistribution: this.calculateCouplingDistribution(nodes),
    };
  }

  /**
   * 分类耦合度等级
   * @param {number} coupling - 耦合度
   * @returns {string} 耦合度等级
   */
  categorizeCoupling(coupling) {
    if (coupling >= 15) return "very_high";
    if (coupling >= 10) return "high";
    if (coupling >= 5) return "medium";
    return "low";
  }

  /**
   * 计算平均耦合度
   * @param {Map} nodes - 组件节点映射
   * @returns {number} 平均耦合度
   */
  calculateAverageCoupling(nodes) {
    let totalCoupling = 0;

    for (const [, node] of nodes) {
      totalCoupling += node.inDegree + node.outDegree;
    }

    return nodes.size > 0 ? totalCoupling / nodes.size : 0;
  }

  /**
   * 计算耦合度分布
   * @param {Map} nodes - 组件节点映射
   * @returns {Object} 耦合度分布
   */
  calculateCouplingDistribution(nodes) {
    const distribution = { low: 0, medium: 0, high: 0, very_high: 0 };

    for (const [, node] of nodes) {
      const coupling = node.inDegree + node.outDegree;
      const category = this.categorizeCoupling(coupling);
      distribution[category]++;
    }

    return distribution;
  }

  /**
   * 生成优化建议
   * @param {Object} analysisData - 分析数据
   * @returns {Array} 建议列表
   */
  generateRecommendations(analysisData) {
    const recommendations = [];

    // 孤岛组件建议
    if (analysisData.orphanComponents.length > 0) {
      const isolatedCount = analysisData.orphanComponents.filter(
        (c) => c.reason === "isolated"
      ).length;
      if (isolatedCount > 0) {
        recommendations.push({
          type: "orphan_components",
          priority: "high",
          title: "移除孤立组件",
          description: `发现 ${isolatedCount} 个孤立组件，建议检查是否可以安全删除`,
          components: analysisData.orphanComponents
            .filter((c) => c.reason === "isolated")
            .slice(0, 5),
        });
      }
    }

    // 未使用Props建议
    if (analysisData.unusedProps.length > 0) {
      const totalUnusedProps = analysisData.unusedProps.reduce(
        (sum, c) => sum + c.unusedProps.length,
        0
      );
      recommendations.push({
        type: "unused_props",
        priority: "medium",
        title: "清理未使用的Props",
        description: `发现 ${totalUnusedProps} 个未使用的Props，建议清理以简化组件接口`,
        components: analysisData.unusedProps.slice(0, 5),
      });
    }

    // 循环依赖建议
    if (analysisData.circularDependencies.length > 0) {
      recommendations.push({
        type: "circular_dependencies",
        priority: "critical",
        title: "解决循环依赖",
        description: `发现 ${analysisData.circularDependencies.length} 个循环依赖，需要重构以避免潜在问题`,
        cycles: analysisData.circularDependencies.slice(0, 3),
      });
    }

    // 高耦合组件建议
    if (analysisData.couplingAnalysis.highCouplingComponents.length > 0) {
      const veryHighCouplingCount =
        analysisData.couplingAnalysis.highCouplingComponents.filter(
          (c) => c.category === "very_high"
        ).length;

      if (veryHighCouplingCount > 0) {
        recommendations.push({
          type: "high_coupling",
          priority: "high",
          title: "降低组件耦合度",
          description: `发现 ${veryHighCouplingCount} 个高耦合组件，建议拆分或重构`,
          components: analysisData.couplingAnalysis.highCouplingComponents
            .filter((c) => c.category === "very_high")
            .slice(0, 5),
        });
      }
    }

    // 枢纽组件建议
    if (analysisData.hubComponents.length > 0) {
      recommendations.push({
        type: "hub_components",
        priority: "medium",
        title: "关注枢纽组件",
        description: `发现 ${analysisData.hubComponents.length} 个枢纽组件，建议重点维护和测试`,
        components: analysisData.hubComponents.slice(0, 3),
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

module.exports = AnalysisEngine;

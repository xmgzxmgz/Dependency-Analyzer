/**
 * 组件节点类
 * 表示依赖图中的一个组件
 */
class ComponentNode {
  /**
   * 构造函数
   * @param {string} id - 组件唯一标识（文件路径）
   * @param {string} name - 组件名称
   */
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.propsDeclared = new Set();
    this.propsUsedInBody = new Set();
    this.dependencies = new Map(); // 依赖的组件映射
    this.dependents = new Set(); // 依赖此组件的组件集合
    this.inDegree = 0; // 入度
    this.outDegree = 0; // 出度
    this.componentUsages = new Map(); // 组件使用情况
    this.cyclomaticComplexity = 0; // 圈复杂度
    
    // 新增：增强的代码关联性数据
    this.functionCalls = new Map(); // 函数调用关系
    this.variableReferences = new Map(); // 变量引用关系
    this.dataFlow = new Map(); // 数据流分析
    this.hookUsage = new Set(); // Hook使用情况
    this.eventHandlers = new Set(); // 事件处理器
    this.stateManagement = new Map(); // 状态管理
    this.componentLifecycle = new Set(); // 组件生命周期
    this.conditionalRendering = []; // 条件渲染
    this.dynamicImports = new Set(); // 动态导入
    this.contextUsage = new Set(); // Context使用
    this.methodChains = new Map(); // 方法链调用
    this.asyncOperations = new Set(); // 异步操作
  }

  /**
   * 添加依赖
   * @param {string} targetId - 目标组件ID
   * @param {Object} dependency - 依赖信息
   */
  addDependency(targetId, dependency) {
    this.dependencies.set(targetId, dependency);
    this.outDegree++;
  }

  /**
   * 添加依赖者
   * @param {string} sourceId - 源组件ID
   */
  addDependent(sourceId) {
    this.dependents.add(sourceId);
    this.inDegree++;
  }

  /**
   * 获取未使用的Props
   * @returns {Array} 未使用的Props列表
   */
  getUnusedProps() {
    const unused = [];
    for (const prop of this.propsDeclared) {
      if (!this.propsUsedInBody.has(prop)) {
        unused.push(prop);
      }
    }
    return unused;
  }

  /**
   * 转换为JSON格式
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      propsDeclared: Array.from(this.propsDeclared),
      propsUsedInBody: Array.from(this.propsUsedInBody),
      unusedProps: this.getUnusedProps(),
      inDegree: this.inDegree,
      outDegree: this.outDegree,
      cyclomaticComplexity: this.cyclomaticComplexity,
      dependencies: Array.from(this.dependencies.keys()),
      dependents: Array.from(this.dependents),
      
      // 新增：增强的代码关联性数据
      functionCalls: this.serializeMap(this.functionCalls),
      variableReferences: this.serializeMap(this.variableReferences),
      dataFlow: this.serializeMap(this.dataFlow),
      hookUsage: Array.from(this.hookUsage),
      eventHandlers: Array.from(this.eventHandlers),
      stateManagement: this.serializeMap(this.stateManagement),
      componentLifecycle: Array.from(this.componentLifecycle),
      conditionalRendering: this.conditionalRendering,
      dynamicImports: Array.from(this.dynamicImports),
      contextUsage: Array.from(this.contextUsage),
      methodChains: this.serializeMap(this.methodChains),
      asyncOperations: Array.from(this.asyncOperations)
    };
  }

  /**
   * 序列化Map对象为普通对象
   * @param {Map} map - 要序列化的Map
   * @returns {Object} 序列化后的对象
   */
  serializeMap(map) {
    const obj = {};
    for (const [key, value] of map) {
      obj[key] = value;
    }
    return obj;
  }
}

/**
 * 依赖边类
 * 表示组件间的依赖关系
 */
class DependencyEdge {
  /**
   * 构造函数
   * @param {string} source - 源组件ID
   * @param {string} target - 目标组件ID
   * @param {Object} metadata - 边的元数据
   */
  constructor(source, target, metadata = {}) {
    this.source = source;
    this.target = target;
    this.metadata = metadata;
  }

  /**
   * 转换为JSON格式
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      source: this.source,
      target: this.target,
      metadata: this.metadata
    };
  }
}

/**
 * 依赖图谱构建器
 * 将AST分析结果组织成结构化的依赖图谱
 */
const path = require('path');

class GraphBuilder {
  constructor() {
    this.nodes = new Map(); // 组件节点映射
    this.edges = []; // 依赖边数组
  }

  /**
   * 构建依赖图谱
   * @param {Array} analysisResults - AST分析结果数组
   * @returns {Object} 构建的图谱对象
   */
  buildGraph(analysisResults) {
    // 重置状态
    this.nodes.clear();
    this.edges = [];

    // 第一阶段：创建所有节点
    this.createNodes(analysisResults);

    // 第二阶段：创建边和更新度数
    this.createEdges(analysisResults);

    // 第三阶段：计算额外的图谱统计信息
    this.calculateGraphMetrics();

    return {
      nodes: this.nodes,
      edges: this.edges,
      metadata: this.getGraphMetadata()
    };
  }

  /**
   * 创建组件节点
   * @param {Array} analysisResults - 分析结果数组
   */
  createNodes(analysisResults) {
    for (const result of analysisResults) {
      if (!result) {
        continue;
      }
      // 同时为具有导出的模块创建节点（例如 re-exports 桶文件）
      if (!result.isComponent && (!result.exports || result.exports.length === 0)) {
        continue;
      }

      const node = new ComponentNode(result.filePath, result.componentName);
      
      // 设置Props信息
      node.propsDeclared = new Set(result.propsDeclared);
      node.propsUsedInBody = new Set(result.propsUsedInBody);
      // 标记是否使用了 ...rest 展开，供未使用props分析跳过处理
      node.usesRestSpread = !!result.usesRestSpread;
      // 设置圈复杂度
      node.cyclomaticComplexity = typeof result.cyclomaticComplexity === 'number' ? result.cyclomaticComplexity : 0;
      
      // 设置组件使用情况
      if (result.componentUsages) {
        node.componentUsages = new Map(result.componentUsages);
      }

      // 新增：设置增强的代码关联性数据
      if (result.functionCalls) {
        node.functionCalls = new Map(result.functionCalls);
      }
      if (result.variableReferences) {
        node.variableReferences = new Map(result.variableReferences);
      }
      if (result.dataFlow) {
        node.dataFlow = new Map(result.dataFlow);
      }
      if (result.hookUsage) {
        node.hookUsage = new Set(result.hookUsage);
      }
      if (result.eventHandlers) {
        node.eventHandlers = new Set(result.eventHandlers);
      }
      if (result.stateManagement) {
        node.stateManagement = new Map(result.stateManagement);
      }
      if (result.componentLifecycle) {
        node.componentLifecycle = new Set(result.componentLifecycle);
      }
      if (result.conditionalRendering) {
        node.conditionalRendering = [...result.conditionalRendering];
      }
      if (result.dynamicImports) {
        node.dynamicImports = new Set(result.dynamicImports);
      }
      if (result.contextUsage) {
        node.contextUsage = new Set(result.contextUsage);
      }
      if (result.methodChains) {
        node.methodChains = new Map(result.methodChains);
      }
      if (result.asyncOperations) {
        node.asyncOperations = new Set(result.asyncOperations);
      }

      this.nodes.set(result.filePath, node);
    }
  }

  /**
   * 创建依赖边
   * @param {Array} analysisResults - 分析结果数组
   */
  createEdges(analysisResults) {
    for (const result of analysisResults) {
      if (!result || !this.nodes.has(result.filePath)) {
        continue;
      }

      const sourceNode = this.nodes.get(result.filePath);

      // 遍历所有依赖
      for (const [targetPath, dependency] of result.dependencies) {
        let targetNode = this.nodes.get(targetPath);
        // 若目标节点不存在，创建占位节点以确保图完整性
        if (!targetNode) {
          const base = path.basename(targetPath, path.extname(targetPath));
          const name = base === 'index' ? path.basename(path.dirname(targetPath)) : base;
          targetNode = new ComponentNode(targetPath, name);
          // 占位节点不含 props 信息
          targetNode.propsDeclared = new Set();
          targetNode.propsUsedInBody = new Set();
          targetNode.usesRestSpread = false;
          this.nodes.set(targetPath, targetNode);
        }
        
        if (targetNode) {
          // 创建边
          const edge = new DependencyEdge(result.filePath, targetPath, {
            importSpecifiers: dependency.specifiers,
            source: dependency.source,
            usage: result.componentUsages ? result.componentUsages.get(targetPath) : null
          });
          
          this.edges.push(edge);
          
          // 更新节点的依赖关系
          sourceNode.addDependency(targetPath, dependency);
          targetNode.addDependent(result.filePath);
        }
      }
    }
  }

  /**
   * 计算图谱指标
   */
  calculateGraphMetrics() {
    // 计算连通分量
    this.calculateConnectedComponents();
    
    // 计算中心性指标
    this.calculateCentralityMetrics();
    
    // 新增：计算代码关联性指标
    this.calculateCodeRelationshipMetrics();
  }

  /**
   * 新增：计算代码关联性指标
   */
  calculateCodeRelationshipMetrics() {
    for (const [nodeId, node] of this.nodes) {
      // 计算函数调用复杂度
      node.functionCallComplexity = this.calculateFunctionCallComplexity(node);
      
      // 计算数据流复杂度
      node.dataFlowComplexity = this.calculateDataFlowComplexity(node);
      
      // 计算状态管理复杂度
      node.stateComplexity = this.calculateStateComplexity(node);
      
      // 计算异步操作复杂度
      node.asyncComplexity = this.calculateAsyncComplexity(node);
      
      // 计算整体关联性得分
      node.relationshipScore = this.calculateRelationshipScore(node);
    }
  }

  /**
   * 新增：计算函数调用复杂度
   * @param {ComponentNode} node - 组件节点
   * @returns {number} 函数调用复杂度
   */
  calculateFunctionCallComplexity(node) {
    let complexity = 0;
    
    // 基于函数调用数量和深度
    for (const [functionName, calls] of node.functionCalls) {
      if (Array.isArray(calls)) {
        complexity += calls.length;
        // 考虑参数复杂度
        calls.forEach(call => {
          complexity += (call.argumentCount || 0) * 0.1;
        });
      }
    }
    
    // 基于方法链长度
    for (const [chainName, chains] of node.methodChains) {
      if (Array.isArray(chains)) {
        chains.forEach(chain => {
          complexity += (chain.chain?.length || 0) * 0.5;
        });
      }
    }
    
    return Math.round(complexity * 100) / 100;
  }

  /**
   * 新增：计算数据流复杂度
   * @param {ComponentNode} node - 组件节点
   * @returns {number} 数据流复杂度
   */
  calculateDataFlowComplexity(node) {
    let complexity = 0;
    
    // 基于变量引用数量
    for (const [varName, references] of node.variableReferences) {
      if (Array.isArray(references)) {
        complexity += references.length * 0.5;
      }
    }
    
    // 基于数据流依赖
    for (const [varName, flow] of node.dataFlow) {
      if (flow.dependencies && Array.isArray(flow.dependencies)) {
        complexity += flow.dependencies.length * 0.3;
      }
    }
    
    // 基于条件渲染复杂度
    complexity += node.conditionalRendering.length * 0.8;
    
    return Math.round(complexity * 100) / 100;
  }

  /**
   * 新增：计算状态管理复杂度
   * @param {ComponentNode} node - 组件节点
   * @returns {number} 状态管理复杂度
   */
  calculateStateComplexity(node) {
    let complexity = 0;
    
    // Hook使用复杂度
    complexity += node.hookUsage.size * 1.0;
    
    // 状态管理复杂度
    complexity += node.stateManagement.size * 1.5;
    
    // Context使用复杂度
    complexity += node.contextUsage.size * 2.0;
    
    // 生命周期方法复杂度
    complexity += node.componentLifecycle.size * 1.2;
    
    return Math.round(complexity * 100) / 100;
  }

  /**
   * 新增：计算异步操作复杂度
   * @param {ComponentNode} node - 组件节点
   * @returns {number} 异步操作复杂度
   */
  calculateAsyncComplexity(node) {
    let complexity = 0;
    
    // 异步操作数量
    complexity += node.asyncOperations.size * 1.5;
    
    // 动态导入复杂度
    complexity += node.dynamicImports.size * 2.0;
    
    return Math.round(complexity * 100) / 100;
  }

  /**
   * 新增：计算整体关联性得分
   * @param {ComponentNode} node - 组件节点
   * @returns {number} 关联性得分
   */
  calculateRelationshipScore(node) {
    const weights = {
      functionCall: 0.25,
      dataFlow: 0.25,
      state: 0.3,
      async: 0.2
    };
    
    const score = 
      (node.functionCallComplexity || 0) * weights.functionCall +
      (node.dataFlowComplexity || 0) * weights.dataFlow +
      (node.stateComplexity || 0) * weights.state +
      (node.asyncComplexity || 0) * weights.async;
    
    return Math.round(score * 100) / 100;
  }

  /**
   * 计算连通分量
   */
  calculateConnectedComponents() {
    const visited = new Set();
    const components = [];
    
    for (const [nodeId] of this.nodes) {
      if (!visited.has(nodeId)) {
        const component = [];
        this.dfsComponent(nodeId, visited, component);
        components.push(component);
      }
    }
    
    // 为每个节点添加连通分量信息
    components.forEach((component, index) => {
      component.forEach(nodeId => {
        const node = this.nodes.get(nodeId);
        if (node) {
          node.componentId = index;
          node.componentSize = component.length;
        }
      });
    });
    
    this.connectedComponents = components;
  }

  /**
   * 深度优先搜索连通分量
   * @param {string} nodeId - 节点ID
   * @param {Set} visited - 已访问节点集合
   * @param {Array} component - 当前连通分量
   */
  dfsComponent(nodeId, visited, component) {
    visited.add(nodeId);
    component.push(nodeId);
    
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    // 访问所有相邻节点（无向图）
    for (const dependencyId of node.dependencies.keys()) {
      if (!visited.has(dependencyId)) {
        this.dfsComponent(dependencyId, visited, component);
      }
    }
    
    for (const dependentId of node.dependents) {
      if (!visited.has(dependentId)) {
        this.dfsComponent(dependentId, visited, component);
      }
    }
  }

  /**
   * 计算中心性指标
   */
  calculateCentralityMetrics() {
    const nodeCount = this.nodes.size;
    
    for (const [nodeId, node] of this.nodes) {
      // 度中心性
      node.degreeCentrality = (node.inDegree + node.outDegree) / (nodeCount - 1);
      
      // 入度中心性
      node.inDegreeCentrality = node.inDegree / (nodeCount - 1);
      
      // 出度中心性
      node.outDegreeCentrality = node.outDegree / (nodeCount - 1);
    }
  }

  /**
   * 获取图谱元数据
   * @returns {Object} 图谱元数据
   */
  getGraphMetadata() {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.length;
    
    // 计算密度
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    
    // 计算度分布
    const degreeDistribution = this.calculateDegreeDistribution();
    
    // 查找孤立节点
    const isolatedNodes = [];
    for (const [nodeId, node] of this.nodes) {
      if (node.inDegree === 0 && node.outDegree === 0) {
        isolatedNodes.push(nodeId);
      }
    }
    
    // 查找叶子节点（只有入度没有出度）
    const leafNodes = [];
    for (const [nodeId, node] of this.nodes) {
      if (node.inDegree > 0 && node.outDegree === 0) {
        leafNodes.push(nodeId);
      }
    }
    
    // 查找根节点（只有出度没有入度）
    const rootNodes = [];
    for (const [nodeId, node] of this.nodes) {
      if (node.inDegree === 0 && node.outDegree > 0) {
        rootNodes.push(nodeId);
      }
    }
    
    return {
      nodeCount,
      edgeCount,
      density,
      degreeDistribution,
      isolatedNodes,
      leafNodes,
      rootNodes,
      connectedComponents: this.connectedComponents ? this.connectedComponents.length : 0,
      largestComponentSize: this.connectedComponents ? 
        Math.max(...this.connectedComponents.map(c => c.length)) : 0
    };
  }

  /**
   * 计算度分布
   * @returns {Object} 度分布统计
   */
  calculateDegreeDistribution() {
    const inDegrees = [];
    const outDegrees = [];
    const totalDegrees = [];
    
    for (const [, node] of this.nodes) {
      inDegrees.push(node.inDegree);
      outDegrees.push(node.outDegree);
      totalDegrees.push(node.inDegree + node.outDegree);
    }
    
    return {
      inDegree: this.calculateStatistics(inDegrees),
      outDegree: this.calculateStatistics(outDegrees),
      totalDegree: this.calculateStatistics(totalDegrees)
    };
  }

  /**
   * 计算统计信息
   * @param {Array} values - 数值数组
   * @returns {Object} 统计信息
   */
  calculateStatistics(values) {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, std: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const median = sorted.length % 2 === 0 ?
      (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 :
      sorted[Math.floor(sorted.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    return { min, max, mean, median, std };
  }

  /**
   * 查找最短路径
   * @param {string} sourceId - 源节点ID
   * @param {string} targetId - 目标节点ID
   * @returns {Array|null} 最短路径或null
   */
  findShortestPath(sourceId, targetId) {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return null;
    }
    
    if (sourceId === targetId) {
      return [sourceId];
    }
    
    const queue = [sourceId];
    const visited = new Set([sourceId]);
    const parent = new Map();
    
    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentNode = this.nodes.get(currentId);
      
      if (!currentNode) continue;
      
      // 检查所有邻居（依赖和被依赖）
      const neighbors = [
        ...currentNode.dependencies.keys(),
        ...currentNode.dependents
      ];
      
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          parent.set(neighborId, currentId);
          queue.push(neighborId);
          
          if (neighborId === targetId) {
            // 重构路径
            const path = [];
            let current = targetId;
            while (current !== undefined) {
              path.unshift(current);
              current = parent.get(current);
            }
            return path;
          }
        }
      }
    }
    
    return null; // 没有找到路径
  }

  /**
   * 转换为D3.js格式
   * @returns {Object} D3.js格式的图谱数据
   */
  toD3Format() {
    const nodes = [];
    const links = [];
    
    // 转换节点
    for (const [nodeId, node] of this.nodes) {
      nodes.push({
        id: nodeId,
        name: node.name,
        group: node.componentId || 0,
        inDegree: node.inDegree,
        outDegree: node.outDegree,
        totalDegree: node.inDegree + node.outDegree,
        cyclomaticComplexity: node.cyclomaticComplexity,
        unusedProps: node.getUnusedProps(),
        propsDeclared: Array.from(node.propsDeclared),
        propsUsedInBody: Array.from(node.propsUsedInBody),
        
        // 新增：代码关联性指标
        functionCallComplexity: node.functionCallComplexity || 0,
        dataFlowComplexity: node.dataFlowComplexity || 0,
        stateComplexity: node.stateComplexity || 0,
        asyncComplexity: node.asyncComplexity || 0,
        relationshipScore: node.relationshipScore || 0,
        
        // 新增：详细的关联性数据
        functionCallsCount: node.functionCalls.size,
        hookUsageCount: node.hookUsage.size,
        stateManagementCount: node.stateManagement.size,
        asyncOperationsCount: node.asyncOperations.size,
        conditionalRenderingCount: node.conditionalRendering.length
      });
    }
    
    // 转换边
    for (const edge of this.edges) {
      links.push({
        source: edge.source,
        target: edge.target,
        value: edge.metadata.usage ? edge.metadata.usage.count : 1
      });
    }
    
    return { nodes, links };
  }

  /**
   * 转换为JSON格式
   * @returns {Object} JSON格式的图谱数据
   */
  toJSON() {
    const nodes = {};
    for (const [nodeId, node] of this.nodes) {
      nodes[nodeId] = node.toJSON();
    }
    
    const edges = this.edges.map(edge => edge.toJSON());
    
    return {
      nodes,
      edges,
      metadata: this.getGraphMetadata()
    };
  }
}

module.exports = GraphBuilder;
const fs = require('fs-extra');
const path = require('path');

/**
 * 可视化生成器
 * 负责生成HTML报告和D3.js可视化图表
 */
class VisualizationGenerator {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * 生成可视化报告
   * @param {Object} dependencyGraph - 依赖图谱
   * @param {Object} analysisReport - 分析报告
   */
  async generateReport(dependencyGraph, analysisReport) {
    // 生成HTML报告
    await this.generateHTMLReport(dependencyGraph, analysisReport);

    // 始终生成JSON文件：优先使用配置的 jsonPath，否则与 HTML 同名 .json
    const defaultJsonPath = this.config.outputPath.replace(/\.html?$/i, '.json');
    const targetJsonPath = this.config.jsonPath || defaultJsonPath;
    await this.generateJSONReport(dependencyGraph, analysisReport, targetJsonPath);
  }

  /**
   * 生成HTML报告
   * @param {Object} dependencyGraph - 依赖图谱
   * @param {Object} analysisReport - 分析报告
   */
  async generateHTMLReport(dependencyGraph, analysisReport) {
    const d3Data = dependencyGraph.nodes.size > 0 ?
      this.convertToD3Format(dependencyGraph) :
      { nodes: [], links: [] };

    const htmlContent = this.generateHTMLTemplate(d3Data, analysisReport);

    await fs.writeFile(this.config.outputPath, htmlContent, 'utf-8');
  }

  /**
   * 生成JSON报告
   * @param {Object} dependencyGraph - 依赖图谱
   * @param {Object} analysisReport - 分析报告
   */
  async generateJSONReport(dependencyGraph, analysisReport, outputJsonPath) {
    // 顶层结构与测试期望对齐：nodes/edges/metadata/analysis
    const graphJson = this.convertGraphToJSON(dependencyGraph);
    const jsonData = {
      nodes: graphJson.nodes,
      edges: graphJson.edges,
      metadata: {
        ...graphJson.metadata,
        generatedAt: new Date().toISOString(),
        projectPath: this.config.projectPath,
        framework: this.config.framework
      },
      analysis: analysisReport
    };

    await fs.writeFile(outputJsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  }

  /**
   * 转换为D3.js格式
   * @param {Object} dependencyGraph - 依赖图谱
   * @returns {Object} D3.js格式数据
   */
  convertToD3Format(dependencyGraph) {
    const nodes = [];
    const links = [];

    // 转换节点
    for (const [nodeId, node] of dependencyGraph.nodes) {
      nodes.push({
        id: nodeId,
        name: node.name,
        group: node.componentId || 0,
        inDegree: node.inDegree,
        outDegree: node.outDegree,
        totalDegree: node.inDegree + node.outDegree,
        cyclomaticComplexity: node.cyclomaticComplexity || 0,
        unusedProps: node.getUnusedProps(),
        propsDeclared: Array.from(node.propsDeclared),
        propsUsedInBody: Array.from(node.propsUsedInBody),
        relativePath: path.relative(this.config.projectPath, nodeId)
      });
    }

    // 转换边
    for (const edge of dependencyGraph.edges) {
      links.push({
        source: edge.source,
        target: edge.target,
        value: edge.metadata.usage ? edge.metadata.usage.count : 1
      });
    }

    return { nodes, links };
  }

  /**
   * 转换图谱为JSON格式
   * @param {Object} dependencyGraph - 依赖图谱
   * @returns {Object} JSON格式图谱
   */
  convertGraphToJSON(dependencyGraph) {
    const nodes = {};
    for (const [nodeId, node] of dependencyGraph.nodes) {
      nodes[nodeId] = {
        ...node.toJSON(),
        relativePath: path.relative(this.config.projectPath, nodeId)
      };
    }

    const edges = dependencyGraph.edges.map(edge => edge.toJSON());

    return {
      nodes,
      edges,
      metadata: dependencyGraph.metadata
    };
  }

  /**
   * 生成HTML模板
   * @param {Object} d3Data - D3.js数据
   * @param {Object} analysisReport - 分析报告
   * @returns {string} HTML内容
   */
  generateHTMLTemplate(d3Data, analysisReport) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>前端组件依赖关系可视化</title>
    <script src="https://unpkg.com/d3@7.9.0/dist/d3.js"></script>
    <style>
        ${this.getCSS()}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>前端组件依赖关系可视化</h1>
            <h2 style="font-size:1rem;color:#6c757d;">依赖关系图谱</h2>
            <div class="project-info">
                <span>项目: ${path.basename(this.config.projectPath)}</span>
                <span>框架: ${this.config.framework}</span>
                <span>生成时间: ${new Date().toLocaleString('zh-CN')}</span>
            </div>
        </header>
        
        <div class="main-content">
            <div class="sidebar">
                <div class="panel">
                    <h3>📊 统计概览</h3>
                    <div class="stats">
                        <div class="stat-item">
                            <span class="stat-label">组件总数:</span>
                            <span class="stat-value">${analysisReport.summary.totalComponents}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">依赖关系:</span>
                            <span class="stat-value">${analysisReport.summary.totalDependencies}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">孤岛组件:</span>
                            <span class="stat-value warning">${analysisReport.summary.orphanCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">未使用Props:</span>
                            <span class="stat-value warning">${analysisReport.summary.unusedPropsCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">循环依赖:</span>
                            <span class="stat-value error">${analysisReport.summary.circularDependenciesCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">图密度:</span>
                            <span class="stat-value">${(analysisReport.summary.density * 100).toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>🔗 代码关联性分析</h3>
                    <div class="stats">
                        <div class="stat-item">
                            <span class="stat-label">平均函数调用复杂度:</span>
                            <span class="stat-value">${this.calculateAverageComplexity(d3Data.nodes, 'functionCallComplexity')}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均数据流复杂度:</span>
                            <span class="stat-value">${this.calculateAverageComplexity(d3Data.nodes, 'dataFlowComplexity')}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均状态管理复杂度:</span>
                            <span class="stat-value">${this.calculateAverageComplexity(d3Data.nodes, 'stateComplexity')}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均异步操作复杂度:</span>
                            <span class="stat-value">${this.calculateAverageComplexity(d3Data.nodes, 'asyncComplexity')}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均关联性得分:</span>
                            <span class="stat-value ${this.getComplexityClass(this.calculateAverageComplexity(d3Data.nodes, 'relationshipScore'))}">${this.calculateAverageComplexity(d3Data.nodes, 'relationshipScore')}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">高关联性组件:</span>
                            <span class="stat-value warning">${this.countHighComplexityNodes(d3Data.nodes)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>🎯 优化建议</h3>
                    <div class="recommendations">
                        ${this.generateRecommendationsHTML(analysisReport.recommendations)}
                    </div>
                </div>
                
                <div class="panel">
                    <h3>🔍 图例</h3>
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-color" style="background: #69b3a2;"></div>
                            <span>普通组件</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #ff6b6b;"></div>
                            <span>孤岛组件</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #4ecdc4;"></div>
                            <span>枢纽组件</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #45b7d1;"></div>
                            <span>高复杂度组件</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #ff9f43;"></div>
                            <span>高关联性组件</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #a55eea;"></div>
                            <span>状态管理组件</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color" style="background: #26de81;"></div>
                            <span>异步操作组件</span>
                        </div>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>⚙️ 控制面板</h3>
                    <div class="controls">
                        <button id="resetZoom" class="btn">重置视图</button>
                        <button id="toggleLabels" class="btn">切换标签</button>
                        <button id="togglePhysics" class="btn">暂停/继续</button>
                        
                        <div class="control-group">
                            <label for="colorMode">节点着色模式:</label>
                            <select id="colorMode" class="select-control">
                                <option value="default">默认模式</option>
                                <option value="relationship">关联性得分</option>
                                <option value="functionCall">函数调用复杂度</option>
                                <option value="dataFlow">数据流复杂度</option>
                                <option value="state">状态管理复杂度</option>
                                <option value="async">异步操作复杂度</option>
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <label for="nodeSize">节点大小基准:</label>
                            <select id="nodeSize" class="select-control">
                                <option value="degree">连接度</option>
                                <option value="relationship">关联性得分</option>
                                <option value="complexity">圈复杂度</option>
                            </select>
                        </div>
                        
                        <div class="slider-group">
                            <label for="linkDistance">连线距离:</label>
                            <input type="range" id="linkDistance" min="30" max="200" value="80">
                        </div>
                        <div class="slider-group">
                            <label for="chargeStrength">排斥力:</label>
                            <input type="range" id="chargeStrength" min="-500" max="-50" value="-200">
                        </div>
                        
                        <div class="slider-group">
                            <label for="complexityThreshold">关联性阈值:</label>
                            <input type="range" id="complexityThreshold" min="0" max="20" value="8" step="0.5">
                            <span id="thresholdValue">8.0</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="visualization-area">
                <div id="graph-container">
                    <svg id="dependency-graph"></svg>
                </div>
                
                <div id="tooltip" class="tooltip"></div>
                
                <div id="details-panel" class="details-panel">
                    <div class="details-header">
                        <h3>组件详情</h3>
                        <button id="closeDetails" class="close-btn">×</button>
                    </div>
                    <div class="details-content">
                        <p>点击组件节点查看详细信息</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // 数据注入
        const graphData = ${JSON.stringify(d3Data)};
        const analysisData = ${JSON.stringify(analysisReport)};
        
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
  }

  /**
   * 生成建议HTML
   * @param {Array} recommendations - 建议列表
   * @returns {string} HTML字符串
   */
  generateRecommendationsHTML(recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return '<p class="no-recommendations">🎉 暂无优化建议，代码结构良好！</p>';
    }

    return recommendations.slice(0, 5).map(rec => {
      const priorityClass = {
        critical: 'priority-critical',
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low'
      }[rec.priority] || 'priority-low';

      return `
        <div class="recommendation ${priorityClass}">
          <div class="rec-title">${rec.title}</div>
          <div class="rec-description">${rec.description}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * 计算平均复杂度
   * @param {Array} nodes - 节点数组
   * @param {string} field - 字段名
   * @returns {string} 格式化的平均值
   */
  calculateAverageComplexity(nodes, field) {
    if (!nodes || nodes.length === 0) return '0.00';

    const sum = nodes.reduce((acc, node) => acc + (node[field] || 0), 0);
    const average = sum / nodes.length;
    return average.toFixed(2);
  }

  /**
   * 获取复杂度等级的CSS类
   * @param {number|string} value - 复杂度值
   * @returns {string} CSS类名
   */
  getComplexityClass(value) {
    const numValue = parseFloat(value);
    if (numValue >= 10) return 'error';
    if (numValue >= 5) return 'warning';
    return '';
  }

  /**
   * 统计高关联性组件数量
   * @param {Array} nodes - 节点数组
   * @returns {number} 高关联性组件数量
   */
  countHighComplexityNodes(nodes) {
    if (!nodes || nodes.length === 0) return 0;

    return nodes.filter(node => (node.relationshipScore || 0) >= 8).length;
  }

  /**
   * 获取CSS样式
   * @returns {string} CSS字符串
   */
  getCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
            color: #333;
        }
        
        .container {
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: #fff;
            padding: 1rem 2rem;
            border-bottom: 1px solid #e9ecef;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            color: #2c3e50;
            margin-bottom: 0.5rem;
        }
        
        .project-info {
            display: flex;
            gap: 2rem;
            font-size: 0.9rem;
            color: #6c757d;
        }
        
        .main-content {
            flex: 1;
            display: flex;
            overflow: hidden;
        }
        
        .sidebar {
            width: 320px;
            background: #fff;
            border-right: 1px solid #e9ecef;
            overflow-y: auto;
            padding: 1rem;
        }
        
        .panel {
            margin-bottom: 1.5rem;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .panel h3 {
            background: #f8f9fa;
            padding: 0.75rem 1rem;
            margin: 0;
            font-size: 0.9rem;
            color: #495057;
            border-bottom: 1px solid #e9ecef;
        }
        
        .stats {
            padding: 1rem;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            font-size: 0.85rem;
        }
        
        .stat-label {
            color: #6c757d;
        }
        
        .stat-value {
            font-weight: 600;
            color: #28a745;
        }
        
        .stat-value.warning {
            color: #ffc107;
        }
        
        .stat-value.error {
            color: #dc3545;
        }
        
        .recommendations {
            padding: 1rem;
        }
        
        .recommendation {
            margin-bottom: 0.75rem;
            padding: 0.75rem;
            border-radius: 6px;
            border-left: 4px solid;
        }
        
        .priority-critical {
            background: #fff5f5;
            border-left-color: #dc3545;
        }
        
        .priority-high {
            background: #fff8e1;
            border-left-color: #ff9800;
        }
        
        .priority-medium {
            background: #f3e5f5;
            border-left-color: #9c27b0;
        }
        
        .priority-low {
            background: #e8f5e8;
            border-left-color: #4caf50;
        }
        
        .rec-title {
            font-weight: 600;
            font-size: 0.85rem;
            margin-bottom: 0.25rem;
        }
        
        .rec-description {
            font-size: 0.8rem;
            color: #6c757d;
            line-height: 1.4;
        }
        
        .legend {
            padding: 1rem;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 0.5rem;
            font-size: 0.85rem;
        }
        
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
        
        .controls {
            padding: 1rem;
        }
        
        .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            margin-bottom: 0.5rem;
            width: 100%;
            transition: background-color 0.2s;
        }
        
        .btn:hover {
            background: #0056b3;
        }
        
        .slider-group {
            margin-bottom: 1rem;
        }
        
        .slider-group label {
            display: block;
            font-size: 0.8rem;
            margin-bottom: 0.25rem;
            color: #6c757d;
        }
        
        .slider-group input[type="range"] {
            width: 100%;
        }
        
        .control-group {
            margin-bottom: 1rem;
        }
        
        .control-group label {
            display: block;
            font-size: 0.8rem;
            margin-bottom: 0.25rem;
            color: #6c757d;
        }
        
        .select-control {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 0.8rem;
            background: white;
        }
        
        .select-control:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }
        
        #thresholdValue {
            font-size: 0.8rem;
            color: #007bff;
            font-weight: 600;
            margin-left: 0.5rem;
        }
        
        .visualization-area {
            flex: 1;
            position: relative;
            overflow: hidden;
        }
        
        #graph-container {
            width: 100%;
            height: 100%;
        }
        
        #dependency-graph {
            width: 100%;
            height: 100%;
            background: #fff;
        }
        
        .node {
            cursor: pointer;
            stroke: #fff;
            stroke-width: 2px;
        }
        
        .node:hover {
            stroke: #333;
            stroke-width: 3px;
        }
        
        .link {
            stroke: #999;
            stroke-opacity: 0.6;
            fill: none;
        }
        
        .node-label {
            font-size: 12px;
            font-family: Arial, sans-serif;
            text-anchor: middle;
            pointer-events: none;
            fill: #333;
        }
        
        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
            max-width: 300px;
        }
        
        .details-panel {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 300px;
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: none;
            z-index: 1001;
        }
        
        .details-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #e9ecef;
            background: #f8f9fa;
        }
        
        .details-header h3 {
            margin: 0;
            font-size: 1rem;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6c757d;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .close-btn:hover {
            color: #333;
        }
        
        .details-content {
            padding: 1rem;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .detail-section {
            margin-bottom: 1rem;
        }
        
        .detail-section h4 {
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
            color: #495057;
        }
        
        .detail-list {
            list-style: none;
            padding: 0;
        }
        
        .detail-list li {
            padding: 0.25rem 0;
            font-size: 0.8rem;
            color: #6c757d;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .no-recommendations {
            text-align: center;
            color: #28a745;
            font-style: italic;
            padding: 1rem;
        }
        
        @media (max-width: 768px) {
            .main-content {
                flex-direction: column;
            }
            
            .sidebar {
                width: 100%;
                height: 200px;
            }
            
            .details-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 400px;
            }
        }
    `;
  }

  /**
   * 获取JavaScript代码
   * @returns {string} JavaScript字符串
   */
  getJavaScript() {
    return `
        // 全局变量
        let simulation;
        let svg;
        let g;
        let nodes, links;
        let showLabels = true;
        let isPhysicsRunning = true;
        let currentColorMode = 'default';
        let currentSizeMode = 'degree';
        let complexityThreshold = 8.0;
        
        // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            initializeVisualization();
            setupEventListeners();
        });
        
        function initializeVisualization() {
            const container = document.getElementById('graph-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            // 创建SVG
            svg = d3.select('#dependency-graph')
                .attr('width', width)
                .attr('height', height);
            
            // 创建缩放组
            g = svg.append('g');
            
            // 设置缩放行为
            const zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .on('zoom', function(event) {
                    g.attr('transform', event.transform);
                });
            
            svg.call(zoom);
            
            // 如果没有数据，显示提示
            if (!graphData.nodes || graphData.nodes.length === 0) {
                showEmptyState();
                return;
            }
            
            // 创建力模拟
            simulation = d3.forceSimulation(graphData.nodes)
                .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(80))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(20));
            
            // 绘制图形
            drawGraph();
            
            // 启动模拟
            simulation.on('tick', ticked);
        }
        
        function showEmptyState() {
            const container = d3.select('#graph-container');
            container.append('div')
                .style('position', 'absolute')
                .style('top', '50%')
                .style('left', '50%')
                .style('transform', 'translate(-50%, -50%)')
                .style('text-align', 'center')
                .style('color', '#6c757d')
                .html('<h3>暂无数据</h3><p>未发现组件依赖关系</p><p>请检查项目路径和框架设置</p>');
        }
        
        function drawGraph() {
            // 绘制连线
            const link = g.append('g')
                .attr('class', 'links')
                .selectAll('line')
                .data(graphData.links)
                .enter().append('line')
                .attr('class', 'link')
                .attr('stroke-width', d => Math.sqrt(d.value));
            
            // 绘制节点
            const node = g.append('g')
                .attr('class', 'nodes')
                .selectAll('circle')
                .data(graphData.nodes)
                .enter().append('circle')
                .attr('class', 'node')
                .attr('r', getNodeSize)
                .attr('fill', getNodeColor)
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended))
                .on('click', showNodeDetails)
                .on('mouseover', showTooltip)
                .on('mouseout', hideTooltip);
            
            // 将节点设置为全局变量以便动态更新
            window.nodes = node;
            
            // 绘制标签
            const label = g.append('g')
                .attr('class', 'labels')
                .selectAll('text')
                .data(graphData.nodes)
                .enter().append('text')
                .attr('class', 'node-label')
                .attr('dy', -20)
                .text(d => d.name)
                .style('display', showLabels ? 'block' : 'none');
            
            // 保存引用
            nodes = node;
            links = link;
            window.labels = label;
        }
        
        function getNodeColor(d) {
            switch (currentColorMode) {
                case 'relationship':
                    return getRelationshipColor(d.relationshipScore || 0);
                case 'functionCall':
                    return getComplexityColor(d.functionCallComplexity || 0);
                case 'dataFlow':
                    return getComplexityColor(d.dataFlowComplexity || 0);
                case 'state':
                    return getComplexityColor(d.stateComplexity || 0);
                case 'async':
                    return getComplexityColor(d.asyncComplexity || 0);
                default:
                    return getDefaultColor(d);
            }
        }
        
        function getDefaultColor(d) {
            // 根据节点特征确定颜色
            if (d.inDegree === 0 && d.outDegree === 0) {
                return '#ff6b6b'; // 孤立组件
            } else if ((d.relationshipScore || 0) >= complexityThreshold) {
                return '#ff9f43'; // 高关联性组件
            } else if (d.totalDegree >= 10) {
                return '#4ecdc4'; // 枢纽组件
            } else if ((d.stateComplexity || 0) >= 5) {
                return '#a55eea'; // 状态管理组件
            } else if ((d.asyncComplexity || 0) >= 3) {
                return '#26de81'; // 异步操作组件
            } else if (d.cyclomaticComplexity && d.cyclomaticComplexity >= 10) {
                return '#45b7d1'; // 高复杂度组件
            } else {
                return '#69b3a2'; // 普通组件
            }
        }
        
        function getRelationshipColor(score) {
            if (score >= 15) return '#d63031'; // 极高关联性
            if (score >= 10) return '#e17055'; // 高关联性
            if (score >= 5) return '#fdcb6e'; // 中等关联性
            if (score >= 2) return '#6c5ce7'; // 低关联性
            return '#74b9ff'; // 极低关联性
        }
        
        function getComplexityColor(complexity) {
            if (complexity >= 10) return '#d63031'; // 极高复杂度
            if (complexity >= 5) return '#e17055'; // 高复杂度
            if (complexity >= 2) return '#fdcb6e'; // 中等复杂度
            if (complexity >= 1) return '#6c5ce7'; // 低复杂度
            return '#74b9ff'; // 极低复杂度
        }
        
        function getNodeSize(d) {
            let value;
            switch (currentSizeMode) {
                case 'relationship':
                    value = d.relationshipScore || 0;
                    return Math.max(5, Math.min(20, 5 + value));
                case 'complexity':
                    value = d.cyclomaticComplexity || 0;
                    return Math.max(5, Math.min(20, 5 + value));
                case 'degree':
                default:
                    value = d.totalDegree || 0;
                    return Math.max(5, Math.min(15, 5 + value));
            }
        }
        
        function updateNodeColors() {
            if (window.nodes) {
                window.nodes.attr('fill', getNodeColor);
            }
        }
        
        function updateNodeSizes() {
            if (window.nodes) {
                window.nodes.attr('r', getNodeSize);
            }
        }
        
        function ticked() {
            if (!links || !nodes || !labels) return;
            
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            nodes
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            labels
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        }
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        function showTooltip(event, d) {
            const tooltip = d3.select('#tooltip');
            
            const tooltipContent = \`
                <strong>\${d.name}</strong><br>
                路径: \${d.relativePath}<br>
                入度: \${d.inDegree} | 出度: \${d.outDegree}<br>
                圈复杂度: \${d.cyclomaticComplexity || 0}<br>
                关联性得分: \${(d.relationshipScore || 0).toFixed(1)}<br>
                Props: \${d.propsDeclared.length} (未使用: \${d.unusedProps.length})
            \`;
            
            tooltip.style('opacity', 1)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .html(tooltipContent);
        }
        
        function hideTooltip() {
            d3.select('#tooltip').style('opacity', 0);
        }
        
        function showNodeDetails(event, d) {
            const panel = document.getElementById('details-panel');
            const content = document.querySelector('.details-content');
            
            const correlationInfo = \`
                <div class="detail-section">
                    <h4>代码关联性分析</h4>
                    <ul class="detail-list">
                        <li><strong>关联性得分:</strong> \${(d.relationshipScore || 0).toFixed(2)}</li>
                        <li><strong>函数调用复杂度:</strong> \${(d.functionCallComplexity || 0).toFixed(2)}</li>
                        <li><strong>数据流复杂度:</strong> \${(d.dataFlowComplexity || 0).toFixed(2)}</li>
                        <li><strong>状态管理复杂度:</strong> \${(d.stateComplexity || 0).toFixed(2)}</li>
                        <li><strong>异步操作复杂度:</strong> \${(d.asyncComplexity || 0).toFixed(2)}</li>
                    </ul>
                </div>
                <div class="detail-section">
                    <h4>详细统计</h4>
                    <ul class="detail-list">
                        <li><strong>函数调用数:</strong> \${d.functionCallsCount || 0}</li>
                        <li><strong>变量引用数:</strong> \${d.variableReferencesCount || 0}</li>
                        <li><strong>Hook使用数:</strong> \${d.hookUsageCount || 0}</li>
                        <li><strong>事件处理器数:</strong> \${d.eventHandlersCount || 0}</li>
                        <li><strong>异步操作数:</strong> \${d.asyncOperationsCount || 0}</li>
                    </ul>
                </div>
            \`;
            
            content.innerHTML = \`
                <div class="detail-section">
                    <h4>基本信息</h4>
                    <ul class="detail-list">
                        <li><strong>组件名:</strong> \${d.name}</li>
                        <li><strong>文件路径:</strong> \${d.relativePath}</li>
                        <li><strong>入度:</strong> \${d.inDegree}</li>
                        <li><strong>出度:</strong> \${d.outDegree}</li>
                        <li><strong>圈复杂度:</strong> \${d.cyclomaticComplexity || 0}</li>
                    </ul>
                </div>
                <div class="detail-section">
                    <h4>Props信息</h4>
                    <ul class="detail-list">
                        <li><strong>声明的Props:</strong> \${d.propsDeclared.join(', ') || '无'}</li>
                        <li><strong>使用的Props:</strong> \${d.propsUsedInBody.join(', ') || '无'}</li>
                        <li><strong>未使用的Props:</strong> \${d.unusedProps.join(', ') || '无'}</li>
                    </ul>
                </div>
                \${correlationInfo}
                \${getNodeRecommendations(d)}
            \`;
            
            panel.style.display = 'block';
        }
        
        function getNodeRecommendations(node) {
            const recommendations = [];
            
            // 基于Props的建议
            if (node.unusedProps.length > 0) {
                recommendations.push('清理未使用的Props以简化组件接口');
            }
            
            // 基于连接度的建议
            if (node.inDegree === 0 && node.outDegree === 0) {
                recommendations.push('此组件可能是死代码，考虑删除');
            }
            
            if (node.totalDegree >= 10) {
                recommendations.push('此组件是系统枢纽，需要重点维护和测试');
            }
            
            // 基于圈复杂度的建议
            if (node.cyclomaticComplexity && node.cyclomaticComplexity >= 10) {
                recommendations.push('圈复杂度较高，考虑拆分函数或简化条件分支');
            }
            
            // 基于代码关联性的建议
            if ((node.relationshipScore || 0) >= 15) {
                recommendations.push('关联性得分极高，建议重构以降低组件间耦合');
            } else if ((node.relationshipScore || 0) >= 10) {
                recommendations.push('关联性得分较高，考虑优化组件设计');
            }
            
            if ((node.functionCallComplexity || 0) >= 8) {
                recommendations.push('函数调用复杂度高，考虑简化函数调用链或减少参数复杂度');
            }
            
            if ((node.dataFlowComplexity || 0) >= 8) {
                recommendations.push('数据流复杂度高，建议优化数据传递方式或减少变量依赖');
            }
            
            if ((node.stateComplexity || 0) >= 8) {
                recommendations.push('状态管理复杂度高，考虑使用状态管理库或简化状态结构');
            }
            
            if ((node.asyncComplexity || 0) >= 5) {
                recommendations.push('异步操作复杂度高，建议优化异步处理逻辑或减少并发操作');
            }
            
            if (recommendations.length === 0) {
                return '<div class="detail-section"><h4>✅ 无需优化</h4><p>此组件结构良好</p></div>';
            }
            
            return \`<div class="detail-section"><h4>🎯 优化建议</h4><ul class="detail-list">\${recommendations.map(rec => \`<li>\${rec}</li>\`).join('')}</ul></div>\`;
        }
        
        function setupEventListeners() {
            // 重置缩放
            document.getElementById('resetZoom').addEventListener('click', function() {
                svg.transition().duration(750).call(
                    d3.zoom().transform,
                    d3.zoomIdentity
                );
            });
            
            // 切换标签
            document.getElementById('toggleLabels').addEventListener('click', function() {
                showLabels = !showLabels;
                if (window.labels) {
                    window.labels.style('display', showLabels ? 'block' : 'none');
                }
            });
            
            // 暂停/继续物理模拟
            document.getElementById('togglePhysics').addEventListener('click', function() {
                if (simulation) {
                    if (isPhysicsRunning) {
                        simulation.stop();
                        this.textContent = '继续';
                    } else {
                        simulation.restart();
                        this.textContent = '暂停';
                    }
                    isPhysicsRunning = !isPhysicsRunning;
                }
            });
            
            // 连线距离滑块
            document.getElementById('linkDistance').addEventListener('input', function() {
                if (simulation) {
                    simulation.force('link').distance(+this.value);
                    simulation.alpha(0.3).restart();
                }
            });
            
            // 排斥力滑块
            document.getElementById('chargeStrength').addEventListener('input', function() {
                if (simulation) {
                    simulation.force('charge').strength(+this.value);
                    simulation.alpha(0.3).restart();
                }
            });
            
            // 关闭详情面板
            document.getElementById('closeDetails').addEventListener('click', function() {
                document.getElementById('details-panel').style.display = 'none';
            });
            
            // 节点着色模式切换
            document.getElementById('colorMode').addEventListener('change', function() {
                currentColorMode = this.value;
                updateNodeColors();
            });
            
            // 节点大小模式切换
            document.getElementById('sizeMode').addEventListener('change', function() {
                currentSizeMode = this.value;
                updateNodeSizes();
            });
            
            // 关联性阈值调整
            document.getElementById('complexityThreshold').addEventListener('input', function() {
                complexityThreshold = parseFloat(this.value);
                document.getElementById('thresholdValue').textContent = this.value;
                updateNodeColors();
            });
            
            // 窗口大小变化
            window.addEventListener('resize', function() {
                const container = document.getElementById('graph-container');
                const width = container.clientWidth;
                const height = container.clientHeight;
                
                svg.attr('width', width).attr('height', height);
                
                if (simulation) {
                    simulation.force('center', d3.forceCenter(width / 2, height / 2));
                    simulation.alpha(0.3).restart();
                }
            });
        }
    `;
  }
}

module.exports = VisualizationGenerator;

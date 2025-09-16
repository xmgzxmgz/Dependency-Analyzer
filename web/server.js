/**
 * 依赖分析工具 - Web服务器
 * 提供前端界面和API接口
 */

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 静态文件服务
app.use('/test-output', express.static(path.join(__dirname, '../test-output')));

/**
 * 主页路由
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * 获取项目文件列表
 */
app.get('/api/projects', async (req, res) => {
    try {
        const examplesPath = path.join(__dirname, '../examples');
        const projects = [];
        
        try {
            const dirs = await fs.readdir(examplesPath);
            for (const dir of dirs) {
                const projectPath = path.join(examplesPath, dir);
                const stat = await fs.stat(projectPath);
                if (stat.isDirectory()) {
                    const srcPath = path.join(projectPath, 'src');
                    try {
                        await fs.access(srcPath);
                        projects.push({
                            name: dir,
                            path: `examples/${dir}/src`,
                            fullPath: srcPath
                        });
                    } catch (e) {
                        // src目录不存在，跳过
                    }
                }
            }
        } catch (e) {
            console.log('Examples目录不存在');
        }
        
        res.json({ projects });
    } catch (error) {
        console.error('获取项目列表失败:', error);
        res.status(500).json({ error: '获取项目列表失败' });
    }
});

/**
 * 执行项目分析
 */
app.post('/api/analyze', async (req, res) => {
    try {
        const { projectPath, config } = req.body;
        
        if (!projectPath) {
            return res.status(400).json({ error: '项目路径不能为空' });
        }
        
        // 构建分析命令
        const args = [
            'start', '--',
            'analyze', projectPath,
            '--framework', config.framework || 'auto',
            '--output', 'test-output/dependency-graph.html',
            '--json', 'test-output/graph-data.json'
        ];
        
        if (config.maxDepth) {
            args.push('--max-depth', config.maxDepth.toString());
        }
        
        if (config.includeNodeModules) {
            args.push('--include-node-modules');
        }
        
        if (config.excludePatterns && config.excludePatterns.length > 0) {
            args.push('--exclude', config.excludePatterns.join(','));
        }
        
        console.log('执行分析命令:', 'npm', args.join(' '));
        
        // 执行分析
        const child = spawn('npm', args, {
            cwd: path.join(__dirname, '..'),
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', async (code) => {
            if (code === 0) {
                try {
                    // 读取分析结果
                    const jsonPath = path.join(__dirname, '../test-output/graph-data.json');
                    const jsonData = await fs.readFile(jsonPath, 'utf8');
                    const result = JSON.parse(jsonData);
                    
                    res.json({
                        success: true,
                        result: {
                            totalComponents: result.graph.nodes.length,
                            totalDependencies: result.graph.edges.length,
                            orphanComponents: result.analysis.summary.orphanComponents || 0,
                            unusedProps: result.analysis.summary.unusedProps || 0,
                            reportPath: 'test-output/dependency-graph.html',
                            jsonPath: 'test-output/graph-data.json',
                            stdout,
                            stderr
                        }
                    });
                } catch (error) {
                    console.error('读取分析结果失败:', error);
                    res.json({
                        success: true,
                        result: {
                            totalComponents: 0,
                            totalDependencies: 0,
                            orphanComponents: 0,
                            unusedProps: 0,
                            reportPath: 'test-output/dependency-graph.html',
                            jsonPath: 'test-output/graph-data.json',
                            stdout,
                            stderr
                        }
                    });
                }
            } else {
                res.status(500).json({
                    success: false,
                    error: '分析失败',
                    stdout,
                    stderr
                });
            }
        });
        
        child.on('error', (error) => {
            console.error('执行分析命令失败:', error);
            res.status(500).json({
                success: false,
                error: '执行分析命令失败: ' + error.message
            });
        });
        
    } catch (error) {
        console.error('分析请求处理失败:', error);
        res.status(500).json({
            success: false,
            error: '分析请求处理失败: ' + error.message
        });
    }
});

/**
 * 获取分析报告列表
 */
app.get('/api/reports', async (req, res) => {
    try {
        const outputPath = path.join(__dirname, '../test-output');
        const reports = [];
        
        try {
            const files = await fs.readdir(outputPath);
            for (const file of files) {
                if (file.endsWith('.html')) {
                    const filePath = path.join(outputPath, file);
                    const stat = await fs.stat(filePath);
                    
                    // 尝试读取对应的JSON文件获取详细信息
                    const jsonFile = file.replace('.html', '.json');
                    const jsonPath = path.join(outputPath, jsonFile);
                    let details = {};
                    
                    try {
                        const jsonData = await fs.readFile(jsonPath, 'utf8');
                        const data = JSON.parse(jsonData);
                        details = {
                            components: data.graph.nodes.length,
                            dependencies: data.graph.edges.length,
                            orphans: data.analysis.summary.orphanComponents || 0,
                            unusedProps: data.analysis.summary.unusedProps || 0
                        };
                    } catch (e) {
                        // JSON文件不存在或格式错误
                        details = {
                            components: 0,
                            dependencies: 0,
                            orphans: 0,
                            unusedProps: 0
                        };
                    }
                    
                    reports.push({
                        id: file.replace('.html', ''),
                        title: file.replace('.html', '').replace(/-/g, ' '),
                        path: file,
                        date: stat.mtime.toLocaleString(),
                        size: stat.size,
                        ...details
                    });
                }
            }
        } catch (e) {
            console.log('输出目录不存在或为空');
        }
        
        // 按修改时间排序
        reports.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json({ reports });
    } catch (error) {
        console.error('获取报告列表失败:', error);
        res.status(500).json({ error: '获取报告列表失败' });
    }
});

/**
 * 删除报告
 */
app.delete('/api/reports/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const outputPath = path.join(__dirname, '../test-output');
        
        // 删除HTML和JSON文件
        const htmlFile = path.join(outputPath, `${id}.html`);
        const jsonFile = path.join(outputPath, `${id}.json`);
        
        try {
            await fs.unlink(htmlFile);
        } catch (e) {
            console.log('HTML文件不存在:', htmlFile);
        }
        
        try {
            await fs.unlink(jsonFile);
        } catch (e) {
            console.log('JSON文件不存在:', jsonFile);
        }
        
        res.json({ success: true, message: '报告删除成功' });
    } catch (error) {
        console.error('删除报告失败:', error);
        res.status(500).json({ error: '删除报告失败' });
    }
});

/**
 * 获取系统信息
 */
app.get('/api/system', (req, res) => {
    res.json({
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 依赖分析工具Web界面已启动`);
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`📊 API文档: http://localhost:${PORT}/api/health`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    process.exit(0);
});
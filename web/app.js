/**
 * 前端依赖分析工具 - Web界面
 * 主要功能：项目分析、报告查看、设置管理
 */

class DependencyAnalyzerApp {
    constructor() {
        this.currentTab = 'analyze';
        this.analysisInProgress = false;
        this.analysisStartTime = null;
        this.settings = this.loadSettings();
        this.reports = [];
        
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        this.bindEvents();
        this.loadReports();
        this.applySettings();
        this.updateStatus('就绪');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 导航标签切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 项目选择
        document.getElementById('selectProject').addEventListener('click', () => {
            this.selectProject();
        });

        // 快速选择项目
        document.querySelectorAll('[data-path]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const path = e.currentTarget.dataset.path;
                document.getElementById('projectPath').value = path;
            });
        });

        // 高级选项切换
        document.getElementById('toggleAdvanced').addEventListener('click', () => {
            this.toggleAdvancedOptions();
        });

        // 深度滑块
        const maxDepthSlider = document.getElementById('maxDepth');
        const maxDepthValue = document.getElementById('maxDepthValue');
        maxDepthSlider.addEventListener('input', (e) => {
            maxDepthValue.textContent = e.target.value;
        });

        // 分析控制
        document.getElementById('startAnalysis').addEventListener('click', () => {
            this.startAnalysis();
        });

        document.getElementById('stopAnalysis').addEventListener('click', () => {
            this.stopAnalysis();
        });

        // 结果操作
        document.getElementById('viewFullReport').addEventListener('click', () => {
            this.viewFullReport();
        });

        document.getElementById('downloadJson').addEventListener('click', () => {
            this.downloadJson();
        });

        // 报告管理
        document.getElementById('refreshReports').addEventListener('click', () => {
            this.loadReports();
        });

        document.getElementById('closeViewer').addEventListener('click', () => {
            this.closeReportViewer();
        });

        // 设置管理
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        document.getElementById('clearCache').addEventListener('click', () => {
            this.clearCache();
        });

        // 主题切换
        document.getElementById('theme').addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });

        // 模态框
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalCancel').addEventListener('click', () => {
            this.hideModal();
        });

        // 点击模态框背景关闭
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.hideModal();
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    /**
     * 切换标签页
     * @param {string} tabName - 标签页名称
     */
    switchTab(tabName) {
        // 更新导航状态
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // 特定标签页的初始化
        if (tabName === 'reports') {
            this.loadReports();
        }
    }

    /**
     * 选择项目目录
     */
    async selectProject() {
        try {
            // 在实际应用中，这里会调用文件选择API
            // 目前使用模拟的方式
            const path = await this.showDirectoryPicker();
            if (path) {
                document.getElementById('projectPath').value = path;
                this.showNotification('success', '项目选择成功', `已选择项目：${path}`);
            }
        } catch (error) {
            this.showNotification('error', '选择失败', '无法选择项目目录');
        }
    }

    /**
     * 模拟目录选择器
     */
    async showDirectoryPicker() {
        return new Promise((resolve) => {
            const paths = [
                'examples/react-demo/src',
                'examples/vue-demo/src',
                'examples/angular-demo/src',
                '/path/to/your/project'
            ];
            
            const path = prompt('请输入项目路径（或选择示例）:\n' + 
                paths.map((p, i) => `${i + 1}. ${p}`).join('\n'));
            
            if (path) {
                const index = parseInt(path) - 1;
                if (index >= 0 && index < paths.length) {
                    resolve(paths[index]);
                } else {
                    resolve(path);
                }
            } else {
                resolve(null);
            }
        });
    }

    /**
     * 切换高级选项显示
     */
    toggleAdvancedOptions() {
        const toggle = document.getElementById('toggleAdvanced');
        const options = document.getElementById('advancedOptions');
        
        toggle.classList.toggle('active');
        options.classList.toggle('show');
    }

    /**
     * 开始分析
     */
    async startAnalysis() {
        const projectPath = document.getElementById('projectPath').value.trim();
        if (!projectPath) {
            this.showNotification('warning', '请选择项目', '请先选择要分析的项目目录');
            return;
        }

        // 获取分析配置
        const config = this.getAnalysisConfig();
        
        // 更新UI状态
        this.analysisInProgress = true;
        this.analysisStartTime = Date.now();
        this.updateAnalysisUI(true);
        
        try {
            // 显示进度
            this.showAnalysisProgress();
            
            // 执行分析
            const result = await this.performAnalysis(projectPath, config);
            
            // 显示结果
            this.showAnalysisResults(result);
            this.showNotification('success', '分析完成', '项目依赖分析已完成');
            
        } catch (error) {
            console.error('分析失败:', error);
            this.showNotification('error', '分析失败', error.message || '分析过程中发生错误');
        } finally {
            this.analysisInProgress = false;
            this.updateAnalysisUI(false);
        }
    }

    /**
     * 获取分析配置
     */
    getAnalysisConfig() {
        const framework = document.querySelector('input[name="framework"]:checked').value;
        const includeNodeModules = document.getElementById('includeNodeModules').checked;
        const enableCache = document.getElementById('enableCache').checked;
        const deepAnalysis = document.getElementById('deepAnalysis').checked;
        const maxDepth = parseInt(document.getElementById('maxDepth').value);
        const excludePatterns = document.getElementById('excludePatterns').value
            .split(',')
            .map(p => p.trim())
            .filter(p => p);

        return {
            framework,
            includeNodeModules,
            enableCache,
            deepAnalysis,
            maxDepth,
            excludePatterns
        };
    }

    /**
     * 执行分析（真实API调用）
     */
    async performAnalysis(projectPath, config) {
        this.updateProgressLog('🚀 开始分析项目...');
        this.updateProgress(10, 100);
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectPath,
                    config
                })
            });
            
            this.updateProgress(30, 100);
            this.updateProgressLog('📡 正在处理分析请求...');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '分析请求失败');
            }
            
            this.updateProgress(60, 100);
            this.updateProgressLog('🔍 正在解析分析结果...');
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '分析失败');
            }
            
            this.updateProgress(90, 100);
            this.updateProgressLog('📊 正在生成报告...');
            
            // 添加分析时间
            data.result.analysisTime = Date.now() - this.analysisStartTime;
            
            this.updateProgress(100, 100);
            this.updateProgressLog('✅ 分析完成!');
            
            // 显示详细日志
            if (data.result.stdout) {
                this.updateProgressLog('📋 分析日志:');
                data.result.stdout.split('\n').forEach(line => {
                    if (line.trim()) {
                        this.updateProgressLog(`   ${line.trim()}`);
                    }
                });
            }
            
            return data.result;
            
        } catch (error) {
            this.updateProgressLog(`❌ 分析失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 更新分析UI状态
     */
    updateAnalysisUI(inProgress) {
        const startBtn = document.getElementById('startAnalysis');
        const stopBtn = document.getElementById('stopAnalysis');
        
        if (inProgress) {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
        } else {
            startBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
        }
    }

    /**
     * 显示分析进度
     */
    showAnalysisProgress() {
        const progressDiv = document.getElementById('analysisProgress');
        const resultsDiv = document.getElementById('quickResults');
        
        progressDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        
        // 重置进度
        this.updateProgress(0, 100);
        this.clearProgressLog();
        this.updateProgressStats(0, 0);
    }

    /**
     * 更新进度条
     */
    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = `${percentage}%`;
    }

    /**
     * 更新进度统计
     */
    updateProgressStats(files, total) {
        const progressFiles = document.getElementById('progressFiles');
        const progressTime = document.getElementById('progressTime');
        
        progressFiles.textContent = `${files}/${total} 文件`;
        
        if (this.analysisStartTime) {
            const elapsed = Math.floor((Date.now() - this.analysisStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            progressTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * 更新进度日志
     */
    updateProgressLog(message) {
        const progressLogs = document.getElementById('progressLogs');
        const timestamp = new Date().toLocaleTimeString();
        progressLogs.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        progressLogs.scrollTop = progressLogs.scrollHeight;
    }

    /**
     * 清空进度日志
     */
    clearProgressLog() {
        document.getElementById('progressLogs').innerHTML = '';
    }

    /**
     * 显示分析结果
     */
    showAnalysisResults(result) {
        const progressDiv = document.getElementById('analysisProgress');
        const resultsDiv = document.getElementById('quickResults');
        
        progressDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
        
        // 更新结果数据
        document.getElementById('totalComponents').textContent = result.totalComponents;
        document.getElementById('totalDependencies').textContent = result.totalDependencies;
        document.getElementById('orphanComponents').textContent = result.orphanComponents;
        document.getElementById('unusedProps').textContent = result.unusedProps;
        
        // 保存结果用于后续操作
        this.lastAnalysisResult = result;
        
        // 添加到报告列表
        this.addToReports(result);
    }

    /**
     * 停止分析
     */
    stopAnalysis() {
        if (this.analysisInProgress) {
            this.analysisInProgress = false;
            this.updateAnalysisUI(false);
            this.showNotification('info', '分析已停止', '用户手动停止了分析过程');
        }
    }

    /**
     * 查看完整报告
     */
    viewFullReport() {
        if (this.lastAnalysisResult && this.lastAnalysisResult.reportPath) {
            this.openReportViewer(this.lastAnalysisResult.reportPath);
        } else {
            this.showNotification('warning', '无可用报告', '请先完成项目分析');
        }
    }

    /**
     * 下载JSON数据
     */
    downloadJson() {
        if (this.lastAnalysisResult && this.lastAnalysisResult.jsonPath) {
            // 模拟下载
            this.showNotification('success', '下载开始', 'JSON数据文件下载已开始');
        } else {
            this.showNotification('warning', '无可用数据', '请先完成项目分析');
        }
    }

    /**
     * 加载报告列表
     */
    async loadReports() {
        try {
            const response = await fetch('/api/reports');
            if (!response.ok) {
                throw new Error('获取报告列表失败');
            }
            
            const data = await response.json();
            this.reports = data.reports.map(report => ({
                id: report.id,
                title: report.title || `分析报告 - ${report.id}`,
                path: report.path,
                date: report.date,
                components: report.components || 0,
                dependencies: report.dependencies || 0,
                orphans: report.orphans || 0,
                unusedProps: report.unusedProps || 0,
                reportPath: `test-output/${report.path}`,
                size: report.size
            }));
            
            this.renderReportsList();
        } catch (error) {
            console.error('加载报告失败:', error);
            this.showNotification('error', '加载失败', '无法加载报告列表');
            this.reports = [];
            this.renderReportsList();
        }
    }

    /**
     * 渲染报告列表
     */
    renderReportsList() {
        const container = document.getElementById('reportsList');
        
        if (this.reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-bar" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 16px;"></i>
                    <h3>暂无分析报告</h3>
                    <p>请先在"分析项目"页面完成项目分析</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.reports.map(report => `
            <div class="report-item">
                <div class="report-header">
                    <div>
                        <div class="report-title">${report.title}</div>
                        <div class="report-meta">
                            <i class="fas fa-folder"></i> ${report.path} • 
                            <i class="fas fa-clock"></i> ${report.date}
                        </div>
                    </div>
                    <div class="report-actions">
                        <button class="btn btn-small btn-primary" onclick="app.openReportViewer('${report.reportPath}')">
                            <i class="fas fa-eye"></i> 查看
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="app.downloadReport('${report.id}')">
                            <i class="fas fa-download"></i> 下载
                        </button>
                        <button class="btn btn-small btn-danger" onclick="app.deleteReport('${report.id}')">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
                <div class="report-stats">
                    <div class="stat-item">
                        <div class="stat-number">${report.components}</div>
                        <div class="stat-label">组件</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${report.dependencies}</div>
                        <div class="stat-label">依赖</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${report.orphans}</div>
                        <div class="stat-label">孤岛</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${report.unusedProps}</div>
                        <div class="stat-label">未使用Props</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * 打开报告查看器
     */
    openReportViewer(reportPath) {
        const viewer = document.getElementById('reportViewer');
        const frame = document.getElementById('reportFrame');
        const title = document.getElementById('viewerTitle');
        
        title.textContent = `报告查看器 - ${reportPath}`;
        frame.src = reportPath;
        viewer.style.display = 'block';
    }

    /**
     * 关闭报告查看器
     */
    closeReportViewer() {
        const viewer = document.getElementById('reportViewer');
        const frame = document.getElementById('reportFrame');
        
        viewer.style.display = 'none';
        frame.src = '';
    }

    /**
     * 下载报告
     */
    downloadReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (report) {
            this.showNotification('success', '下载开始', `报告 "${report.title}" 下载已开始`);
        }
    }

    /**
     * 删除报告
     */
    deleteReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (report) {
            this.showModal(
                '确认删除',
                `确定要删除报告 "${report.title}" 吗？此操作不可撤销。`,
                async () => {
                    try {
                        const response = await fetch(`/api/reports/${reportId}`, {
                            method: 'DELETE'
                        });
                        
                        if (!response.ok) {
                            throw new Error('删除报告失败');
                        }
                        
                        this.reports = this.reports.filter(r => r.id !== reportId);
                        this.renderReportsList();
                        this.showNotification('success', '删除成功', '报告已删除');
                    } catch (error) {
                        console.error('删除报告失败:', error);
                        this.showNotification('error', '删除失败', error.message);
                    }
                }
            );
        }
    }

    /**
     * 添加到报告列表
     */
    addToReports(result) {
        const report = {
            id: Date.now().toString(),
            title: `项目分析 - ${new Date().toLocaleDateString()}`,
            path: document.getElementById('projectPath').value,
            date: new Date().toLocaleString(),
            components: result.totalComponents,
            dependencies: result.totalDependencies,
            orphans: result.orphanComponents,
            unusedProps: result.unusedProps,
            reportPath: result.reportPath
        };
        
        this.reports.unshift(report);
        
        // 限制报告数量
        if (this.reports.length > 10) {
            this.reports = this.reports.slice(0, 10);
        }
    }

    /**
     * 加载设置
     */
    loadSettings() {
        const defaultSettings = {
            defaultFramework: 'auto',
            defaultMaxDepth: 5,
            autoSaveReports: true,
            theme: 'auto',
            showAnimations: true,
            maxCacheSize: 100,
            workerThreads: 4,
            exportFormat: 'both',
            includeSourceMaps: true
        };
        
        try {
            const saved = localStorage.getItem('dependencyAnalyzerSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('加载设置失败:', error);
            return defaultSettings;
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        try {
            const settings = {
                defaultFramework: document.getElementById('defaultFramework').value,
                defaultMaxDepth: parseInt(document.getElementById('defaultMaxDepth').value),
                autoSaveReports: document.getElementById('autoSaveReports').checked,
                theme: document.getElementById('theme').value,
                showAnimations: document.getElementById('showAnimations').checked,
                maxCacheSize: parseInt(document.getElementById('maxCacheSize').value),
                workerThreads: parseInt(document.getElementById('workerThreads').value),
                exportFormat: document.getElementById('exportFormat').value,
                includeSourceMaps: document.getElementById('includeSourceMaps').checked
            };
            
            localStorage.setItem('dependencyAnalyzerSettings', JSON.stringify(settings));
            this.settings = settings;
            this.applySettings();
            
            this.showNotification('success', '设置已保存', '所有设置已成功保存');
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showNotification('error', '保存失败', '无法保存设置');
        }
    }

    /**
     * 重置设置
     */
    resetSettings() {
        this.showModal(
            '重置设置',
            '确定要重置所有设置为默认值吗？',
            () => {
                localStorage.removeItem('dependencyAnalyzerSettings');
                this.settings = this.loadSettings();
                this.applySettings();
                this.showNotification('success', '设置已重置', '所有设置已重置为默认值');
            }
        );
    }

    /**
     * 应用设置
     */
    applySettings() {
        // 更新表单值
        document.getElementById('defaultFramework').value = this.settings.defaultFramework;
        document.getElementById('defaultMaxDepth').value = this.settings.defaultMaxDepth;
        document.getElementById('autoSaveReports').checked = this.settings.autoSaveReports;
        document.getElementById('theme').value = this.settings.theme;
        document.getElementById('showAnimations').checked = this.settings.showAnimations;
        document.getElementById('maxCacheSize').value = this.settings.maxCacheSize;
        document.getElementById('workerThreads').value = this.settings.workerThreads;
        document.getElementById('exportFormat').value = this.settings.exportFormat;
        document.getElementById('includeSourceMaps').checked = this.settings.includeSourceMaps;
        
        // 应用主题
        this.applyTheme(this.settings.theme);
        
        // 应用动画设置
        if (!this.settings.showAnimations) {
            document.body.style.setProperty('--transition', 'none');
        }
    }

    /**
     * 应用主题
     */
    applyTheme(theme) {
        document.body.removeAttribute('data-theme');
        
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            document.body.setAttribute('data-theme', 'light');
        }
        // auto 主题使用CSS媒体查询
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.showModal(
            '清除缓存',
            '确定要清除所有缓存数据吗？这可能会影响分析性能。',
            () => {
                // 模拟清除缓存
                this.showNotification('success', '缓存已清除', '所有缓存数据已清除');
            }
        );
    }

    /**
     * 显示通知
     */
    showNotification(type, title, message, duration = 5000) {
        const container = document.getElementById('notifications');
        const id = Date.now().toString();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">${title}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        container.appendChild(notification);
        
        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    }

    /**
     * 显示模态框
     */
    showModal(title, message, onConfirm, onCancel) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const confirmBtn = document.getElementById('modalConfirm');
        
        modalTitle.textContent = title;
        modalBody.textContent = message;
        
        // 移除之前的事件监听器
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // 添加新的事件监听器
        newConfirmBtn.addEventListener('click', () => {
            this.hideModal();
            if (onConfirm) onConfirm();
        });
        
        modal.style.display = 'flex';
    }

    /**
     * 隐藏模态框
     */
    hideModal() {
        document.getElementById('modal').style.display = 'none';
    }

    /**
     * 更新状态栏
     */
    updateStatus(text) {
        document.getElementById('statusText').textContent = text;
    }

    /**
     * 处理键盘快捷键
     */
    handleKeyboard(e) {
        // Ctrl/Cmd + 数字键切换标签
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
            e.preventDefault();
            const tabs = ['analyze', 'reports', 'settings'];
            const index = parseInt(e.key) - 1;
            if (tabs[index]) {
                this.switchTab(tabs[index]);
            }
        }
        
        // ESC 关闭模态框和查看器
        if (e.key === 'Escape') {
            this.hideModal();
            this.closeReportViewer();
        }
        
        // Ctrl/Cmd + Enter 开始分析
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && this.currentTab === 'analyze') {
            e.preventDefault();
            if (!this.analysisInProgress) {
                this.startAnalysis();
            }
        }
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DependencyAnalyzerApp();
});

// 全局错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    if (app) {
        app.showNotification('error', '系统错误', '发生了意外错误，请刷新页面重试');
    }
});

// 全局未处理的Promise拒绝
window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
    if (app) {
        app.showNotification('error', '系统错误', '发生了意外错误，请刷新页面重试');
    }
});
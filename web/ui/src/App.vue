<template>
  <el-container class="app-container">
    <el-aside width="220px" class="app-aside">
      <div class="brand">
        <el-icon style="margin-right: 6px"><Monitor /></el-icon>
        <span>依赖分析器</span>
      </div>
      <el-menu :default-active="currentTab" @select="(key) => switchTab(key)">
        <el-menu-item index="analyze">
          <el-icon><Search /></el-icon>
          <span>分析项目</span>
        </el-menu-item>
        <el-menu-item index="reports">
          <el-icon><Document /></el-icon>
          <span>查看报告</span>
        </el-menu-item>

        <el-menu-item index="settings">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <span class="subtitle">逻辑清晰 · 层次分明 · 深度分析</span>
        </div>
        <div class="header-right">
          <el-tag type="success">{{ statusText }}</el-tag>
        </div>
      </el-header>

      <el-main>
        <!-- Analyze Tab -->
        <div v-show="currentTab==='analyze'" id="analyze" class="analyze-container">
          <el-card shadow="hover" class="panel">
            <template #header>
              <div class="card-header">
                <span>分析项目</span>
              </div>
            </template>
            <AnalyzeForm
              :analysis-in-progress="analysisInProgress"
              :settings="settings"
              @start="onStartAnalysis"
              @stop="onStopAnalysis"
              @toggle-advanced="toggleAdvanced"
            />
          </el-card>

          <el-row :gutter="16" v-if="showProgress">
            <el-col :span="14">
              <el-card shadow="never" class="panel">
                <template #header>
                  <span>进度</span>
                </template>
                <AnalysisProgress :progress="progress" :logs="progressLogs" />
              </el-card>
            </el-col>
            <el-col :span="10">
              <el-card shadow="never" class="panel">
                <template #header>
                  <span>快速结果</span>
                </template>
                <QuickResults :result="lastResult" @view-report="onViewReport" @download-json="onDownloadJson" />
              </el-card>
            </el-col>
          </el-row>
          <el-card shadow="never" class="panel" v-if="componentDetails">
            <template #header>
              <div class="card-header">
                <span>组件详情</span>
                <el-button type="primary" link @click="loadSampleDetails">加载示例</el-button>
              </div>
            </template>
            <ComponentDetails :details="componentDetails" />
          </el-card>
        </div>

        <!-- Reports Tab -->
        <div v-show="currentTab==='reports'" id="reports" class="reports-container">
          <el-card shadow="hover" class="panel">
            <template #header>
              <div class="card-header">
                <span>分析报告</span>
                <el-button type="primary" link @click="loadReports"><el-icon><Refresh /></el-icon> 刷新</el-button>
              </div>
            </template>
            <ReportsList :reports="reports" @open="openViewer" @delete="deleteReport" />
          </el-card>
          <ReportViewer v-if="viewer.open" :path="viewer.path" @close="closeViewer" />
        </div>



        <!-- Settings Tab -->
        <div v-show="currentTab==='settings'" id="settings" class="settings-container">
          <el-card shadow="hover" class="panel">
            <template #header>
              <span>系统设置</span>
            </template>
            <SettingsPanel :settings="settings" @save="saveSettings" @reset="resetSettings" @generate="generateConfig" />
          </el-card>
        </div>
      </el-main>
      <el-footer>
        <StatusBar :text="statusText" />
      </el-footer>
    </el-container>
    <Notifications :items="notifications" @close="closeNotification" />
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import AnalyzeForm from './components/AnalyzeForm.vue'
import AnalysisProgress from './components/AnalysisProgress.vue'
import QuickResults from './components/QuickResults.vue'
import ComponentDetails from './components/ComponentDetails.vue'
import ReportsList from './components/ReportsList.vue'
import ReportViewer from './components/ReportViewer.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import Notifications from './components/Notifications.vue'
import StatusBar from './components/StatusBar.vue'

import { Monitor, Search, Document, Calendar, Setting, Refresh } from '@element-plus/icons-vue'

// State
const currentTab = ref('analyze')
const analysisInProgress = ref(false)
const showProgress = ref(false)
const progress = reactive({ percent: 0, files: 0, total: 0, elapsed: '00:00' })
const progressLogs = ref([])
const lastResult = ref(null)
const componentDetails = ref(null)
const reports = ref([])
const viewer = reactive({ open: false, path: '' })
const notifications = ref([])
const statusText = ref('就绪')

// Settings
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
}
const settings = reactive(loadSettings())

function loadSettings() {
  try {
    const saved = localStorage.getItem('dependencyAnalyzerSettings')
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

function saveSettings(val) {
  Object.assign(settings, val)
  localStorage.setItem('dependencyAnalyzerSettings', JSON.stringify(settings))
  applyTheme(settings.theme)
  notify('success', '设置已保存', '所有设置已成功保存')
}

function resetSettings() {
  Object.assign(settings, defaultSettings)
  localStorage.setItem('dependencyAnalyzerSettings', JSON.stringify(settings))
  applyTheme(settings.theme)
  notify('success', '设置已重置', '所有设置已重置为默认值')
}

function applyTheme(theme) {
  const root = document.documentElement
  document.body.removeAttribute('data-theme')
  root.classList.remove('dark')
  if (theme === 'dark') {
    document.body.setAttribute('data-theme', 'dark')
    root.classList.add('dark')
  } else if (theme === 'light') {
    document.body.setAttribute('data-theme', 'light')
  } else {
    // 自动：跟随系统偏好
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark) {
      document.body.setAttribute('data-theme', 'dark')
      root.classList.add('dark')
    } else {
      document.body.setAttribute('data-theme', 'light')
    }
  }
  if (!settings.showAnimations) document.body.style.setProperty('--transition', 'none')
}

onMounted(() => {
  applyTheme(settings.theme)
})

function switchTab(tab) {
  currentTab.value = tab
  if (tab === 'reports') loadReports()
}

function notify(type, title, message, duration = 5000) {
  const id = Date.now().toString()
  notifications.value.push({ id, type, title, message, duration })
  if (duration > 0) {
    setTimeout(() => closeNotification(id), duration)
  }
}

function closeNotification(id) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

function updateStatus(text) {
  statusText.value = text
}

function loadSampleDetails() {
  componentDetails.value = {
    name: 'App',
    filePath: 'MedSegAssist/frontend/src/App.tsx',
    inDegree: 0,
    outDegree: 11,
    cyclomaticComplexity: 1,
    props: { declared: [], used: [], unused: [] },
    correlation: {
      score: 0.0,
      functionComplexity: 0.0,
      dataFlowComplexity: 0.0,
      stateManagementComplexity: 0.0,
      asyncComplexity: 0.0
    },
    stats: {
      functionCalls: 0,
      variableRefs: 0,
      hooks: 0,
      eventHandlers: 0,
      asyncOps: 0
    },
    suggestions: [
      '此组件是系统枢纽，需要重点维护和测试的算法，很多并不能正确显示',
      '当前统计显示调用/引用较少，请确认分析范围与规则',
      '建议对关键交互与状态流转添加单元与集成测试'
    ]
  }
}

// Analysis
async function onStartAnalysis({ projectPath, config }) {
  if (!projectPath) {
    notify('warning', '请选择项目', '请先选择要分析的项目目录')
    return
  }
  analysisInProgress.value = true
  showProgress.value = true
  progress.percent = 10
  progressLogs.value = []
  updateStatus('分析中')
  const startTime = Date.now()

  try {
    progressLogs.value.push(log('🚀 开始分析项目...'))
    const resp = await fetch('/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, config })
    })
    progress.percent = 30
    progressLogs.value.push(log('📡 正在处理分析请求...'))
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.error || '分析请求失败')
    }
    progress.percent = 60
    progressLogs.value.push(log('🔍 正在解析分析结果...'))
    const data = await resp.json()
    if (!data.success) throw new Error(data.error || '分析失败')
    progress.percent = 90
    progressLogs.value.push(log('📊 正在生成报告...'))

    const result = data.result
    result.analysisTime = Date.now() - startTime
    lastResult.value = result
    progress.percent = 100
    progressLogs.value.push(log('✅ 分析完成!'))
    notify('success', '分析完成', '项目依赖分析已完成')
    addToReports(result)
  } catch (e) {
    notify('error', '分析失败', e.message || '分析过程中发生错误')
  } finally {
    analysisInProgress.value = false
    updateStatus('就绪')
  }
}

function onStopAnalysis() {
  analysisInProgress.value = false
  updateStatus('就绪')
  notify('info', '分析已停止', '用户手动停止了分析过程')
}

function onViewReport() {
  if (lastResult.value?.reportPath) {
    switchTab('reports')
    openViewer(lastResult.value.reportPath.startsWith('/') ? lastResult.value.reportPath : `/${lastResult.value.reportPath}`)
  } else {
    notify('warning', '无可用报告', '请先完成项目分析')
  }
}

function onDownloadJson() {
  if (lastResult.value?.jsonPath) {
    const url = lastResult.value.jsonPath.startsWith('/') ? lastResult.value.jsonPath : `/${lastResult.value.jsonPath}`
    window.open(url, '_blank')
    notify('success', '下载开始', 'JSON数据文件下载已开始')
  } else {
    notify('warning', '无可用数据', '请先完成项目分析')
  }
}

function log(message) {
  const ts = new Date().toLocaleTimeString()
  return `[${ts}] ${message}`
}

// Reports
async function loadReports() {
  try {
    const resp = await fetch('/api/reports')
    if (!resp.ok) throw new Error('获取报告列表失败')
    const data = await resp.json()
    reports.value = data.reports.map(r => ({
      ...r,
      reportPath: `test-output/${r.path}`
    }))
  } catch (e) {
    notify('error', '加载失败', '无法加载报告列表')
    reports.value = []
  }
}

function addToReports(result) {
  const report = {
    id: Date.now().toString(),
    title: `项目分析 - ${new Date().toLocaleDateString()}`,
    path: '',
    date: new Date().toLocaleString(),
    components: result.totalComponents,
    dependencies: result.totalDependencies,
    orphans: result.orphanComponents,
    unusedProps: result.unusedProps,
    reportPath: result.reportPath
  }
  reports.value.unshift(report)
  if (reports.value.length > 10) reports.value = reports.value.slice(0, 10)
}

function openViewer(p) { viewer.open = true; viewer.path = p }
function closeViewer() { viewer.open = false; viewer.path = '' }

async function deleteReport(id) {
  const target = reports.value.find(r => r.id === id)
  if (!target) return
  // 简化：直接删除
  try {
    const resp = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    if (!resp.ok) throw new Error('删除报告失败')
    reports.value = reports.value.filter(r => r.id !== id)
    notify('success', '删除成功', '报告已删除')
  } catch (e) {
    notify('error', '删除失败', e.message)
  }
}

// Settings / Generate config
async function generateConfig({ format, projectPath }) {
  try {
    const resp = await fetch('/api/init', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, projectPath })
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.error || '生成配置失败')
    }
    const data = await resp.json()
    notify('success', '配置已生成', `文件路径：${data.path}`)
  } catch (e) {
    notify('error', '生成失败', e.message || '无法生成默认配置文件')
  }
}

function toggleAdvanced() {}

onMounted(() => {
  applyTheme(settings.theme)
  loadReports()
})
</script>

<style>
/* 可在此添加局部样式或复用全局样式 */
</style>

<style scoped>
.app-container { height: 100vh; }
.app-aside { border-right: 1px solid var(--el-border-color-light); padding: 12px 8px; }
.brand { display:flex; align-items:center; font-weight:600; padding: 8px; margin-bottom: 8px; }
.app-header { display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--el-border-color-light); }
.subtitle { color: var(--el-text-color-secondary); }
.panel { margin-bottom: 16px; }
.card-header { display:flex; align-items:center; justify-content:space-between; }
</style>
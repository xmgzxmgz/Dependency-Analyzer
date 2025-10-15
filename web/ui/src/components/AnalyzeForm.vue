<template>
  <div class="analyze-panel">
    <el-form label-width="100px" label-position="left">
      <el-form-item label="项目路径">
        <el-input v-model="projectPath" placeholder="点击选择路径或手动输入绝对路径（建议选择项目的 src 目录；选择文件将自动取父目录）" />
        <el-button class="ml8" type="primary" plain @click="pickPath">
          <el-icon><FolderOpened /></el-icon> 选择路径
        </el-button>
      </el-form-item>

      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="框架">
            <el-select v-model="config.framework" placeholder="选择框架">
              <el-option label="自动识别" value="auto" />
              <el-option label="React" value="react" />
              <el-option label="Vue" value="vue" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最大深度">
            <el-input-number v-model="config.maxDepth" :min="1" :max="20" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="选项">
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <el-checkbox v-model="config.cache">使用缓存</el-checkbox>
          <el-checkbox v-model="config.deep">深度分析</el-checkbox>
          <el-checkbox v-model="config.includeSourceMaps">包含 Source Maps</el-checkbox>
        </div>
      </el-form-item>

      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="排除">
            <el-input v-model="config.exclude" placeholder="如 node_modules/**, dist/**" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="导出格式">
            <el-select v-model="config.exportFormat">
              <el-option label="报告 + JSON" value="both" />
              <el-option label="仅报告" value="report" />
              <el-option label="仅 JSON" value="json" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <div class="actions">
        <el-button type="primary" :disabled="analysisInProgress" @click="start">
          <el-icon><CaretRight /></el-icon> 开始分析
        </el-button>
        <el-button type="danger" plain :disabled="!analysisInProgress" @click="$emit('stop')">
          <el-icon><CircleClose /></el-icon> 停止
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { FolderOpened, CaretRight, CircleClose } from '@element-plus/icons-vue'

const props = defineProps({
  analysisInProgress: { type: Boolean, default: false },
  settings: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['start', 'stop', 'toggle-advanced'])

const projectPath = ref('')
const config = reactive({
  framework: 'auto',
  maxDepth: 5,
  cache: true,
  deep: false,
  exclude: '',
  exportFormat: 'both',
  includeSourceMaps: true
})

watch(() => props.settings, (s) => {
  if (!s) return
  config.framework = s.defaultFramework || 'auto'
  config.maxDepth = s.defaultMaxDepth || 5
  config.exportFormat = s.exportFormat || 'both'
  config.includeSourceMaps = Boolean(s.includeSourceMaps)
}, { immediate: true })

function start() {
  emit('start', { projectPath: projectPath.value, config: { ...config } })
}

async function pickPath() {
  // 优先尝试目录选择；失败则回退到文件选择（分析端会自动取父目录）
  try {
    let data
    try {
      const respDir = await fetch('/api/pick-directory')
      if (respDir.ok) {
        data = await respDir.json()
        if (data.success && data.path) {
          projectPath.value = data.path
          return
        }
      }
    } catch (_) {}

    const respFile = await fetch('/api/pick-file')
    if (!respFile.ok) throw new Error('无法打开系统选择器，请手动输入路径')
    data = await respFile.json()
    if (data.success && data.path) {
      projectPath.value = data.path.replace(/\/$/, '')
    } else {
      throw new Error(data.error || '未选择路径，请重试或手动输入')
    }
  } catch (e) {
    alert(e.message)
  }
}
</script>

<style scoped>
.analyze-panel { display: grid; gap: 16px; }
.actions { display: flex; gap: 12px; }
.ml8 { margin-left: 8px; }
</style>
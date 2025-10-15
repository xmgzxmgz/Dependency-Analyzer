<template>
  <div class="settings-panel">
    <div class="grid-two">
      <div>
        <label>主题</label>
        <select v-model="local.theme">
          <option value="auto">自动</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </div>
      <div>
        <label>动画效果</label>
        <select v-model="local.showAnimations">
          <option :value="true">开启</option>
          <option :value="false">关闭</option>
        </select>
      </div>
    </div>

    <div class="grid-two">
      <div>
        <label>默认框架</label>
        <select v-model="local.defaultFramework">
          <option value="auto">自动识别</option>
          <option value="react">React</option>
          <option value="vue">Vue</option>
        </select>
      </div>
      <div>
        <label>默认最大深度</label>
        <input v-model.number="local.defaultMaxDepth" type="number" min="1" max="20" />
      </div>
    </div>

    <div class="grid-two">
      <div>
        <label>导出格式</label>
        <select v-model="local.exportFormat">
          <option value="both">报告 + JSON</option>
          <option value="report">仅报告</option>
          <option value="json">仅 JSON</option>
        </select>
      </div>
      <div>
        <label>包含 Source Maps</label>
        <select v-model="local.includeSourceMaps">
          <option :value="true">是</option>
          <option :value="false">否</option>
        </select>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" @click="emit('save', local)"><i class="fas fa-save"></i> 保存设置</button>
      <button class="btn" @click="emit('reset')"><i class="fas fa-undo"></i> 重置</button>
    </div>

    <div class="divider"></div>

    <div class="config-generator">
      <h3>生成默认配置文件</h3>
      <div class="grid-two">
        <input v-model="projectPath" type="text" placeholder="输入项目路径，如 /Users/me/my-app" />
        <select v-model="format">
          <option value="json">.dep-analyzer.json</option>
          <option value="js">dep-analyzer.config.js</option>
        </select>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" @click="doGenerate"><i class="fas fa-wrench"></i> 生成配置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({ settings: { type: Object, default: () => ({}) } })
const emit = defineEmits(['save', 'reset', 'generate'])

const local = reactive({
  theme: 'auto',
  showAnimations: true,
  defaultFramework: 'auto',
  defaultMaxDepth: 5,
  exportFormat: 'both',
  includeSourceMaps: true
})

watch(() => props.settings, (s) => { Object.assign(local, s || {}) }, { immediate: true })

const projectPath = ref('')
const format = ref('json')

function doGenerate() {
  emit('generate', { format: format.value, projectPath: projectPath.value })
}
</script>

<style scoped>
.settings-panel { display: grid; gap: 16px; }
.grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.actions { display: flex; gap: 12px; }
.divider { height: 1px; background: var(--border); margin: 8px 0; }
.config-generator { display: grid; gap: 12px; }
</style>
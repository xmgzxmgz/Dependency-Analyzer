<template>
  <div class="progress-panel">
    <div class="progress-bar">
      <div class="progress" :style="{ width: progress.percent + '%' }"></div>
    </div>
    <div class="progress-stats">
      <span>进度：{{ progress.percent }}%</span>
      <span>文件：{{ progress.files }}/{{ progress.total }}</span>
      <span>耗时：{{ progress.elapsed }}</span>
    </div>
    <div class="logs">
      <pre v-for="(line,i) in logs" :key="i">{{ line }}</pre>
    </div>
  </div>
</template>

<script setup>
defineProps({
  progress: { type: Object, required: true },
  logs: { type: Array, default: () => [] }
})
</script>

<style scoped>
.progress-panel { display: grid; gap: 12px; }
.progress-bar { height: 8px; background: var(--border); border-radius: 6px; overflow: hidden; }
.progress { height: 8px; background: var(--primary); transition: width var(--transition); }
.progress-stats { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); }
.logs { background: var(--bg-muted); padding: 8px; border-radius: 6px; max-height: 180px; overflow: auto; }
pre { margin: 0; font-size: 12px; }
</style>
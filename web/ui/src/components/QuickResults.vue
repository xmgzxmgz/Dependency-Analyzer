<template>
  <div class="quick-results">
    <div class="summary-cards">
      <div class="card">
        <div class="card-title">组件总数</div>
        <div class="card-value">{{ result.totalComponents }}</div>
      </div>
      <div class="card">
        <div class="card-title">依赖总数</div>
        <div class="card-value">{{ result.totalDependencies }}</div>
      </div>
      <div class="card">
        <div class="card-title">孤立组件</div>
        <div class="card-value">{{ result.orphanComponents }}</div>
      </div>
      <div class="card">
        <div class="card-title">未使用属性</div>
        <div class="card-value">{{ result.unusedProps }}</div>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-primary" @click="$emit('view-report')"><i class="fas fa-eye"></i> 查看报告</button>
      <button class="btn btn-secondary" @click="$emit('download-json')"><i class="fas fa-download"></i> 下载 JSON</button>
    </div>
  </div>
</template>

<script setup>
defineProps({ result: { type: Object, required: true } })
</script>

<style scoped>
.quick-results { display: grid; gap: 12px; }
.summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.card { background: var(--bg-muted); padding: 12px; border-radius: 8px; border: 1px solid var(--border); }
.card-title { font-size: 12px; color: var(--text-secondary); }
.card-value { font-size: 20px; font-weight: 600; }
.actions { display: flex; gap: 12px; }
</style>
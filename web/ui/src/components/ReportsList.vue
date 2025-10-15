<template>
  <div class="reports-list">
    <div v-if="reports.length===0" class="empty">暂无报告</div>
    <div v-else class="list">
      <div v-for="r in reports" :key="r.id" class="item">
        <div class="meta">
          <div class="title">{{ r.title }}</div>
          <div class="sub">{{ r.date }}</div>
          <div class="stats">组件 {{ r.components }} · 依赖 {{ r.dependencies }}</div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="$emit('open', r.reportPath)"><i class="fas fa-eye"></i> 查看</button>
          <button class="btn btn-danger" @click="$emit('delete', r.id)"><i class="fas fa-trash"></i> 删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  reports: { type: Array, default: () => [] }
})
</script>

<style scoped>
.reports-list { display: grid; gap: 12px; }
.item { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; }
.title { font-weight: 600; }
.sub { font-size: 12px; color: var(--text-secondary); }
.stats { font-size: 12px; color: var(--text-secondary); }
.actions { display: flex; gap: 8px; }
.empty { color: var(--text-secondary); }
</style>
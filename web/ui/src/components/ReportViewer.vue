<template>
  <div class="viewer-root" role="dialog" aria-modal="true">
    <div class="viewer-header">
      <h3>报告查看器（全屏）</h3>
      <div class="header-actions">
        <a class="btn btn-secondary" :href="path" target="_blank" rel="noopener">新窗口打开</a>
        <button class="btn btn-ghost" @click="$emit('close')"><i class="fas fa-times"></i></button>
      </div>
    </div>
    <iframe :src="path" class="viewer"></iframe>
  </div>
</template>

<script setup>
defineProps({ path: { type: String, required: true } })
</script>

<style scoped>
.viewer-root { position: fixed; inset: 0; background: var(--bg); display: grid; grid-template-rows: auto 1fr; z-index: 999; }
.viewer-header { display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 12px; border-bottom: 1px solid var(--border); }
.header-actions { display: flex; gap: 8px; align-items: center; }
.viewer { width: 100%; height: 100%; border: 0; }
</style>
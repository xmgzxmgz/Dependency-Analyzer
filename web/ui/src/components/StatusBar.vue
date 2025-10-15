<template>
  <footer class="status-bar">
    <span>{{ text }}</span>
  </footer>
</template>

<script setup>
defineProps({ text: { type: String, default: '' } })
</script>

<style scoped>
.status-bar { position: fixed; left: 0; right: 0; bottom: 0; height: 28px; display: grid; align-content: center; padding: 0 12px; border-top: 1px solid var(--border); background: var(--bg); color: var(--text-secondary); }
</style>
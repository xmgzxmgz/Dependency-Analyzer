<template>
  <div class="notifications">
    <div v-for="n in items" :key="n.id" class="notice" :class="n.type">
      <div class="title">{{ n.title }}</div>
      <div class="message">{{ n.message }}</div>
      <button class="btn btn-ghost" @click="$emit('close', n.id)"><i class="fas fa-times"></i></button>
    </div>
  </div>
</template>

<script setup>
defineProps({ items: { type: Array, default: () => [] } })
</script>

<style scoped>
.notifications { position: fixed; right: 16px; bottom: 16px; display: grid; gap: 8px; z-index: 1000; }
.notice { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 8px; box-shadow: var(--shadow); border: 1px solid var(--border); background: var(--bg); }
.notice.success { border-color: var(--success); }
.notice.error { border-color: var(--danger); }
.notice.warning { border-color: var(--warning); }
.title { font-weight: 600; }
.message { font-size: 12px; color: var(--text-secondary); }
</style>
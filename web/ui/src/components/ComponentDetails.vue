<template>
  <div class="component-details">
    <div class="header">
      <h3>信息组件详情</h3>
      <span class="badge">{{ details?.name || '未命名组件' }}</span>
    </div>

    <div class="grid">
      <section>
        <h4>基本信息</h4>
        <div class="kv">
          <div><span class="k">组件名</span><span class="v">{{ details?.name }}</span></div>
          <div><span class="k">文件路径</span><span class="v">{{ details?.filePath }}</span></div>
          <div><span class="k">入度</span><span class="v">{{ details?.inDegree }}</span></div>
          <div><span class="k">出度</span><span class="v">{{ details?.outDegree }}</span></div>
          <div><span class="k">圈复杂度</span><span class="v">{{ details?.cyclomaticComplexity }}</span></div>
        </div>
      </section>

      <section>
        <h4>Props信息</h4>
        <div class="kv">
          <div><span class="k">声明的Props</span><span class="v">{{ fmtList(details?.props?.declared) }}</span></div>
          <div><span class="k">使用的Props</span><span class="v">{{ fmtList(details?.props?.used) }}</span></div>
          <div><span class="k">未使用的Props</span><span class="v">{{ fmtList(details?.props?.unused) }}</span></div>
        </div>
      </section>

      <section>
        <h4>代码关联性分析</h4>
        <div class="kv">
          <div><span class="k">关联性得分</span><span class="v">{{ fmtNum(details?.correlation?.score) }}</span></div>
          <div><span class="k">函数调用复杂度</span><span class="v">{{ fmtNum(details?.correlation?.functionComplexity) }}</span></div>
          <div><span class="k">数据流复杂度</span><span class="v">{{ fmtNum(details?.correlation?.dataFlowComplexity) }}</span></div>
          <div><span class="k">状态管理复杂度</span><span class="v">{{ fmtNum(details?.correlation?.stateManagementComplexity) }}</span></div>
          <div><span class="k">异步操作复杂度</span><span class="v">{{ fmtNum(details?.correlation?.asyncComplexity) }}</span></div>
        </div>
      </section>

      <section>
        <h4>详细统计</h4>
        <div class="stats">
          <div class="stat"><div class="label">函数调用数</div><div class="value">{{ details?.stats?.functionCalls ?? 0 }}</div></div>
          <div class="stat"><div class="label">变量引用数</div><div class="value">{{ details?.stats?.variableRefs ?? 0 }}</div></div>
          <div class="stat"><div class="label">Hook使用数</div><div class="value">{{ details?.stats?.hooks ?? 0 }}</div></div>
          <div class="stat"><div class="label">事件处理器数</div><div class="value">{{ details?.stats?.eventHandlers ?? 0 }}</div></div>
          <div class="stat"><div class="label">异步操作数</div><div class="value">{{ details?.stats?.asyncOps ?? 0 }}</div></div>
        </div>
      </section>
    </div>

    <section>
      <h4>🎯 优化建议</h4>
      <div class="tips" v-if="tips && tips.length">
        <ul>
          <li v-for="(t,i) in tips" :key="i">{{ t }}</li>
        </ul>
      </div>
      <div class="tips" v-else>
        <em>暂无建议</em>
      </div>
    </section>
  </div>
</template>

<script setup>
const props = defineProps({
  details: { type: Object, default: null }
})

const tips = computed(() => {
  const suggest = props.details?.suggestions
  if (Array.isArray(suggest)) return suggest
  if (typeof suggest === 'string') return [suggest]
  return []
})

function fmtList(arr) {
  if (!arr || (Array.isArray(arr) && arr.length === 0)) return '无'
  if (Array.isArray(arr)) return arr.join(', ')
  return String(arr)
}

function fmtNum(n) {
  if (n == null) return '0.00'
  try { return Number(n).toFixed(2) } catch { return String(n) }
}
</script>

<style scoped>
.component-details { display: grid; gap: 16px; }
.header { display: flex; align-items: center; gap: 8px; }
.badge { font-size: 12px; color: var(--text-secondary); background: var(--bg-muted); border: 1px solid var(--border); padding: 2px 8px; border-radius: 999px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
section { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
h4 { margin: 0 0 8px 0; font-size: 14px; color: var(--text); }
.kv { display: grid; gap: 6px; }
.kv .k { display: inline-block; min-width: 120px; color: var(--text-secondary); }
.kv .v { color: var(--text); }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.stat { background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 8px; display: grid; gap: 4px; }
.stat .label { font-size: 12px; color: var(--text-secondary); }
.stat .value { font-size: 18px; font-weight: 600; }
.tips { background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; }
ul { margin: 0; padding-left: 18px; }
li { margin: 4px 0; }
@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
<script setup>
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  paramGroups: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="card dd-card">
    <div class="dd-card-head">
      <AppIcon name="bolt" :size="16" stroke="var(--brand)" />
      <h3>设备参数</h3>
    </div>

    <div v-if="!paramGroups.length" class="rp-empty">
      <AppIcon name="info" :size="20" stroke="var(--text-3)" />
      <span>暂无参数数据</span>
    </div>

    <div v-else class="rp-list">
      <div
        v-for="item in paramGroups.flatMap(g => g.items)"
        :key="item.name"
        class="rp-row"
      >
        <span class="rp-name">{{ item.name }}</span>
        <span class="rp-val">{{ item.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dd-card-head {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 14px; margin-bottom: 18px;
  border-bottom: 1px dashed var(--line);
  flex-wrap: nowrap; white-space: nowrap;
}
.dd-card-head h3 { margin: 0; font-size: 15px; color: var(--text-0); }
.rp-list {
  display: flex; flex-direction: column; gap: 1px;
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
}

.rp-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; gap: 12px;
  background: #fff;
  transition: background 0.15s;
}
.rp-row:nth-child(even) { background: #f8fafd; }
.rp-row:hover { background: #f0f5ff; }

.rp-name {
  font-size: 12px; color: var(--text-2); flex-shrink: 0;
}
.rp-val {
  font-family: "JetBrains Mono", monospace; font-size: 12px;
  color: var(--text-0); font-weight: 500;
  text-align: right; word-break: break-all;
}

.rp-empty {
  padding: 30px 0; text-align: center; color: var(--text-3); font-size: 12px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
</style>

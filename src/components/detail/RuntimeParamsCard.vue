<script setup>
// ── components/detail/RuntimeParamsCard.vue ───────────────────────
// 运行参数卡：动态 key-value 列表，复用总览卡片 param-row 视觉语言
// 数据来源对应未来 T_ST_EquipmentAttributeValue（属性ID + 取值）

import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  params: { type: Object, required: true },
})
</script>

<template>
  <div class="card dd-card">
    <div class="dd-card-head">
      <AppIcon name="bolt" :size="16" stroke="var(--brand)" />
      <h3>运行参数</h3>
      <span class="dd-card-count">{{ Object.keys(params).length }} 项</span>
    </div>

    <div v-if="Object.keys(params).length === 0" class="rp-empty">
      <AppIcon name="info" :size="20" stroke="var(--text-3)" />
      <span>暂无运行参数数据</span>
    </div>

    <div v-else class="rp-grid">
      <div v-for="([k, v]) in Object.entries(params)" :key="k" class="rp-row">
        <span class="pl">{{ k }}</span>
        <span class="pv" :title="v">{{ v }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rp-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px;
}
.rp-row {
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #f7f9fd, #fbfcfe);
  border: 1px dashed var(--line);
  border-radius: 8px;
  min-width: 0;
}
.rp-row .pl { font-size: 12px; color: var(--text-2); flex-shrink: 0; }
.rp-row .pv {
  font-family: "JetBrains Mono", monospace; font-size: 13px;
  color: var(--text-0); font-weight: 500; text-align: right;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rp-empty {
  padding: 30px 0; text-align: center; color: var(--text-3); font-size: 12px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.dd-card-count {
  margin-left: auto; font-size: 11px; color: var(--text-3);
  font-family: "JetBrains Mono", monospace;
}
</style>

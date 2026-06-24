<script setup>
// ── components/detail/RuntimeParamsCard.vue ───────────────────────
// 运行参数卡：分组展示，每组独立区块，名称左值右单列布局

import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  paramGroups: { type: Array, default: () => [] },
})

// 每组颜色循环
const GROUP_COLORS = ['#4dc9ff', '#2bd9a8', '#a799ff', '#ffb547']
</script>

<template>
  <div class="card dd-card">
    <div class="dd-card-head">
      <AppIcon name="bolt" :size="16" stroke="var(--brand)" />
      <h3>设备参数</h3>
      <span class="dd-card-count">
        {{ paramGroups.reduce((n, g) => n + g.items.length, 0) }} 项
      </span>
    </div>

    <div v-if="!paramGroups.length" class="rp-empty">
      <AppIcon name="info" :size="20" stroke="var(--text-3)" />
      <span>暂无参数数据</span>
    </div>

    <div v-else class="rp-groups">
      <div
        v-for="(group, gi) in paramGroups"
        :key="group.group"
        class="rp-group"
        :style="{ '--gc': GROUP_COLORS[gi % GROUP_COLORS.length] }"
      >
        <div class="rp-group-label">
          <span class="rp-group-dot"></span>
          {{ group.group }}
        </div>
        <div class="rp-list">
          <div
            v-for="item in group.items"
            :key="item.name"
            class="rp-row"
          >
            <span class="rp-name">{{ item.name }}</span>
            <span class="rp-val">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rp-groups { display: flex; flex-direction: column; gap: 16px; }

.rp-group { }

.rp-group-label {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; font-weight: 600; color: var(--gc);
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.rp-group-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--gc); flex-shrink: 0;
}

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
.dd-card-count {
  margin-left: auto; font-size: 11px; color: var(--text-3);
  font-family: "JetBrains Mono", monospace;
}
</style>

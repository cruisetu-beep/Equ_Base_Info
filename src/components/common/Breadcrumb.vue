<script setup>
// ── components/common/Breadcrumb.vue ──────────────────────────────
// 对应原 React Breadcrumb 组件
// Props : items (String[])  — 面包屑路径数组，最后一项高亮

import AppIcon from './AppIcon.vue'

defineProps({
  items: { type: Array, required: true },
})
</script>

<template>
  <div class="breadcrumb">
    <template v-for="(crumb, i) in items" :key="i">
      <AppIcon v-if="i > 0" name="chevron-right" :size="10" />
      <span :class="['crumb', i === items.length - 1 && 'active']">
        {{ crumb }}
      </span>
    </template>
  </div>
</template>

<script setup>
// ── components/common/TopBar.vue ───────────────────────────────────
// 对应原 React TopBar 组件，原样迁入全部结构与样式
// Props : tab (String)
// Emits : update:tab (String)  — 支持 v-model:tab 双向绑定

import AppIcon from './AppIcon.vue'

defineProps({
  tab: { type: String, required: true },
})

defineEmits(['update:tab'])

const NAV_ITEMS = [
  { k: 'overview', label: '设备总览' },
  { k: 'archive',  label: '设备档案录入' },
  { k: 'judge',    label: '低效淘汰判定' },
  { k: 'rules',    label: '规则库管理' },
]
</script>

<template>
  <div class="topbar">
    <!-- 左：品牌 LOGO -->
    <div class="topbar-left">
      <div class="brand">
        <div class="brand-mark">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="bg-grad-2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#4dc9ff"/>
                <stop offset="100%" stop-color="#e0394f"/>
              </linearGradient>
            </defs>
            <path
              d="M16 3l11 6.5v13L16 29 5 22.5v-13L16 3z"
              stroke="url(#bg-grad-2)"
              stroke-width="1.5"
              fill="rgba(47,127,255,0.06)"
            />
            <circle cx="16" cy="16" r="2.4" fill="#e0394f"/>
            <circle cx="11" cy="11" r="1.2" fill="#4dc9ff"/>
            <circle cx="21" cy="11" r="1.2" fill="#4dc9ff"/>
            <circle cx="11" cy="21" r="1.2" fill="#4dc9ff"/>
            <circle cx="21" cy="21" r="1.2" fill="#4dc9ff"/>
            <g stroke="#4dc9ff" stroke-width="0.5" opacity="0.55">
              <path d="M16 16L11 11M16 16L21 11M16 16L11 21M16 16L21 21"/>
            </g>
          </svg>
        </div>
        <div class="brand-text">
          <div class="brand-title">EOL · DEVICE</div>
          <div class="brand-sub">低效淘汰设备库 v1.3</div>
        </div>
      </div>
    </div>

    <!-- 中：主导航 -->
    <nav class="topbar-nav">
      <a
        v-for="item in NAV_ITEMS"
        :key="item.k"
        :class="['nav-item', tab === item.k && 'active']"
        @click="$emit('update:tab', item.k)"
      >
        {{ item.label }}
      </a>
    </nav>

    <!-- 右：状态 + 操作区 -->
    <div class="topbar-right">
      <div class="status-pill">
        <span class="dot"></span>
        规则引擎在线 · 435 条
      </div>
      <button class="icon-btn" title="通知">
        <AppIcon name="bell" />
      </button>
      <button class="icon-btn" title="设置">
        <AppIcon name="settings" />
      </button>
      <div class="user-chip">
        <div class="avatar">CH</div>
        <span>陈工 / 设备能效管理员</span>
      </div>
    </div>
  </div>
</template>

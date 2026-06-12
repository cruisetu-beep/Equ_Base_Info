<script setup>
// ── components/common/AppIcon.vue ──────────────────────────────────
// 对应原 React Icon 组件，原样迁入全部 SVG 路径，零改动
// 用法：<AppIcon name="motor" :size="20" stroke="var(--brand)" />

const props = defineProps({
  name:   { type: String, required: true },
  size:   { type: Number, default: 16 },
  stroke: { type: String, default: 'currentColor' },
})

// SVG 路径数据表（与原 switch-case 一一对应）
const ICONS = {
  cube:        `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5"/><path d="M12 12L4 7.5"/><path d="M12 12v9"/>`,
  plus:        `<path d="M12 5v14M5 12h14"/>`,
  search:      `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`,
  doc:         `<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>`,
  graph:       `<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><circle cx="12" cy="12" r="1.5"/><path d="M7.5 7.5l3.5 3.5M16.5 7.5L13 11M12 13.5V15.5"/>`,
  bolt:        `<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>`,
  panel:       `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>`,
  leaf:        `<path d="M21 3c-7 0-13 4-13 12 0 3 1 6 1 6s9-1 12-7c2-4 0-11 0-11z"/><path d="M8 21c0-6 4-10 10-12"/>`,
  sun:         `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`,
  plug:        `<path d="M9 2v4M15 2v4M5 10h14v4a7 7 0 0 1-14 0v-4z"/><path d="M12 21v-3"/>`,
  factory:     `<path d="M3 21V10l6 4V10l6 4V7l6 3v11H3z"/>`,
  check:       `<path d="M5 12l4 4L19 6"/>`,
  'chevron-right': `<path d="M9 6l6 6-6 6"/>`,
  'chevron-left':  `<path d="M15 6l-6 6 6 6"/>`,
  'chevron-down':  `<path d="M6 9l6 6 6-6"/>`,
  upload:      `<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>`,
  tag:         `<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1"/>`,
  sparkles:    `<path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/>`,
  scan:        `<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>`,
  database:    `<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>`,
  settings:    `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`,
  user:        `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>`,
  bell:        `<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/>`,
  trash:       `<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>`,
  edit:        `<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
  more:        `<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>`,
  cpu:         `<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 9h6v6H9z"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>`,
  zap:         `<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>`,
  filter:      `<path d="M3 4h18l-7 9v6l-4 2v-8L3 4z"/>`,
  eye:         `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`,
  download:    `<path d="M12 4v12M6 14l6 6 6-6"/><path d="M4 20h16"/>`,
  warn:        `<path d="M12 2L2 21h20L12 2z"/><path d="M12 9v5M12 17.5v.5"/>`,
  ban:         `<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>`,
  shield:      `<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"/>`,
  fan:         `<circle cx="12" cy="12" r="2"/><path d="M12 10c0-3 1.5-7 4-7s4 4 0 7-4 0-4 0z"/><path d="M12 14c0 3 1.5 7 4 7s4-4 0-7-4 0-4 0z"/><path d="M10 12c-3 0-7-1.5-7-4s4-4 7 0 0 4 0 4z"/><path d="M14 12c3 0 7 1.5 7 4s-4 4-7 0 0-4 0-4z"/>`,
  motor:       `<circle cx="12" cy="12" r="6"/><path d="M12 6v-3M12 21v-3M6 12h-3M21 12h-3"/><circle cx="12" cy="12" r="2"/>`,
  transformer: `<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M8 6V3M16 6V3M8 21v-3M16 21v-3M4 10h2M4 14h2M18 10h2M18 14h2"/>`,
  pump:        `<circle cx="12" cy="13" r="6"/><path d="M12 7V4h5M12 13L8 9"/>`,
  boiler:      `<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6M9 18h6"/>`,
  compressor:  `<circle cx="12" cy="12" r="7"/><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="2"/>`,
  chip:        `<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/>`,
  list:        `<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,
  import:      `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>`,
  rule:        `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>`,
  calendar:    `<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>`,
  info:        `<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 12v4"/>`,
  pause:       `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`,
  play:        `<path d="M6 4l14 8-14 8V4z"/>`,
}
</script>

<template>
  <svg
    v-if="ICONS[name]"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="stroke"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-html="ICONS[name]"
  />
</template>

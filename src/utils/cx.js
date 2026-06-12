// ── utils/cx.js ────────────────────────────────────────────────────
// React 版 cx 函数原样迁入，在 Vue 模板中通过 :class="[...]" 可替代，
// 但保留此工具函数供 JS 逻辑层使用

export const cx = (...xs) => xs.filter(Boolean).join(' ')

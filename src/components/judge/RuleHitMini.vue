<script setup>
// ── components/judge/RuleHitMini.vue ──────────────────────────────
defineProps({
  hit: { type: Object, required: true },
})

function actionColor(type) {
  if (type === '强制') return 'var(--eol-red)'
  if (type === '限期') return 'var(--eol-deadline)'
  return 'var(--eol-low)'
}
</script>

<template>
  <div
    :style="{
      padding: '10px 12px',
      background: '#f7f9fd',
      border: `1px solid ${actionColor(hit.rule.actionType)}4d`,
      borderLeft: `3px solid ${actionColor(hit.rule.actionType)}`,
      borderRadius: '8px',
      fontSize: '11.5px',
    }"
  >
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span
        class="mono"
        :style="{
          padding: '1px 6px',
          background: `${actionColor(hit.rule.actionType)}22`,
          color: actionColor(hit.rule.actionType),
          borderRadius: '3px',
          fontSize: '10.5px',
          fontWeight: 600,
        }"
      >{{ hit.rule.ruleId }}</span>
      <span :style="{ color: actionColor(hit.rule.actionType), fontWeight: 500, fontSize: '11px' }">
        {{ hit.rule.actionType }}淘汰
      </span>
      <span style="color:var(--text-3);font-size:10px;margin-left:auto">{{ hit.rule.batch }}</span>
    </div>
    <div style="color:var(--text-0);line-height:1.5">
      <strong>{{ hit.rule.product }}</strong>
    </div>
    <div style="font-size:10.5px;color:var(--text-2);margin-top:4px;font-family:'JetBrains Mono',monospace">
      ▸ {{ hit.rule.standard }} · 截止 {{ hit.rule.deadline }}
    </div>
  </div>
</template>

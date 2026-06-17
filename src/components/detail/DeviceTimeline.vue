<script setup>
// ── components/detail/DeviceTimeline.vue ──────────────────────────
// 操作历史时间线：对应数据库设计 T_ST_EquipmentAuditLog
// 纵向时间线，事件包括录入/判定/编辑等

import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  device: { type: Object, required: true },
})

const EVENT_META = {
  create:  { icon: 'plus',   color: 'var(--brand)' },
  judge:   { icon: 'zap',    color: 'var(--eol-low)' },
  edit:    { icon: 'edit',   color: 'var(--accent)' },
  doc:     { icon: 'doc',    color: 'var(--ok)' },
  fusion:  { icon: 'graph',  color: 'var(--brand-2)' },
}

// Mock 操作历史（真实后端就绪后由 T_ST_EquipmentAuditLog 按 F_RecordKey 查询返回）
const events = computed(() => {
  const list = [
    { type: 'create', text: '设备档案录入，铭牌 OCR 识别完成', who: '陈工', time: `${props.device.year}-03-12 09:20` },
    { type: 'doc',    text: '上传采购合同与验收报告', who: '陈工', time: `${props.device.year}-03-12 09:35` },
    { type: 'fusion', text: '知识图谱融合完成，已链接建筑/类型/标准节点', who: 'SYSTEM', time: `${props.device.year}-03-12 09:38` },
  ]
  if (props.device.status !== 'pending') {
    list.push({
      type: 'judge',
      text: props.device.status === 'normal'
        ? '规则引擎判定：未命中任何淘汰规则'
        : `规则引擎判定：命中规则 ${props.device.ruleHit || '人工判定'}，状态变更为「${props.device.level}」`,
      who: 'SYSTEM', time: props.device.updated,
    })
  }
  return list.slice().reverse() // 最新事件在前
})
</script>

<template>
  <div class="tl-card">
    <h4><AppIcon name="info" :size="16" stroke="var(--brand)" /> 操作历史</h4>

    <div class="tl-list">
      <div v-for="(e, i) in events" :key="i" class="tl-item">
        <div class="tl-dot" :style="{ background: EVENT_META[e.type]?.color }">
          <AppIcon :name="EVENT_META[e.type]?.icon || 'info'" :size="11" />
        </div>
        <div class="tl-content">
          <div class="tl-text">{{ e.text }}</div>
          <div class="tl-meta">{{ e.who }} · <span class="mono">{{ e.time }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tl-card {
  background: white; border: 1px solid var(--line); border-radius: 12px;
  padding: 18px; box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}
.tl-card h4 { margin: 0 0 16px; font-size: 13px; color: var(--text-0); display: flex; align-items: center; gap: 8px; }

.tl-list { display: flex; flex-direction: column; }
.tl-item { display: flex; gap: 12px; position: relative; padding-bottom: 18px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-item::before {
  content: ""; position: absolute; left: 11px; top: 24px; bottom: -2px; width: 1px;
  background: var(--line);
}
.tl-item:last-child::before { display: none; }
.tl-dot {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  display: grid; place-items: center; color: white; z-index: 1;
}
.tl-content { flex: 1; min-width: 0; padding-top: 2px; }
.tl-text { font-size: 12px; color: var(--text-0); line-height: 1.5; }
.tl-meta { font-size: 10.5px; color: var(--text-3); margin-top: 4px; }
</style>

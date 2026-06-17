<script setup>
// ── components/detail/KnowledgeGraphSummary.vue ───────────────────
// 知识图谱关联摘要：复用 archive 第4步 WizardStepFusion 的"融合摘要"视觉语言

import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { SAMPLE_DEVICES, DEV_TYPE_MAP } from '@/data/devices'

const props = defineProps({
  device: { type: Object, required: true },
})

const devType = computed(() => DEV_TYPE_MAP[props.device.typeK] || DEV_TYPE_MAP.other)

// 同型号设备数量（不含自身）
const sameModelCount = computed(() =>
  SAMPLE_DEVICES.filter(d => d.id !== props.device.id && d.model === props.device.model).length
)

// 同建筑设备数量（不含自身）
const sameBuildingCount = computed(() =>
  SAMPLE_DEVICES.filter(d => d.id !== props.device.id && d.building === props.device.building).length
)
</script>

<template>
  <div class="kg-summary">
    <h4><AppIcon name="graph" :size="16" stroke="var(--brand)" /> 知识图谱关联</h4>

    <div class="kg-body">
      <div class="kg-row"><span class="l">设备：</span><strong>{{ device.name }}</strong></div>
      <div class="kg-row"><span class="l">类型：</span><strong>{{ devType.label }} / {{ device.type2 }}</strong></div>
      <div class="kg-row"><span class="l">型号：</span><span class="mono">{{ device.model }}</span></div>
      <div class="kg-row"><span class="l">建筑：</span><strong>{{ device.building }}</strong></div>

      <div class="kg-links">
        <div class="kg-links-label">已关联图谱节点：</div>
        <div class="kg-links-list">
          <div class="kg-link-item">
            <AppIcon name="cube" :size="12" stroke="var(--brand)" />
            建筑实体（同 {{ device.building }}） · 关联设备 {{ sameBuildingCount }} 台
          </div>
          <div class="kg-link-item">
            <AppIcon :name="devType.icon" :size="12" :stroke="devType.color" />
            设备类型节点（{{ devType.label }}）
          </div>
          <div class="kg-link-item" v-if="sameModelCount > 0">
            <AppIcon name="tag" :size="12" stroke="var(--accent)" />
            同型号设备 {{ sameModelCount }} 台
          </div>
          <div class="kg-link-item">
            <AppIcon name="doc" :size="12" stroke="var(--warn)" />
            关联国标 GB18613 / GB20052 / GB/T17981
          </div>
          <div class="kg-link-item" v-if="device.ruleHit">
            <AppIcon name="rule" :size="12" stroke="var(--eol-red)" />
            命中淘汰规则 <span class="mono">{{ device.ruleHit }}</span>
          </div>
        </div>
      </div>
    </div>

    <button class="btn ghost kg-view-btn">
      <AppIcon name="search" :size="12" /> 查看完整图谱
    </button>
  </div>
</template>

<style scoped>
.kg-summary {
  background: white; border: 1px solid var(--line); border-radius: 12px;
  padding: 18px; box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}
.kg-summary h4 { margin: 0 0 14px; font-size: 13px; color: var(--text-0); display: flex; align-items: center; gap: 8px; }
.kg-body { font-size: 12px; color: var(--text-1); line-height: 1.7; }
.kg-row { margin-bottom: 10px; }
.kg-row .l { color: var(--text-2); }
.kg-row strong { color: var(--text-0); }

.kg-links {
  padding: 10px 12px; background: #f5f9ff; border-radius: 8px;
  margin-top: 14px; border: 1px solid var(--line);
}
.kg-links-label { font-size: 11px; color: var(--text-2); margin-bottom: 8px; }
.kg-links-list { display: flex; flex-direction: column; gap: 7px; }
.kg-link-item {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; color: var(--text-1); line-height: 1.5;
}

.kg-view-btn { width: 100%; justify-content: center; margin-top: 14px; padding: 8px; font-size: 12px; }
</style>

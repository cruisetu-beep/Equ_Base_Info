<script setup>
// ── components/rules/RulesSidebar.vue ─────────────────────────────
// 横向筛选条：统计 + 状态一行，批次一行，类型一行
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPES } from '@/data/devices'
import { BATCH_COLORS } from '@/data/rules'

const props = defineProps({
  rules:        { type: Array,  required: true },
  filterBatch:  { type: String, required: true },
  filterType:   { type: String, required: true },
  filterStatus: { type: String, required: true },
})
const emit = defineEmits(['update:filterBatch', 'update:filterType', 'update:filterStatus'])

const total   = computed(() => props.rules.length)
const enabled = computed(() => props.rules.filter(r => r.enabled !== false).length)
const disabled= computed(() => total.value - enabled.value)

const batchCnt = computed(() => {
  const m = {}
  Object.keys(BATCH_COLORS).forEach(b => { m[b] = props.rules.filter(r => r.batch === b).length })
  return m
})

const typeCnt = computed(() => {
  const m = {}
  props.rules.forEach(r => { m[r.typeK] = (m[r.typeK] || 0) + 1 })
  return m
})

const typesWithRules = computed(() => DEV_TYPES.filter(t => typeCnt.value[t.k] > 0))
</script>

<template>
  <div class="rules-filterbar">
    <!-- 第一行：状态 + 批次 -->
    <div class="fb-row">
      <span class="g-label">状态</span>
      <div class="status-segs">
        <span :class="['status-seg', filterStatus === 'all'      && 'active']"     @click="$emit('update:filterStatus', 'all')">全部</span>
        <span :class="['status-seg', filterStatus === 'enabled'  && 'active ok']"  @click="$emit('update:filterStatus', 'enabled')">启用</span>
        <span :class="['status-seg', filterStatus === 'disabled' && 'active dis']" @click="$emit('update:filterStatus', 'disabled')">禁用</span>
      </div>

      <div class="vsep" />

      <span class="g-label">批次</span>
      <div class="chip-row">
        <span
          :class="['f-chip', filterBatch === 'all' && 'active']"
          style="--cl:#1f6feb"
          @click="$emit('update:filterBatch', 'all')"
        >
          <span class="dot" style="background:#1f6feb" /> 全部 <span class="cnt">{{ total }}</span>
        </span>
        <span
          v-for="[b, c] in Object.entries(BATCH_COLORS)" :key="b"
          :class="['f-chip', filterBatch === b && 'active']"
          :style="{ '--cl': c.bg }"
          @click="$emit('update:filterBatch', b)"
        >
          <span class="dot" /> {{ b }} ({{ c.year }}) <span class="cnt">{{ batchCnt[b] || 0 }}</span>
        </span>
      </div>

      <div class="stats-text">
        <AppIcon name="database" :size="12" stroke="var(--text-3)" />
        共 <strong>{{ total }}</strong> 条规则
        <span class="sep">·</span>
        已启用 <strong class="ok">{{ enabled }}</strong>
        <span class="sep">·</span>
        已禁用 <strong class="dis">{{ disabled }}</strong>
      </div>
    </div>

    <!-- 第三行：设备类型 -->
    <div class="fb-row">
      <span class="g-label">类型</span>
      <div class="chip-row">
        <span
          :class="['f-chip', filterType === 'all' && 'active']"
          style="--cl:#1f6feb"
          @click="$emit('update:filterType', 'all')"
        >
          <AppIcon name="cube" :size="11" /> 全部 <span class="cnt">{{ total }}</span>
        </span>
        <span
          v-for="t in typesWithRules" :key="t.k"
          :class="['f-chip', filterType === t.k && 'active']"
          :style="{ '--cl': t.color }"
          @click="$emit('update:filterType', t.k)"
        >
          <AppIcon :name="t.icon" :size="11" :stroke="filterType === t.k ? t.color : 'currentColor'" />
          {{ t.label }} <span class="cnt">{{ typeCnt[t.k] }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rules-filterbar {
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px 18px; background: white; border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}

.fb-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.fb-row:not(:last-child) { padding-bottom: 12px; border-bottom: 1px dashed var(--line); }

.vsep { width: 1px; align-self: stretch; background: var(--line); flex-shrink: 0; }

/* 统计信息：纯文本展示，与可点击筛选项区分 */
.stats-text {
  margin-left: auto; display: flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: var(--text-3);
}
.stats-text strong { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--text-1); font-weight: 600; }
.stats-text strong.ok  { color: var(--ok); }
.stats-text strong.dis { color: var(--eol-red); }
.stats-text .sep { color: var(--line-strong); }

.g-label { font-size: 11px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; flex-shrink: 0; }

/* 状态分段 */
.status-segs { display: flex; gap: 4px; }
.status-seg { padding: 5px 12px; border-radius: 6px; background: #f5f9ff; border: 1px solid var(--line); font-size: 11.5px; color: var(--text-1); cursor: pointer; user-select: none; }
.status-seg.active { background: var(--brand); border-color: var(--brand); color: white; font-weight: 500; }
.status-seg.active.ok  { background: var(--ok);     border-color: var(--ok); }
.status-seg.active.dis { background: var(--text-2); border-color: var(--text-2); }

/* 通用 chip */
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.f-chip {
  padding: 5px 10px 5px 8px; border-radius: 6px; background: #f5f9ff; border: 1px solid var(--line);
  font-size: 11.5px; color: var(--text-1); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px; user-select: none; transition: all 0.15s;
  white-space: nowrap;
}
.f-chip:hover { border-color: var(--line-strong); background: white; }
.f-chip.active { background: color-mix(in srgb, var(--cl) 12%, white); border-color: var(--cl); color: var(--text-0); font-weight: 500; }
.f-chip .dot { width: 8px; height: 8px; border-radius: 2px; background: var(--cl); flex-shrink: 0; }
.f-chip .cnt { color: var(--text-3); font-family: "JetBrains Mono", monospace; font-size: 10.5px; }
.f-chip.active .cnt { color: var(--text-2); }
</style>

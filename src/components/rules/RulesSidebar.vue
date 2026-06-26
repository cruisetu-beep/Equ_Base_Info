<script setup>
// ── components/rules/RulesSidebar.vue ─────────────────────────────
// 横向筛选条：统计 + 状态一行，批次一行，类型一行
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPES } from '@/data/devices'
import { BATCH_COLORS } from '@/data/rules'

const props = defineProps({
  stats:        { type: Object, required: true },
  filterBatch:  { type: String, required: true },
  filterType:   { type: String, required: true },
  filterStatus: { type: String, required: true },
})
const emit = defineEmits(['update:filterBatch', 'update:filterType', 'update:filterStatus'])

const total    = computed(() => props.stats?.status?.find(s => s.key === 'all')?.count || 0)
const enabled  = computed(() => props.stats?.status?.find(s => s.key === 'enabled')?.count || 0)
const disabled = computed(() => props.stats?.status?.find(s => s.key === 'disabled')?.count || 0)

// 过滤筛选条件列表：只保留“全部”、数量大于 0 的、以及当前选中的项，其他没有数据的项不显示
const displayStatusList = computed(() => {
  if (!props.stats?.status) return []
  return props.stats.status.filter(s => s.key === 'all' || s.count > 0 || props.filterStatus === s.key)
})

const displayBatchList = computed(() => {
  if (!props.stats?.batches) return []
  return props.stats.batches.filter(b => b.key === 'all' || b.count > 0 || props.filterBatch === b.key)
})

const displayTypeList = computed(() => {
  if (!props.stats?.types) return []
  return props.stats.types.filter(t => t.key === 'all' || t.count > 0 || props.filterType === t.key)
})

const getBatchColor = (key) => {
  if (key === 'all') return '#1f6feb'
  return BATCH_COLORS[key]?.bg || '#888'
}

const getBatchYear = (key) => {
  if (key === 'all') return ''
  return BATCH_COLORS[key]?.year ? ` (${BATCH_COLORS[key].year})` : ''
}

const getTypeColor = (key) => {
  if (key === 'all') return '#1f6feb'
  const devType = DEV_TYPES.find(d => d.k === key)
  return devType?.color || '#888'
}

const getTypeIcon = (key) => {
  if (key === 'all') return 'cube'
  const devType = DEV_TYPES.find(d => d.k === key)
  return devType?.icon || 'settings'
}
</script>

<template>
  <div class="rules-filterbar">
    <!-- 第一行：状态 + 批次 -->
    <div class="fb-row">
      <span class="g-label">状态</span>
      <div class="status-segs">
        <span 
          v-for="s in displayStatusList" :key="s.key"
          :class="['status-seg', filterStatus === s.key && 'active', filterStatus === s.key && s.key === 'enabled' && 'ok', filterStatus === s.key && s.key === 'disabled' && 'dis']"     
          @click="$emit('update:filterStatus', s.key)"
        >
          {{ s.name }} <span class="cnt">{{ s.count }}</span>
        </span>
      </div>

      <div class="vsep" />

      <span class="g-label">批次</span>
      <div class="chip-row">
        <span
          v-for="b in displayBatchList" :key="b.key"
          :class="['f-chip', filterBatch === b.key && 'active']"
          :style="{ '--cl': getBatchColor(b.key) }"
          @click="$emit('update:filterBatch', b.key)"
        >
          <span class="dot" /> {{ b.name }}{{ getBatchYear(b.key) }} <span class="cnt">{{ b.count }}</span>
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
          v-for="t in displayTypeList" :key="t.key"
          :class="['f-chip', filterType === t.key && 'active']"
          :style="{ '--cl': getTypeColor(t.key) }"
          @click="$emit('update:filterType', t.key)"
        >
          <AppIcon :name="getTypeIcon(t.key)" :size="11" :stroke="filterType === t.key ? getTypeColor(t.key) : 'currentColor'" />
          {{ t.name }} <span class="cnt">{{ t.count }}</span>
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
.status-seg .cnt { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-3); margin-left: 4px; }
.status-seg.active .cnt { color: inherit; opacity: 0.9; }

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

<script setup>
// ── components/rules/RulesSidebar.vue ─────────────────────────────
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
  <div class="rules-sidebar">
    <!-- 统计卡 -->
    <div class="stats-card">
      <h4><AppIcon name="database" :size="12" stroke="#4dc9ff" /> 规则库统计</h4>
      <div class="row">
        <span class="l">总规则数</span><span class="v">{{ total }}</span>
      </div>
      <div class="row ok">
        <span class="l">已启用</span><span class="v">{{ enabled }}</span>
      </div>
      <div class="row dis">
        <span class="l">已禁用</span><span class="v">{{ disabled }}</span>
      </div>
    </div>

    <!-- 状态筛选 -->
    <div class="filter-card">
      <h5>状态</h5>
      <div class="status-segs">
        <span :class="['status-seg', filterStatus === 'all'      && 'active']"     @click="$emit('update:filterStatus', 'all')">全部</span>
        <span :class="['status-seg', filterStatus === 'enabled'  && 'active ok']"  @click="$emit('update:filterStatus', 'enabled')">启用</span>
        <span :class="['status-seg', filterStatus === 'disabled' && 'active dis']" @click="$emit('update:filterStatus', 'disabled')">禁用</span>
      </div>
    </div>

    <!-- 批次筛选 -->
    <div class="filter-card">
      <h5>批次（按发布年份）</h5>
      <div class="batch-chips">
        <span
          :class="['batch-chip', filterBatch === 'all' && 'active']"
          style="--cl:#1f6feb"
          @click="$emit('update:filterBatch', 'all')"
        >
          <span class="dot" style="background:#1f6feb" /> 全部 <span class="cnt">{{ total }}</span>
        </span>
        <span
          v-for="[b, c] in Object.entries(BATCH_COLORS)" :key="b"
          :class="['batch-chip', filterBatch === b && 'active']"
          :style="{ '--cl': c.bg }"
          @click="$emit('update:filterBatch', b)"
        >
          <span class="dot" /> {{ b }} ({{ c.year }}) <span class="cnt">{{ batchCnt[b] || 0 }}</span>
        </span>
      </div>
    </div>

    <!-- 设备类型筛选 -->
    <div class="filter-card">
      <h5>设备一级类型</h5>
      <div class="type-tree">
        <div
          :class="['type-tree-item', filterType === 'all' && 'active']"
          style="--cl:#1f6feb"
          @click="$emit('update:filterType', 'all')"
        >
          <div class="ic"><AppIcon name="cube" :size="11" /></div>
          <span class="n">全部类型</span>
          <span class="c">{{ total }}</span>
        </div>
        <div
          v-for="t in typesWithRules" :key="t.k"
          :class="['type-tree-item', filterType === t.k && 'active']"
          :style="{ '--cl': t.color }"
          @click="$emit('update:filterType', t.k)"
        >
          <div class="ic"><AppIcon :name="t.icon" :size="11" /></div>
          <span class="n">{{ t.label }}</span>
          <span class="c">{{ typeCnt[t.k] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rules-sidebar { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 80px; }

.stats-card {
  padding: 16px; background: linear-gradient(135deg, #0f1d3d 0%, #1a2a55 100%);
  border-radius: 12px; color: white; position: relative; overflow: hidden;
}
.stats-card::before { content:""; position:absolute; right:-30px; top:-30px; width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle, rgba(77,201,255,0.18), transparent 70%); }
.stats-card h4 { margin: 0 0 12px; font-size: 12px; color: #c5d3ed; display: flex; align-items: center; gap: 6px; font-weight: 500; }
.stats-card .row { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.08); }
.stats-card .row:last-child { border-bottom: 0; }
.stats-card .row .l { font-size: 11.5px; color: #8da3c8; }
.stats-card .row .v { font-family: "Orbitron", sans-serif; font-size: 18px; font-weight: 600; color: white; }
.stats-card .row.ok .v  { color: #2bd9a8; }
.stats-card .row.dis .v { color: #ff8da0; }

.filter-card { padding: 14px; background: white; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 1px 2px rgba(60,110,200,0.04); }
.filter-card h5 { margin: 0 0 10px; font-size: 11.5px; color: var(--text-2); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

.batch-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.batch-chip { padding: 5px 10px 5px 7px; border-radius: 6px; background: #f5f9ff; border: 1px solid var(--line); font-size: 11.5px; color: var(--text-1); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; user-select: none; transition: all 0.15s; }
.batch-chip:hover { border-color: var(--line-strong); background: white; }
.batch-chip.active { background: color-mix(in srgb, var(--cl) 12%, white); border-color: var(--cl); color: var(--text-0); font-weight: 500; }
.batch-chip .dot { width: 8px; height: 8px; border-radius: 2px; background: var(--cl); }
.batch-chip .cnt { color: var(--text-3); font-family: "JetBrains Mono", monospace; font-size: 10.5px; }
.batch-chip.active .cnt { color: var(--text-2); }

.status-segs { display: flex; gap: 4px; }
.status-seg { flex: 1; padding: 6px 8px; border-radius: 6px; background: #f5f9ff; border: 1px solid var(--line); font-size: 11.5px; color: var(--text-1); cursor: pointer; text-align: center; user-select: none; }
.status-seg.active { background: var(--brand); border-color: var(--brand); color: white; font-weight: 500; }
.status-seg.active.ok  { background: var(--ok);     border-color: var(--ok); }
.status-seg.active.dis { background: var(--text-2); border-color: var(--text-2); }

.type-tree { display: flex; flex-direction: column; gap: 2px; }
.type-tree-item { padding: 8px 10px; border-radius: 6px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: var(--text-1); transition: all 0.15s; }
.type-tree-item:hover { background: #f5f9ff; }
.type-tree-item.active { background: linear-gradient(90deg, color-mix(in srgb, var(--cl) 12%, white), transparent); color: var(--text-0); font-weight: 500; border-left: 2px solid var(--cl); padding-left: 8px; }
.type-tree-item .ic { width: 22px; height: 22px; border-radius: 5px; background: color-mix(in srgb, var(--cl) 14%, white); color: var(--cl); display: grid; place-items: center; flex-shrink: 0; }
.type-tree-item .n { flex: 1; }
.type-tree-item .c { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-3); }
</style>

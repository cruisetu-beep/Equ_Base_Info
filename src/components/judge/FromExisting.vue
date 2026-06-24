<script setup>
// ── components/judge/FromExisting.vue ─────────────────────────────
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { SAMPLE_DEVICES, DEV_TYPE_MAP, STATUS_MAP } from '@/data/devices'

defineProps({ rules: { type: Array, required: true } })
const emit = defineEmits(['start', 'back'])

const selected = ref({})
const cnt = computed(() => Object.keys(selected.value).filter(k => selected.value[k]).length)

const toggle       = id => { selected.value = { ...selected.value, [id]: !selected.value[id] } }
const selectAll    = () => { selected.value = Object.fromEntries(SAMPLE_DEVICES.map(d => [d.id, true])) }
const clearSel     = () => { selected.value = {} }
const onlyPending  = () => { selected.value = Object.fromEntries(SAMPLE_DEVICES.filter(d => d.status === 'pending').map(d => [d.id, true])) }
const allOld       = () => { selected.value = Object.fromEntries(SAMPLE_DEVICES.filter(d => d.year && parseInt(d.year) <= 2010).map(d => [d.id, true])) }

const STATUS_ICON = { normal: 'check', pending: 'info', low_eff: 'warn', phaseout: 'ban' }

function handleStart() {
  const devs = SAMPLE_DEVICES.filter(d => selected.value[d.id])
  emit('start', devs)
}
</script>

<template>
  <div class="from-existing float-in">
    <div class="page-head">
      <div>
        <h1 class="page-title"><AppIcon name="list" :size="22" stroke="var(--brand-2)" /> 从已录入设备选择</h1>
        <div class="page-subtitle">勾选若干已入库设备，对其发起判定。判定结果将更新至设备档案。</div>
      </div>
      <button class="btn ghost" @click="$emit('back')"><AppIcon name="chevron-left" :size="14" /> 返回选择方式</button>
    </div>

    <div class="ent-toolbar">
      <div class="l">已选择 <strong style="color:var(--brand-2)">{{ cnt }}</strong> / {{ SAMPLE_DEVICES.length }} 台</div>
      <button class="btn ghost" style="padding:6px 12px;font-size:12px" @click="selectAll"><AppIcon name="check" :size="11" /> 全选</button>
      <button class="btn ghost" style="padding:6px 12px;font-size:12px" @click="onlyPending">仅待判定</button>
      <button class="btn ghost" style="padding:6px 12px;font-size:12px" @click="allOld">≤2010 年投运</button>
      <button class="btn ghost" style="padding:6px 12px;font-size:12px" @click="clearSel">清空</button>
    </div>

    <div class="ent-list">
      <div
        v-for="d in SAMPLE_DEVICES" :key="d.id"
        :class="['ent-row', selected[d.id] && 'sel']"
        :style="{ '--cl': DEV_TYPE_MAP[d.typeK].color }"
        @click="toggle(d.id)"
      >
        <div class="ck">
          <AppIcon v-if="selected[d.id]" name="check" :size="14" />
        </div>
        <div class="thumb">
          <AppIcon :name="DEV_TYPE_MAP[d.typeK].icon" :size="20" :stroke="DEV_TYPE_MAP[d.typeK].color" />
        </div>
        <div class="info">
          <div class="code">{{ d.code }}</div>
          <div class="name">{{ d.name }}</div>
          <div class="meta">{{ DEV_TYPE_MAP[d.typeK].label }} · {{ d.type2 }} · <span class="mono">{{ d.model }}</span> · {{ d.year }}</div>
        </div>
        <div class="params-mini">
          <div v-for="item in (d.paramGroups || []).flatMap(g => g.items).slice(0, 2)" :key="item.name">
            {{ item.name }}: <strong style="color:var(--text-0)">{{ item.value }}</strong>
          </div>
        </div>
        <div class="building-mini">{{ d.building }}</div>
        <div :class="['level-tag', d.status]">
          <AppIcon :name="STATUS_ICON[d.status]" :size="10" />
          {{ STATUS_MAP[d.status]?.label }}
        </div>
      </div>
    </div>

    <div :class="['float-bar', cnt === 0 && 'empty']">
      <div class="info">
        <div class="h">{{ cnt > 0 ? `准备对 ${cnt} 台设备发起判定` : '请先勾选要判定的设备' }}</div>
        <div class="s">{{ cnt > 0 ? `预计耗时约 ${cnt * 3} 秒（每台 ~3 秒）` : `共 ${SAMPLE_DEVICES.length} 台设备可选` }}</div>
      </div>
      <button class="btn primary" :disabled="cnt === 0" @click="handleStart">
        <AppIcon name="zap" :size="14" /> 开始判定 <template v-if="cnt > 0">· {{ cnt }} 台</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.from-existing { display: flex; flex-direction: column; gap: 16px; }
.ent-toolbar { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: white; border: 1px solid var(--line); border-radius: 10px; }
.ent-toolbar .l { font-size: 13px; color: var(--text-1); margin-right: auto; }
.ent-list { display: flex; flex-direction: column; gap: 8px; }
.ent-row {
  padding: 14px 18px; background: white; border: 1px solid var(--line); border-radius: 10px;
  display: grid; grid-template-columns: 36px 56px 1fr 200px 120px 90px; gap: 14px;
  align-items: center; cursor: pointer; transition: all 0.15s;
}
.ent-row:hover { border-color: var(--brand); background: #f8faff; }
.ent-row.sel { border-color: var(--brand); background: #eaf2ff; box-shadow: 0 2px 8px rgba(47,127,255,0.10); }
.ent-row .ck { width: 22px; height: 22px; border-radius: 5px; border: 2px solid var(--line-strong); background: white; display: grid; place-items: center; color: white; font-size: 14px; }
.ent-row.sel .ck { background: var(--brand); border-color: var(--brand); }
.ent-row .thumb { width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, rgba(77,201,255,0.15), rgba(77,201,255,0.05)); border: 1px solid rgba(77,201,255,0.22); display: grid; place-items: center; color: var(--cl); }
.ent-row .info .code { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-2); }
.ent-row .info .name { font-size: 13.5px; color: var(--text-0); font-weight: 500; margin-top: 2px; }
.ent-row .info .meta { font-size: 11px; color: var(--text-2); margin-top: 3px; }
.ent-row .params-mini { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-1); }
.ent-row .building-mini { font-size: 11px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.float-bar {
  position: sticky; bottom: 0; margin-top: 10px;
  padding: 16px 22px; background: rgba(255,255,255,0.97);
  border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 -2px 16px rgba(60,110,200,0.08);
  display: flex; align-items: center; gap: 14px;
  backdrop-filter: blur(10px);
}
.float-bar.empty { opacity: 0.65; }
.float-bar .info { flex: 1; }
.float-bar .info .h { font-size: 14px; color: var(--text-0); font-weight: 500; }
.float-bar .info .s { font-size: 11.5px; color: var(--text-2); margin-top: 2px; }
</style>

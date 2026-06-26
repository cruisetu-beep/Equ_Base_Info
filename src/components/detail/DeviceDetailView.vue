<script setup>
// ── components/detail/DeviceDetailView.vue ────────────────────────
// 设备详情页 Phase 7：页面骨架 + 基础信息
// Phase 8 起逐步补充：运行参数 / 知识图谱摘要 / 判定详情 / 文档 / 时间线 / 改造计划

import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import RuntimeParamsCard from './RuntimeParamsCard.vue'
import EnergyChartCard from './EnergyChartCard.vue'
import EliminationBasisCard from './EliminationBasisCard.vue'
import { SAMPLE_DEVICES, DEV_TYPE_MAP, STATUS_MAP, getDeviceDetailExt, parseTypeK } from '@/data/devices'
import { getDevice } from '@/api/devices'

const props = defineProps({
  deviceId: { type: String, required: true },
})
defineEmits(['back', 'edit', 'rejudge', 'view-rule'])

const device = ref(null)
const loading = ref(false)

async function loadDevice() {
  if (!props.deviceId) return
  loading.value = true
  try {
    let dev = SAMPLE_DEVICES.find(d => d.id === props.deviceId)
    if (dev) {
      device.value = dev
      return
    }

    const res = await getDevice(props.deviceId)
    if (res) {
      res.typeK = res.typeK || parseTypeK(res.type2)
      const templateDev = SAMPLE_DEVICES.find(s => s.typeK === res.typeK) || SAMPLE_DEVICES[0]
      
      const realParamGroups = [
        {
          groupName: "技术参数",
          items: (res.params || []).map(p => ({
            name: p.name,
            value: p.value || "—"
          }))
        }
      ]

      device.value = {
        ...res,
        files: res.files || [],
        ruleHit: res.ruleId,
        matchMethod: res.matchMethod,
        ruleBatch: res.ruleBatch,
        ruleDeadline: res.ruleDeadline,
        paramGroups: realParamGroups,
        energyData: (res.energyData && res.energyData.length) ? res.energyData : (templateDev ? JSON.parse(JSON.stringify(templateDev.energyData)) : []),
      }
    } else {
      device.value = null
    }
  } catch (err) {
    console.error('加载设备详情失败:', err)
    device.value = null
  } finally {
    loading.value = false
  }
}

watch(() => props.deviceId, loadDevice, { immediate: true })

const devType = computed(() => device.value ? (DEV_TYPE_MAP[device.value.typeK] || DEV_TYPE_MAP.other) : null)
const statusInfo = computed(() => device.value ? STATUS_MAP[device.value.status] : null)
const ext = computed(() => device.value ? getDeviceDetailExt(device.value) : null)
const deviceCount = computed(() => {
  if (device.value && device.value.deviceCount !== undefined) {
    return device.value.deviceCount
  }
  const all = (device.value?.paramGroups || []).flatMap(g => g.items)
  const item = all.find(i => i.name === '设备数量')
  return item ? item.value : '—'
})

const STATUS_ICON = { normal: 'check', pending: 'info', low_eff: 'warn', phaseout: 'ban' }

</script>

<template>
  <div v-if="loading" class="placeholder-page float-in">
    <div style="font-size: 15px; color: var(--text-2)">
      正在加载设备数据，请稍候...
    </div>
  </div>

  <div v-else-if="!device" class="placeholder-page float-in">
    <div class="icn">❓</div>
    <div class="h">未找到该设备</div>
    <div class="s">设备可能已被删除，请返回总览重新选择</div>
    <button class="btn ghost" style="margin-top:16px" @click="$emit('back')">
      <AppIcon name="chevron-left" :size="14" /> 返回设备总览
    </button>
  </div>

  <div v-else class="device-detail float-in">
    <!-- 页头 -->
    <div class="page-head">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <button class="icon-btn" style="margin-top:2px" @click="$emit('back')">
          <AppIcon name="chevron-left" :size="16" />
        </button>
        <div class="dd-thumb" :style="{ '--cl': devType.color }">
          <AppIcon :name="devType.icon" :size="20" :stroke="devType.color" />
        </div>
        <div>
          <h1 class="page-title" style="gap:10px;display:flex;align-items:center">
            {{ device.name }}
            <span v-if="device.status === 'phaseout'" class="phaseout-badge">
              <AppIcon name="ban" :size="15" stroke="#fff" />
              淘汰设备
            </span>
          </h1>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn primary" @click="$emit('edit')"><AppIcon name="ban" :size="14" /> 淘汰设备判定</button>
      </div>
    </div>

    <div class="dd-grid">
      <!-- 左栏：基础信息 + 设备参数 + 今日能耗 -->
      <div class="dd-main">
        <!-- 基础信息卡 -->
        <div class="card dd-card">
          <div class="dd-card-head">
            <AppIcon name="cube" :size="16" stroke="var(--brand)" />
            <h3>基础信息</h3>
          </div>
          <div class="dd-fields-simple">
            <div class="dd-field-row">
              <span class="l">建筑编号</span>
              <span class="v mono">{{ device.buildingCode || '—' }}</span>
            </div>
            <div class="dd-field-row">
              <span class="l">建筑名称</span>
              <span class="v">{{ device.building || '—' }}</span>
            </div>
            <div class="dd-field-row">
              <span class="l">设备编号</span>
              <span class="v mono">{{ device.code }}</span>
            </div>
            <div class="dd-field-row">
              <span class="l">设备名称</span>
              <span class="v">{{ device.name }}</span>
            </div>
            <div class="dd-field-row">
              <span class="l">设备类型</span>
              <span class="v">{{ device.type2 || devType.label || '—' }}</span>
            </div>
            <div class="dd-field-row">
              <span class="l">设备数量</span>
              <span class="v">{{ deviceCount }}</span>
            </div>
          </div>
        </div>

        <!-- 运行参数卡 -->
        <RuntimeParamsCard :paramGroups="device.paramGroups" />

        <!-- 能耗图表卡 -->
        <EnergyChartCard :energyData="device.energyData" :monthKwh="device.monthKwh" :yearKwh="device.yearKwh" :deviceName="device.name" />
      </div>

      <!-- 右栏：淘汰判定详情 -->
      <div class="dd-side">
        <EliminationBasisCard :device="device" :ext="ext" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-detail { display: flex; flex-direction: column; gap: 20px; }

.phaseout-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #e0394f, #c0152a);
  color: #fff;
  font-size: 14px; font-weight: 700; letter-spacing: 0.06em;
  padding: 5px 14px 5px 11px; border-radius: 8px;
  vertical-align: middle; flex-shrink: 0;
  box-shadow: 0 3px 12px rgba(224,57,79,0.5);
  animation: badge-pulse 2.4s ease-in-out infinite;
  border: 1.5px solid rgba(255,255,255,0.25);
}
@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 3px 12px rgba(224,57,79,0.5); }
  50%       { box-shadow: 0 4px 24px rgba(224,57,79,0.85); }
}

.dd-thumb {  width: 40px; height: 40px; border-radius: 10px;
  background: linear-gradient(135deg, #eaf2ff, #e2dcff);
  border: 1px solid var(--line-strong);
  display: grid; place-items: center; color: var(--cl); flex-shrink: 0;
}

.dd-fields-simple {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
}
.dd-field-row {
  display: flex; align-items: center;
  padding: 9px 14px; gap: 8px; background: #fff;
}
.dd-field-row:nth-child(6n+4),
.dd-field-row:nth-child(6n+5),
.dd-field-row:nth-child(6n+6) { background: #f8fafd; }
.dd-field-row .l { font-size: 12px; color: var(--text-2); flex-shrink: 0; white-space: nowrap; }
.dd-field-row .v { font-size: 12px; color: var(--text-0); margin-left: 8px; }
.dd-field-row .v.mono { font-family: "JetBrains Mono", monospace; }
.dd-field-row .v.emph { font-weight: 600; color: var(--brand); }

.dd-main { display: flex; flex-direction: column; gap: 16px; }
.dd-side { display: flex; flex-direction: column; gap: 16px; }
.dd-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: flex-start;
}

.dd-card { padding: 22px 26px; }
.dd-card-head { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; margin-bottom: 18px; border-bottom: 1px dashed var(--line); flex-wrap: nowrap; white-space: nowrap; }
.dd-card-head h3 { margin: 0; font-size: 15px; color: var(--text-0); }

.dd-section { margin-bottom: 24px; padding-bottom: 22px; border-bottom: 1px dashed var(--line); }
.dd-section:last-child { border-bottom: 0; padding-bottom: 0; }
.dd-section-label {
  font-size: 11.5px; color: var(--text-1); text-transform: uppercase; letter-spacing: 0.5px;
  font-weight: 600; margin-bottom: 14px;
  display: flex; align-items: center; gap: 8px;
}
.dd-section-ic {
  width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
  background: color-mix(in srgb, var(--ic-cl) 16%, white);
  color: var(--ic-cl);
  display: grid; place-items: center;
}
.dd-fields { gap: 16px 20px; }
.dd-field { display: flex; flex-direction: column; gap: 5px; }
.dd-field .l { font-size: 11.5px; color: var(--text-2); }
.dd-field .v { font-size: 13px; color: var(--text-0); }
.dd-field .v.emph { font-size: 16px; font-weight: 700; }
.dd-field .v.emph small { font-size: 11px; font-weight: 400; color: var(--text-2); margin-left: 2px; }

.eff-badge {
  display: inline-flex; align-items: center; width: fit-content;
  padding: 3px 10px; border-radius: 5px; font-size: 12px; font-weight: 600;
}
.eff-badge.good { background: rgba(24,165,114,0.12); color: var(--ok); }
.eff-badge.mid  { background: rgba(234,140,46,0.12); color: var(--eol-low); }
.eff-badge.bad  { background: rgba(224,57,79,0.12); color: var(--eol-red); }
</style>

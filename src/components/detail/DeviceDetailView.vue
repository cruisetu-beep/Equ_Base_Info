<script setup>
// ── components/detail/DeviceDetailView.vue ────────────────────────
// 设备详情页 Phase 7：页面骨架 + 基础信息
// Phase 8 起逐步补充：运行参数 / 知识图谱摘要 / 判定详情 / 文档 / 时间线 / 改造计划

import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import RuntimeParamsCard from './RuntimeParamsCard.vue'
import KnowledgeGraphSummary from './KnowledgeGraphSummary.vue'
import EliminationBasisCard from './EliminationBasisCard.vue'
import DeviceDocList from './DeviceDocList.vue'
import DeviceTimeline from './DeviceTimeline.vue'
import ReplacementPlanCard from './ReplacementPlanCard.vue'
import { SAMPLE_DEVICES, DEV_TYPE_MAP, STATUS_MAP, getDeviceDetailExt } from '@/data/devices'

const props = defineProps({
  deviceId: { type: String, required: true },
})
defineEmits(['back', 'edit', 'rejudge', 'view-rule'])

const device = computed(() => SAMPLE_DEVICES.find(d => d.id === props.deviceId) || null)
const devType = computed(() => device.value ? (DEV_TYPE_MAP[device.value.typeK] || DEV_TYPE_MAP.other) : null)
const statusInfo = computed(() => device.value ? STATUS_MAP[device.value.status] : null)
const ext = computed(() => device.value ? getDeviceDetailExt(device.value) : null)

const STATUS_ICON = { normal: 'check', pending: 'info', low_eff: 'warn', phaseout: 'ban' }
</script>

<template>
  <div v-if="!device" class="placeholder-page float-in">
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
          <AppIcon :name="devType.icon" :size="28" :stroke="devType.color" />
        </div>
        <div>
          <h1 class="page-title" style="gap:10px">
            {{ device.name }}
            <span :class="['level-tag', device.status]">
              <AppIcon :name="STATUS_ICON[device.status]" :size="11" />
              {{ device.level }}
            </span>
          </h1>
          <div class="page-subtitle" style="display:flex;align-items:center;gap:10px;margin-top:8px">
            <span class="mono">{{ device.code }}</span>
            <span style="color:var(--text-3)">·</span>
            <span>{{ devType.label }} / {{ device.type2 }}</span>
            <span style="color:var(--text-3)">·</span>
            <span class="mono">{{ device.model }}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn ghost"><AppIcon name="download" :size="14" /> 导出报告</button>
        <button class="btn ghost" @click="$emit('rejudge')"><AppIcon name="zap" :size="14" /> 重新判定</button>
        <button class="btn primary" @click="$emit('edit')"><AppIcon name="edit" :size="14" /> 编辑设备</button>
      </div>
    </div>

    <!-- 主体两栏 -->
    <div class="dd-grid">
      <!-- 左栏 -->
      <div class="dd-main">

        <!-- 基础信息卡 -->
        <div class="card dd-card">
          <div class="dd-card-head">
            <AppIcon name="cube" :size="16" stroke="var(--brand)" />
            <h3>基础信息</h3>
          </div>

          <div class="dd-section">
            <div class="dd-section-label">设备属性</div>
            <div class="grid-3 dd-fields">
              <div class="dd-field"><span class="l">设备类型</span><span class="v">{{ devType.label }} / {{ device.type2 }}</span></div>
              <div class="dd-field"><span class="l">规格型号</span><span class="v mono">{{ device.model }}</span></div>
              <div class="dd-field"><span class="l">投运年份</span><span class="v">{{ device.year }} 年</span></div>
              <div class="dd-field"><span class="l">生产厂家</span><span class="v">{{ ext.manufacturer }}</span></div>
              <div class="dd-field"><span class="l">出厂编号</span><span class="v mono">{{ ext.serialNo }}</span></div>
              <div class="dd-field"><span class="l">出厂日期</span><span class="v mono">{{ ext.manufactureDate }}</span></div>
            </div>
          </div>

          <div class="dd-section">
            <div class="dd-section-label">采购维保</div>
            <div class="grid-3 dd-fields">
              <div class="dd-field"><span class="l">采购日期</span><span class="v mono">{{ ext.purchaseDate }}</span></div>
              <div class="dd-field"><span class="l">采购金额</span><span class="v mono">{{ ext.purchaseAmount }} 万元</span></div>
              <div class="dd-field"><span class="l">能效等级</span><span class="v">{{ ext.energyEfficiencyLevel }}</span></div>
              <div class="dd-field"><span class="l">设计寿命</span><span class="v mono">{{ ext.designLife }} 年</span></div>
              <div class="dd-field"><span class="l">已用年限</span><span class="v mono">{{ ext.serviceYears }} 年</span></div>
              <div class="dd-field"><span class="l">剩余寿命</span><span class="v mono" :style="{ color: ext.remainingLife <= 2 ? 'var(--eol-red)' : 'var(--text-0)' }">{{ ext.remainingLife }} 年</span></div>
            </div>
          </div>

          <div class="dd-section" style="margin-bottom:0">
            <div class="dd-section-label">位置归属</div>
            <div class="grid-3 dd-fields">
              <div class="dd-field"><span class="l">所属建筑</span><span class="v">{{ device.building }}</span></div>
              <div class="dd-field"><span class="l">安装位置</span><span class="v">{{ ext.location }}</span></div>
              <div class="dd-field"><span class="l">所属系统</span><span class="v">{{ ext.system }}</span></div>
              <div class="dd-field"><span class="l">计量点位</span><span class="v mono">{{ ext.meteringPointId }}</span></div>
              <div class="dd-field"><span class="l">数据更新</span><span class="v mono">{{ device.updated }}</span></div>
            </div>
          </div>
        </div>

        <!-- 运行参数卡 -->
        <RuntimeParamsCard :params="device.params" />

        <!-- 淘汰判定详情卡 -->
        <EliminationBasisCard :device="device" :ext="ext" @view-rule="id => $emit('view-rule', id)" />

        <!-- 更新改造计划卡 -->
        <ReplacementPlanCard :device="device" />
      </div>

      <!-- 右栏 -->
      <div class="dd-side">
        <KnowledgeGraphSummary :device="device" />
        <DeviceDocList :device="device" />
        <DeviceTimeline :device="device" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-detail { display: flex; flex-direction: column; gap: 20px; }

.dd-thumb {
  width: 56px; height: 56px; border-radius: 12px;
  background: linear-gradient(135deg, #eaf2ff, #e2dcff);
  border: 1px solid var(--line-strong);
  display: grid; place-items: center; color: var(--cl); flex-shrink: 0;
}

.dd-grid { display: grid; grid-template-columns: 1fr 360px; gap: 16px; align-items: flex-start; }
.dd-main { display: flex; flex-direction: column; gap: 16px; }
.dd-side { display: flex; flex-direction: column; gap: 16px; }

.dd-card { padding: 22px 26px; }
.dd-card-head { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; margin-bottom: 18px; border-bottom: 1px dashed var(--line); }
.dd-card-head h3 { margin: 0; font-size: 15px; color: var(--text-0); }

.dd-section { margin-bottom: 22px; }
.dd-section-label { font-size: 11px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; margin-bottom: 12px; }
.dd-fields { gap: 14px 20px; }
.dd-field { display: flex; flex-direction: column; gap: 4px; }
.dd-field .l { font-size: 11.5px; color: var(--text-2); }
.dd-field .v { font-size: 13px; color: var(--text-0); }
</style>

<script setup>
// ── components/detail/ReplacementPlanCard.vue ─────────────────────
// 更新改造计划卡：对应数据库设计 T_ST_EquipmentReplacementPlan（当前空表）
// 预留完整字段结构，先做空状态 + 生成按钮，后续接入真实计划生成逻辑

import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  device: { type: Object, required: true },
})

// 预留字段结构，对应 T_ST_EquipmentReplacementPlan 全部业务字段：
// planType / targetReplacementDate / estimatedInvestment / estimatedAnnualSaving /
// estimatedEnergySaving / paybackPeriod / replacementDeviceModel /
// replacementDeviceEfficiency / planStatus / approvalBy / approvalDate / executionDate
</script>

<template>
  <div class="card dd-card">
    <div class="dd-card-head">
      <AppIcon name="sparkles" :size="16" stroke="var(--brand)" />
      <h3>更新改造计划</h3>
    </div>

    <div class="rpc-empty">
      <div class="ic"><AppIcon name="factory" :size="28" stroke="var(--text-3)" /></div>
      <div class="h">
        {{ device.status === 'phaseout'
          ? '暂无改造计划，可基于判定结果生成建议'
          : '该设备暂无需要更新改造的计划' }}
      </div>
      <div class="s">
        生成的计划将包含：替换设备型号 / 预计投资额 / 预计年节省额 / 预计节能量 / 投资回收期 / 审批流程
      </div>
      <button
        v-if="device.status === 'phaseout'"
        class="btn primary"
        style="margin-top:14px"
      >
        <AppIcon name="sparkles" :size="13" /> 生成改造计划
      </button>
    </div>
  </div>
</template>

<style scoped>
.rpc-empty {
  padding: 36px 24px; text-align: center;
  border: 1px dashed var(--line-strong); border-radius: 10px;
  background: linear-gradient(180deg, #f8faff, #f3f6fb);
}
.rpc-empty .ic { display: flex; justify-content: center; margin-bottom: 10px; }
.rpc-empty .h { font-size: 13px; color: var(--text-1); font-weight: 500; line-height: 1.5; }
.rpc-empty .s { font-size: 11.5px; color: var(--text-3); margin-top: 8px; line-height: 1.6; max-width: 440px; margin-left: auto; margin-right: auto; }
</style>

<script setup>
// ── components/archive/ArchiveWizard.vue ──────────────────────────
// 4步向导总控制器，对应原 React ArchiveWizard 组件

import { ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import ArchiveStepper    from './ArchiveStepper.vue'
import WizardStepBasic   from './WizardStepBasic.vue'
import WizardStepDocs    from './WizardStepDocs.vue'
import WizardStepData    from './WizardStepData.vue'
import WizardStepFusion  from './WizardStepFusion.vue'

defineEmits(['exit'])

const STEP_COUNT = 4

const stepIdx = ref(0)
const pkg     = ref({ docs: {} })

function next() { stepIdx.value = Math.min(STEP_COUNT - 1, stepIdx.value + 1) }
function prev() { stepIdx.value = Math.max(0, stepIdx.value - 1) }

function updatePkg(val) { pkg.value = val }
</script>

<template>
  <!-- 页头 -->
  <div class="page-head">
    <div>
      <h1 class="page-title">
        <AppIcon name="plus" :size="22" stroke="var(--brand-2)" />
        录入新设备 — 档案与知识图谱融合
      </h1>
      <div class="page-subtitle">
        上传铭牌照片自动识别 · 关联档案与运行数据 · 知识图谱智能融合，全流程约 2 - 3 分钟
      </div>
    </div>
    <button class="btn ghost" @click="$emit('exit')">
      <AppIcon name="chevron-left" :size="14" /> 返回设备总览
    </button>
  </div>

  <div class="card" style="padding:0">
    <ArchiveStepper :current="stepIdx" />

    <div class="wizard-body">
      <WizardStepBasic
        v-if="stepIdx === 0"
        :data="pkg"
        @update:data="updatePkg"
        @next="next"
      />
      <WizardStepDocs
        v-else-if="stepIdx === 1"
        :data="pkg"
        @update:data="updatePkg"
        @next="next"
        @prev="prev"
      />
      <WizardStepData
        v-else-if="stepIdx === 2"
        :data="pkg"
        @update:data="updatePkg"
        @next="next"
        @prev="prev"
      />
      <WizardStepFusion
        v-else-if="stepIdx === 3"
        :data="pkg"
        @next="$emit('exit')"
        @prev="prev"
      />
    </div>
  </div>
</template>

<style scoped>
.wizard-body {
  padding: 24px;
  height: 580px;
  overflow-y: auto;
  box-sizing: border-box;
}
/* 细滚动条 */
.wizard-body::-webkit-scrollbar { width: 4px; }
.wizard-body::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 2px; }
</style>

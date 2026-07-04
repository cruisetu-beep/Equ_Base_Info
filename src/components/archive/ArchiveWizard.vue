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

const emit = defineEmits(['exit'])

const STEP_COUNT = 4

import { addDevice, uploadEquipmentFiles } from '@/api/devices'

const stepIdx = ref(0)
const pkg     = ref({ docs: {} })
const submitting = ref(false)
const basicStepRef = ref(null)

function next() { stepIdx.value = Math.min(STEP_COUNT - 1, stepIdx.value + 1) }
function prev() { stepIdx.value = Math.max(0, stepIdx.value - 1) }

function updatePkg(val) { pkg.value = val }

function handleNextStep() {
  if (stepIdx.value === 0) {
    if (basicStepRef.value && basicStepRef.value.validate()) {
      next()
    }
  } else {
    next()
  }
}

async function submitArchive() {
  submitting.value = true
  try {
    const paramsList = []
    if (pkg.value.paramGroups) {
      pkg.value.paramGroups.forEach(g => {
        if (g.items) {
          g.items.forEach(i => {
            if (i.name && i.name.trim()) {
              paramsList.push({ name: i.name.trim(), value: i.value || '' })
            }
          })
        }
      })
    }

    const filesList = []
    const realFilesToUpload = []
    if (pkg.value.docs) {
      Object.values(pkg.value.docs).forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(f => {
            if (f.name) {
              filesList.push({ name: f.name, size: f.size || 0 })
              if (f.rawFile) {
                realFilesToUpload.push(f.rawFile)
              }
            }
          })
        }
      })
    }

    const payload = {
      code: pkg.value.code || '',
      name: pkg.value.name || '',
      typeK: pkg.value.typeK || '',
      type2: pkg.value.type2 || '',
      building: pkg.value.building || '',
      buildingCode: pkg.value.buildingCode || '',
      model: pkg.value.model || '',
      year: parseInt(pkg.value.year) || 2010,
      manufacturer: pkg.value.manufacturer || '',
      params: paramsList,
      files: filesList
    }

    console.log('提交新设备载荷:', payload)
    // 1. 先保存设备主体数据
    await addDevice(payload)

    // 2. 主体保存成功后，如有真实的本地文件，发起批量关联上传
    if (realFilesToUpload.length > 0) {
      const equId = payload.code
      const buildId = payload.buildingCode
      const descs = realFilesToUpload.map(() => '')
      console.log(`设备 ${equId} 主体创建成功，开始上传 ${realFilesToUpload.length} 个本地附件...`)
      try {
        await uploadEquipmentFiles(realFilesToUpload, equId, buildId, descs)
        console.log('真实附件批量上传并持久化成功！')
      } catch (uploadErr) {
        console.error('附件批量上传失败:', uploadErr)
        alert('设备主体已保存，但附件上传失败，请稍后在设备详情页重新上传。')
      }
    }

    emit('exit')
  } catch (err) {
    console.error('提交新设备异常:', err)
    alert('保存新设备失败，请稍后重试。')
  } finally {
    submitting.value = false
  }
}
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
      <div class="wizard-content">
        <WizardStepBasic
            v-if="stepIdx === 0"
            ref="basicStepRef"
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

      <!-- 固定底部按钮区 -->
      <div class="wizard-footer">
        <div class="form-actions" style="margin:0">
          <button v-if="stepIdx > 0" class="btn ghost" @click="prev">
            <AppIcon name="chevron-left" :size="14" /> 上一步
          </button>
          <div style="margin-left:auto; display:flex; gap:10px">
            <template v-if="stepIdx < 3">
              <button class="btn primary" @click="handleNextStep">
                下一步 <AppIcon name="chevron-right" :size="14" />
              </button>
            </template>
            <template v-else>
              <button class="btn primary" :disabled="submitting" @click="submitArchive">
                <template v-if="submitting">
                  <div class="ocr-spinner" style="width:12px; height:12px; border-width:1.5px; border-top-color:#fff; margin-right:6px"></div>
                  正在保存...
                </template>
                <template v-else>
                  <AppIcon name="check" :size="14" stroke="#fff" /> 完成 · 返回总览
                </template>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-body {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 320px);
  min-height: 480px;
  box-sizing: border-box;
}
.wizard-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 24px 0;
}
.wizard-content::-webkit-scrollbar { width: 4px; }
.wizard-content::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 2px; }
.wizard-footer {
  flex-shrink: 0;
  padding: 14px 24px;
  border-top: 1px solid var(--line);
  background: #fff;
}
</style>

<script setup>
// ── components/detail/DeviceDocList.vue ───────────────────────────
// 关联文档列表：对应数据库设计 T_ST_EquipmentFileInfo
// 复用 archive 第2步 WizardStepDocs 的文档行视觉语言

import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  device: { type: Object, required: true },
})

// Mock 文档清单（真实后端就绪后由 T_ST_EquipmentFileInfo 按 F_EquID 查询返回）
const DOC_ICON = { photo: 'eye', manual: 'doc', archive: 'database', maintain: 'settings', test: 'sparkles' }

const docs = computed(() => {
  const seed = props.device.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return [
    { id: 'f1', cat: 'photo',   name: '设备铭牌-特写.jpg',        size: 1620 + (seed % 500), date: props.device.updated.slice(0, 10) },
    { id: 'f2', cat: 'photo',   name: '设备外观-正面.jpg',        size: 2840 + (seed % 400), date: props.device.updated.slice(0, 10) },
    { id: 'f3', cat: 'manual',  name: `${props.device.model} 使用说明书.pdf`, size: 4820 + (seed % 1000), date: `${props.device.year}-03-12` },
    { id: 'f4', cat: 'archive', name: '采购合同与验收报告.pdf',    size: 1240 + (seed % 300), date: `${props.device.year}-01-20` },
    ...(props.device.status === 'phaseout'
      ? [{ id: 'f5', cat: 'test', name: '能效检测报告.pdf', size: 1560 + (seed % 200), date: props.device.updated.slice(0, 10) }]
      : []),
  ]
})
</script>

<template>
  <div class="dl-card">
    <h4><AppIcon name="doc" :size="16" stroke="var(--brand)" /> 关联文档<span class="cnt">{{ docs.length }}</span></h4>

    <div class="dl-list">
      <div v-for="d in docs" :key="d.id" class="dl-row">
        <div class="dl-icn"><AppIcon :name="DOC_ICON[d.cat] || 'doc'" :size="14" /></div>
        <div class="dl-info">
          <div class="n">{{ d.name }}</div>
          <div class="meta">{{ d.size }}KB · {{ d.date }}</div>
        </div>
        <button class="dl-action" title="下载"><AppIcon name="download" :size="12" /></button>
      </div>
    </div>

    <button class="btn ghost dl-upload-btn">
      <AppIcon name="upload" :size="12" /> 上传新文档
    </button>
  </div>
</template>

<style scoped>
.dl-card {
  background: white; border: 1px solid var(--line); border-radius: 12px;
  padding: 18px; box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}
.dl-card h4 { margin: 0 0 14px; font-size: 13px; color: var(--text-0); display: flex; align-items: center; gap: 8px; }
.dl-card h4 .cnt { margin-left: auto; font-size: 11px; color: var(--text-3); font-family: "JetBrains Mono", monospace; }

.dl-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.dl-row {
  padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px;
  background: #f8faff; display: flex; align-items: center; gap: 10px; font-size: 12px;
}
.dl-icn { width: 26px; height: 26px; border-radius: 6px; background: white; border: 1px solid var(--line); display: grid; place-items: center; color: var(--text-2); flex-shrink: 0; }
.dl-info { flex: 1; min-width: 0; }
.dl-info .n { font-size: 12px; color: var(--text-0); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-info .meta { font-size: 10.5px; color: var(--text-2); margin-top: 2px; font-family: "JetBrains Mono", monospace; }
.dl-action { width: 26px; height: 26px; border-radius: 6px; background: white; border: 1px solid var(--line); display: grid; place-items: center; color: var(--text-2); cursor: pointer; flex-shrink: 0; }
.dl-action:hover { border-color: var(--brand); color: var(--brand); }

.dl-upload-btn { width: 100%; justify-content: center; padding: 8px; font-size: 12px; }
</style>

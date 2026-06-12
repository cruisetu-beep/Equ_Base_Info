<script setup>
// ── components/archive/ArchiveStepper.vue ─────────────────────────
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  current: { type: Number, required: true },
})

const ARCHIVE_STEPS = [
  { k: 'basic',  n: '基础信息',     d: '铭牌识别 + 设备属性录入' },
  { k: 'docs',   n: '照片与文档',   d: '现场照片 + 档案 + AI 解析' },
  { k: 'data',   n: '运行数据接入', d: '采集点位与数据源配置' },
  { k: 'fusion', n: '图谱融合',     d: '知识库智能链接与入库' },
]
</script>

<template>
  <div class="stepper">
    <template v-for="(s, i) in ARCHIVE_STEPS" :key="s.k">
      <div :class="['step', current === i && 'active', current > i && 'done']">
        <div class="step-num">
          <AppIcon v-if="current > i" name="check" :size="14" />
          <template v-else>{{ String(i + 1).padStart(2, '0') }}</template>
        </div>
        <div class="step-info">
          <div class="step-title">{{ s.n }}</div>
          <div class="step-desc">{{ s.d }}</div>
        </div>
      </div>
      <div v-if="i < ARCHIVE_STEPS.length - 1" class="step-line" />
    </template>
  </div>
</template>

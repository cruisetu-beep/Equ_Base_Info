<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  device: { type: Object, required: true },
})

const seed = computed(() =>
  props.device.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
)

// 文件类型配置
const FILE_TYPES = {
  pdf:  { color: '#e0394f', bg: '#fff0f1', label: 'PDF', icon: 'doc' },
  jpg:  { color: '#2b8fef', bg: '#f0f6ff', label: 'JPG', icon: 'eye' },
  png:  { color: '#2bd9a8', bg: '#f0fdf9', label: 'PNG', icon: 'eye' },
}

const getType = name => {
  const ext = name.split('.').pop().toLowerCase()
  return FILE_TYPES[ext] || { color: '#8a9bbf', bg: '#f5f7fb', label: ext.toUpperCase(), icon: 'doc' }
}

const docs = computed(() => {
  const s = seed.value
  const list = [
    { id: 'f1', name: '设备铭牌-特写.jpg',               size: 1.6 + (s % 5) * 0.1,  date: props.device.updated.slice(0, 10) },
    { id: 'f2', name: '设备外观-正面.jpg',               size: 2.8 + (s % 4) * 0.1,  date: props.device.updated.slice(0, 10) },
    { id: 'f3', name: `${props.device.model}-使用说明书.pdf`, size: 4.8 + (s % 10) * 0.1, date: `${props.device.year}-03-12` },
    { id: 'f4', name: '采购合同与验收报告.pdf',           size: 1.2 + (s % 3) * 0.1,  date: `${props.device.year}-01-20` },
  ]
  if (props.device.status === 'phaseout' || props.device.status === 'low_eff') {
    list.push({ id: 'f5', name: '能效检测报告.pdf', size: 1.5 + (s % 2) * 0.1, date: props.device.updated.slice(0, 10) })
  }
  return list.map(f => ({ ...f, type: getType(f.name) }))
})
</script>

<template>
  <div class="eb-block da-block">
    <div class="eb-block-title">
      <AppIcon name="database" :size="13" stroke="var(--brand)" />
      设备档案
      <span class="da-count">{{ docs.length }}</span>
    </div>

    <div class="da-grid">
      <div v-for="f in docs" :key="f.id" class="da-item" :title="f.name">
        <!-- 文件图标 -->
        <div class="da-icon" :style="{ background: f.type.bg, borderColor: f.type.color + '44' }">
          <AppIcon :name="f.type.icon" :size="22" :stroke="f.type.color" />
          <span class="da-ext" :style="{ background: f.type.color }">{{ f.type.label }}</span>
        </div>
        <!-- 文件名 -->
        <div class="da-name">{{ f.name }}</div>
        <div class="da-meta">{{ f.size.toFixed(1) }} MB · {{ f.date }}</div>
        <!-- 操作 -->
        <button class="da-dl" title="下载">
          <AppIcon name="download" :size="12" stroke="var(--brand)" />
        </button>
      </div>
    </div>

    <button class="da-upload">
      <AppIcon name="upload" :size="13" stroke="var(--brand)" />
      上传文件
    </button>
  </div>
</template>

<style scoped>
.da-block { margin-bottom: 0; }

.eb-block-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; color: var(--text-2);
  letter-spacing: 0.05em; text-transform: uppercase;
  padding: 7px 14px; background: #f6f9ff;
  border-bottom: 1px solid var(--line);
}
.da-count {
  margin-left: auto;
  font-size: 10px; color: var(--text-3);
  font-family: "JetBrains Mono", monospace;
}

/* 网格 */
.da-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 14px;
  background: #fff;
}

.da-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 10px 6px; border-radius: 8px;
  border: 1px solid var(--line); background: #fafbff;
  cursor: pointer; position: relative;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.da-item:hover {
  border-color: var(--brand);
  box-shadow: 0 2px 10px rgba(47,127,255,0.1);
}

/* 图标区 */
.da-icon {
  width: 52px; height: 52px; border-radius: 10px;
  border: 1px solid; display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
}
.da-ext {
  position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
  font-size: 8px; font-weight: 700; color: #fff; letter-spacing: 0.04em;
  padding: 1px 5px; border-radius: 3px; white-space: nowrap;
}

.da-name {
  font-size: 10.5px; color: var(--text-1); text-align: center;
  word-break: break-all; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-top: 4px;
}
.da-meta {
  font-size: 9.5px; color: var(--text-3);
  font-family: "JetBrains Mono", monospace; text-align: center;
}

/* 下载按钮 */
.da-dl {
  position: absolute; top: 6px; right: 6px;
  width: 20px; height: 20px; border-radius: 4px;
  background: white; border: 1px solid var(--line);
  display: grid; place-items: center; cursor: pointer; opacity: 0;
  transition: opacity 0.15s;
}
.da-item:hover .da-dl { opacity: 1; }
.da-dl:hover { border-color: var(--brand); }

/* 上传按钮 */
.da-upload {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 9px; font-size: 12px; color: var(--brand);
  background: #f6f9ff; border: none; border-top: 1px dashed var(--line);
  cursor: pointer;
}
.da-upload:hover { background: #eef3ff; }
</style>

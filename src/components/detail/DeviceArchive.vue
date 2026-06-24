<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  device: { type: Object, required: true },
})

const seed = computed(() =>
  props.device.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
)

const getExt = name => name.split('.').pop().toLowerCase()

const docs = computed(() => {
  const s = seed.value
  const list = [
    { id: 'f1', name: '设备铭牌-特写.jpg' },
    { id: 'f2', name: '设备外观-正面.jpg' },
    { id: 'f3', name: `${props.device.model}-使用说明书.pdf` },
    { id: 'f4', name: '采购合同与验收报告.pdf' },
  ]
  if (props.device.status === 'phaseout' || props.device.status === 'low_eff') {
    list.push({ id: 'f5', name: '能效检测报告.pdf' })
  }
  return list.map(f => ({ ...f, ext: getExt(f.name).toUpperCase() }))
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
        <div class="da-icon">
          <AppIcon name="doc" :size="26" stroke="var(--brand)" />
          <span class="da-ext">{{ f.ext }}</span>
        </div>
        <div class="da-name">{{ f.name }}</div>
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
.da-count { margin-left: auto; font-size: 10px; color: var(--text-3); font-family: "JetBrains Mono", monospace; }

.da-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; padding: 14px; background: #fff;
}

.da-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 12px 8px; border-radius: 8px;
  border: 1px solid var(--line); background: #fafbff;
  cursor: pointer; position: relative;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.da-item:hover { border-color: var(--brand); box-shadow: 0 2px 10px rgba(47,127,255,0.1); }

.da-icon {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 48px; height: 48px;
}
.da-ext {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  font-size: 8px; font-weight: 700; color: #fff; letter-spacing: 0.03em;
  background: var(--brand); padding: 1px 5px; border-radius: 3px; white-space: nowrap;
}

.da-name {
  font-size: 10.5px; color: var(--text-1); text-align: center;
  word-break: break-all; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.da-dl {
  position: absolute; top: 6px; right: 6px;
  width: 20px; height: 20px; border-radius: 4px;
  background: white; border: 1px solid var(--line);
  display: grid; place-items: center; cursor: pointer; opacity: 0;
  transition: opacity 0.15s;
}
.da-item:hover .da-dl { opacity: 1; }
.da-dl:hover { border-color: var(--brand); }

.da-upload {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 9px; font-size: 12px; color: var(--brand);
  background: #f6f9ff; border: none; border-top: 1px dashed var(--line); cursor: pointer;
}
.da-upload:hover { background: #eef3ff; }
</style>

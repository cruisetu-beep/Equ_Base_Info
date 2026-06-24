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
  <div class="da-wrap">
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

  </div>
</template>

<style scoped>
.da-wrap {
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
  margin-bottom: 12px;
}

.eb-block-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; color: var(--text-2);
  letter-spacing: 0.05em; text-transform: uppercase;
  padding: 7px 14px; background: #f6f9ff;
  border-bottom: 1px solid var(--line);
}
.da-count { margin-left: auto; font-size: 10px; color: var(--text-3); font-family: "JetBrains Mono", monospace; }

.da-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px; padding: 12px; background: #fff;
}

.da-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 5px; padding: 10px 6px 8px; border-radius: 8px;
  border: 1px solid var(--line); background: #fafbff;
  cursor: pointer; position: relative; min-width: 0;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.da-item:hover { border-color: var(--brand); box-shadow: 0 2px 10px rgba(47,127,255,0.1); }

.da-icon {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 40px; height: 44px; flex-shrink: 0;
}
.da-ext {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  font-size: 7px; font-weight: 700; color: #fff; letter-spacing: 0.03em;
  background: var(--brand); padding: 1px 4px; border-radius: 3px; white-space: nowrap;
}

.da-name {
  font-size: 10px; color: var(--text-1); text-align: center;
  width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.da-dl {
  position: absolute; top: 5px; right: 5px;
  width: 18px; height: 18px; border-radius: 4px;
  background: white; border: 1px solid var(--line);
  display: grid; place-items: center; cursor: pointer; opacity: 0;
  transition: opacity 0.15s;
}
.da-item:hover .da-dl { opacity: 1; }
.da-dl:hover { border-color: var(--brand); }


</style>

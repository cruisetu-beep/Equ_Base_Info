<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'

const props = defineProps({ data: { type: Object, required: true } })
const emit  = defineEmits(['next', 'prev'])

// 基础信息
const devType = computed(() => DEV_TYPE_MAP[props.data.typeK] || DEV_TYPE_MAP.other)

// 参数数量
const paramCount = computed(() =>
  (props.data.paramGroups || []).flatMap(g => g.items || []).filter(i => i.name?.trim()).length
)

// 文档数量
const docCount = computed(() => {
  const docs = props.data.docs || {}
  return Object.values(docs).reduce((n, arr) => n + (arr?.length || 0), 0)
})

const docCategories = computed(() => {
  const docs = props.data.docs || {}
  return Object.entries(docs)
    .filter(([, arr]) => arr?.length)
    .map(([k, arr]) => {
      const labels = { device:'设备照片', site:'现场照片', archive:'设备档案', maintain:'维保记录', monitor:'监测报告', other:'其他文件' }
      return `${labels[k] || k} ${arr.length} 份`
    })
})

// 数据接入
const hasDataLink = computed(() => !!props.data.dataNodeId)

// 步骤列表
const steps = computed(() => [
  {
    icon: 'cube', color: '#4dc9ff',
    title: '基础信息',
    desc: props.data.name
      ? `${props.data.name} 已登记，归属 ${props.data.building || '—'}`
      : '设备基础信息已录入',
    done: !!(props.data.name || props.data.code),
  },
  {
    icon: 'bolt', color: '#2bd9a8',
    title: '设备参数',
    desc: paramCount.value > 0
      ? `${paramCount.value} 项运行参数已录入`
      : '未录入参数',
    done: paramCount.value > 0,
  },
  {
    icon: 'database', color: '#a799ff',
    title: '照片与文档',
    desc: docCount.value > 0
      ? docCategories.value.join(' · ')
      : '暂未上传档案',
    done: docCount.value > 0,
  },
  {
    icon: 'panel', color: '#ffb547',
    title: '运行数据接入',
    desc: hasDataLink.value
      ? `已接入 ${props.data.dataModelId || ''} · ${props.data.dataNodeId}`
      : '暂未配置数据接入',
    done: hasDataLink.value,
  },
])

const doneCount = computed(() => steps.value.filter(s => s.done).length)
</script>

<template>
  <div class="step-fusion">

    <!-- 顶部成功横幅 -->
    <div class="success-banner">
      <div class="success-icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="14" fill="rgba(43,217,168,0.15)"/>
          <path d="M8 14l4 4 8-8" stroke="#2bd9a8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="success-text">
        <div class="success-title">设备已成功录入系统</div>
        <div class="success-sub">
          {{ data.name || '新设备' }}
          <span v-if="data.code" class="success-code">{{ data.code }}</span>
          · 完成 {{ doneCount }} / {{ steps.length }} 项信息录入
        </div>
      </div>
      <div class="success-time">{{ new Date().toLocaleString('zh-CN') }}</div>
    </div>

    <!-- 流程卡片 -->
    <div class="flow-wrap">
      <template v-for="(step, i) in steps" :key="step.title">
        <div :class="['flow-card', step.done ? 'done' : 'skip']">
          <div class="flow-card-top">
            <div class="flow-icon" :style="{ background: step.color + '22', '--c': step.color }">
              <AppIcon :name="step.icon" :size="20" :stroke="step.color" />
            </div>
            <div :class="['flow-badge', step.done ? 'badge-done' : 'badge-skip']">
              <template v-if="step.done">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                已完成
              </template>
              <template v-else>未配置</template>
            </div>
          </div>
          <div class="flow-step-num">STEP {{ i + 1 }}</div>
          <div class="flow-title">{{ step.title }}</div>
          <div class="flow-desc">{{ step.desc }}</div>
        </div>

        <!-- 箭头连接 -->
        <div v-if="i < steps.length - 1" class="flow-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="var(--line-strong)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </template>
    </div>

    <!-- 提示说明 -->
    <div class="fusion-note">
      <AppIcon name="info" :size="13" stroke="var(--text-3)" />
      设备详细信息、能耗数据和淘汰判定可在设备详情页中查看
    </div>

  </div>

  <!-- 底部操作 -->
  <div class="form-actions" style="margin-top: 20px">
    <button class="btn ghost" @click="$emit('prev')">
      <AppIcon name="chevron-left" :size="14" /> 上一步
    </button>
    <div style="display:flex; gap:10px; margin-left:auto">
      <button class="btn ghost" @click="$emit('next')">继续录入下一台</button>
      <button class="btn primary" @click="$emit('next')">
        <AppIcon name="check" :size="14" stroke="#fff" /> 完成 · 返回总览
      </button>
    </div>
  </div>
</template>

<style scoped>
.step-fusion { display: flex; flex-direction: column; gap: 20px; }

/* 成功横幅 */
.success-banner {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(43,217,168,0.08), rgba(77,201,255,0.06));
  border: 1px solid rgba(43,217,168,0.25);
}
.success-icon { flex-shrink: 0; }
.success-text { flex: 1; }
.success-title { font-size: 16px; font-weight: 700; color: var(--text-0); margin-bottom: 4px; }
.success-sub { font-size: 12px; color: var(--text-2); display: flex; align-items: center; gap: 8px; }
.success-code {
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  background: rgba(77,201,255,0.12); color: var(--brand);
  padding: 1px 7px; border-radius: 4px;
}
.success-time { font-size: 11px; color: var(--text-3); font-family: "JetBrains Mono", monospace; flex-shrink: 0; }

/* 流程卡片 */
.flow-wrap {
  display: flex; align-items: stretch; gap: 0;
  border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
}

.flow-card {
  flex: 1; padding: 20px 18px; display: flex; flex-direction: column; gap: 8px;
  border-right: 1px solid var(--line); background: #fff;
  transition: background 0.2s;
}
.flow-card:last-of-type { border-right: none; }
.flow-card.done { background: #fff; }
.flow-card.skip { background: #f8faff; }

.flow-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }

.flow-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: grid; place-items: center; flex-shrink: 0;
}

.flow-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px;
}
.badge-done { background: rgba(43,217,168,0.15); color: #1aaa88; }
.badge-skip { background: #f0f2f7; color: var(--text-3); }

.flow-step-num { font-size: 10px; color: var(--text-3); font-family: "JetBrains Mono", monospace; letter-spacing: 0.06em; }
.flow-title { font-size: 14px; font-weight: 700; color: var(--text-0); }
.flow-desc { font-size: 12px; color: var(--text-2); line-height: 1.6; }

.flow-arrow {
  display: flex; align-items: center; justify-content: center;
  width: 0; overflow: visible; position: relative; z-index: 1;
}
.flow-arrow svg { flex-shrink: 0; }

/* 提示 */
.fusion-note {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--text-3);
  padding: 10px 14px; background: #f8faff; border-radius: 8px;
  border: 1px solid var(--line);
}
</style>

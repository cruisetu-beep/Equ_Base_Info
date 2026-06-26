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
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="rgba(43,217,168,0.15)"/>
          <circle cx="24" cy="24" r="18" fill="rgba(43,217,168,0.12)"/>
          <path d="M14 24l7 7 13-13" stroke="#2bd9a8" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="success-text">
        <div class="success-title">设备已成功录入系统</div>
        <div class="success-sub">
          <span class="device-name">{{ data.name || '新设备' }}</span>
          <span v-if="data.code" class="success-code">{{ data.code }}</span>
        </div>
      </div>
      <div class="success-time">{{ new Date().toLocaleString('zh-CN') }}</div>
    </div>

    <!-- 流程卡片 -->
    <div class="flow-wrap">
      <template v-for="(step, i) in steps" :key="step.title">
        <div :class="['flow-card', step.done ? 'done' : 'skip']">
          <div class="flow-card-top">
            <div class="flow-icon" :style="{ background: step.color + '22' }">
              <AppIcon :name="step.icon" :size="28" :stroke="step.color" />
            </div>
            <div :class="['flow-badge', step.done ? 'badge-done' : 'badge-skip']">
              <template v-if="step.done">
                <svg width="15" height="15" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3L10 3" stroke="#0b9474" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
        <div v-if="i < steps.length - 1" class="flow-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
  display: flex; align-items: center; gap: 18px;
  padding: 20px 24px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(43,217,168,0.08), rgba(77,201,255,0.06));
  border: 1px solid rgba(43,217,168,0.25);
}
.success-icon { flex-shrink: 0; }
.success-text { flex: 1; }
.success-title { font-size: 20px; font-weight: 700; color: var(--text-0); margin-bottom: 6px; }
.success-sub { display: flex; align-items: center; gap: 10px; }
.device-name { font-size: 14px; color: var(--text-1); }
.success-code {
  font-family: "JetBrains Mono", monospace; font-size: 12px;
  background: rgba(77,201,255,0.12); color: var(--brand);
  padding: 2px 9px; border-radius: 5px;
}
.success-time { font-size: 11px; color: var(--text-3); font-family: "JetBrains Mono", monospace; flex-shrink: 0; align-self: flex-start; }

/* 统计数据 */
.success-stats {
  display: flex; align-items: center; gap: 0;
  background: rgba(255,255,255,0.7); border: 1px solid rgba(43,217,168,0.2);
  border-radius: 10px; padding: 12px 0; flex-shrink: 0;
}
.stat-item { padding: 0 20px; text-align: center; }
.stat-val { font-size: 22px; font-weight: 700; color: var(--brand); font-family: "JetBrains Mono", monospace; line-height: 1.2; }
.stat-label { font-size: 11px; color: var(--text-3); margin-top: 4px; }
.stat-div { width: 1px; height: 36px; background: rgba(43,217,168,0.2); flex-shrink: 0; }

/* 流程卡片 */
.flow-wrap {
  display: flex; align-items: stretch; gap: 0;
  border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
}
.flow-card {
  flex: 1; padding: 24px 20px; display: flex; flex-direction: column; gap: 10px;
  border-right: 1px solid var(--line); background: #fff;
}
.flow-card:last-of-type { border-right: none; }
.flow-card.skip { background: #f9fbff; }

.flow-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
.flow-icon {
  width: 56px; height: 56px; border-radius: 14px;
  display: grid; place-items: center; flex-shrink: 0;
}
.flow-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 700; padding: 8px 18px; border-radius: 20px;
}
.badge-done { background: rgba(43,217,168,0.2); color: #0b9474; border: 1.5px solid rgba(43,217,168,0.4); }
.badge-skip { background: #eef0f6; color: var(--text-2); border: 1.5px solid var(--line); }

.flow-step-num { font-size: 11px; color: var(--text-3); font-family: "JetBrains Mono", monospace; letter-spacing: 0.06em; }
.flow-title { font-size: 16px; font-weight: 700; color: var(--text-0); }
.flow-desc {
  font-size: 14px; font-weight: 600; color: var(--brand);
  line-height: 1.6; margin-top: 4px;
  padding: 10px 14px; background: #f0f6ff; border-radius: 7px;
  border-left: 3px solid var(--brand);
}
.flow-card.skip .flow-desc {
  color: var(--text-2); background: #f5f7fb; border-left-color: var(--line-strong);
}

/* 提示 */
.fusion-note {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--text-3);
  padding: 10px 14px; background: #f8faff; border-radius: 8px;
  border: 1px solid var(--line);
}
</style>

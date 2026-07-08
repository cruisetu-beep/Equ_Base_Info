<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'

const props = defineProps({ data: { type: Object, required: true } })
const emit  = defineEmits(['next', 'prev'])

const devType = computed(() => DEV_TYPE_MAP[props.data.typeK] || DEV_TYPE_MAP.other)

const paramCount = computed(() =>
  (props.data.paramGroups || []).flatMap(g => g.items || []).filter(i => i.name?.trim()).length
)
const paramSample = computed(() =>
  (props.data.paramGroups || []).flatMap(g => g.items || [])
    .filter(i => i.name?.trim()).slice(0, 3).map(i => i.name)
)
const paramExtra = computed(() => Math.max(0, paramCount.value - 3))

const docCounts = computed(() => {
  const docs = props.data.docs || {}
  const labels = { device:'设备照片', site:'现场照片', archive:'设备档案', maintain:'维保记录', monitor:'监测报告', other:'其他文件' }
  return Object.entries(docs)
    .filter(([, arr]) => arr?.length)
    .map(([k, arr]) => `${labels[k] || k} ${arr.length}`)
})
const docTotal = computed(() =>
  Object.values(props.data.docs || {}).reduce((n, arr) => n + (arr?.length || 0), 0)
)

const hasDataLink = computed(() => !!props.data.dataNodeId)
const dataLabel = computed(() => {
  if (!hasDataLink.value) return ''
  return `${props.data.dataModelId || ''} · ${props.data.dataNodeId}`
})

const doneCount = computed(() => [
  !!(props.data.name || props.data.code),
  paramCount.value > 0,
  docTotal.value > 0,
  hasDataLink.value,
].filter(Boolean).length)

const THEMES = [
  { iconBg:'#eaf3fc', iconStroke:'#5a8fd8', accentBg:'#f3f9fe', accentBorder:'#8fbcf0', accentText:'#3973c4' },
  { iconBg:'#e6f7ee', iconStroke:'#16a34a', accentBg:'#f3fbf6', accentBorder:'#22c55e', accentText:'#15803d' },
  { iconBg:'#e6f4f2', iconStroke:'#4ba89d', accentBg:'#f2faf9', accentBorder:'#74c5bb', accentText:'#15837a' },
  { iconBg:'#faf1e0', iconStroke:'#d29a52', accentBg:'#fdf9f0', accentBorder:'#f0c886', accentText:'#b67b32' },
]
</script>

<template>
  <div class="fusion-wrap">

    <!-- 成功横幅 -->
    <div class="banner">
      <div class="banner-icon">
        <div class="icon-outer">
          <div class="icon-inner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="banner-title">设备信息录入完成</div>
      <div class="banner-pill">
        <span class="pill-num">{{ doneCount }}</span>
        <span class="pill-text">/ 4 项完成</span>
      </div>
    </div>

    <!-- 四张步骤卡片 2×2 -->
    <div class="cards-grid">

      <!-- STEP 1 基础信息 -->
      <div class="step-card">
        <div class="card-top">
          <div class="card-icon" :style="{ background: THEMES[0].iconBg }">
            <AppIcon name="cube" :size="30" :stroke="THEMES[0].iconStroke" />
          </div>
          <div class="card-title-wrap">
            <div class="card-step">STEP 1</div>
            <div class="card-title">基础信息</div>
          </div>
          <div class="done-badge">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M3 8.5l4 4 7-7" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            已完成
          </div>
        </div>
        <div class="accent-block" :style="{ background: THEMES[0].accentBg, borderLeftColor: THEMES[0].accentBorder }">
          <div class="accent-intro">设备基础信息已登记</div>
          <div class="accent-main" :style="{ color: THEMES[0].accentText }">{{ data.name || '—' }}</div>
          <div class="accent-sub">
            <span class="info-pill" style="background:#eaf3fc; color:#4a82d2">归属 {{ data.building || '—' }}</span>
            <span style="color:#475569">编号 {{ data.code || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- STEP 2 设备参数 -->
      <div class="step-card">
        <div class="card-top">
          <div class="card-icon" :style="{ background: THEMES[1].iconBg }">
            <AppIcon name="bolt" :size="30" :stroke="THEMES[1].iconStroke" />
          </div>
          <div class="card-title-wrap">
            <div class="card-step">STEP 2</div>
            <div class="card-title">设备参数</div>
          </div>
          <div class="done-badge" v-if="paramCount > 0">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M3 8.5l4 4 7-7" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            已完成
          </div>
          <div class="skip-badge" v-else>未填</div>
        </div>
        <div class="accent-block" :style="{ background: THEMES[1].accentBg, borderLeftColor: THEMES[1].accentBorder }">
          <div class="accent-intro">运行参数已全部录入</div>
          <div class="accent-main" :style="{ color: THEMES[1].accentText }">
            {{ paramCount }}<span class="accent-unit">项</span>
          </div>
          <div class="accent-sub tag-row">
            <span v-for="t in paramSample" :key="t" class="param-tag" :style="{ background: THEMES[1].iconBg, color: '#475569' }">{{ t }}</span>
            <span v-if="paramExtra > 0" class="param-tag" style="background:#eef4ef; color:#94a3b8">+{{ paramExtra }}</span>
            <span v-if="paramCount === 0" style="color:#94a3b8; font-size:12px">暂无参数</span>
          </div>
        </div>
      </div>

      <!-- STEP 3 档案资料 -->
      <div class="step-card">
        <div class="card-top">
          <div class="card-icon" :style="{ background: THEMES[2].iconBg }">
            <AppIcon name="database" :size="30" :stroke="THEMES[2].iconStroke" />
          </div>
          <div class="card-title-wrap">
            <div class="card-step">STEP 3</div>
            <div class="card-title">档案资料</div>
          </div>
          <div class="done-badge" v-if="docTotal > 0">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M3 8.5l4 4 7-7" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            已完成
          </div>
          <div class="skip-badge" v-else>未上传</div>
        </div>
        <div class="accent-block" :style="{ background: THEMES[2].accentBg, borderLeftColor: THEMES[2].accentBorder }">
          <div class="accent-intro">相关档案资料已上传</div>
          <div class="accent-main" :style="{ color: THEMES[2].accentText }">
            {{ docTotal }}<span class="accent-unit">份</span>
          </div>
          <div class="accent-sub">{{ docCounts.join(' · ') || '暂未上传' }}</div>
        </div>
      </div>

      <!-- STEP 4 数据接入 -->
      <div class="step-card">
        <div class="card-top">
          <div class="card-icon" :style="{ background: THEMES[3].iconBg }">
            <AppIcon name="panel" :size="30" :stroke="THEMES[3].iconStroke" />
          </div>
          <div class="card-title-wrap">
            <div class="card-step">STEP 4</div>
            <div class="card-title">数据接入</div>
          </div>
          <div class="done-badge" v-if="hasDataLink">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M3 8.5l4 4 7-7" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            已完成
          </div>
          <div class="skip-badge" v-else>未配置</div>
        </div>
        <div class="accent-block" :style="{ background: THEMES[3].accentBg, borderLeftColor: THEMES[3].accentBorder }">
          <div class="accent-intro">
            <span v-if="hasDataLink" class="green-dot"></span>
            {{ hasDataLink ? '实时运行数据已接入' : '暂未配置数据接入' }}
          </div>
          <div class="accent-main" :style="{ color: THEMES[3].accentText }">
            {{ hasDataLink ? (data.dataNodeName || data.dataNodeId) : '—' }}
          </div>
          <div class="accent-sub" v-if="hasDataLink">
            已绑定模型节点：<span>{{ data.dataModelName || data.dataModelId }}</span>
          </div>
          <div class="accent-sub" v-else>可在运行数据接入步骤配置</div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.fusion-wrap { display: flex; flex-direction: column; gap: 12px; }

/* 横幅 */
.banner {
  display: flex; align-items: center; gap: 16px;
  background: #fff; border: 1px solid #eceff3; border-radius: 14px;
  padding: 12px 20px; box-shadow: 0 8px 28px -20px rgba(15,23,42,.35);
}
.icon-outer {
  width: 40px; height: 40px; border-radius: 50%;
  background: #e6f7ee; display: grid; place-items: center; flex-shrink: 0;
}
.icon-inner {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg, #34d399, #16a34a);
  box-shadow: 0 4px 10px -4px rgba(22,163,74,.6);
  display: grid; place-items: center;
}
.banner-title { font-size: 16px; font-weight: 700; color: #0f172a; flex: 1; }
.banner-pill {
  display: flex; align-items: baseline; gap: 4px;
  background: #ecfdf3; border: 1px solid #c7eed5;
  padding: 6px 14px; border-radius: 999px; flex-shrink: 0;
}
.pill-num { font-size: 16px; font-weight: 800; color: #16a34a; }
.pill-text { font-size: 12px; font-weight: 600; color: #15803d; }

/* 卡片网格 */
.cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.step-card {
  background: #fff; border: 1px solid #eceff3; border-radius: 12px;
  padding: 14px 16px; box-shadow: 0 8px 28px -22px rgba(15,23,42,.35);
  display: flex; flex-direction: column;
}

/* 卡片顶部 */
.card-top { display: flex; align-items: center; gap: 12px; }
.card-icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
.card-title-wrap { flex: 1; }
.card-step { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 1.5px; }
.card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px; }

.done-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: #ecfdf3; color: #16a34a; font-size: 13px; font-weight: 700;
  padding: 6px 12px; border-radius: 999px; flex-shrink: 0;
}
.skip-badge {
  background: #f1f5f9; color: #94a3b8; font-size: 12px; font-weight: 600;
  padding: 6px 12px; border-radius: 999px; flex-shrink: 0;
}

/* 高亮信息块 */
.accent-block {
  margin-top: 8px; border-radius: 0 8px 8px 0;
  padding: 10px 12px; border-left: 3px solid;
  display: flex; flex-direction: column; gap: 10px; flex: 1;
}
.accent-intro { font-size: 11px; font-weight: 500; color: #64748b; display: flex; align-items: center; gap: 7px; }
.accent-main { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
.accent-unit { font-size: 14px; font-weight: 600; margin-left: 4px; opacity: 0.85; }
.accent-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: #475569; }

.info-pill { padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.tag-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.param-tag { font-size: 11px; padding: 2px 8px; border-radius: 6px; }

.green-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(34,197,94,.22);
}
</style>

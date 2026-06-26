<script setup>
import { ref, computed, watch } from 'vue'
import * as echarts from 'echarts'
import { onMounted, onBeforeUnmount } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DATA_MODELS_BY_BUILDING, genNodeEnergyData } from '@/data/dataModels'

const props = defineProps({ data: { type: Object, required: true } })
defineEmits(['next', 'prev'])

// ── 数据模型列表（根据楼宇筛选）──────────────────────────────────
const models = computed(() =>
  DATA_MODELS_BY_BUILDING[props.data.building] || []
)

const selectedModelId = ref('')
const selectedNodeId  = ref('')
const expandedNodes   = ref({})

const selectedModel = computed(() =>
  models.value.find(m => m.id === selectedModelId.value) || null
)
const selectedNode = computed(() => {
  if (!selectedModel.value || !selectedNodeId.value) return null
  for (const group of selectedModel.value.nodes) {
    if (group.id === selectedNodeId.value) return group
    for (const child of group.children || []) {
      if (child.id === selectedNodeId.value) return child
    }
  }
  return null
})

function selectModel(id) {
  selectedModelId.value = id
  selectedNodeId.value = ''
  expandedNodes.value = {}
}

function toggleGroup(id) {
  expandedNodes.value = { ...expandedNodes.value, [id]: !expandedNodes.value[id] }
}

function selectNode(id) {
  selectedNodeId.value = id
}

// ── 能耗数据 ──────────────────────────────────────────────────────
const energyData = computed(() =>
  selectedNodeId.value ? genNodeEnergyData(selectedNodeId.value) : []
)

const totalKwh = computed(() =>
  energyData.value.reduce((s, d) => s + d.kwh, 0).toFixed(1)
)
const monthKwh = computed(() =>
  (parseFloat(totalKwh.value) * new Date().getDate()).toFixed(1)
)
const yearKwh = computed(() => {
  const now = new Date()
  const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  return (parseFloat(totalKwh.value) * day).toFixed(1)
})

// 小时聚合
const hourlyData = computed(() => {
  const map = {}
  energyData.value.forEach(d => {
    const h = d.time.split(':')[0]
    map[h] = (map[h] || 0) + d.kwh
  })
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2,'0')}:00`,
    kwh: parseFloat((map[String(i).padStart(2,'0')] || 0).toFixed(2)),
  }))
})

// ── ECharts ───────────────────────────────────────────────────────
const chartRef = ref(null)
let chart = null

function buildOption() {
  const data = hourlyData.value
  const max = Math.max(...data.map(d => d.kwh))
  return {
    grid: { top: 12, right: 10, bottom: 32, left: 42 },
    tooltip: {
      trigger: 'axis',
      formatter: p => `${p[0].name}<br/>用电量：<b>${p[0].value} kWh</b>`,
      backgroundColor: '#1a2440', borderColor: '#2a3a60',
      textStyle: { color: '#c8d8f8', fontSize: 12 },
    },
    xAxis: {
      type: 'category', data: data.map(d => d.hour),
      axisLabel: { fontSize: 10, color: '#8a9bbf', interval: 3, formatter: v => v.slice(0,2)+'h' },
      axisLine: { lineStyle: { color: '#dde4f0' } }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value', name: 'kWh',
      nameTextStyle: { fontSize: 10, color: '#8a9bbf' },
      axisLabel: { fontSize: 10, color: '#8a9bbf' },
      splitLine: { lineStyle: { color: '#eef1f8', type: 'dashed' } },
    },
    series: [{
      type: 'bar', data: data.map(d => d.kwh), barMaxWidth: 24,
      itemStyle: {
        color: params => params.value / max > 0.8
          ? new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ff8a47'},{offset:1,color:'#ffb547'}])
          : new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#4dc9ff'},{offset:1,color:'#2bd9a8'}]),
        borderRadius: [3,3,0,0],
      },
    }],
  }
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, null, { renderer: 'svg' })
  chart.setOption(buildOption())
}

const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => chart?.resize()) : null

onMounted(() => { if (selectedNodeId.value) initChart() })
onBeforeUnmount(() => { ro?.disconnect(); chart?.dispose() })

watch(selectedNodeId, () => {
  if (!selectedNodeId.value) { chart?.dispose(); chart = null; return }
  setTimeout(() => {
    if (!chart) initChart()
    else chart.setOption(buildOption())
  }, 50)
})
</script>

<template>
  <div class="step-fusion">

    <!-- 左：选择区 -->
    <div class="fusion-left">

      <!-- 楼宇提示 -->
      <div class="building-hint" v-if="data.building">
        <AppIcon name="cube" :size="14" stroke="var(--brand)" />
        <span>当前楼宇：<strong>{{ data.building }}</strong>，共 {{ models.length }} 个数据模型</span>
      </div>
      <div class="building-hint warn" v-else>
        <AppIcon name="info" :size="14" stroke="var(--warn)" />
        <span>请先在基础信息中选择楼宇</span>
      </div>

      <!-- Step 1: 选择数据模型 -->
      <div class="step-block">
        <div class="step-label"><span class="step-num">1</span>选择数据模型</div>
        <div class="model-list">
          <div
            v-for="m in models" :key="m.id"
            :class="['model-card', selectedModelId === m.id && 'active']"
            @click="selectModel(m.id)"
          >
            <AppIcon name="database" :size="16" :stroke="selectedModelId === m.id ? 'var(--brand)' : 'var(--text-3)'" />
            <span>{{ m.name }}</span>
            <AppIcon v-if="selectedModelId === m.id" name="check" :size="13" stroke="var(--brand)" style="margin-left:auto" />
          </div>
          <div v-if="!models.length" class="empty-hint">当前楼宇暂无数据模型</div>
        </div>
      </div>

      <!-- Step 2: 选择节点 -->
      <div class="step-block" v-if="selectedModel">
        <div class="step-label"><span class="step-num">2</span>选择模型节点</div>
        <div class="node-tree">
          <div v-for="group in selectedModel.nodes" :key="group.id">
            <!-- 分组行 -->
            <div class="tree-group" @click="toggleGroup(group.id)">
              <span class="tree-arrow">{{ expandedNodes[group.id] ? '▼' : '▶' }}</span>
              <AppIcon name="panel" :size="13" stroke="var(--text-2)" />
              <span>{{ group.label }}</span>
            </div>
            <!-- 子节点 -->
            <div v-if="expandedNodes[group.id]">
              <div
                v-for="child in group.children" :key="child.id"
                :class="['tree-node', selectedNodeId === child.id && 'active']"
                @click="selectNode(child.id)"
              >
                <span class="tree-indent"></span>
                <span class="node-dot" :class="selectedNodeId === child.id ? 'on' : ''"></span>
                <span>{{ child.label }}</span>
                <AppIcon v-if="selectedNodeId === child.id" name="check" :size="11" stroke="var(--brand)" style="margin-left:auto" />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 右：数据预览 -->
    <div class="fusion-right">

      <!-- 未选节点空态 -->
      <div v-if="!selectedNodeId" class="preview-empty">
        <AppIcon name="bolt" :size="32" stroke="var(--line-strong)" />
        <div class="h">请先选择模型节点</div>
        <div class="s">选择完成后将自动展示该节点的今日能耗数据</div>
      </div>

      <!-- 已选节点：数据预览 -->
      <template v-else>
        <div class="preview-head">
          <AppIcon name="bolt" :size="15" stroke="var(--brand)" />
          <span class="pn">{{ selectedNode?.label }}</span>
          <span class="pm">· {{ selectedModel?.name }}</span>
          <span class="freq">15min</span>
        </div>

        <!-- 快照指标 -->
        <div class="ec-stats">
          <div class="ec-stat">
            <div class="ec-val">{{ totalKwh }}</div>
            <div class="ec-label">今日能耗 (kWh)</div>
          </div>
          <div class="ec-div"></div>
          <div class="ec-stat">
            <div class="ec-val">{{ monthKwh }}</div>
            <div class="ec-label">本月能耗 (kWh)</div>
          </div>
          <div class="ec-div"></div>
          <div class="ec-stat">
            <div class="ec-val">{{ yearKwh }}</div>
            <div class="ec-label">今年能耗 (kWh)</div>
          </div>
        </div>

        <!-- 柱状图 -->
        <div class="chart-title">今日用电曲线（15min 采集，小时聚合）</div>
        <div ref="chartRef" class="ec-chart"></div>

        <!-- 数据来源 -->
        <div class="data-source">
          数据来源：{{ selectedModel?.name }} · 节点 {{ selectedNodeId }} · 采样间隔 15min
        </div>
      </template>
    </div>

  </div>

  <!-- 底部操作 -->
  <div class="form-actions" style="margin-top:16px">
    <button class="btn ghost" @click="$emit('prev')">
      <AppIcon name="chevron-left" :size="14" /> 上一步
    </button>
    <button class="btn primary" @click="$emit('next')">
      完成 · 返回总览 <AppIcon name="check" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.step-fusion { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: flex-start; }

/* 左侧 */
.fusion-left { display: flex; flex-direction: column; gap: 14px; }

.building-hint {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; border-radius: 8px; font-size: 12px;
  background: #f0f6ff; border: 1px solid var(--line);
  color: var(--text-1);
}
.building-hint.warn { background: #fffbf0; border-color: rgba(234,140,46,0.3); }
.building-hint strong { color: var(--text-0); }

.step-block {
  border: 1px solid var(--line); border-radius: 10px; overflow: hidden;
}
.step-label {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #f6f9ff;
  border-bottom: 1px solid var(--line);
  font-size: 13px; font-weight: 600; color: var(--text-0);
}
.step-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--brand); color: #fff;
  font-size: 11px; display: grid; place-items: center; flex-shrink: 0;
}

/* 数据模型列表 */
.model-list { padding: 8px; display: flex; flex-direction: column; gap: 4px; background: #fff; }
.model-card {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 7px; cursor: pointer;
  border: 1px solid transparent; font-size: 13px; color: var(--text-1);
  transition: all 0.15s;
}
.model-card:hover { background: #f5f8ff; border-color: var(--line); }
.model-card.active { background: #eef5ff; border-color: var(--brand); color: var(--text-0); font-weight: 500; }
.empty-hint { padding: 16px; text-align: center; font-size: 12px; color: var(--text-3); }

/* 节点树 */
.node-tree { background: #fff; padding: 8px; }
.tree-group {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; cursor: pointer; border-radius: 6px;
  font-size: 12px; font-weight: 600; color: var(--text-1);
  user-select: none;
}
.tree-group:hover { background: #f5f8ff; }
.tree-arrow { font-size: 10px; color: var(--text-3); width: 12px; flex-shrink: 0; }

.tree-node {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px 7px 26px; border-radius: 6px; cursor: pointer;
  font-size: 12px; color: var(--text-2); transition: all 0.15s; user-select: none;
}
.tree-node:hover { background: #f5f8ff; color: var(--text-0); }
.tree-node.active { background: #eef5ff; color: var(--brand); font-weight: 500; }
.tree-indent { width: 4px; flex-shrink: 0; }
.node-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  background: var(--line-strong); transition: background 0.15s;
}
.node-dot.on { background: var(--brand); }

/* 右侧预览 */
.fusion-right {
  border: 1px solid var(--line); border-radius: 10px;
  background: #fff; padding: 18px; min-height: 380px;
}

.preview-empty {
  height: 100%; min-height: 340px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; color: var(--text-3);
}
.preview-empty .h { font-size: 14px; font-weight: 500; color: var(--text-2); }
.preview-empty .s { font-size: 12px; }

.preview-head {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed var(--line);
}
.pn { font-size: 14px; font-weight: 600; color: var(--text-0); }
.pm { font-size: 12px; color: var(--text-3); }
.freq {
  margin-left: auto; font-size: 10px; font-family: "JetBrains Mono", monospace;
  background: #eef5ff; color: var(--brand); padding: 2px 8px; border-radius: 4px;
}

.ec-stats {
  display: flex; align-items: center;
  background: #f5f9ff; border: 1px solid var(--line); border-radius: 8px;
  padding: 10px 0; margin-bottom: 14px;
}
.ec-stat { flex: 1; text-align: center; }
.ec-val { font-size: 18px; font-weight: 700; color: var(--brand); font-family: "JetBrains Mono", monospace; }
.ec-label { font-size: 10px; color: var(--text-3); margin-top: 3px; }
.ec-div { width: 1px; height: 30px; background: var(--line); flex-shrink: 0; }

.chart-title { font-size: 11px; color: var(--text-3); margin-bottom: 6px; }
.ec-chart { height: 180px; width: 100%; }
.data-source {
  margin-top: 10px; font-size: 10px; color: var(--text-3);
  font-family: "JetBrains Mono", monospace; text-align: right;
}
</style>

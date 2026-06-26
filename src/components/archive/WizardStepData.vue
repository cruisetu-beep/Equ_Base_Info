<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import AppIcon from '@/components/common/AppIcon.vue'
import { DATA_MODELS_BY_BUILDING, genNodeEnergyData } from '@/data/dataModels'

const props = defineProps({ data: { type: Object, required: true } })
const emit  = defineEmits(['update:data', 'next', 'prev'])

const models = computed(() => DATA_MODELS_BY_BUILDING[props.data.building] || [])

const selectedModelId = ref(props.data.dataModelId || '')
const selectedNodeId  = ref(props.data.dataNodeId  || '')
const expandedNodes   = ref({})
const modelDropdown   = ref(false)

const selectedModel = computed(() => models.value.find(m => m.id === selectedModelId.value) || null)
const selectedNode  = computed(() => {
  if (!selectedModel.value || !selectedNodeId.value) return null
  for (const g of selectedModel.value.nodes) {
    if (g.id === selectedNodeId.value) return g
    for (const c of g.children || []) if (c.id === selectedNodeId.value) return c
  }
  return null
})

function selectModel(id) {
  selectedModelId.value = id
  selectedNodeId.value  = ''
  expandedNodes.value   = {}
  modelDropdown.value   = false
  emit('update:data', { ...props.data, dataModelId: id, dataNodeId: '' })
}
function toggleGroup(id) {
  expandedNodes.value = { ...expandedNodes.value, [id]: !expandedNodes.value[id] }
}
function selectNode(id) {
  selectedNodeId.value = id
  emit('update:data', { ...props.data, dataModelId: selectedModelId.value, dataNodeId: id })
}

// ── 能耗数据 ──────────────────────────────────────────────────────
const energyData = computed(() => selectedNodeId.value ? genNodeEnergyData(selectedNodeId.value) : [])
const totalKwh   = computed(() => energyData.value.reduce((s, d) => s + d.kwh, 0).toFixed(1))
const monthKwh   = computed(() => (parseFloat(totalKwh.value) * new Date().getDate()).toFixed(1))
const yearKwh    = computed(() => {
  const now = new Date()
  const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  return (parseFloat(totalKwh.value) * day).toFixed(1)
})
const hourlyData = computed(() => {
  const map = {}
  energyData.value.forEach(d => { const h = d.time.split(':')[0]; map[h] = (map[h] || 0) + d.kwh })
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2,'0')}:00`,
    kwh: parseFloat((map[String(i).padStart(2,'0')] || 0).toFixed(2)),
  }))
})

// ── ECharts ───────────────────────────────────────────────────────
const chartRef = ref(null)
let chart = null
function buildOption() {
  const data = hourlyData.value, max = Math.max(...data.map(d => d.kwh))
  return {
    grid: { top: 12, right: 10, bottom: 32, left: 42 },
    tooltip: { trigger: 'axis', formatter: p => `${p[0].name}<br/>用电量：<b>${p[0].value} kWh</b>`,
      backgroundColor: '#1a2440', borderColor: '#2a3a60', textStyle: { color: '#c8d8f8', fontSize: 12 } },
    xAxis: { type: 'category', data: data.map(d => d.hour),
      axisLabel: { fontSize: 10, color: '#8a9bbf', interval: 3, formatter: v => v.slice(0,2)+'h' },
      axisLine: { lineStyle: { color: '#dde4f0' } }, axisTick: { show: false } },
    yAxis: { type: 'value', name: 'kWh', nameTextStyle: { fontSize: 10, color: '#8a9bbf' },
      axisLabel: { fontSize: 10, color: '#8a9bbf' }, splitLine: { lineStyle: { color: '#eef1f8', type: 'dashed' } } },
    series: [{ type: 'bar', data: data.map(d => d.kwh), barMaxWidth: 24,
      itemStyle: { color: p => p.value/max > 0.8
        ? new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ff8a47'},{offset:1,color:'#ffb547'}])
        : new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#4dc9ff'},{offset:1,color:'#2bd9a8'}]),
        borderRadius: [3,3,0,0] } }],
  }
}
const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => chart?.resize()) : null
onMounted(() => { if (selectedNodeId.value && chartRef.value) { chart = echarts.init(chartRef.value, null, { renderer: 'svg' }); chart.setOption(buildOption()); ro?.observe(chartRef.value) } })
onBeforeUnmount(() => { ro?.disconnect(); chart?.dispose() })
watch(selectedNodeId, () => {
  if (!selectedNodeId.value) { chart?.dispose(); chart = null; return }
  setTimeout(() => {
    if (!chartRef.value) return
    if (!chart) { chart = echarts.init(chartRef.value, null, { renderer: 'svg' }); ro?.observe(chartRef.value) }
    chart.setOption(buildOption())
  }, 50)
})
</script>

<template>
  <div class="step-data">

    <!-- ── 顶部：楼宇提示 + 数据模型下拉 ── -->
    <div class="top-bar">
      <div class="building-hint" v-if="data.building">
        <AppIcon name="cube" :size="13" stroke="var(--brand)" />
        <span>{{ data.building }} · {{ models.length }} 个数据模型</span>
      </div>
      <div class="building-hint warn" v-else>
        <AppIcon name="info" :size="13" stroke="var(--warn)" />
        <span>请先在基础信息中选择楼宇</span>
      </div>

      <!-- 数据模型下拉 -->
      <div class="model-select-wrap">
        <label class="sel-label"><span class="step-num">1</span>数据模型</label>
        <div class="model-dd" @click="modelDropdown = !modelDropdown" @blur.capture="setTimeout(()=>modelDropdown=false,150)" tabindex="0">
          <AppIcon name="database" :size="14" stroke="var(--brand)" />
          <span :class="selectedModelId ? 'sel-text' : 'sel-placeholder'">
            {{ selectedModel?.name || '请选择数据模型...' }}
          </span>
          <AppIcon name="chevron-down" :size="13" stroke="var(--text-3)" />
          <div v-if="modelDropdown && models.length" class="model-dropdown">
            <div
              v-for="m in models" :key="m.id"
              :class="['dd-item', selectedModelId === m.id && 'active']"
              @mousedown.prevent="selectModel(m.id)"
            >
              <AppIcon name="database" :size="13" :stroke="selectedModelId === m.id ? 'var(--brand)' : 'var(--text-3)'" />
              {{ m.name }}
              <AppIcon v-if="selectedModelId === m.id" name="check" :size="11" stroke="var(--brand)" style="margin-left:auto" />
            </div>
          </div>
          <div v-if="modelDropdown && !models.length" class="model-dropdown">
            <div class="dd-empty">当前楼宇暂无数据模型</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 主体：节点树 + 预览 ── -->
    <div class="main-body">

      <!-- 左：节点树 -->
      <div class="tree-panel">
        <div class="panel-head">
          <span class="step-num">2</span>选择模型节点
        </div>
        <div class="tree-body" v-if="selectedModel">
          <div v-for="group in selectedModel.nodes" :key="group.id" class="tree-section">
            <div class="tree-group" @click="toggleGroup(group.id)">
              <span class="tree-arrow">{{ expandedNodes[group.id] ? '▼' : '▶' }}</span>
              <AppIcon name="panel" :size="13" stroke="var(--text-2)" />
              <span>{{ group.label }}</span>
            </div>
            <transition name="slide">
              <div v-if="expandedNodes[group.id]" class="tree-children">
                <div
                  v-for="child in group.children" :key="child.id"
                  :class="['tree-node', selectedNodeId === child.id && 'active']"
                  @click="selectNode(child.id)"
                >
                  <span class="node-dot" :class="selectedNodeId === child.id && 'on'"></span>
                  <span>{{ child.label }}</span>
                  <AppIcon v-if="selectedNodeId === child.id" name="check" :size="11" stroke="var(--brand)" style="margin-left:auto" />
                </div>
              </div>
            </transition>
          </div>
        </div>
        <div class="tree-empty" v-else>请先选择数据模型</div>
      </div>

      <!-- 右：数据预览 -->
      <div class="preview-panel">
        <div v-if="!selectedNodeId" class="preview-empty">
          <AppIcon name="bolt" :size="36" stroke="var(--line-strong)" />
          <div class="h">请先选择模型节点</div>
          <div class="s">选择后自动展示该节点今日能耗数据</div>
        </div>

        <template v-else>
          <div class="preview-head">
            <AppIcon name="bolt" :size="15" stroke="var(--brand)" />
            <span class="pn">{{ selectedNode?.label }}</span>
            <span class="pm">· {{ selectedModel?.name }}</span>
            <span class="freq-badge">15min</span>
          </div>
          <div class="ec-stats">
            <div class="ec-stat"><div class="ec-val">{{ totalKwh }}</div><div class="ec-label">今日能耗 (kWh)</div></div>
            <div class="ec-div"></div>
            <div class="ec-stat"><div class="ec-val">{{ monthKwh }}</div><div class="ec-label">本月能耗 (kWh)</div></div>
            <div class="ec-div"></div>
            <div class="ec-stat"><div class="ec-val">{{ yearKwh }}</div><div class="ec-label">今年能耗 (kWh)</div></div>
          </div>
          <div class="chart-title">今日用电曲线（小时聚合 · 15min 采集）</div>
          <div ref="chartRef" class="ec-chart"></div>
          <div class="data-source">来源：{{ selectedModel?.name }} · {{ selectedNodeId }} · 采样 15min</div>
        </template>
      </div>
    </div>

  </div>

  <div class="form-actions" style="margin-top:16px">
    <button class="btn ghost" @click="$emit('prev')"><AppIcon name="chevron-left" :size="14" /> 上一步</button>
    <button class="btn primary" @click="$emit('next')">下一步 <AppIcon name="chevron-right" :size="14" /></button>
  </div>
</template>

<style scoped>
.step-data { display: flex; flex-direction: column; gap: 16px; }

/* 顶部栏 */
.top-bar { display: flex; align-items: center; gap: 20px; }
.building-hint {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 7px; font-size: 12px;
  background: #f0f6ff; border: 1px solid var(--line); color: var(--text-1); flex-shrink: 0;
}
.building-hint.warn { background: #fffbf0; border-color: rgba(234,140,46,0.3); }

/* 数据模型下拉 */
.model-select-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
.sel-label { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--text-0); flex-shrink: 0; }
.model-dd {
  position: relative; display: flex; align-items: center; gap: 9px;
  padding: 8px 12px; border: 1px solid var(--line-strong); border-radius: 8px;
  background: #fff; cursor: pointer; flex: 1; min-width: 0;
  transition: border-color 0.15s;
}
.model-dd:hover, .model-dd:focus { border-color: var(--brand); outline: none; }
.sel-text { font-size: 13px; color: var(--text-0); flex: 1; }
.sel-placeholder { font-size: 13px; color: var(--text-3); flex: 1; }
.model-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 100;
  background: #fff; border: 1px solid var(--line-strong); border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1); overflow: hidden;
}
.dd-item {
  display: flex; align-items: center; gap: 9px;
  padding: 10px 14px; font-size: 13px; color: var(--text-1);
  cursor: pointer; transition: background 0.1s; user-select: none;
}
.dd-item:hover { background: #f0f6ff; }
.dd-item.active { background: #eef5ff; color: var(--brand); font-weight: 500; }
.dd-empty { padding: 12px 14px; font-size: 12px; color: var(--text-3); text-align: center; }

.step-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--brand); color: #fff;
  font-size: 11px; display: grid; place-items: center; flex-shrink: 0;
}

/* 主体 */
.main-body { display: grid; grid-template-columns: 280px 1fr; gap: 14px; min-height: 440px; }

/* 节点树面板 */
.tree-panel { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
.panel-head {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; background: #f6f9ff; border-bottom: 1px solid var(--line);
  font-size: 13px; font-weight: 600; color: var(--text-0); flex-shrink: 0;
}
.tree-body { flex: 1; overflow-y: auto; padding: 8px; }
.tree-empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text-3); padding: 20px; text-align: center; }
.tree-section { margin-bottom: 2px; }
.tree-group {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; cursor: pointer; border-radius: 6px;
  font-size: 12px; font-weight: 600; color: var(--text-1); user-select: none;
}
.tree-group:hover { background: #f5f8ff; }
.tree-arrow { font-size: 9px; color: var(--text-3); width: 12px; flex-shrink: 0; }
.tree-children { padding-left: 4px; }
.tree-node {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px 7px 22px; border-radius: 6px;
  cursor: pointer; font-size: 12px; color: var(--text-2);
  transition: all 0.15s; user-select: none;
}
.tree-node:hover { background: #f5f8ff; color: var(--text-0); }
.tree-node.active { background: #eef5ff; color: var(--brand); font-weight: 500; }
.node-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; background: var(--line-strong); transition: background 0.15s; }
.node-dot.on { background: var(--brand); }
.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-4px); }

/* 预览面板 */
.preview-panel { border: 1px solid var(--line); border-radius: 10px; background: #fff; padding: 16px; display: flex; flex-direction: column; }
.preview-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-3); }
.preview-empty .h { font-size: 14px; font-weight: 500; color: var(--text-2); }
.preview-empty .s { font-size: 12px; }
.preview-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed var(--line); }
.pn { font-size: 14px; font-weight: 600; color: var(--text-0); }
.pm { font-size: 12px; color: var(--text-3); }
.freq-badge { margin-left: auto; font-size: 10px; font-family: "JetBrains Mono", monospace; background: #eef5ff; color: var(--brand); padding: 2px 8px; border-radius: 4px; }
.ec-stats { display: flex; align-items: center; background: #f5f9ff; border: 1px solid var(--line); border-radius: 8px; padding: 10px 0; margin-bottom: 12px; }
.ec-stat { flex: 1; text-align: center; }
.ec-val { font-size: 18px; font-weight: 700; color: var(--brand); font-family: "JetBrains Mono", monospace; }
.ec-label { font-size: 10px; color: var(--text-3); margin-top: 3px; }
.ec-div { width: 1px; height: 28px; background: var(--line); flex-shrink: 0; }
.chart-title { font-size: 11px; color: var(--text-3); margin-bottom: 6px; }
.ec-chart { flex: 1; min-height: 200px; width: 100%; }
.data-source { margin-top: 8px; font-size: 10px; color: var(--text-3); font-family: "JetBrains Mono", monospace; text-align: right; }
</style>

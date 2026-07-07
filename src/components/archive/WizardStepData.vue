<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import AppIcon from '@/components/common/AppIcon.vue'
import { getBuildingModels, getNodeEnergyData } from '@/api/devices'

const props = defineProps({ data: { type: Object, required: true } })
const emit  = defineEmits(['update:data', 'next', 'prev'])

const models = ref([])
const loadingModels = ref(false)

const selectedModelId = ref(props.data.dataModelId || '')
const selectedNodeId  = ref(props.data.dataNodeId  || '')
const expandedNodes   = ref({})
const modelDropdown   = ref(false)

const selectedModel = computed(() => models.value.find(m => m.id === selectedModelId.value) || null)

// 支持无限级深度遍历，精准找到选中的模型节点
const selectedNode  = computed(() => {
  if (!selectedModel.value || !selectedNodeId.value) return null
  function findNode(nodes) {
    for (const n of nodes) {
      if (n.id === selectedNodeId.value) return n
      if (n.children && n.children.length > 0) {
        const found = findNode(n.children)
        if (found) return found
      }
    }
    return null
  }
  return findNode(selectedModel.value.nodes)
})

// 递归拉平树形节点，支持无限层级扁平化渲染与精细缩进
const flatNodes = computed(() => {
  if (!selectedModel.value) return []
  const list = []
  function traverse(node, level, parentId = null) {
    const hasChildren = node.children && node.children.length > 0
    list.push({
      id: node.id,
      label: node.label,
      level,
      hasChildren,
      parentId,
      raw: node
    })
    // 只有当父节点被展开时，才继续向下递归拉平其子节点
    if (hasChildren && expandedNodes.value[node.id]) {
      node.children.forEach(c => traverse(c, level + 1, node.id))
    }
  }
  selectedModel.value.nodes.forEach(n => traverse(n, 0))
  return list
})

// 加载模型树
async function loadModels() {
  loadingModels.value = true
  try {
    const list = await getBuildingModels(props.data.buildingCode)
    models.value = list || []
    
    // 如果没有选中的模型，默认选中第一个
    if (!selectedModelId.value && models.value.length > 0) {
      selectModel(models.value[0].id)
    } else if (selectedModelId.value) {
      // 默认展开选中模型的所有一级分类
      nextTick(() => {
        if (selectedModel.value) {
          selectedModel.value.nodes.forEach(n => {
            expandedNodes.value[n.id] = true
          })
          
          // 如果此前已选过节点，在后台默默自动补全其对应的中文名称，以便在后面的融合卡片中正常呈现中文名
          if (selectedNodeId.value && selectedNode.value) {
            emit('update:data', {
              ...props.data,
              dataModelName: selectedModel.value.name,
              dataNodeName: selectedNode.value.label
            })
          }
        }
      })
    }
  } catch (e) {
    console.error('加载建筑模型树异常:', e)
    models.value = []
  } finally {
    loadingModels.value = false
  }
}

function selectModel(id) {
  selectedModelId.value = id
  selectedNodeId.value  = ''
  expandedNodes.value   = {}
  modelDropdown.value   = false
  energyData.value      = []
  const m = models.value.find(x => x.id === id)
  emit('update:data', { 
    ...props.data, 
    dataModelId: id, 
    dataModelName: m ? m.name : '',
    dataNodeId: '',
    dataNodeName: ''
  })
  
  // 默认展开所有一级根节点（电、水等）
  nextTick(() => {
    if (selectedModel.value) {
      selectedModel.value.nodes.forEach(n => {
        expandedNodes.value[n.id] = true
      })
    }
  })
}

function toggleGroup(id) {
  expandedNodes.value = { ...expandedNodes.value, [id]: !expandedNodes.value[id] }
}

async function selectNode(node) {
  selectedNodeId.value = node.id
  emit('update:data', { 
    ...props.data, 
    dataModelId: selectedModelId.value, 
    dataModelName: selectedModel.value?.name || '',
    dataNodeId: node.id,
    dataNodeName: node.label
  })
  await loadEnergyData(node.id)
  await nextTick()
  updateChart()
  
  // 如果选中了一个包含子节点的目录节点，并且目前折叠，点击文字时智能自动展开
  if (node.hasChildren && !expandedNodes.value[node.id]) {
    expandedNodes.value[node.id] = true
  }
}

// ── 能耗数据 ──────────────────────────────────────────────────────
const energyData = ref([])
const loadingEnergy = ref(false)

async function loadEnergyData(nodeId) {
  if (!nodeId) {
    energyData.value = []
    return
  }
  loadingEnergy.value = true
  try {
    const data = await getNodeEnergyData(props.data.buildingCode, nodeId)
    energyData.value = data || []
  } catch (e) {
    console.error('加载能耗时序数据异常:', e)
    energyData.value = []
  } finally {
    loadingEnergy.value = false
  }
}

const totalKwh   = computed(() => energyData.value.reduce((s, d) => s + d.kwh, 0).toFixed(1))
const monthKwh   = computed(() => (parseFloat(totalKwh.value) * new Date().getDate()).toFixed(1))
const yearKwh    = computed(() => {
  const now = new Date()
  const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  return (parseFloat(totalKwh.value) * day).toFixed(1)
})
const hourlyData = computed(() => {
  const map = {}
  energyData.value.forEach(d => { 
    if (d.time) {
      const h = d.time.split(':')[0]
      map[h] = (map[h] || 0) + d.kwh 
    }
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
  const data = energyData.value
  return {
    grid: { top: 16, right: 10, bottom: 36, left: 46 },
    tooltip: {
      trigger: 'axis',
      formatter: p => `${p[0].name}<br/>用电量：<b>${p[0].value} kWh</b>`,
      backgroundColor: '#1a2440', borderColor: '#2a3a60',
      textStyle: { color: '#c8d8f8', fontSize: 12 },
    },
    xAxis: {
      type: 'category', data: data.map(d => d.time),
      axisLabel: { fontSize: 10, color: '#8a9bbf', interval: 'auto', formatter: v => v },
      axisLine: { lineStyle: { color: '#dde4f0' } }, axisTick: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value', name: 'kWh',
      nameTextStyle: { fontSize: 10, color: '#8a9bbf' },
      axisLabel: { fontSize: 10, color: '#8a9bbf' },
      splitLine: { lineStyle: { color: '#eef1f8', type: 'dashed' } },
    },
    series: [{
      type: 'line', data: data.map(d => d.kwh),
      smooth: true, symbol: 'none',
      lineStyle: { width: 2, color: '#4dc9ff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(77,201,255,0.35)' },
          { offset: 1, color: 'rgba(43,217,168,0.05)' },
        ]),
      },
    }],
  }
}

function updateChart() {
  if (!chartRef.value) return
  // 如果已存在 chart 实例，但其挂载的 DOM 并不是当前最新的 chartRef 容器（说明发生过 v-if 销毁与重建），先销毁旧实例以防断开
  if (chart && chart.getDom() !== chartRef.value) {
    chart.dispose()
    chart = null
  }
  if (!chart) {
    chart = echarts.init(chartRef.value, null, { renderer: 'svg' })
    ro?.observe(chartRef.value)
  }
  chart.setOption(buildOption())
  
  // 延迟微调 resize，保证 100% 宽度完美撑满，消除由于 Flex/Transition 导致的初始化宽度为 0 假死
  setTimeout(() => {
    chart?.resize()
  }, 60)
}

watch(energyData, async () => {
  await nextTick()
  updateChart()
})

const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => chart?.resize()) : null

onMounted(async () => {
  await loadModels()
  if (selectedNodeId.value) {
    await loadEnergyData(selectedNodeId.value)
    updateChart()
  }
})

onBeforeUnmount(() => { 
  ro?.disconnect()
  chart?.dispose() 
})
</script>

<template>
  <div class="step-data">

    <!-- 左：模型下拉 + 节点树 -->
      <div class="tree-panel">
        <!-- 楼宇提示 -->
        <div class="building-hint" v-if="data.building">
          <AppIcon name="cube" :size="13" stroke="var(--brand)" />
          <span>{{ data.building }} · {{ models.length }} 个数据模型</span>
        </div>
        <div class="building-hint warn" v-else>
          <AppIcon name="info" :size="13" stroke="var(--warn)" />
          <span>请先在基础信息中选择楼宇</span>
        </div>

        <!-- Step 1: 数据模型下拉 -->
        <div class="panel-step-label"><span class="step-num">1</span>数据模型</div>
        <div class="model-select-wrap">
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

        <!-- Step 2: 节点树 -->
        <div class="panel-step-label"><span class="step-num">2</span>选择模型节点</div>
        <div v-if="loadingModels" class="loading-state" style="padding: 30px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-direction: column;">
          <div class="ocr-spinner" style="width: 16px; height: 16px; border-width: 2px; border-top-color: var(--brand)"></div>
          <span style="font-size: 12px; color: var(--text-3)">加载模型树中...</span>
        </div>
        <div class="tree-body" v-else-if="selectedModel">
          <div
            v-for="node in flatNodes" :key="node.id"
            :class="['tree-item-row', selectedNodeId === node.id && 'active']"
            :style="{ paddingLeft: (node.level * 16 + 10) + 'px' }"
            @click="selectNode(node)"
          >
            <span
              v-if="node.hasChildren"
              class="tree-arrow"
              @click.stop="toggleGroup(node.id)"
            >
              {{ expandedNodes[node.id] ? '▼' : '▶' }}
            </span>
            <span v-else class="tree-arrow-placeholder"></span>
            
            <AppIcon
              :name="node.level === 0 ? 'panel' : (node.hasChildren ? 'folder' : 'bolt')"
              :size="13"
              :stroke="selectedNodeId === node.id ? 'var(--brand)' : 'var(--text-2)'"
            />
            <span class="node-label">{{ node.label }}</span>
            <AppIcon v-if="selectedNodeId === node.id" name="check" :size="11" stroke="var(--brand)" style="margin-left:auto" />
          </div>
        </div>
        <div class="tree-empty" v-else>请先选择数据模型</div>
      </div>

      <!-- 右：数据预览 -->
      <div class="preview-panel" style="position: relative;">
        <div v-if="loadingEnergy" class="loading-state-overlay" style="position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; z-index: 10;">
          <div class="ocr-spinner" style="width: 24px; height: 24px; border-width: 2.5px; border-top-color: var(--brand)"></div>
        </div>

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
          <div class="chart-title">今日用电曲线（15min 采集）</div>
          <div v-if="energyData.length" ref="chartRef" class="ec-chart"></div>
          <div v-else class="ec-chart-empty">
            <AppIcon name="info" :size="18" stroke="var(--text-3)" />
            <span>该节点暂无用电能耗时序数据</span>
          </div>
          <div class="data-source" v-if="energyData.length">来源：{{ selectedModel?.name }} · {{ selectedNode?.label }}</div>
        </template>
      </div>

  </div>
</template>

<style scoped>
.step-data { display: grid; grid-template-columns: 300px 1fr; gap: 14px; min-height: 360px; }

.building-hint {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; font-size: 12px; font-weight: 500; color: var(--text-1);
  background: #f6f9ff; border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.building-hint.warn {
  color: var(--warn, #f59e0b); background: #fffbeb;
}

/* 节点树面板 */
.tree-panel { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; gap: 0; height: 440px; }
.panel-step-label {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; font-size: 13px; font-weight: 600; color: var(--text-0);
  border-bottom: 1px solid var(--line); background: #f6f9ff; flex-shrink: 0;
}
.model-select-wrap { padding: 10px; flex-shrink: 0; }
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

/* 节点树面板 */
.tree-panel { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; height: 440px; }
.tree-body { flex: 1; overflow-y: auto; padding: 8px; }
.tree-empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text-3); padding: 20px; text-align: center; }
.tree-section { margin-bottom: 2px; }
.tree-item-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; cursor: pointer; border-radius: 6px;
  font-size: 12px; color: var(--text-2); user-select: none;
  transition: all 0.15s;
}
.tree-item-row:hover { background: #f5f8ff; color: var(--text-0); }
.tree-item-row.active { background: #eef5ff; color: var(--brand); font-weight: 500; }
.tree-arrow { font-size: 8px; color: var(--text-3); width: 12px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; height: 12px; cursor: pointer; }
.tree-arrow-placeholder { width: 12px; flex-shrink: 0; }
.node-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; margin-left: 2px; }

/* 预览面板 */
.preview-panel { border: 1px solid var(--line); border-radius: 10px; background: #fff; padding: 16px; display: flex; flex-direction: column; min-width: 0; }
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
.data-source { margin-top: 8px; font-size: 11px; color: var(--text-3); text-align: right; user-select: none; }
.ec-chart-empty {
  height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: var(--text-3); font-size: 12px; background: #fafbfc; border: 1px dashed var(--line);
  border-radius: 8px;
}
</style>

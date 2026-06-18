<script setup>
// ── components/detail/GraphCanvas.vue ──────────────────────────────
// 知识图谱画布：环形固定布局（非力导向），以设备为 L0 根节点
// 完整规范见 知识图谱画布-样式与实现说明.md
//
// 层级设计（设备知识库适配）：
// L0 设备本身（中心节点）
// L1 所属建筑 / 设备类型 / 命中规则（仅淘汰·低效设备有） / 关联国标
// L2 同建筑其他设备 / 同型号设备 / 规则详情 / 各国标编号
// L3 改造建议（挂在"规则详情"下）
// file 关联文档（挂在 L0 设备下）

import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue'
import * as echarts from 'echarts'
import AppIcon from '@/components/common/AppIcon.vue'
import { SAMPLE_DEVICES, DEV_TYPE_MAP } from '@/data/devices'
import { RULES_LIB_INIT } from '@/data/rules'

const props = defineProps({
  device: { type: Object, required: true },
})
const emit = defineEmits(['select-node'])

const COLOR_L0   = '#4dc9ff'
const COLOR_L1   = '#2bd9a8'
const COLOR_L2   = '#a799ff'
const COLOR_L3   = '#ffb547'
const COLOR_FILE = '#ff6b8a'

const LEGEND_ITEMS = [
  { key: 'l0',   color: COLOR_L0,   label: '设备' },
  { key: 'l1',   color: COLOR_L1,   label: '一级节点' },
  { key: 'l2',   color: COLOR_L2,   label: '二级节点' },
  { key: 'l3',   color: COLOR_L3,   label: '三级节点' },
  { key: 'file', color: COLOR_FILE, label: '文件' },
]

const SIZE = { l0: 42, l1: 22, l2: 15, l3: 9, file: 9 }

// ── 构造层级树（参照文档第9节：root → children[] → children[] → children[]）──
const tree = computed(() => {
  const d = props.device
  const devType = DEV_TYPE_MAP[d.typeK] || DEV_TYPE_MAP.other
  const matchedRule = d.ruleHit ? RULES_LIB_INIT.find(r => r.ruleId === d.ruleHit) : null

  const sameBuilding = SAMPLE_DEVICES.filter(x => x.id !== d.id && x.building === d.building).slice(0, 6)
  const sameModel    = SAMPLE_DEVICES.filter(x => x.id !== d.id && x.model === d.model).slice(0, 6)

  const children = []

  // L1: 所属建筑
  if (d.building) {
    children.push({
      id: 'building', name: d.building, type: 'group',
      children: sameBuilding.map((x, i) => ({ id: `bld-${i}`, name: x.name, type: 'group' })),
    })
  }

  // L1: 设备类型
  children.push({
    id: 'devtype', name: devType.label, type: 'group',
    children: sameModel.map((x, i) => ({ id: `mdl-${i}`, name: x.name, type: 'group' })),
  })

  // L1: 命中规则（仅淘汰/低效设备）
  if (matchedRule) {
    children.push({
      id: 'rule', name: `命中规则 ${matchedRule.ruleId}`, type: 'group',
      children: [
        {
          id: 'rule-detail', name: `${matchedRule.actionType}淘汰 · ${matchedRule.deadline}`, type: 'group',
          children: [
            { id: 'rule-advice', name: matchedRule.advice, type: 'group' },
          ],
        },
      ],
    })
  }

  // L1: 关联国标
  const standards = matchedRule ? [matchedRule.standard, 'GB/T 17981'] : ['GB18613-2012', 'GB20052-2020']
  children.push({
    id: 'standard', name: '关联国标', type: 'group',
    children: standards.map((s, i) => ({ id: `std-${i}`, name: s, type: 'group' })),
  })

  // file 节点：关联文档（直接挂在根节点下，不走 L1/L2/L3 链路）
  const fileChildren = [
    { id: 'doc-1', name: '设备铭牌照片', type: 'file' },
    { id: 'doc-2', name: `${d.model} 说明书`, type: 'file' },
    { id: 'doc-3', name: '采购合同与验收报告', type: 'file' },
  ]

  return {
    id: 'root', name: d.name, type: 'root',
    children,
    fileChildren,
  }
})

// ── ECharts 实例与状态 ──────────────────────────────────────────
const containerRef = ref(null)
let chart = null
let resizeHandler = null

const expandedLv2 = ref(null) // 当前展开的 L2 父节点 id（用于展示 L3）
const selectedId  = ref(null)

function buildGraphData() {
  const root = tree.value
  const nodes = []
  const edges = []

  const w = containerRef.value?.clientWidth || 800
  const h = containerRef.value?.clientHeight || 500
  const cx = w / 2
  const cy = h / 2

  // L0 根节点
  nodes.push({
    id: root.id, name: root.name, x: cx, y: cy,
    symbolSize: SIZE.l0,
    itemStyle: { color: COLOR_L0, shadowBlur: 20, shadowColor: COLOR_L0 },
    label: { show: true, fontSize: 13, color: '#eaf2ff', textBorderColor: 'rgba(0,0,0,0.7)', textBorderWidth: 2 },
    fixed: true, _raw: root,
  })

  // file 节点：环绕根节点的小圈
  const fileList = root.fileChildren || []
  const fileR = Math.min(w, h) * 0.13
  fileList.forEach((f, i) => {
    const ang = Math.PI + (i - (fileList.length - 1) / 2) * 0.5 // 朝左下方散开，避免和L1重叠
    const x = cx + Math.cos(ang) * fileR
    const y = cy + Math.sin(ang) * fileR
    nodes.push({
      id: f.id, name: truncate(f.name, 8), x, y,
      symbolSize: SIZE.file,
      itemStyle: { color: COLOR_FILE },
      label: { show: selectedId.value === f.id, fontSize: 10, color: '#eaf2ff', textBorderColor: 'rgba(0,0,0,0.7)', textBorderWidth: 2 },
      fixed: true, _raw: f,
    })
    edges.push({ source: root.id, target: f.id, lineStyle: { color: COLOR_FILE, opacity: 0.35, curveness: 0 } })
  })

  // L1 一级节点：环形分布
  const lv1List = root.children || []
  const R1 = Math.min(w, h) * 0.24
  const angleStep1 = (Math.PI * 2) / lv1List.length

  lv1List.forEach((lv1, i) => {
    const ang = -Math.PI / 2 + i * angleStep1
    const x = cx + Math.cos(ang) * R1
    const y = cy + Math.sin(ang) * R1
    const isSel = selectedId.value === lv1.id

    nodes.push({
      id: lv1.id, name: truncate(lv1.name, 6), x, y,
      symbolSize: isSel ? SIZE.l1 * 1.5 : SIZE.l1,
      itemStyle: { color: COLOR_L1, borderWidth: isSel ? 2 : 0, borderColor: '#fff', shadowBlur: isSel ? 14 : 0, shadowColor: COLOR_L1 },
      label: { show: true, fontSize: 11, color: '#eaf2ff', textBorderColor: 'rgba(0,0,0,0.7)', textBorderWidth: 2 },
      fixed: true, _raw: lv1, _ang: ang,
    })
    edges.push({ source: root.id, target: lv1.id, lineStyle: { color: COLOR_L1, opacity: 0.5, curveness: 0 } })

    // L2 二级节点：扇形展开
    const lv2List = lv1.children || []
    if (lv2List.length === 0) return
    const R2 = R1 + Math.min(w, h) * 0.16
    const fanSpan = Math.min(Math.PI * 0.7, Math.max(0.4, lv2List.length * 0.22))
    const fanStart = ang - fanSpan / 2

    lv2List.forEach((lv2, j) => {
      const a = lv2List.length === 1 ? ang : fanStart + (fanSpan / (lv2List.length - 1)) * j
      const lx = cx + Math.cos(a) * R2
      const ly = cy + Math.sin(a) * R2
      const lv2Sel = selectedId.value === lv2.id
      const showLabel = lv2Sel || selectedId.value === lv1.id

      nodes.push({
        id: lv2.id, name: truncate(lv2.name, 6), x: lx, y: ly,
        symbolSize: lv2Sel ? SIZE.l2 * 1.5 : SIZE.l2,
        itemStyle: { color: COLOR_L2, borderWidth: lv2Sel ? 2 : 0, borderColor: '#fff', shadowBlur: lv2Sel ? 12 : 0, shadowColor: COLOR_L2 },
        label: { show: showLabel, fontSize: 10, color: '#eaf2ff', textBorderColor: 'rgba(0,0,0,0.7)', textBorderWidth: 2 },
        fixed: true, _raw: lv2, _parentAng: a,
      })
      edges.push({ source: lv1.id, target: lv2.id, lineStyle: { color: COLOR_L2, opacity: 0.4, curveness: 0 } })

      // L3 三级节点：仅展开时渲染
      const lv3List = lv2.children || []
      if (lv3List.length === 0 || expandedLv2.value !== lv2.id) return
      const R3 = R2 + Math.min(w, h) * 0.12
      const subSpan = Math.min(Math.PI * 0.4, Math.max(0.2, lv3List.length * 0.18))
      const subStart = a - subSpan / 2

      lv3List.forEach((lv3, k) => {
        const sa = lv3List.length === 1 ? a : subStart + (subSpan / (lv3List.length - 1)) * k
        const sx = cx + Math.cos(sa) * R3
        const sy = cy + Math.sin(sa) * R3
        const lv3Sel = selectedId.value === lv3.id

        nodes.push({
          id: lv3.id, name: truncate(lv3.name, 8), x: sx, y: sy,
          symbolSize: lv3Sel ? SIZE.l3 * 1.5 : SIZE.l3,
          itemStyle: { color: COLOR_L3, borderWidth: lv3Sel ? 2 : 0, borderColor: '#fff' },
          label: { show: true, fontSize: 10, color: '#eaf2ff', textBorderColor: 'rgba(0,0,0,0.7)', textBorderWidth: 2 },
          fixed: true, _raw: lv3,
        })
        edges.push({ source: lv2.id, target: lv3.id, lineStyle: { color: COLOR_L3, opacity: 0.35, curveness: 0, type: 'dashed' } })
      })
    })
  })

  return { nodes, edges }
}

function truncate(s, max) {
  if (!s) return ''
  return s.length > max ? s.slice(0, max) + '…' : s
}

const nodeCount = ref(0)
const edgeCount = ref(0)

function refreshChart() {
  if (!chart) return
  const { nodes, edges } = buildGraphData()
  nodeCount.value = nodes.length
  edgeCount.value = edges.length

  chart.setOption({
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 300,
    series: [{
      type: 'graph',
      layout: 'none',
      data: nodes,
      links: edges,
      roam: true,
      draggable: false,
      zoom: 1,
      center: ['50%', '50%'],
      focusNodeAdjacency: false,
      lineStyle: { curveness: 0 },
      emphasis: { disabled: false, focus: 'none' },
    }],
  }, { replaceMerge: ['series'] })
}

function findNode(id) {
  const root = tree.value
  if (root.id === id) return root
  for (const f of root.fileChildren || []) if (f.id === id) return f
  for (const lv1 of root.children || []) {
    if (lv1.id === id) return lv1
    for (const lv2 of lv1.children || []) {
      if (lv2.id === id) return lv2
      for (const lv3 of lv2.children || []) {
        if (lv3.id === id) return lv3
      }
    }
  }
  return null
}

function onNodeClick(params) {
  const id = params.data.id
  const node = findNode(id)
  if (!node) return

  // L2 节点带子节点时，切换展开/收起
  if (node.children && node.children.length > 0 && tree.value.children.some(lv1 => lv1.children?.some(lv2 => lv2.id === id))) {
    expandedLv2.value = expandedLv2.value === id ? null : id
  }

  selectedId.value = id
  emit('select-node', { id, node })
  refreshChart()

  setTimeout(() => centerNode(id), 200)
}

function centerNode(nodeId) {
  if (!chart) return
  const opt = chart.getOption()
  const target = opt.series[0].data.find(n => n.id === nodeId)
  if (!target) return
  const px = chart.convertToPixel({ seriesIndex: 0 }, [target.x, target.y])
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  chart.dispatchAction({ type: 'graphRoam', dx: w / 2 - px[0], dy: h / 2 - px[1] })
}

function resetView() {
  expandedLv2.value = null
  selectedId.value = null
  if (chart) chart.dispatchAction({ type: 'graphRoam', zoom: 1 / (chart.getOption().series[0].zoom || 1) })
  refreshChart()
}

onMounted(async () => {
  await nextTick()
  if (!containerRef.value) return
  chart = echarts.init(containerRef.value)
  chart.on('click', onNodeClick)
  refreshChart()

  resizeHandler = () => chart && chart.resize()
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (chart) { chart.dispose(); chart = null }
})

watch(() => props.device.id, () => {
  expandedLv2.value = null
  selectedId.value = null
  refreshChart()
})
</script>

<template>
  <div class="dv-canvas-wrap">
    <!-- 顶部工具栏 -->
    <div class="dv-canvas-toolbar">
      <button class="dv-tool-btn" title="重置视图" @click="resetView">
        <AppIcon name="settings" :size="13" />
      </button>
      <div class="dv-toolbar-divider" />

      <div class="dv-stat-badge">
        <AppIcon name="sparkles" :size="12" stroke="#4dc9ff" />
        <span class="dv-stat-item">
          <span class="dv-stat-num">{{ nodeCount }}</span>
          <span class="dv-stat-lbl">节点</span>
        </span>
        <span class="dv-stat-sep" />
        <span class="dv-stat-item">
          <span class="dv-stat-num">{{ edgeCount }}</span>
          <span class="dv-stat-lbl">关系</span>
        </span>
      </div>
      <div class="dv-toolbar-divider" />

      <div class="dv-toolbar-group dv-toolbar-legend">
        <span v-for="item in LEGEND_ITEMS" :key="item.key" class="dv-legend-item">
          <span class="dv-legend-dot" :style="{ background: item.color, color: item.color }" />
          {{ item.label }}
        </span>
      </div>
    </div>

    <!-- 画布 -->
    <div class="dv-canvas-svg-wrap">
      <div ref="containerRef" style="width:100%;height:100%;position:relative;z-index:1" />
    </div>
  </div>
</template>

<style scoped>
.dv-canvas-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; }

.dv-canvas-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  background: rgba(240,245,252,0.98);
  border-bottom: 1px solid rgba(100,160,220,0.2);
  z-index: 5; flex-shrink: 0;
}
.dv-toolbar-group { display: flex; align-items: center; gap: 4px; }
.dv-toolbar-legend { margin-left: auto; flex-wrap: wrap; }
.dv-toolbar-divider { width: 1px; height: 20px; background: rgba(100,140,200,0.25); margin: 0 6px; }

.dv-tool-btn {
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(100,140,200,0.08);
  border: 1px solid rgba(100,140,200,0.25);
  border-radius: 4px; color: #4a6080; cursor: pointer; transition: all 150ms;
}
.dv-tool-btn:hover { background: rgba(100,140,200,0.16); border-color: rgba(100,140,200,0.5); color: #2a5298; }

.dv-stat-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 4px 10px;
  background: rgba(77,201,255,0.06);
  border: 1px solid rgba(77,201,255,0.18);
  border-radius: 20px;
}
.dv-stat-item { display: inline-flex; align-items: baseline; gap: 3px; }
.dv-stat-num { font-family: "JetBrains Mono", monospace; font-size: 13px; font-weight: 600; color: #4dc9ff; line-height: 1; }
.dv-stat-lbl { font-size: 10px; color: #7a9cc8; letter-spacing: 0.02em; }
.dv-stat-sep { width: 1px; height: 14px; background: rgba(77,201,255,0.25); display: inline-block; }

.dv-legend-item { display: inline-flex; align-items: center; gap: 4px; color: #4a6080; font-size: 11px; }
.dv-legend-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 4px currentColor; }

.dv-canvas-svg-wrap {
  flex: 1; position: relative; overflow: hidden; background: #243650;
  min-height: 0;
}
.dv-canvas-svg-wrap::before {
  content: ""; position: absolute; inset: 0;
  background-image: radial-gradient(ellipse 60% 60% at 50% 50%, rgba(77,201,255,0.06), transparent 70%);
  pointer-events: none;
}
.dv-canvas-svg-wrap::after {
  content: ""; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(77,201,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(77,201,255,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
</style>

<script setup>
// ── components/detail/EnergyChartCard.vue ─────────────────────────
// 今日15分钟粒度用电量柱状图（ECharts）
// energyData: [{ time: "00:00", kwh: 1.23 }, ...]  96条/天

import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import * as echarts from 'echarts'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  energyData: { type: Array, default: () => [] },
  deviceName: { type: String, default: '' },
})

const chartRef = ref(null)
let chart = null

// 统计快照
const totalKwh = computed(() =>
  props.energyData.reduce((s, d) => s + d.kwh, 0).toFixed(1)
)
const peakKwh = computed(() =>
  Math.max(...props.energyData.map(d => d.kwh)).toFixed(3)
)
const peakTime = computed(() => {
  const max = Math.max(...props.energyData.map(d => d.kwh))
  return props.energyData.find(d => d.kwh === max)?.time || '--'
})

// 小时聚合（96条 → 24条，便于可视化）
const hourlyData = computed(() => {
  const map = {}
  props.energyData.forEach(d => {
    const h = d.time.split(':')[0]
    map[h] = (map[h] || 0) + d.kwh
  })
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2,'0')}:00`,
    kwh: parseFloat((map[String(i).padStart(2,'0')] || 0).toFixed(2)),
  }))
})

function buildOption() {
  const data = hourlyData.value
  const max = Math.max(...data.map(d => d.kwh))
  return {
    grid: { top: 16, right: 12, bottom: 36, left: 44 },
    tooltip: {
      trigger: 'axis',
      formatter: p => `${p[0].name}<br/>用电量：<b>${p[0].value} kWh</b>`,
      backgroundColor: '#1a2440',
      borderColor: '#2a3a60',
      textStyle: { color: '#c8d8f8', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.hour),
      axisLabel: {
        fontSize: 10, color: '#8a9bbf', interval: 3,
        formatter: v => v.slice(0,2) + 'h',
      },
      axisLine: { lineStyle: { color: '#dde4f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'kWh',
      nameTextStyle: { fontSize: 10, color: '#8a9bbf' },
      axisLabel: { fontSize: 10, color: '#8a9bbf' },
      splitLine: { lineStyle: { color: '#eef1f8', type: 'dashed' } },
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.kwh),
      barMaxWidth: 20,
      itemStyle: {
        color: params => {
          const ratio = params.value / max
          // 高耗时段偏橙，正常偏蓝
          return ratio > 0.8
            ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#ff8a47' },
                { offset: 1, color: '#ffb547' },
              ])
            : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#4dc9ff' },
                { offset: 1, color: '#2bd9a8' },
              ])
        },
        borderRadius: [3, 3, 0, 0],
      },
    }],
  }
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, null, { renderer: 'svg' })
  chart.setOption(buildOption())
}

const ro = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver(() => chart?.resize())
  : null

onMounted(() => {
  initChart()
  if (ro && chartRef.value) ro.observe(chartRef.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
})

watch(() => props.energyData, () => {
  chart?.setOption(buildOption())
})
</script>

<template>
  <div class="card dd-card">
    <div class="dd-card-head">
      <AppIcon name="zap" :size="16" stroke="var(--brand)" />
      <h3>今日能耗</h3>
      <span class="ec-date">{{ new Date().toLocaleDateString('zh-CN') }}</span>
    </div>

    <!-- 快照指标 -->
    <div class="ec-stats">
      <div class="ec-stat">
        <div class="ec-stat-val">{{ totalKwh }}</div>
        <div class="ec-stat-label">累计用电 (kWh)</div>
      </div>
      <div class="ec-divider"></div>
      <div class="ec-stat">
        <div class="ec-stat-val peak">{{ peakKwh }}</div>
        <div class="ec-stat-label">峰值 (kWh/15min)</div>
      </div>
      <div class="ec-divider"></div>
      <div class="ec-stat">
        <div class="ec-stat-val mono">{{ peakTime }}</div>
        <div class="ec-stat-label">峰值时段</div>
      </div>
    </div>

    <!-- 图表 -->
    <div v-if="energyData.length" ref="chartRef" class="ec-chart"></div>
    <div v-else class="ec-empty">
      <AppIcon name="info" :size="20" stroke="var(--text-3)" />
      <span>暂无能耗数据</span>
    </div>
  </div>
</template>

<style scoped>
.ec-date { margin-left: auto; font-size: 11px; color: var(--text-3); font-family: "JetBrains Mono", monospace; }

.ec-stats {
  display: flex; align-items: center; gap: 0;
  background: linear-gradient(135deg, #f5f9ff, #f0f7fe);
  border: 1px solid var(--line); border-radius: 8px;
  padding: 12px 0; margin-bottom: 14px;
}
.ec-stat { flex: 1; text-align: center; }
.ec-stat-val {
  font-size: 18px; font-weight: 700; color: var(--brand);
  font-family: "JetBrains Mono", monospace; line-height: 1.2;
}
.ec-stat-val.peak { color: var(--warn); }
.ec-stat-val.mono { font-size: 15px; }
.ec-stat-label { font-size: 10px; color: var(--text-3); margin-top: 3px; }
.ec-divider { width: 1px; height: 32px; background: var(--line); flex-shrink: 0; }

.ec-chart { height: 160px; width: 100%; }

.ec-empty {
  padding: 30px 0; text-align: center; color: var(--text-3); font-size: 12px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
</style>

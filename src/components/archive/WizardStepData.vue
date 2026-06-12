<script setup>
// ── components/archive/WizardStepData.vue ─────────────────────────
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({ data: { type: Object, required: true } })
const emit  = defineEmits(['update:data', 'next', 'prev'])

const SOURCES = [
  { k: 'meter',  n: '分项计量电表',  icon: 'bolt',   desc: '建筑能耗分项计量系统直读' },
  { k: 'ba',     n: 'BA / BMS 系统', icon: 'panel',  desc: '楼宇自控系统对接' },
  { k: 'manual', n: '人工录入',      icon: 'edit',   desc: '周期性手动录入电量数据' },
  { k: 'file',   n: '历史文件导入',  icon: 'upload', desc: '批量导入 CSV / Excel 历史数据' },
]

const PRESET_POINTS = [
  { id: 'P1', name: '主回路电量', unit: 'kWh', path: 'BA/Building1/B2/Pump-Room-1/M01' },
  { id: 'P2', name: '瞬时功率',   unit: 'kW',  path: 'BA/Building1/B2/Pump-Room-1/M01.P' },
  { id: 'P3', name: '功率因数',   unit: '-',   path: 'BA/Building1/B2/Pump-Room-1/M01.PF' },
  { id: 'P4', name: '运行时长',   unit: 'h',   path: 'BA/Building1/B2/Pump-Room-1/M01.RT' },
]

const FREQS = [['1min','1 分钟'],['5min','5 分钟'],['15min','15 分钟'],['1h','1 小时'],['1d','1 天']]

const src       = ref(props.data.dataSrc || 'meter')
const freq      = ref(props.data.freq || '15min')
const points    = ref(props.data.points || [])
const connected = ref(false)
const history   = ref([])

function handleConnect() {
  connected.value = true
  points.value    = PRESET_POINTS
  history.value   = Array.from({ length: 24 }, (_, i) => ({
    h: i, kwh: 12 + Math.sin(i / 3.8) * 6 + Math.random() * 4,
  }))
}

watch([src, freq, points], () => {
  emit('update:data', { ...props.data, dataSrc: src.value, freq: freq.value, points: points.value })
})

const max     = computed(() => Math.max(...history.value.map(d => d.kwh), 1))
const total24 = computed(() => history.value.reduce((s, d) => s + d.kwh, 0))

function chartPath(fill) {
  if (!history.value.length) return ''
  const pts = history.value.map((d, i) => `L ${i * 10} ${140 - (d.kwh / max.value * 120)}`).join(' ')
  if (fill) return `M 0 140 ${pts} L 230 140 Z`
  return `M 0 ${140 - (history.value[0].kwh / max.value * 120)} ${pts}`
}

const currentSource = computed(() => SOURCES.find(s => s.k === src.value))
</script>

<template>
  <div class="step-data float-in">

    <div class="card glow">
      <div class="card-corner-tl" /><div class="card-corner-br" />

      <!-- 数据源选择 -->
      <div class="form-section">
        <div class="section-head">
          <div class="ico"><AppIcon name="bolt" :size="18" /></div>
          <div>
            <h3>选择数据源</h3>
            <div class="desc">配置设备运行能耗数据接入方式，用于后续能效评价与判定</div>
          </div>
        </div>
        <div class="src-grid">
          <div
            v-for="s in SOURCES" :key="s.k"
            :class="['src-card', src === s.k && 'active']"
            @click="src = s.k"
          >
            <div class="ic"><AppIcon :name="s.icon" :size="18" /></div>
            <div>
              <div class="n">{{ s.n }}</div>
              <div class="d">{{ s.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 采样频率 -->
      <div class="form-section" style="padding-top:0">
        <div class="section-head">
          <div class="ico"><AppIcon name="calendar" :size="18" /></div>
          <div>
            <h3>采样频率</h3>
            <div class="desc">数据上送间隔，建议建筑设备 15min ~ 1h</div>
          </div>
        </div>
        <div class="freq-row">
          <span v-for="[k, n] in FREQS" :key="k"
                :class="['freq-pill', freq === k && 'active']"
                @click="freq = k">{{ n }}</span>
        </div>

        <div :class="['conn-strip', connected && 'connected']">
          <div :class="['ai-orb', !connected && 'danger']" style="width:24px;height:24px" />
          <div class="lbl">
            <template v-if="connected">
              已连接到 <strong>{{ currentSource.n }}</strong> · 同步 {{ points.length }} 个测点 · 拉取近 24h 历史数据
            </template>
            <template v-else>未连接数据源，点击下方按钮发起连接握手</template>
          </div>
          <span v-if="connected" class="badge ok">
            <span class="live-pulse" />实时同步中
          </span>
          <button v-else class="btn primary" style="padding:7px 14px" @click="handleConnect">
            <AppIcon name="play" :size="11" /> 发起连接
          </button>
        </div>

        <div v-if="connected" class="points-table">
          <div class="pt-row head">
            <span>测点ID</span><span>名称 / 路径</span><span>单位</span><span>状态</span>
          </div>
          <div v-for="p in points" :key="p.id" class="pt-row">
            <span class="pt-id">{{ p.id }}</span>
            <div>
              <div class="pt-name">{{ p.name }}</div>
              <div class="pt-path">{{ p.path }}</div>
            </div>
            <span class="pt-unit">{{ p.unit }}</span>
            <span class="badge ok"><span class="live-pulse" />采集中</span>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <div style="font-size:12px;color:var(--text-2);margin-right:auto">
          {{ connected ? `已配置 ${points.length} 个测点 · 采样 ${freq}` : '未连接数据源' }}
          <span v-if="!connected" style="color:var(--warn);margin-left:8px">（可跳过：后续仍可补录）</span>
        </div>
        <button class="btn ghost" @click="$emit('prev')"><AppIcon name="chevron-left" :size="14" /> 上一步</button>
        <button class="btn primary" @click="$emit('next')">
          下一步 · 图谱融合 <AppIcon name="chevron-right" :size="14" />
        </button>
      </div>
    </div>

    <!-- 右：数据预览 -->
    <div class="data-preview">
      <h4><AppIcon name="zap" :size="14" stroke="#4dc9ff" /> 实时数据预览 · 主回路电量</h4>
      <template v-if="history.length > 0">
        <svg class="preview-chart" viewBox="0 0 240 140" width="100%">
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#4dc9ff" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#4dc9ff" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <line v-for="y in [0,35,70,105,140]" :key="y" :x1="0" :y1="y" :x2="240" :y2="y" stroke="#1a2950" stroke-width="0.5"/>
          <path :d="chartPath(true)"  fill="url(#area-grad)"/>
          <path :d="chartPath(false)" fill="none" stroke="#4dc9ff" stroke-width="1.5"/>
          <circle
            v-for="(d, i) in history.filter((_, i) => i % 3 === 0)"
            :key="i"
            :cx="i * 30" :cy="140 - (d.kwh / max * 120)"
            r="2" fill="#4dc9ff"
          />
        </svg>
        <div class="stats">
          <div class="b">
            <div class="v">{{ total24.toFixed(0) }}</div>
            <div class="l">24h 累计 (kWh)</div>
          </div>
          <div class="b">
            <div class="v">{{ (total24 / 24).toFixed(1) }}</div>
            <div class="l">小时均值 (kWh)</div>
          </div>
        </div>
        <div style="font-size:10px;color:#6a7da3;text-align:center;margin-top:8px;font-family:'JetBrains Mono',monospace">
          数据来源：{{ currentSource.n }} · 频率 {{ freq }}
        </div>
      </template>
      <div v-else style="text-align:center;padding:40px 0;color:#6a7da3;font-size:12px">
        <AppIcon name="bolt" :size="36" stroke="#3a4a70" />
        <div style="margin-top:8px">连接后将显示历史曲线</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-data { display: grid; grid-template-columns: 1fr 320px; gap: 18px; }
.src-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.src-card {
  padding: 16px; border-radius: 10px;
  background: #f8faff; border: 1px solid var(--line);
  cursor: pointer; transition: all 0.15s;
  display: flex; gap: 12px; align-items: flex-start;
}
.src-card:hover { border-color: var(--line-strong); background: white; }
.src-card.active { background: linear-gradient(135deg, #eaf2ff, #f5f9ff); border-color: var(--brand); box-shadow: 0 4px 12px rgba(47,127,255,0.12); }
.src-card .ic { width: 36px; height: 36px; border-radius: 8px; background: white; border: 1px solid var(--line); display: grid; place-items: center; color: var(--brand); flex-shrink: 0; }
.src-card.active .ic { background: linear-gradient(135deg, var(--brand), var(--brand-2)); border-color: transparent; color: white; }
.src-card .n { font-size: 13px; font-weight: 500; color: var(--text-0); }
.src-card .d { font-size: 11px; color: var(--text-2); margin-top: 3px; }

.freq-row { display: flex; gap: 8px; }
.freq-pill { padding: 6px 14px; border-radius: 6px; font-size: 12px; background: #f5f9ff; border: 1px solid var(--line); color: var(--text-1); cursor: pointer; user-select: none; }
.freq-pill:hover { border-color: var(--line-strong); background: white; }
.freq-pill.active { background: #eaf2ff; border-color: var(--brand); color: var(--brand); font-weight:500; }

.conn-strip {
  padding: 14px 18px; background: linear-gradient(90deg, #f8faff, #f3f6fb);
  border: 1px dashed var(--line-strong); border-radius: 10px;
  display: flex; align-items: center; gap: 12px; margin-top: 14px;
}
.conn-strip.connected { background: linear-gradient(90deg, rgba(43,217,168,0.06), rgba(43,217,168,0.01)); border-color: rgba(43,217,168,0.30); border-style: solid; }
.conn-strip .lbl { font-size: 12px; color: var(--text-1); flex:1; }
.conn-strip .lbl strong { color: var(--text-0); }

.points-table { margin-top: 14px; background: white; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.points-table .pt-row { display: grid; grid-template-columns: 60px 1fr 60px 88px; padding: 10px 14px; gap: 12px; font-size: 12px; align-items: center; border-bottom: 1px solid var(--line); }
.points-table .pt-row:last-child { border-bottom: 0; }
.points-table .pt-row.head { background: #f5f9ff; font-size: 11px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px; }
.points-table .pt-id { font-family: "JetBrains Mono", monospace; color: var(--text-2); }
.points-table .pt-name { color: var(--text-0); }
.points-table .pt-path { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-2); margin-top: 2px; }
.points-table .pt-unit { font-family: "JetBrains Mono", monospace; color: var(--text-1); }

.live-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); margin-right: 6px; display: inline-block; box-shadow: 0 0 8px var(--ok); animation: pulse 1.4s ease-in-out infinite; }

.data-preview { background: linear-gradient(180deg, #0f1d3d, #1a2a55); border: 1px solid #1a2950; border-radius: 12px; padding: 16px; color: #eaf2ff; height: fit-content; }
.data-preview h4 { margin: 0 0 12px; font-size: 13px; display: flex; align-items: center; gap: 8px; color: #eaf2ff; }
.preview-chart { height: 140px; margin: 10px 0; position: relative; }
.data-preview .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.data-preview .stats .b { padding: 10px; border-radius: 6px; background: rgba(77,201,255,0.06); border: 1px solid rgba(77,201,255,0.2); }
.data-preview .stats .b .v { font-size: 18px; font-family: "Orbitron", sans-serif; color: #4dc9ff; }
.data-preview .stats .b .l { font-size: 10px; color: #8da3c8; margin-top: 2px; }
</style>

<script setup>
// ── components/archive/WizardStepFusion.vue ───────────────────────
import { ref, onUnmounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'
import { randomFusionLog, tsNow } from '@/utils/logHelpers'

const props = defineProps({ data: { type: Object, required: true } })
defineEmits(['next', 'prev'])

const PHASES = [
  { n: '实体抽取与去重',  d: '识别铭牌字段 + 文档实体，与现有图谱合并' },
  { n: '关系推断与连边',  d: '建立设备-建筑-子系统-标准的层级关系' },
  { n: '向量化 / 索引',   d: '对所有切片生成语义向量，写入向量库' },
  { n: '规则与标准链接',  d: '链接到《淘汰目录》《能效限值》等知识' },
  { n: '质量校验 / 发布', d: '图谱一致性检查，发布为可查询版本' },
]

const NODE_COLORS = { device: '#4dc9ff', field: '#a799ff', doc: '#ff8a47', standard: '#ffb547', similar: '#2bd9a8' }
const NODE_LABELS = { device: '设备实体', field: '铭牌字段', doc: '文档片段', standard: '关联标准', similar: '相似设备' }

const progress = ref(0)
const phase    = ref(0)
const stats    = ref({ entities: 0, edges: 0, vectors: 0, rules: 0 })
const nodes    = ref([])
const edges    = ref([])
const logs     = ref([])
const done     = ref(false)

// 进度推进
const progTimer = setInterval(() => {
  if (done.value) return
  progress.value = Math.min(100, progress.value + 1.0)
  phase.value    = Math.min(4, Math.floor(progress.value / 20))
  if (progress.value >= 100) {
    done.value = true
    clearInterval(progTimer)
  }
}, 80)

// 统计计数
const statsTimer = setInterval(() => {
  if (done.value) return
  stats.value = {
    entities: Math.min(86,   stats.value.entities + Math.floor(Math.random() * 2 + 1)),
    edges:    Math.min(168,  stats.value.edges    + Math.floor(Math.random() * 4 + 1)),
    vectors:  Math.min(1240, stats.value.vectors  + Math.floor(Math.random() * 30 + 8)),
    rules:    Math.min(12,   stats.value.rules    + (Math.random() < 0.25 ? 1 : 0)),
  }
}, 200)

// 节点生长
const nodeTimer = setInterval(() => {
  if (done.value) return
  if (nodes.value.length < 38) {
    const types = ['device', 'field', 'doc', 'standard', 'similar']
    const t = nodes.value.length === 0 ? 'device' : types[1 + Math.floor(Math.random() * 4)]
    const a = Math.random() * Math.PI * 2
    const r = 8 + Math.random() * 32
    nodes.value = [...nodes.value, { id: nodes.value.length, t, x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r * 0.62 }]
  }
  if (nodes.value.length >= 2 && edges.value.length < 60) {
    const a = Math.floor(Math.random() * nodes.value.length)
    let b = Math.floor(Math.random() * nodes.value.length)
    while (b === a && nodes.value.length > 1) b = Math.floor(Math.random() * nodes.value.length)
    edges.value = [...edges.value, { a, b }]
  }
}, 200)

// 融合日志
const logTimer = setInterval(() => {
  if (done.value) return
  const ev = randomFusionLog(phase.value, props.data)
  logs.value = [...logs.value, { ts: tsNow(), ...ev }].slice(-30)
}, 480)

onUnmounted(() => {
  clearInterval(progTimer)
  clearInterval(statsTimer)
  clearInterval(nodeTimer)
  clearInterval(logTimer)
})

// 随机同型号数量（固定到首次渲染，避免闪烁）
const sameModelCount = Math.floor(2 + Math.random() * 6)
</script>

<template>
  <div class="step-fusion float-in">

    <!-- 左：融合阶段列表 -->
    <div class="gr-side">
      <h4><AppIcon name="graph" :size="16" stroke="var(--brand)" /> 融合阶段</h4>
      <div
        v-for="(p, i) in PHASES" :key="i"
        :class="['gr-phase', phase === i && !done && 'active', (phase > i || done) && 'done']"
      >
        <div class="num">
          <AppIcon v-if="phase > i || done" name="check" :size="11" />
          <template v-else>{{ i + 1 }}</template>
        </div>
        <div class="info">
          <div class="n">{{ p.n }}</div>
          <div class="d">{{ p.d }}</div>
        </div>
      </div>
    </div>

    <!-- 中：知识图谱画布 -->
    <div class="gr-canvas">
      <div class="gr-head">
        <div class="ai-orb" style="width:30px;height:30px" />
        <div>
          <h4>{{ done ? '图谱融合完成' : '知识图谱构建中…' }}</h4>
          <div class="sub">FusionEngine · 实时入图谱</div>
        </div>
        <div class="gr-progress">
          <span>{{ Math.round(progress) }}%</span>
          <div class="bar"><div class="fill" :style="{ width: `${progress}%` }" /></div>
        </div>
      </div>

      <svg class="gr-svg" viewBox="0 0 100 70">
        <defs>
          <radialGradient id="bg-glow-2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(77,201,255,0.10)"/>
            <stop offset="100%" stop-color="rgba(77,201,255,0)"/>
          </radialGradient>
        </defs>
        <rect width="100" height="70" fill="url(#bg-glow-2)"/>
        <ellipse v-for="(r, i) in [12, 22, 30]" :key="i"
                 cx="50" cy="35" :rx="r" :ry="r * 0.62"
                 fill="none" stroke="rgba(77,201,255,0.10)" stroke-width="0.15" stroke-dasharray="0.4 0.6"/>
        <template v-for="(e, i) in edges" :key="i">
          <line v-if="nodes[e.a] && nodes[e.b]"
                :x1="nodes[e.a].x" :y1="nodes[e.a].y * 0.7"
                :x2="nodes[e.b].x" :y2="nodes[e.b].y * 0.7"
                stroke="rgba(77,201,255,0.30)" stroke-width="0.18" stroke-dasharray="0.5 0.5"/>
        </template>
        <g v-for="(n, i) in nodes" :key="i"
           style="animation: node-pop 0.4s ease forwards"
           :style="{ transformOrigin: `${n.x}px ${n.y * 0.7}px` }">
          <circle :cx="n.x" :cy="n.y * 0.7" :r="n.t === 'device' ? 1.6 : 0.9"
                  :fill="NODE_COLORS[n.t]" opacity="0.85"
                  style="filter: drop-shadow(0 0 1.5px rgba(255,255,255,0.5))"/>
          <circle v-if="n.t === 'device'"
                  :cx="n.x" :cy="n.y * 0.7" r="2.6"
                  fill="none" :stroke="NODE_COLORS[n.t]" stroke-width="0.2" opacity="0.5"
                  style="animation: orb-pulse 2s ease-in-out infinite"/>
        </g>
      </svg>

      <div class="gr-legend">
        <span v-for="(label, k) in NODE_LABELS" :key="k" class="item" :style="{ '--cl': NODE_COLORS[k] }">
          <span class="dot" /> {{ label }}
        </span>
      </div>

      <div class="gr-stats">
        <div class="s" style="--cl:#4dc9ff"><div class="v">{{ stats.entities }}</div><div class="l">图谱节点</div></div>
        <div class="s" style="--cl:#a799ff"><div class="v">{{ stats.edges }}</div><div class="l">关系边</div></div>
        <div class="s" style="--cl:#2bd9a8"><div class="v">{{ stats.vectors }}</div><div class="l">向量片段</div></div>
        <div class="s" style="--cl:#ffb547"><div class="v">{{ stats.rules }}</div><div class="l">关联规则</div></div>
      </div>

      <div class="gr-log">
        <div v-for="(l, i) in logs.slice(-4)" :key="i">
          <span class="ts">{{ l.ts }}</span>
          <span :class="`lv-${l.lv}`">[{{ l.lv.toUpperCase() }}]</span> {{ l.msg }}
        </div>
      </div>
    </div>

    <!-- 右：融合摘要 -->
    <div class="gr-side">
      <h4><AppIcon name="info" :size="16" stroke="var(--brand)" /> 融合摘要</h4>
      <div style="font-size:12px;color:var(--text-1);line-height:1.7">
        <div style="margin-bottom:10px">设备：<strong style="color:var(--text-0)">{{ data.name || '—' }}</strong></div>
        <div style="margin-bottom:10px">类型：<strong style="color:var(--text-0)">{{ DEV_TYPE_MAP[data.typeK]?.label || '—' }} / {{ data.type2 || '—' }}</strong></div>
        <div style="margin-bottom:10px">型号：<span class="mono" style="color:var(--text-0)">{{ data.model || '—' }}</span></div>
        <div style="margin-bottom:10px">建筑：<strong style="color:var(--text-0)">{{ data.building || '—' }}</strong></div>
        <div style="padding:10px 12px;background:#f5f9ff;border-radius:8px;margin-top:14px;border:1px solid var(--line)">
          <div style="font-size:11px;color:var(--text-2);margin-bottom:6px">已链接到知识图谱：</div>
          <div class="mono" style="font-size:11px;color:var(--text-1);line-height:1.8">
            ▸ 建筑实体（同 {{ data.building || '—' }}）<br/>
            ▸ 设备类型节点（{{ DEV_TYPE_MAP[data.typeK]?.label || '—' }}）<br/>
            ▸ 同型号设备 {{ sameModelCount }} 台<br/>
            ▸ 关联国标 GB18613 / GB20052 / GB/T17981
          </div>
        </div>
      </div>

      <div v-if="done" class="complete-banner">
        <div class="ok-orb"><AppIcon name="check" :size="16" /></div>
        <div>
          <div class="h">设备档案已成功入库</div>
          <div class="d">已加入知识图谱，可参与判定</div>
        </div>
      </div>

      <div class="form-actions" style="margin-top:14px;padding:14px 0 0;border-top:1px solid var(--line);background:transparent;border-radius:0">
        <button class="btn ghost" @click="$emit('prev')">
          <AppIcon name="chevron-left" :size="14" /> 上一步
        </button>
        <button class="btn primary" @click="$emit('next')">
          完成 · 返回总览 <AppIcon name="check" :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-fusion { display: grid; grid-template-columns: 280px 1fr 320px; gap: 20px; }

.gr-side { background: white; border: 1px solid var(--line); border-radius: 12px; padding: 18px; height: fit-content; box-shadow: 0 1px 2px rgba(60,110,200,0.04); }
.gr-side h4 { font-size: 13px; margin: 0 0 14px; color: var(--text-0); display: flex; align-items: center; gap: 8px; }
.gr-phase { padding: 11px 12px; margin-bottom: 8px; border-radius: 8px; background: #f8faff; border: 1px solid var(--line); display: flex; gap: 10px; align-items: flex-start; transition: all 0.3s; }
.gr-phase.active { background: linear-gradient(180deg, #eaf2ff, #f5f9ff); border-color: var(--brand); box-shadow: 0 4px 12px rgba(47,127,255,0.12); }
.gr-phase.done { border-color: rgba(24,165,114,0.30); background: #effaf5; }
.gr-phase .num { width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center; flex-shrink: 0; background: white; border: 1px solid var(--line); font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-2); }
.gr-phase.active .num { background: linear-gradient(135deg, var(--brand), var(--brand-2)); border-color: transparent; color: white; }
.gr-phase.done   .num { background: rgba(24,165,114,0.10); border-color: var(--ok); color: var(--ok); }
.gr-phase .info .n { font-size: 12px; color: var(--text-0); font-weight: 500; }
.gr-phase .info .d { font-size: 10.5px; color: var(--text-2); margin-top: 2px; line-height: 1.4; }

.gr-canvas { background: linear-gradient(180deg, #0f1d3d, #1a2a55); border: 1px solid #1a2950; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; min-height: 540px; color: #eaf2ff; }
.gr-canvas::before { content:""; position:absolute; inset:0; background-image: radial-gradient(circle at 50% 50%, rgba(47,127,255,0.12), transparent 70%); pointer-events: none; }
.gr-head { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; border-bottom: 1px dashed rgba(77,201,255,0.2); margin-bottom: 14px; position: relative; }
.gr-head h4 { margin: 0; font-size: 14px; color: #eaf2ff; }
.gr-head .sub { font-size: 11px; color: #8da3c8; font-family: "JetBrains Mono", monospace; }
.gr-progress { margin-left: auto; display: flex; align-items: center; gap: 10px; font-size: 11px; color: #8da3c8; font-family: "JetBrains Mono", monospace; }
.gr-progress .bar { width: 120px; height: 4px; background: rgba(255,255,255,0.10); border-radius: 2px; overflow: hidden; }
.gr-progress .bar .fill { height: 100%; background: linear-gradient(90deg, #4dc9ff, #2bd9a8); transition: width 0.3s; }

.gr-svg { width: 100%; height: 360px; position: relative; z-index: 1; }
.gr-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
.gr-stats .s { padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(77,201,255,0.20); text-align: center; }
.gr-stats .s .v { font-family: "Orbitron", sans-serif; font-size: 22px; font-weight: 600; color: var(--cl, #4dc9ff); }
.gr-stats .s .l { font-size: 10px; color: #8da3c8; margin-top: 2px; }

.gr-legend { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 10px; background: rgba(0,0,0,0.18); border-radius: 6px; margin-top: 10px; font-size: 10.5px; color: #8da3c8; font-family: "JetBrains Mono", monospace; }
.gr-legend .item { display: inline-flex; align-items: center; gap: 5px; }
.gr-legend .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--cl); display: inline-block; }

@keyframes node-pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }

.gr-log { background: rgba(0,0,0,0.25); border-radius: 8px; padding: 8px 10px; font-family: "JetBrains Mono", monospace; font-size: 10px; max-height: 80px; overflow-y: auto; margin-top: 10px; line-height: 1.6; color: #c5d3ed; }
.gr-log .ts { color: #6a7da3; margin-right: 6px; }
.gr-log .lv-info { color: #4dc9ff; }
.gr-log .lv-ok   { color: #2bd9a8; }

.complete-banner { padding: 14px 18px; margin-top: 12px; background: linear-gradient(90deg, rgba(43,217,168,0.12), rgba(43,217,168,0.02)); border: 1px solid rgba(43,217,168,0.40); border-radius: 10px; display: flex; align-items: center; gap: 12px; }
.complete-banner .ok-orb { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #2bd9a8, #18a572); display: grid; place-items: center; color: white; flex-shrink: 0; box-shadow: 0 0 16px rgba(43,217,168,0.4); }
.complete-banner .h { font-size: 13px; font-weight: 600; color: var(--text-0); }
.complete-banner .d { font-size: 11px; color: var(--text-2); margin-top: 2px; }
</style>

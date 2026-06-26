<script setup>
// ── components/archive/WizardStepDocs.vue ─────────────────────────
import { ref, computed, watch, onUnmounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { tsNow, randomTags, randomDocLog, tokenizeDocLog } from '@/utils/logHelpers'

const props = defineProps({
  data: { type: Object, required: true },
  stages: {
    type: Array,
    default: () => [
      { n: 'OCR · 文本抽取',  k: 1 },
      { n: '语义切片',         k: 2 },
      { n: '实体识别 / 标签',  k: 3 },
      { n: '向量化 / 入图谱',  k: 4 },
    ],
  },
})
const STAGES = computed(() => props.stages)
const emit  = defineEmits(['update:data', 'next', 'prev'])

const DOC_CATEGORIES = [
  { k: 'device',   n: '设备照片',   icon: 'eye',      color: '#4dc9ff', desc: '设备外观、铭牌特写等照片' },
  { k: 'site',     n: '现场照片',   icon: 'scan',     color: '#2bd9a8', desc: '安装环境、现场全景照片' },
  { k: 'archive',  n: '设备档案',   icon: 'database', color: '#7a5cff', desc: '采购合同、验收报告、试运行记录' },
  { k: 'maintain', n: '维保记录',   icon: 'settings', color: '#ffb547', desc: '维修工单、保养记录、故障日志' },
  { k: 'monitor',  n: '监测报告',   icon: 'sparkles', color: '#ff8a47', desc: '能效检测、运行监测、第三方报告' },
  { k: 'other',    n: '其他文件',   icon: 'doc',      color: '#8a9bbf', desc: '其他相关文件资料' },
]

const SAMPLE_FILES_FOR = {
  device:   [{ name: '设备外观-正面.jpg', size: 2840 }, { name: '设备铭牌-特写.jpg', size: 1620 }],
  site:     [{ name: '安装环境-机房全景.jpg', size: 3120 }, { name: '现场安装照片.jpg', size: 2240 }],
  archive:  [{ name: '采购合同-2008.pdf', size: 1240 }, { name: '出厂检验报告.pdf', size: 980 }, { name: '现场验收记录.docx', size: 560 }],
  maintain: [{ name: '2023年度维保记录.xlsx', size: 720 }, { name: '故障维修工单合集.pdf', size: 1840 }],
  monitor:  [{ name: '电机能效检测报告-2023.pdf', size: 1560 }],
  other:    [],
}




const activeCat = ref('device')
const docs      = ref({ ...(props.data.docs || {}) })
const logs      = ref([{ ts: tsNow(), lv: 'info', msg: 'AI 文档解析引擎就绪 · 等待文档输入…' }])

// 推进解析阶段
let stageTimer = null
stageTimer = setInterval(() => {
  const next = {}
  for (const [k, arr] of Object.entries(docs.value)) {
    next[k] = arr.map(d => {
      if (d.stage < 4) {
        const newStage = Math.min(4, d.stage + 1)
        const newDoc = { ...d, stage: newStage }
        if (newStage === 2) newDoc.chunks   = Math.floor(d.size / 25 + 8)
        if (newStage === 3) newDoc.tags     = randomTags(k)
        if (newStage === 4) newDoc.entities = Math.floor(8 + Math.random() * 16)
        return newDoc
      }
      return d
    })
  }
  docs.value = next
}, 1100)

// 流日志
let logTimer = null
watch(docs, (val) => {
  clearInterval(logTimer)
  const allDocs = Object.entries(val).flatMap(([k, arr]) => arr.map(d => ({ ...d, cat: k })))
  const active = allDocs.find(d => d.stage > 0 && d.stage < 4)
  if (!active) return
  logTimer = setInterval(() => {
    const ev = randomDocLog(active)
    logs.value = [...logs.value, { ts: tsNow(), ...ev }].slice(-30)
  }, 750)
}, { deep: true })

// 同步到父层
watch(docs, (val) => {
  emit('update:data', { ...props.data, docs: val })
}, { deep: true })

onUnmounted(() => {
  clearInterval(stageTimer)
  clearInterval(logTimer)
})

function addDocs(catK, files) {
  const newItems = files.map((f, i) => ({
    id: `${catK}-${Date.now()}-${i}`, name: f.name, size: f.size, stage: 1,
  }))
  docs.value = { ...docs.value, [catK]: [...(docs.value[catK] || []), ...newItems] }
  logs.value = [...logs.value, { ts: tsNow(), lv: 'info', msg: `接收到 ${newItems.length} 份新文档 → 投入 OCR 队列` }]
}

function previewFile(doc) {
  // 真实文件用 doc.url，mock 数据用文件名搜索演示
  const url = doc.url || `https://www.google.com/search?q=${encodeURIComponent(doc.name)}`
  window.open(url, '_blank')
}

function handleSampleAdd(catK) {
  addDocs(catK, SAMPLE_FILES_FOR[catK] || [])
}

const allDocs       = computed(() => Object.values(docs.value).flat())
const totalChunks   = computed(() => allDocs.value.reduce((s, d) => s + (d.chunks || 0), 0))
const totalEntities = computed(() => allDocs.value.reduce((s, d) => s + (d.entities || 0), 0))
const totalTags     = computed(() => allDocs.value.reduce((s, d) => s + (d.tags?.length || 0), 0))
const stageMax      = computed(() => Math.max(0, ...allDocs.value.map(d => d.stage)))

const activeCatInfo = computed(() => DOC_CATEGORIES.find(c => c.k === activeCat.value))
const activeList    = computed(() => docs.value[activeCat.value] || [])
</script>

<template>
  <div class="step-docs-2 float-in">

    <!-- 左：分类导航 -->
    <div class="doc-cat-nav">
      <div
        v-for="c in DOC_CATEGORIES" :key="c.k"
        :class="['doc-cat-item', activeCat === c.k && 'active']"
        :style="{ '--cl': c.color }"
        @click="activeCat = c.k"
      >
        <div class="ic"><AppIcon :name="c.icon" :size="14" /></div>
        <div class="info">
          <div class="n">{{ c.n }}</div>
          <div class="c">
            {{ (docs[c.k] || []).length > 0
              ? `${(docs[c.k] || []).filter(d => d.stage >= 4).length}/${(docs[c.k] || []).length} 已解析`
              : '未上传' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 中：文档主区 -->
    <div class="doc-main">
      <div class="doc-main-head">
        <div class="ico" :style="{ background: `${activeCatInfo.color}1a`, color: activeCatInfo.color }">
          <AppIcon :name="activeCatInfo.icon" :size="16" />
        </div>
        <div>
          <h3>{{ activeCatInfo.n }}</h3>
          <div class="desc">{{ activeCatInfo.desc }}</div>
        </div>
        <div style="flex:1" />
        <span class="badge">{{ activeList.filter(d => d.stage >= 4).length }} / {{ activeList.length }} 已解析</span>
      </div>

      <div class="uploader" @click="handleSampleAdd(activeCat)">
        <div class="icn"><AppIcon name="upload" :size="26" /></div>
        <div class="h">点击上传或拖拽 {{ activeCatInfo.n }}</div>
        <div class="s">{{ ['device','site'].includes(activeCat) ? '支持 JPG / PNG，可多张' : '支持 PDF / Word / 图片，单文件 ≤ 50MB' }}</div>
        <div class="s" style="color:var(--brand);margin-top:6px">
          <AppIcon name="sparkles" :size="11" /> 点击此区域加载示例文档进行演示
        </div>
      </div>

      <!-- 照片网格 -->
      <div v-if="['device','site'].includes(activeCat)" class="photo-grid">
        <div v-if="activeList.length === 0"
             style="grid-column:1/-1;color:var(--text-3);text-align:center;padding:30px 0;font-size:12px">
          暂无照片
        </div>
        <div v-else v-for="d in activeList" :key="d.id"
             :class="['photo-cell', d.stage > 0 && d.stage < 4 && 'scan-anim']">
          <AppIcon name="eye" :size="28" stroke="rgba(255,255,255,0.4)" />
          <span class="label">{{ d.name }}</span>
          <span v-if="d.stage >= 4" class="done-tag">已解析</span>
        </div>
      </div>

      <!-- 文档列表 -->
      <div v-else class="doc-list">
        <div v-if="activeList.length === 0"
             style="color:var(--text-3);text-align:center;padding:30px 0;font-size:12px">
          暂无文档
        </div>
        <template v-else v-for="d in activeList" :key="d.id">
          <div :class="['doc-row', d.stage >= 4 && 'done']">
            <div class="icn"><AppIcon name="doc" :size="14" /></div>
            <div class="info">
              <div class="n">{{ d.name }}</div>
              <div class="meta">{{ d.size }}KB</div>
            </div>
            <button class="preview-btn" title="预览文件" @click="previewFile(d)">
              <AppIcon name="eye" :size="14" stroke="var(--brand)" />
            </button>
            <div class="progress"><div class="progress-fill" :style="{ width: `${d.stage * 25}%` }" /></div>
            <span class="stage-tag">
              {{ STAGES.find(s => s.k === d.stage)?.n?.split('·')[0]?.trim() || '已完成' }}
            </span>
          </div>
        </template>
      </div>
    </div>

    <!-- 右：AI 解析流水线 -->
    <div class="parse-stream-2">
      <div class="head">
        <div class="ai-orb" style="width:30px;height:30px" />
        <div>
          <div class="h">AI 解析流水线</div>
          <div class="sub">DocGraph-LLM · 文档管线</div>
        </div>
      </div>

      <div class="pipe">
        <div
          v-for="s in STAGES" :key="s.k"
          :class="['pipe-step', stageMax > s.k && 'done', stageMax === s.k && 'active']"
        >
          <div class="dot">
            <AppIcon v-if="stageMax > s.k" name="check" :size="11" />
            <template v-else>{{ s.k }}</template>
          </div>
          <div class="label">{{ s.n }}</div>
          <div class="stat">
            <template v-if="s.k === 1 && allDocs.length > 0">{{ allDocs.length }} 份</template>
            <template v-if="s.k === 2 && totalChunks > 0">{{ totalChunks }} 片</template>
            <template v-if="s.k === 3 && totalTags > 0">{{ totalTags }} 标签</template>
            <template v-if="s.k === 4 && totalEntities > 0">{{ totalEntities }} 实体</template>
          </div>
        </div>
      </div>

      <div class="parse-log-2">
        <span v-for="(l, i) in logs" :key="i" class="line">
          <span class="ts">{{ l.ts }}</span>
          <span :class="`lv-${l.lv}`">[{{ l.lv.toUpperCase() }}]</span>
          <!-- token 着色渲染 -->
          <template v-for="(tok, j) in tokenizeDocLog(l.msg)" :key="j">
            <span v-if="tok.type === 'ent'"    class="ent">{{ tok.value }}</span>
            <span v-else-if="tok.type === 'cyan'"   :style="{ color: '#4dc9ff' }">{{ tok.value }}</span>
            <span v-else-if="tok.type === 'yellow'" :style="{ color: '#ffb547' }">{{ tok.value }}</span>
            <template v-else>{{ tok.value }}</template>
          </template>
        </span>
      </div>

      <div class="doc-stats-2">
        <div class="doc-stat-2"><div class="v">{{ allDocs.length }}</div><div class="l">文档</div></div>
        <div class="doc-stat-2"><div class="v">{{ totalChunks }}</div><div class="l">语义切片</div></div>
        <div class="doc-stat-2"><div class="v">{{ totalEntities }}</div><div class="l">图谱实体</div></div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="form-actions" style="grid-column: 1 / -1">
      <div style="font-size:12px;color:var(--text-2);margin-right:auto">
        已上传 <strong style="color:var(--brand-2)">{{ allDocs.length }}</strong> 份
      </div>
      <button class="btn ghost" @click="$emit('prev')"><AppIcon name="chevron-left" :size="14" /> 上一步</button>
      <button class="btn primary" @click="$emit('next')">
        下一步 · 运行数据接入 <AppIcon name="chevron-right" :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.step-docs-2 { display: grid; grid-template-columns: 200px 1fr 320px; gap: 18px; }

.doc-cat-nav { background: white; border: 1px solid var(--line); border-radius: 12px; padding: 12px 0; height: fit-content; }
.doc-cat-item {
  padding: 10px 14px; cursor: pointer; display: flex; align-items: center; gap: 10px;
  border-left: 2px solid transparent; transition: all 0.15s;
  font-size: 12.5px; color: var(--text-1);
}
.doc-cat-item:hover { background: #f5f9ff; }
.doc-cat-item.active {
  background: linear-gradient(90deg, rgba(47,127,255,0.08), transparent);
  border-left-color: var(--cl); color: var(--text-0); font-weight: 500;
}
.doc-cat-item .ic { width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center; background: rgba(60,110,200,0.06); color: var(--cl); flex-shrink: 0; }
.doc-cat-item .info { flex: 1; min-width: 0; }
.doc-cat-item .n { font-size: 12.5px; }
.doc-cat-item .c { font-size: 10.5px; color: var(--text-3); margin-top: 2px; }
.doc-cat-item.active .c { color: var(--text-2); }

.doc-main { background: white; border: 1px solid var(--line); border-radius: 12px; padding: 22px; display: flex; flex-direction: column; min-height: 460px; }
.doc-main-head { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px dashed var(--line); }
.doc-main-head .ico { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; }
.doc-main-head h3 { margin: 0; font-size: 14px; color: var(--text-0); }
.doc-main-head .desc { font-size: 11.5px; color: var(--text-2); margin-top:2px; }

.uploader {
  border: 2px dashed var(--line-strong); border-radius: 10px;
  padding: 24px; text-align: center; cursor: pointer;
  background: linear-gradient(180deg, #f8faff, #f3f6fb);
  transition: all 0.15s; margin-bottom: 14px;
}
.uploader:hover { border-color: var(--brand); background: linear-gradient(180deg, #eaf2ff, #f5f9ff); }
.uploader .h { font-size: 13px; color: var(--text-1); }
.uploader .s { font-size: 11px; color: var(--text-3); margin-top: 4px; }
.uploader .icn { color: var(--brand); margin-bottom: 6px; display:flex; justify-content:center; }

.doc-list { display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; max-height: 360px; }
.doc-row {
  padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: #f8faff; display: flex; align-items: center; gap: 10px; font-size: 12px;
}
.doc-row .icn { width: 28px; height: 28px; border-radius: 6px; background: white; border: 1px solid var(--line); display:grid; place-items:center; color: var(--text-2); flex-shrink:0; }
.doc-row .info { flex: 1; min-width: 0; }
.doc-row .n { font-size: 12px; color: var(--text-0); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.doc-row .meta { font-size: 10.5px; color: var(--text-2); margin-top:2px; font-family: "JetBrains Mono", monospace; }
.doc-row .progress { width: 100px; height: 4px; background: #e3ebf7; border-radius: 2px; overflow: hidden; }
.doc-row .progress-fill { height: 100%; background: linear-gradient(90deg, var(--brand), var(--brand-2)); transition: width 0.5s; }
.doc-row.done .progress-fill { background: var(--ok); }
.doc-row .stage-tag { font-size: 10px; font-family: "JetBrains Mono", monospace; padding: 2px 7px; border-radius: 3px; background: rgba(47,127,255,0.10); color: var(--brand); border: 1px solid rgba(47,127,255,0.22); }
.doc-row.done .stage-tag { background: rgba(43,217,168,0.10); color: var(--ok); border-color: rgba(43,217,168,0.22); }
.doc-tags-strip { display: flex; gap: 4px; flex-wrap: wrap; padding-left: 38px; padding-right: 12px; padding-top: 4px; }
.preview-btn {
  display: grid; place-items: center; width: 28px; height: 28px;
  border: 1px solid var(--line); border-radius: 6px;
  background: white; cursor: pointer; flex-shrink: 0;
  opacity: 0; transition: opacity 0.15s;
}
.doc-row:hover .preview-btn { opacity: 1; }
.preview-btn:hover { border-color: var(--brand); background: #f0f6ff; }

.doc-tag-chip {
  font-size: 10px; padding: 1px 6px; border-radius: 3px;
  background: rgba(122,92,255,0.08); color: #6a4eff;
  border: 1px solid rgba(122,92,255,0.20);
  font-family: "JetBrains Mono", monospace;
  opacity: 0; animation: tag-pop 0.3s ease forwards;
}
@keyframes tag-pop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }

.photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.photo-cell {
  aspect-ratio: 4/3; border-radius: 8px; overflow:hidden;
  border: 1px solid var(--line);
  background: linear-gradient(135deg, #2a3855, #4a5780);
  position: relative; display: flex; align-items: center; justify-content: center;
  color: white; font-size: 11px;
}
.photo-cell::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 60%); }
.photo-cell .label { position: absolute; bottom: 6px; left: 6px; font-size: 10px; opacity: 0.85; z-index: 1; }
.photo-cell.scan-anim::after {
  content:""; position:absolute; left:0; right:0; top:0; height: 30%;
  background: linear-gradient(180deg, transparent, rgba(77,201,255,0.35) 70%, rgba(77,201,255,0));
  animation: photo-scan 2s ease-in-out infinite;
}
@keyframes photo-scan { 0% { top: -30%; } 100% { top: 100%; } }
.photo-cell .done-tag { position:absolute; top:6px; right:6px; padding:1px 6px; border-radius:3px; background:rgba(43,217,168,0.85); font-size:10px; color:white; z-index:2; }

.parse-stream-2 {
  background: white; border: 1px solid var(--line); border-radius: 12px;
  padding: 16px; height: fit-content; position: sticky; top: 80px;
  box-shadow: 0 1px 2px rgba(60,110,200,0.04), 0 4px 16px rgba(60,110,200,0.06);
}
.parse-stream-2 .head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.parse-stream-2 .head .h { font-size: 13px; color: var(--text-0); font-weight: 600; }
.parse-stream-2 .head .sub { font-size: 11px; color: var(--text-2); margin-top: 2px; font-family: "JetBrains Mono", monospace; }

.pipe { display: flex; flex-direction: column; margin-bottom: 12px; }
.pipe-step { display: flex; align-items: center; gap: 10px; padding: 8px 0; position: relative; }
.pipe-step::before { content:""; position:absolute; left: 11px; top: 30px; bottom: -8px; width: 1px; background: var(--line); }
.pipe-step:last-child::before { display: none; }
.pipe-step .dot {
  width: 24px; height: 24px; border-radius: 50%;
  background: white; border: 1px solid var(--line);
  display: grid; place-items: center; flex-shrink: 0;
  font-family: "JetBrains Mono", monospace; font-size: 10px; color: var(--text-2); z-index: 2;
}
.pipe-step.active .dot { background: linear-gradient(135deg, var(--brand), var(--brand-2)); border-color: transparent; color: white; box-shadow: 0 0 12px rgba(47,127,255,0.4); }
.pipe-step.done .dot { background: rgba(24,165,114,0.10); border-color: var(--ok); color: var(--ok); }
.pipe-step .label { flex: 1; font-size: 12px; color: var(--text-2); }
.pipe-step.active .label { color: var(--text-0); }
.pipe-step.done .label { color: var(--text-1); }
.pipe-step .stat { font-size: 10px; color: var(--text-3); font-family: "JetBrains Mono", monospace; }
.pipe-step.done .stat { color: var(--ok); }

.parse-log-2 {
  background: #0f1d3d; border-radius: 8px; padding: 10px;
  font-family: "JetBrains Mono", monospace; font-size: 10.5px;
  max-height: 200px; overflow-y: auto; color: #c5d3ed;
  line-height: 1.7; border: 1px solid #1a2950;
}
.parse-log-2 .line { display: block; }
.parse-log-2 .ts { color: #6a7da3; margin-right: 8px; }
.parse-log-2 .lv-info { color: #4dc9ff; }
.parse-log-2 .lv-ok   { color: #2bd9a8; }
.parse-log-2 .lv-warn { color: #ffb547; }
.parse-log-2 .ent     { color: #b3a4ff; }

.doc-stats-2 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 12px; }
.doc-stat-2 { padding: 10px; background: #f5f9ff; border: 1px solid var(--line); border-radius: 8px; text-align: center; }
.doc-stat-2 .v { font-size: 18px; color: var(--brand); font-family: "Orbitron", sans-serif; font-weight: 600; }
.doc-stat-2 .l { font-size: 10px; color: var(--text-2); margin-top: 2px; }
</style>

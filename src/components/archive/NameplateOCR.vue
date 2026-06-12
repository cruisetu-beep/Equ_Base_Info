<script setup>
// ── components/archive/NameplateOCR.vue ───────────────────────────
import { ref, watch, onUnmounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { OCR_PRESET } from '@/data/devices'
import { tsNow } from '@/utils/logHelpers'

const emit = defineEmits(['recognized'])

const phase     = ref('idle')      // idle | scanning | recognized
const scanProg  = ref(0)
const hitFields = ref([])
const logs      = ref([])
const fileInput = ref(null)

let scanTimer = null
let fieldTimer = null

function startScan() {
  phase.value    = 'scanning'
  scanProg.value = 0
  hitFields.value = []
  logs.value = [{ ts: tsNow(), lv: 'info', msg: '加载图像 → 预处理（去噪 / 矫正 / 二值化）' }]

  clearInterval(scanTimer)
  scanTimer = setInterval(() => {
    if (scanProg.value >= 100) {
      clearInterval(scanTimer)
      return
    }
    scanProg.value = Math.min(100, scanProg.value + 2)
  }, 36)
}

// 字段命中检测
watch(scanProg, (p) => {
  if (phase.value !== 'scanning') return

  OCR_PRESET.fields.forEach(f => {
    const trigger = f.y + f.h * 0.5
    if (p >= trigger && !hitFields.value.includes(f.key)) {
      hitFields.value = [...hitFields.value, f.key]
      logs.value = [...logs.value, {
        ts: tsNow(), lv: 'ok',
        msg: `识别字段 ${f.label}="${f.value}"  conf=${(0.92 + Math.random() * 0.07).toFixed(2)}`,
      }]
    }
  })

  if (p >= 100 && phase.value === 'scanning') {
    setTimeout(() => {
      phase.value = 'recognized'
      logs.value = [...logs.value,
        { ts: tsNow(), lv: 'info', msg: `生成结构化字段 → 写入表单（${OCR_PRESET.fields.length} 项）` },
        { ts: tsNow(), lv: 'ok',   msg: `完成 · 平均置信度 0.96` },
      ]
      emit('recognized', OCR_PRESET)
    }, 400)
  }
})

function handleFile() { startScan() }

function onDrop(e) {
  e.preventDefault()
  const f = e.dataTransfer.files[0]
  if (f) handleFile()
}

onUnmounted(() => {
  clearInterval(scanTimer)
  clearInterval(fieldTimer)
})
</script>

<template>
  <div class="ocr-card">
    <!-- 左：铭牌扫描舞台 -->
    <div class="ocr-stage">
      <!-- 空态 -->
      <template v-if="phase === 'idle'">
        <div
          class="ocr-empty"
          @click="fileInput.click()"
          @dragover.prevent
          @drop="onDrop"
        >
          <div class="ic"><AppIcon name="scan" :size="28" /></div>
          <div class="h">上传设备铭牌照片</div>
          <div class="s">支持 JPG / PNG · 拖拽或点击选择 · AI 自动识别字段并填写表单</div>
          <button
            class="ocr-mini-btn"
            style="margin-top:8px"
            @click.stop="startScan"
          >
            <AppIcon name="sparkles" :size="11" /> 使用示例铭牌演示
          </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" style="display:none"
               @change="e => e.target.files[0] && handleFile()" />
      </template>

      <!-- 扫描中 / 识别完成 -->
      <template v-else>
        <!-- 模拟铭牌 -->
        <div class="nameplate-mock">
          <div class="brand">SHANGHAI ELECTRIC MACHINE CO., LTD.</div>
          <div class="model-line">Y2 - 180M - 4</div>
          <div class="grid">
            <div class="row"><span class="lbl">No.</span><span class="val">SH-2008-04572</span></div>
            <div class="row"><span class="lbl">Standard</span><span class="val">GB18613</span></div>
            <div class="row"><span class="lbl">Year</span><span class="val">2008</span></div>
            <div class="row"><span class="lbl">P</span><span class="val">22 kW</span></div>
            <div class="row"><span class="lbl">U</span><span class="val">380 V</span></div>
            <div class="row"><span class="lbl">f</span><span class="val">50 Hz</span></div>
            <div class="row"><span class="lbl">n</span><span class="val">1470 r/min</span></div>
            <div class="row"><span class="lbl">IP</span><span class="val">IP54</span></div>
            <div class="row"><span class="lbl">Ins.</span><span class="val">F</span></div>
          </div>
          <div class="footer">
            <span>EFF. 88.5%</span><span>WT. 178 kg</span><span>S1</span>
          </div>
        </div>

        <!-- 字段命中框 -->
        <div
          v-for="f in OCR_PRESET.fields.filter(f => hitFields.includes(f.key))"
          :key="f.key"
          :class="['hit-box', phase === 'recognized' && 'done']"
          :style="{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%` }"
        >
          <span class="tag">{{ f.label }}: {{ f.value }}</span>
        </div>

        <!-- 扫描线 -->
        <div v-if="phase === 'scanning'" class="scan-bar" :style="{ top: `${scanProg - 30}%` }" />

        <!-- 底部进度条 -->
        <div class="ocr-bottom-bar">
          <span class="label">{{ phase === 'scanning' ? 'OCR · 识别中' : 'OCR · 完成' }}</span>
          <div class="progress-bar"><div class="progress-fill" :style="{ width: `${scanProg}%` }" /></div>
          <span>{{ scanProg }}%</span>
          <button v-if="phase === 'recognized'" class="ocr-mini-btn" @click="startScan">
            <AppIcon name="scan" :size="10" /> 重新识别
          </button>
        </div>
      </template>
    </div>

    <!-- 右：AI 日志 -->
    <div class="ocr-log">
      <div class="ocr-log-head">
        <div class="ai-orb" style="width:24px;height:24px" />
        <div class="h">AI · 视觉识别</div>
        <span class="sub mono">VLM-Nameplate v2</span>
      </div>
      <div class="ocr-log-body">
        <span v-if="logs.length === 0" style="color:#6a7da3">等待图像输入…</span>
        <span v-for="(l, i) in logs" :key="i" class="ll">
          <span class="ts">{{ l.ts }}</span>
          <span :class="`lv-${l.lv}`">[{{ l.lv.toUpperCase() }}]</span> {{ l.msg }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ocr-card { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
.ocr-stage {
  background: linear-gradient(135deg, #0a1628 0%, #0d1b35 60%, #0a1628 100%);
  border: 1px solid rgba(77,201,255,0.2); border-radius: 10px;
  aspect-ratio: 16/9; position: relative; overflow: hidden;
  box-shadow: inset 0 0 60px rgba(77,201,255,0.05);
}
.ocr-stage::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, rgba(47,127,255,0.10), transparent 60%);
  pointer-events: none;
}
.ocr-empty {
  position: absolute; inset: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: #8da3c8; cursor: pointer;
  border: 2px dashed rgba(77,201,255,0.25); border-radius: 10px;
  transition: all 0.2s;
}
.ocr-empty:hover { border-color: rgba(77,201,255,0.5); background: rgba(47,127,255,0.04); }
.ocr-empty .h { font-size: 14px; color: #c5d3ed; font-weight: 500; }
.ocr-empty .s { font-size: 11px; color: #6a7da3; }
.ocr-empty .ic { width: 56px; height: 56px; border-radius: 50%; background: rgba(77,201,255,0.12); display:grid; place-items:center; color: #4dc9ff; margin-bottom: 6px; }

.nameplate-mock {
  position: absolute; inset: 14px;
  background: linear-gradient(135deg, #d4ad57 0%, #b59041 50%, #d4ad57 100%);
  border: 4px double rgba(0,0,0,0.5); border-radius: 6px;
  padding: 14px 22px;
  color: #2a1f0c; font-family: "JetBrains Mono", monospace;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.2), 0 4px 14px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
}
.nameplate-mock::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(90deg, transparent 0, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px);
}
.nameplate-mock .brand { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-align:center; padding-bottom:4px; border-bottom:1px solid rgba(0,0,0,0.3); }
.nameplate-mock .model-line { font-size: 18px; font-weight: 700; text-align:center; margin: 6px 0 10px; letter-spacing: 1px; }
.nameplate-mock .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 14px; font-size: 11px; }
.nameplate-mock .row { display: flex; justify-content: space-between; }
.nameplate-mock .lbl { opacity: 0.65; }
.nameplate-mock .val { font-weight: 700; }
.nameplate-mock .footer { margin-top: auto; padding-top: 6px; font-size: 9px; opacity: 0.6; display:flex; justify-content:space-between; }

.scan-bar {
  position: absolute; left: 0; right: 0; height: 60px; pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(77,201,255,0.55) 50%, rgba(77,201,255,0) 100%);
  box-shadow: 0 0 24px rgba(77,201,255,0.6); z-index: 4;
}
.scan-bar::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
  background: #4dc9ff; box-shadow: 0 0 8px #4dc9ff;
}

.hit-box {
  position: absolute; pointer-events: none;
  border: 1.5px solid #4dc9ff; border-radius: 3px;
  box-shadow: 0 0 8px rgba(77,201,255,0.6), inset 0 0 4px rgba(77,201,255,0.3);
  background: rgba(77,201,255,0.08);
  animation: hit-flash 0.5s ease;
  z-index: 3;
}
.hit-box.done { border-color: #2bd9a8; box-shadow: 0 0 8px rgba(43,217,168,0.5); background: rgba(43,217,168,0.10); }
.hit-box .tag {
  position: absolute; top: -18px; left: 0;
  font-family: "JetBrains Mono", monospace; font-size: 9px;
  padding: 1px 6px; background: #4dc9ff; color: #0f1d3d; border-radius: 3px; white-space: nowrap;
  font-weight: 600;
}
.hit-box.done .tag { background: #2bd9a8; }
@keyframes hit-flash {
  0% { opacity: 0; transform: scale(0.8); }
  60% { opacity: 1; transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}

.ocr-bottom-bar {
  position: absolute; left: 12px; right: 12px; bottom: 12px;
  display: flex; align-items: center; gap: 10px;
  font-family: "JetBrains Mono", monospace; font-size: 11px;
  color: #c5d3ed; z-index: 5;
}
.ocr-bottom-bar .progress-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.10); border-radius: 2px; overflow: hidden; }
.ocr-bottom-bar .progress-fill { height: 100%; background: linear-gradient(90deg, #4dc9ff, #2bd9a8); transition: width 0.06s linear; }
.ocr-bottom-bar .label { color: #4dc9ff; }
.ocr-mini-btn {
  background: rgba(77,201,255,0.1); border: 1px solid rgba(77,201,255,0.3);
  color: #4dc9ff; padding: 4px 10px; border-radius: 4px;
  font-size: 11px; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 4px;
}
.ocr-mini-btn:hover { background: rgba(77,201,255,0.2); }

.ocr-log {
  background: linear-gradient(135deg, #0a1628 0%, #0d1b35 60%, #0a1628 100%);
  border: 1px solid rgba(77,201,255,0.2); border-radius: 10px;
  padding: 14px; font-family: "JetBrains Mono", monospace;
  font-size: 10.5px; color: #c5d3ed; line-height: 1.7;
  display: flex; flex-direction: column; min-height: 280px;
  box-shadow: inset 0 0 60px rgba(77,201,255,0.05);
}
.ocr-log-head { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px dashed rgba(77,201,255,0.2); margin-bottom: 10px; }
.ocr-log-head .h { color: #eaf2ff; font-size: 12px; font-family: "Noto Sans SC", sans-serif; }
.ocr-log-head .sub { color: #6a7da3; font-size: 10px; margin-left: auto; }
.ocr-log-body { flex: 1; overflow-y: auto; max-height: 320px; display: flex; flex-direction: column; }
.ocr-log-body .ll { display: block; animation: log-in 0.25s ease forwards; }
.ocr-log .ts { color: #6a7da3; margin-right: 6px; }
.ocr-log .lv-info { color: #4dc9ff; }
.ocr-log .lv-ok   { color: #2bd9a8; }
</style>

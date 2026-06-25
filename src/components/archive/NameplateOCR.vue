<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { OCR_PRESET } from '@/data/devices'

const emit = defineEmits(['recognized'])

// 状态：idle | loading | done
const phase     = ref('idle')
const previewUrl = ref('')
const result    = ref([])
const fileInput = ref(null)

function triggerUpload() { fileInput.value.click() }

function handleFile(file) {
  if (!file) return
  // 生成预览
  const reader = new FileReader()
  reader.onload = e => { previewUrl.value = e.target.result }
  reader.readAsDataURL(file)
  // 开始 mock loading
  phase.value = 'loading'
  setTimeout(() => {
    result.value = OCR_PRESET.fields.map(f => ({ name: f.label, value: f.value }))
    phase.value = 'done'
  }, 1800)
}

function onFileChange(e) { handleFile(e.target.files[0]) }
function onDrop(e) { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

function useDemo() {
  previewUrl.value = ''
  phase.value = 'loading'
  setTimeout(() => {
    result.value = OCR_PRESET.fields.map(f => ({ name: f.label, value: f.value }))
    phase.value = 'done'
  }, 1800)
}

function reset() {
  phase.value = 'idle'
  previewUrl.value = ''
  result.value = []
}

function importParams() {
  emit('recognized', {
    ...OCR_PRESET,
    params: result.value.map(r => ({ k: r.name, v: r.value, conf: 0.96 })),
  })
  phase.value = 'idle'
  previewUrl.value = ''
  result.value = []
}
</script>

<template>
  <div class="ocr-wrap">

    <!-- ① 空态：小上传区 -->
    <div v-if="phase === 'idle'"
      class="ocr-idle"
      @click="triggerUpload"
      @dragover.prevent
      @drop="onDrop"
    >
      <div class="ocr-idle-icon">
        <AppIcon name="scan" :size="20" stroke="var(--brand)" />
      </div>
      <span class="ocr-idle-text">点击或拖拽上传铭牌照片</span>
      <button class="ocr-demo-btn" @click.stop="useDemo">使用演示数据</button>
      <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
    </div>

    <!-- ② 识别中 -->
    <div v-else-if="phase === 'loading'" class="ocr-loading">
      <img v-if="previewUrl" :src="previewUrl" class="ocr-thumb" />
      <div v-else class="ocr-thumb ocr-thumb-demo">
        <AppIcon name="scan" :size="24" stroke="#8a9bbf" />
      </div>
      <div class="ocr-loading-info">
        <div class="ocr-spinner"></div>
        <span>AI 识别中，请稍候…</span>
      </div>
    </div>

    <!-- ③ 识别完成 -->
    <div v-else-if="phase === 'done'" class="ocr-done">
      <!-- 左：缩略图 -->
      <img v-if="previewUrl" :src="previewUrl" class="ocr-thumb" />
      <div v-else class="ocr-thumb ocr-thumb-demo">
        <AppIcon name="scan" :size="24" stroke="#8a9bbf" />
      </div>

      <!-- 右：识别结果 -->
      <div class="ocr-result">
        <div class="ocr-result-head">
          <AppIcon name="check" :size="14" stroke="var(--ok)" />
          <span>识别完成，共 {{ result.length }} 项参数</span>
          <button class="ocr-reset-btn" @click="reset">重新上传</button>
        </div>
        <div class="ocr-result-list">
          <div v-for="(r, i) in result" :key="i" class="ocr-result-row">
            <span class="r-name">{{ r.name }}</span>
            <span class="r-val mono">{{ r.value }}</span>
          </div>
        </div>
        <div class="ocr-result-actions">
          <span class="ocr-hint">是否将识别到的参数导入设备参数区域？</span>
          <button class="btn primary btn-sm" @click="importParams">导入参数</button>
          <button class="btn ghost btn-sm" @click="reset">忽略</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.ocr-wrap { width: 100%; }

/* 空态 */
.ocr-idle {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border: 1.5px dashed var(--line-strong);
  border-radius: 8px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: #fafbff;
}
.ocr-idle:hover { border-color: var(--brand); background: #f0f6ff; }
.ocr-idle-icon {
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  background: #eaf2ff; display: grid; place-items: center;
}
.ocr-idle-text { font-size: 13px; color: var(--text-2); flex: 1; }
.ocr-demo-btn {
  font-size: 12px; color: var(--brand);
  background: white; border: 1px solid var(--line-strong);
  padding: 5px 12px; border-radius: 6px; cursor: pointer; flex-shrink: 0;
}
.ocr-demo-btn:hover { border-color: var(--brand); background: #f0f6ff; }

/* 缩略图 */
.ocr-thumb {
  width: 80px; height: 60px; object-fit: cover;
  border-radius: 6px; border: 1px solid var(--line); flex-shrink: 0;
}
.ocr-thumb-demo {
  background: #f0f4fa; display: flex; align-items: center; justify-content: center;
}

/* 识别中 */
.ocr-loading {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; border: 1px solid var(--line);
  border-radius: 8px; background: #fafbff;
}
.ocr-loading-info {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--text-2);
}
.ocr-spinner {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2.5px solid var(--line);
  border-top-color: var(--brand);
  animation: spin 0.8s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 识别完成 */
.ocr-done {
  display: flex; gap: 14px;
  border: 1px solid rgba(43,217,168,0.3); border-radius: 8px;
  background: rgba(43,217,168,0.04); padding: 14px;
}
.ocr-result { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.ocr-result-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--ok); font-weight: 500;
}
.ocr-reset-btn {
  margin-left: auto; font-size: 11px; color: var(--text-3);
  background: none; border: none; cursor: pointer; text-decoration: underline;
}
.ocr-reset-btn:hover { color: var(--text-1); }

.ocr-result-list {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 1px; border: 1px solid var(--line); border-radius: 6px; overflow: hidden;
}
.ocr-result-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px; background: #fff; font-size: 12px;
}
.ocr-result-row:nth-child(even) { background: #f8fafd; }
.r-name { color: var(--text-2); flex-shrink: 0; }
.r-val { color: var(--text-0); font-size: 11px; }

.ocr-result-actions {
  display: flex; align-items: center; gap: 10px;
  padding-top: 8px; border-top: 1px dashed var(--line);
}
.ocr-hint { font-size: 12px; color: var(--text-2); flex: 1; }
.btn-sm { padding: 5px 14px; font-size: 12px; }
</style>

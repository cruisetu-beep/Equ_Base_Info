<script setup>
import { ref } from 'vue'
import axios from 'axios'
import AppIcon from '@/components/common/AppIcon.vue'
import { parseTypeK } from '@/data/devices'
import { getAttributeNames } from '@/api/devices'

const emit = defineEmits(['recognized'])

const attributeDict = ref([])
async function loadAttributeDict() {
  try {
    const dict = await getAttributeNames()
    attributeDict.value = dict || []
  } catch (e) {
    console.error('OCR组件获取属性字典异常:', e)
  }
}
loadAttributeDict()

// 状态：idle | loading | done | fail
const phase      = ref('idle')
const previewUrl = ref('')
const result     = ref([])
const fileInput  = ref(null)

// 缓存接口真实返回的数据包
const ocrPackage = ref(null)
const isImporting = ref(false)
const rawDataList = ref([])

function triggerUpload() { fileInput.value.click() }

async function handleFile(file) {
  if (!file) return

  // 1. 本地图片预览
  const reader = new FileReader()
  reader.onload = e => { previewUrl.value = e.target.result }
  reader.readAsDataURL(file)

  // 2. 发起真实 OCR 识别
  phase.value = 'loading'
  result.value = []
  ocrPackage.value = null

  const formData = new FormData()
  formData.append('multipartFile', file)

  try {
    const response = await axios.post('/kouzi/ocrWorkFlow', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    console.log('OCR 识别原始返回:', response.data)

    const rawRes = response.data || {}
    let resData = rawRes.data
    // 如果返回的 data 字段为 JSON 字符串，在此自动解析为对象
    if (typeof resData === 'string') {
      try {
        resData = JSON.parse(resData)
      } catch (parseErr) {
        console.error('反序列化 OCR data 字符串失败:', parseErr)
      }
    }

    if (!resData || typeof resData !== 'object') {
      resData = rawRes
    }

    // 自动深挖最底层的实际参数字典对象 ocrData，支持 data 内部包裹的二次序列化 JSON 字符串
    let ocrData = resData
    if (resData && typeof resData === 'object' && resData.data !== undefined) {
      ocrData = resData.data
    }
    if (typeof ocrData === 'string') {
      try {
        ocrData = JSON.parse(ocrData)
      } catch (e) {
        console.error('反序列化 ocrData 失败:', e)
      }
    }
    if (!ocrData || typeof ocrData !== 'object') {
      ocrData = resData
    }

    // 1. 解析 dataList 并存入缓存以备后用
    let dataList = rawRes.dataList || resData.dataList || ocrData.dataList || []
    if (typeof dataList === 'string') {
      try {
        dataList = JSON.parse(dataList)
      } catch (e) {
        console.error('反序列化 dataList 字符串失败:', e)
        dataList = []
      }
    }
    if (!Array.isArray(dataList)) {
      dataList = []
    }

    rawDataList.value = dataList.map(item => {
      if (!item) return null
      return {
        id: item.id || null,
        k: item.name || item.k || '',
        v: String(item.value || item.v || '')
      }
    }).filter(x => x && x.k)

    if (ocrData && typeof ocrData === 'object') {
      // 2. 识别结果面板渲染数据 result 仅使用 ocrData 里面的字段，排除对象、数组等
      const viewList = []
      Object.entries(ocrData).forEach(([k, v]) => {
        if (k && v !== null && v !== undefined && typeof v !== 'object' && k !== 'dataList') {
          let showKey = k
          if (k === 'model') showKey = '型号'
          else if (k === 'voltage' || k === 'voltageV') showKey = '电源电压(V)'
          else if (k === 'power' || k === 'powerKw') showKey = '额定功率(kW)'
          else if (k === 'code' || k === 'serialNumber') showKey = '出厂编号'
          else if (k === 'date' || k === 'manufactureDate') showKey = '出厂日期'
          else if (k === 'factory' || k === 'manufacturer') showKey = '生产厂家'
          else if (k === 'brand') showKey = '品牌'
          viewList.push({ id: null, name: showKey, value: String(v) })
        }
      })
      result.value = viewList

      // 提取核心属性，用于回填基础信息字段（基于 ocrData）
      const findValue = (keys) => {
        for (const k of keys) {
          if (ocrData && ocrData[k]) return ocrData[k]
        }
        return ''
      }

      const type2 = findValue(['产品名称', '设备名称', 'type2', 'typeName'])
      const type1 = type2 ? parseTypeK(type2) : 'other'
      const model = findValue(['产品型号', '型号', 'model', 'modelName'])
      const manufacturer = findValue(['制造商', '生产厂', '生产商', '制造商名称', 'manufacturer', 'factory'])
      const dateStr = findValue(['制造日期', '出厂日期', '出厂年份', 'date', 'manufactureDate', 'year'])

      let year = 2010
      if (dateStr) {
        const match = String(dateStr).match(/\b(19\d{2}|20\d{2})\b/)
        if (match) {
          year = parseInt(match[1])
        }
      }

      // 封装数据包（暂时把基础信息拼好）
      ocrPackage.value = {
        type1,
        typeK: type1,
        type2,
        model,
        manufacturer,
        year,
        params: [] // 在 importParams 点击导入时，再使用 dataList 拼接
      }

      phase.value = 'done'
    } else {
      phase.value = 'fail'
    }
  } catch (error) {
    console.error('OCR 识别请求异常:', error)
    phase.value = 'fail'
  }
}

function onFileChange(e) { handleFile(e.target.files[0]) }
function onDrop(e) { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

function reset() {
  phase.value = 'idle'
  previewUrl.value = ''
  result.value = []
  ocrPackage.value = null
  rawDataList.value = []
}

async function importParams() {
  if (isImporting.value) return
  if (!ocrPackage.value) {
    reset()
    return
  }

  isImporting.value = true
  try {
    // 1. 拼接 OCR 面板展示的直观 data 键值对，组成描述文本（发给能效判定接口）
    const ocrStr = result.value.map(r => `${r.name}:${r.value}`).join(' ')

    // 2. 调用能效判定接口
    const formData = new FormData()
    formData.append('params', ocrStr)

    const response = await axios.post('/kouzi/aiEnergyJudgmentWorkFlow', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    console.log('能效判定原始返回:', response.data)

    let energyLevel = '-'
    if (response.data && response.data.code === 200) {
      let resData = response.data.data
      if (typeof resData === 'string') {
        try {
          resData = JSON.parse(resData)
        } catch (e) {
          console.error('解析能效判定 data 失败:', e)
        }
      }

      if (resData && typeof resData === 'object' && resData.result !== undefined && resData.result !== null) {
        energyLevel = String(resData.result)
      }
    }

    // 3. 动态从字典表缓存中匹配“能效等级(国标)”的属性 ID 与展示名称，避免任何写死硬编码
    const dictMatched = attributeDict.value.find(item => item.name && item.name.includes('能效等级'))
    const energyAttrId = dictMatched ? dictMatched.id : null
    const energyAttrName = dictMatched ? dictMatched.name : '能效等级(国标)'

    // 构建参数列表：使用 dataList (rawDataList)，并在最下端追加入能效等级
    const finalParams = rawDataList.value.map(p => ({
      id: p.id || null,
      k: p.k,
      v: p.v
    }))

    finalParams.push({
      id: energyAttrId,
      k: energyAttrName,
      v: energyLevel
    })

    ocrPackage.value.params = finalParams

    emit('recognized', ocrPackage.value)
  } catch (error) {
    console.error('能效判定接口调用异常:', error)
    
    const dictMatched = attributeDict.value.find(item => item.name && item.name.includes('能效等级'))
    const energyAttrId = dictMatched ? dictMatched.id : null
    const energyAttrName = dictMatched ? dictMatched.name : '能效等级(国标)'

    // 接口调用失败时也继续导入，但将能效等级设为 '-'
    const finalParams = rawDataList.value.map(p => ({
      id: p.id || null,
      k: p.k,
      v: p.v
    }))

    finalParams.push({
      id: energyAttrId,
      k: energyAttrName,
      v: '-'
    })

    ocrPackage.value.params = finalParams
    emit('recognized', ocrPackage.value)
  } finally {
    isImporting.value = false
    reset()
  }
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

    <!-- ③ 识别失败 -->
    <div v-else-if="phase === 'fail'" class="ocr-fail">
      <img v-if="previewUrl" :src="previewUrl" class="ocr-thumb" />
      <div v-else class="ocr-thumb ocr-thumb-demo">
        <AppIcon name="scan" :size="24" stroke="#8a9bbf" />
      </div>
      <div class="ocr-fail-info">
        <div class="ocr-fail-head">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7.5" stroke="#e0394f"/>
            <path d="M8 4v5M8 11v1" stroke="#e0394f" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <span>识别失败</span>
        </div>
        <div class="fail-reason">无法从图片中提取有效铭牌信息，可能原因：图片模糊、光线不足、铭牌遮挡或格式不支持。</div>
        <div class="fail-actions">
          <button class="btn primary btn-sm" @click="reset">重新上传</button>
          <button class="btn ghost btn-sm" @click="reset">手动录入</button>
        </div>
      </div>
    </div>

    <!-- ④ 识别完成 -->
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
          <button class="btn primary btn-sm" @click="importParams" :disabled="isImporting">
            <span v-if="isImporting">导入中...</span>
            <span v-else>导入参数</span>
          </button>
          <button class="btn ghost btn-sm" @click="reset" :disabled="isImporting">忽略</button>
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

/* 缩略图 */
.ocr-thumb {
  width: 100px; height: auto; max-height: 160px; object-fit: contain;
  border-radius: 6px; border: 1px solid var(--line); flex-shrink: 0;
  background: #f0f4fa;
}
.ocr-thumb-demo {
  width: 100px; height: 80px;
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

/* 识别失败 */
.ocr-fail {
  display: flex; gap: 14px;
  border: 1px solid rgba(224,57,79,0.3); border-radius: 8px;
  background: rgba(224,57,79,0.04); padding: 14px;
}
.ocr-fail-info { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.ocr-fail-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #e0394f; font-weight: 600;
}
.fail-reason {
  font-size: 12px; color: var(--text-2); line-height: 1.6;
}
.fail-actions { display: flex; gap: 8px; }

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
  display: flex; align-items: baseline; gap: 10px;
  padding: 10px 14px; background: #fff; font-size: 12px;
  line-height: 1.5;
}
.ocr-result-row:nth-child(even) { background: #f8fafd; }
.r-name { color: var(--text-2); flex-shrink: 0; font-size: 12px; line-height: 1.5; white-space: nowrap; }
.r-val { color: var(--text-0); font-size: 12px; line-height: 1.5; word-break: break-all; }

.ocr-result-actions {
  display: flex; align-items: center; gap: 10px;
  padding-top: 8px; border-top: 1px dashed var(--line);
}
.ocr-hint { font-size: 12px; color: var(--text-2); flex: 1; }
.btn-sm { padding: 5px 14px; font-size: 12px; }
</style>

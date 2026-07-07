<script setup>
// ── components/archive/WizardStepDocs.vue ─────────────────────────
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import axios from 'axios'
import AppIcon from '@/components/common/AppIcon.vue'
import { tsNow } from '@/utils/logHelpers'

const props = defineProps({
  data: { type: Object, required: true },
  stages: {
    type: Array,
    default: () => [
      { n: '上传',      k: 1 },
      { n: '解析成功',  k: 2 },
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

const activeCat = ref('device')
const docs      = ref({ ...(props.data.docs || {}) })

// 初始化时自动将已存在的历史文件及解析结果回填至流日志控制台，防止切步骤时历史丢失
const initLogs = [{ ts: tsNow(), lv: 'info', msg: '文档解析引擎就绪 · 等待文档输入…' }]
const existingDocs = Object.values(docs.value).flat()
if (existingDocs.length > 0) {
  existingDocs.forEach(d => {
    if (d.stage >= 2) {
      initLogs.push({
        ts: tsNow(),
        lv: 'info',
        msg: `历史文件 "${d.name}" 导入检测完成。`,
        docId: d.id
      })
      initLogs.push({
        ts: tsNow(),
        lv: 'ok',
        msg: `解析成功！成功提取文件格式与关键数据项。${d.extractedText || ''}`,
        docId: d.id
      })
    }
  })
}

const logs = ref(initLogs)

const allDocs       = computed(() => Object.values(docs.value).flat())
const stageMax      = computed(() => Math.max(0, ...allDocs.value.map(d => d.stage)))

// 同步到父层
watch(docs, (val) => {
  emit('update:data', { ...props.data, docs: val })
}, { deep: true })

const logConsoleRef = ref(null)

function scrollToBottom(smooth = true) {
  nextTick(() => {
    if (logConsoleRef.value) {
      logConsoleRef.value.scrollTo({
        top: logConsoleRef.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  })
}

// 侦听日志追加，自动滚动至底端
watch(logs, () => {
  scrollToBottom(true)
}, { deep: true })

onMounted(() => {
  scrollToBottom(false)
})

async function addDocs(catK, files) {
  const newItems = files.map((f, i) => ({
    id: `${catK}-${Date.now()}-${i}`,
    name: f.name,
    size: f.size,
    stage: 1, // 刚上传初始化为阶段 1 (上传/解析中)
    rawFile: f.rawFile || null,
    url: f.url || ''
  }))
  
  // 挂载显示
  docs.value = { ...docs.value, [catK]: [...(docs.value[catK] || []), ...newItems] }
  
  // 在循环外统一只打印一次接收日志，包含本次添加的文件总数！
  logs.value = [...logs.value, { 
    ts: tsNow(), 
    lv: 'info', 
    msg: `接收到 ${newItems.length} 份文件，开始导入处理…` 
  }].slice(-30)
  
  // 逐个文件调用后端真实 API 解析
  for (const item of newItems) {
    if (!item.rawFile) continue
    
    const isImg = item.rawFile.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)
    
    const formData = new FormData()
    formData.append('multipartFile', item.rawFile)
    formData.append('isImg', isImg)
    
    try {
      // 请求真实接口
      const response = await axios.post('/kouzi/ocrFileWorkFlow', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // 1. 解析提取后端返回的具体字段并进行深度递归反序列化
      let parsedData = null
      const resData = response.data
      if (resData && resData.data) {
        let temp = resData.data
        for (let i = 0; i < 5; i++) {
          if (typeof temp === 'string') {
            try {
              const val = JSON.parse(temp)
              if (val === temp) break
              temp = val
            } catch (e) {
              break
            }
          } else {
            break
          }
        }
        parsedData = temp
      }
      
      let dataStr = ''
      if (parsedData) {
        if (typeof parsedData === 'object') {
          const pairs = Object.entries(parsedData).map(([k, v]) => `${k}: ${v}`)
          if (pairs.length > 0) {
            dataStr = ` (${pairs.join(', ')})`
          }
        } else if (typeof parsedData === 'string' && parsedData.trim().length > 0) {
          dataStr = ` (${parsedData})`
        }
      }
      
      // 2. 更新解析状态为成功 2，并妥善持久化已提取数据到 doc 节点上以便切步骤时回填
      const next = {}
      for (const [k, arr] of Object.entries(docs.value)) {
        next[k] = arr.map(d => {
          if (d.id === item.id) {
            return { ...d, stage: 2, extractedText: dataStr }
          }
          return d
        })
      }
      docs.value = next
      
      // 3. 打印对应文件的解析成功日志，带上文件名，便于用户区分，并绑定 docId
      logs.value = [...logs.value, { 
        ts: tsNow(), 
        lv: 'ok', 
        msg: `解析文件 "${item.name}" 成功！成功提取文件格式与关键数据项。${dataStr}`,
        docId: item.id
      }].slice(-30)
      
    } catch (err) {
      console.error('接口上传解析失败:', err)
      
      // 解析失败时也推进状态防止流程阻断，但在日志里警示
      const next = {}
      for (const [k, arr] of Object.entries(docs.value)) {
        next[k] = arr.map(d => {
          if (d.id === item.id) {
            return { ...d, stage: 2, error: true }
          }
          return d
        })
      }
      docs.value = next
      
      logs.value = [...logs.value, { 
        ts: tsNow(), 
        lv: 'warn', 
        msg: `文件 "${item.name}" 导入解析失败：${err.message || '网络或服务端异常'}`,
        docId: item.id
      }].slice(-30)
    }
  }
}

function previewFile(doc) {
  let url = doc.url
  // 容错：若 blob url 丢失或由于生命周期被销毁，自动利用内存中缓存在 rawFile 的真实 File 对象再行建立
  if (!url && doc.rawFile) {
    url = URL.createObjectURL(doc.rawFile)
  }
  
  if (url) {
    window.open(url, '_blank')
  } else {
    alert('暂无可用的预览链接，请于建档确认后下载查看。')
  }
}

function removeDoc(doc) {
  const catK = activeCat.value
  docs.value[catK] = (docs.value[catK] || []).filter(d => d.id !== doc.id)
  
  // 精确联动删除：只清除与当前被删文件唯一 id (docId) 强绑定的控制台日志，完美解决同名文件多次上传的精确过滤与回填问题
  logs.value = logs.value.filter(l => l.docId !== doc.id)
}

const fileInputRef = ref(null)

function triggerFileSelect() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function onFileSelected(e) {
  const rawFiles = Array.from(e.target.files || [])
  if (rawFiles.length === 0) {
    e.target.value = ''
    return
  }
  
  const validFiles = []
  const cat = activeCat.value
  
  for (const f of rawFiles) {
    // 1. 大小校验：最大 50MB
    const limitBytes = 50 * 1024 * 1024
    if (f.size > limitBytes) {
      const sizeMb = (f.size / (1024 * 1024)).toFixed(1)
      const errorMsg = `文件 "${f.name}" 大小（${sizeMb}MB）超过了 50MB 的限制！`
      alert(errorMsg)
      
      logs.value = [...logs.value, {
        ts: tsNow(),
        lv: 'warn',
        msg: `上传拦截：${errorMsg}`
      }].slice(-30)
      continue
    }
    
    // 2. 格式校验
    const isImage = f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)
    const isPdf   = f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    const isWord  = f.type.includes('word') || f.type.includes('officedocument') || /\.(doc|docx)$/i.test(f.name)
    
    if (['device', 'site'].includes(cat)) {
      // 照片类分类：仅支持图片
      if (!isImage) {
        const errorMsg = `该分类仅支持上传图片格式（JPG/PNG/WEBP等）！`
        alert(`文件 "${f.name}" 上传失败：${errorMsg}`)
        
        logs.value = [...logs.value, {
          ts: tsNow(),
          lv: 'warn',
          msg: `上传拦截：[${f.name}] ${errorMsg}`
        }].slice(-30)
        continue
      }
    } else {
      // 档案、记录类分类：支持 PDF, Word, 图片
      if (!isImage && !isPdf && !isWord) {
        const errorMsg = `格式不支持，该分类仅支持 PDF、Word 及图片文件！`
        alert(`文件 "${f.name}" 上传失败：${errorMsg}`)
        
        logs.value = [...logs.value, {
          ts: tsNow(),
          lv: 'warn',
          msg: `上传拦截：[${f.name}] ${errorMsg}`
        }].slice(-30)
        continue
      }
    }
    
    // 校验通过：组装预览地址及文件包裹 (为图片、PDF、Word 均生成本地 blob URL 链接，以便新标签页原生展示或直接下载)
    let previewUrl = ''
    if (isImage || isPdf || isWord) {
      previewUrl = URL.createObjectURL(f)
    }
    validFiles.push({
      name: f.name,
      size: Math.round(f.size / 1024),
      rawFile: f,
      url: previewUrl
    })
  }
  
  if (validFiles.length > 0) {
    addDocs(cat, validFiles)
  }
  e.target.value = ''
}

const activeCatInfo = computed(() => DOC_CATEGORIES.find(c => c.k === activeCat.value))
const activeList    = computed(() => docs.value[activeCat.value] || [])

const acceptTypes = computed(() => {
  if (['device', 'site'].includes(activeCat.value)) {
    return 'image/*'
  }
  return 'image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
})
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
              ? `${(docs[c.k] || []).filter(d => d.stage >= 2).length}/${(docs[c.k] || []).length} 已解析`
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
        <span class="badge">{{ activeList.filter(d => d.stage >= 2).length }} / {{ activeList.length }} 已解析</span>
      </div>

      <div class="uploader" @click="triggerFileSelect">
        <input ref="fileInputRef" type="file" multiple style="display: none;" :accept="acceptTypes" @change="onFileSelected" />
        <div class="icn"><AppIcon name="upload" :size="26" /></div>
        <div class="h">点击上传或拖拽 {{ activeCatInfo.n }}</div>
        <div class="s">{{ ['device','site'].includes(activeCat) ? '支持 JPG / PNG，可多张' : '支持 PDF / Word / 图片，单文件 ≤ 50MB' }}</div>
      </div>

      <!-- 照片网格 -->
      <div v-if="['device','site'].includes(activeCat)" class="photo-grid">
        <div v-if="activeList.length === 0"
             style="grid-column:1/-1;color:var(--text-3);text-align:center;padding:30px 0;font-size:12px">
          暂无照片
        </div>
        <div v-else v-for="d in activeList" :key="d.id"
             :class="['photo-cell', d.stage > 0 && d.stage < 2 && 'scan-anim']"
             @click="previewFile(d)">
          <img v-if="d.url" :src="d.url" class="photo-img" />
          <AppIcon v-else name="eye" :size="20" stroke="rgba(255,255,255,0.4)" />
          <span class="label">{{ d.name }}</span>
          <span v-if="d.stage >= 2" class="done-tag">已解析</span>
          <!-- 悬浮小眼睛预览遮罩 -->
          <div class="photo-preview-overlay">
            <AppIcon name="eye" :size="16" stroke="white" stroke-width="2.5" />
          </div>
          <!-- 右上角红x删除按钮 -->
          <button class="photo-delete-btn" title="删除照片" @click.stop="removeDoc(d)">
            ×
          </button>
        </div>
      </div>

      <!-- 文档列表 -->
      <div v-else class="doc-list">
        <div v-if="activeList.length === 0"
             style="color:var(--text-3);text-align:center;padding:30px 0;font-size:12px">
          暂无文档
        </div>
        <template v-else v-for="d in activeList" :key="d.id">
          <div :class="['doc-row', d.stage >= 2 && 'done']">
            <div class="icn"><AppIcon name="doc" :size="14" /></div>
            <div class="info">
              <div class="n">{{ d.name }}</div>
              <div class="meta">{{ d.size }}KB</div>
            </div>
            <button class="preview-btn" title="预览文件" @click.stop="previewFile(d)">
              <AppIcon name="eye" :size="14" stroke="var(--brand)" />
            </button>
            <button class="doc-delete-btn" title="删除文件" @click.stop="removeDoc(d)">
              ×
            </button>
            <span class="stage-tag">{{ d.stage >= 2 ? '已就绪' : '解析中' }}</span>
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
            <template v-if="s.k === 1 && allDocs.length > 0">
              <span class="stat-normal">{{ allDocs.length }} 份</span>
            </template>
            <template v-if="s.k === 2 && allDocs.filter(d => d.stage >= 2).length > 0">
              <span class="stat-success">{{ allDocs.filter(d => d.stage >= 2).length }} 份</span>
            </template>
          </div>
        </div>
      </div>

      <div class="parse-log-2" ref="logConsoleRef">
        <span v-for="(l, i) in logs" :key="i" class="line">
          <span class="ts">{{ l.ts }}</span>
          <span :class="`lv-${l.lv}`">[{{ l.lv.toUpperCase() }}]</span>
          <span>{{ l.msg }}</span>
        </span>
      </div>

      <div class="doc-stats-2" style="grid-template-columns: 1fr;">
        <div class="doc-stat-2"><div class="v">{{ allDocs.length }}</div><div class="l">文档</div></div>
      </div>
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
  border: 1px dashed var(--line-strong); border-radius: 8px;
  padding: 10px 14px; text-align: center; cursor: pointer;
  background: linear-gradient(180deg, #f8faff, #f3f6fb);
  transition: all 0.15s; margin-bottom: 12px;
}
.uploader:hover { border-color: var(--brand); background: linear-gradient(180deg, #eaf2ff, #f5f9ff); }
.uploader .h { font-size: 12px; color: var(--text-1); }
.uploader .s { font-size: 10px; color: var(--text-3); margin-top: 2px; }
.uploader .icn { color: var(--brand); margin-bottom: 2px; display:flex; justify-content:center; }

.doc-list { display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; max-height: 360px; }
.doc-row {
  padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: #f8faff; display: flex; align-items: center; gap: 10px; font-size: 12px;
}
.doc-row .icn { width: 28px; height: 28px; border-radius: 6px; background: white; border: 1px solid var(--line); display:grid; place-items:center; color: var(--text-2); flex-shrink:0; }
.doc-row .info { flex: 1; min-width: 0; }
.doc-row .n { font-size: 12px; color: var(--text-0); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.doc-row .meta { font-size: 10.5px; color: var(--text-2); margin-top:2px; font-family: "JetBrains Mono", monospace; }
.preview-btn {
  display: grid; place-items: center; width: 28px; height: 28px;
  border: 1px solid var(--line); border-radius: 6px;
  background: white; cursor: pointer; flex-shrink: 0;
  opacity: 0; transition: opacity 0.15s;
}
.doc-row:hover .preview-btn { opacity: 1; }
.preview-btn:hover { border-color: var(--brand); background: #f0f6ff; }

.photo-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.photo-cell {
  aspect-ratio: 4/3; border-radius: 8px; overflow:hidden;
  border: 1px solid var(--line);
  background: linear-gradient(135deg, #2a3855, #4a5780);
  position: relative; display: flex; align-items: center; justify-content: center;
  color: white; font-size: 11px;
  cursor: pointer;
}
.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}
.photo-cell::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 60%); z-index: 1; }
.photo-cell .label { position: absolute; bottom: 4px; left: 4px; right: 4px; font-size: 9px; opacity: 0.85; z-index: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,0.6); }
.photo-cell .done-tag { position:absolute; top:4px; left:4px; padding:1px 4px; border-radius:3px; background:rgba(43,217,168,0.85); font-size:9px; color:white; z-index: 2; }
.photo-delete-btn {
  position: absolute; top: 4px; right: 4px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #ff4d4f;
  border: none; display: flex; align-items: center; justify-content: center;
  cursor: pointer; opacity: 0; transition: opacity 0.15s, background-color 0.15s, transform 0.15s;
  z-index: 3;
  color: white;
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
  padding: 0 0 1px 0;
  text-align: center;
}
.photo-cell:hover .photo-delete-btn { opacity: 1; }
.photo-delete-btn:hover { background: #ff7875; transform: scale(1.1); }

.photo-preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}
.photo-cell:hover .photo-preview-overlay {
  opacity: 1;
}

.doc-delete-btn {
  display: grid; place-items: center; width: 28px; height: 28px;
  border: 1px solid var(--line); border-radius: 6px;
  background: white; cursor: pointer; flex-shrink: 0;
  opacity: 0; transition: opacity 0.15s, border-color 0.15s;
  color: var(--danger);
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
}
.doc-row:hover .doc-delete-btn { opacity: 1; }
.doc-delete-btn:hover { border-color: var(--danger); background: rgba(220, 53, 69, 0.05); }

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
.pipe-step .stat { font-size: 10px; color: var(--text-3); font-family: "JetBrains Mono", monospace; }
.stat-normal { color: var(--text-3); }
.stat-success { color: var(--ok); font-weight: 500; }

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

.doc-stats-2 { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 12px; }
.doc-stat-2 { padding: 10px; background: #f5f9ff; border: 1px solid var(--line); border-radius: 8px; text-align: center; }
.doc-stat-2 .v { font-size: 18px; color: var(--brand); font-family: "Orbitron", sans-serif; font-weight: 600; }
.doc-stat-2 .l { font-size: 10px; color: var(--text-2); margin-top: 2px; }
.photo-cell.scan-anim::after {
  content:""; position:absolute; left:0; right:0; top:0; height: 30%;
  background: linear-gradient(180deg, transparent, rgba(77,201,255,0.35) 70%, rgba(77,201,255,0));
  animation: photo-scan 2s ease-in-out infinite;
}
@keyframes photo-scan { 0% { top: -30%; } 100% { top: 100%; } }
.doc-row .stage-tag { font-size: 10px; font-family: "JetBrains Mono", monospace; padding: 2px 7px; border-radius: 3px; background: rgba(43,217,168,0.10); color: var(--ok); border: 1px solid rgba(43,217,168,0.22); }
</style>

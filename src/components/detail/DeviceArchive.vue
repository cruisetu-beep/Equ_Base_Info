<script setup>
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { BASE_URL } from '@/api/config'

const props = defineProps({
  device: { type: Object, required: true },
})

const seed = computed(() =>
  props.device.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
)

const getExt = name => name.split('.').pop().toLowerCase()

// 预览大图灯箱相关的状态
const showPreviewModal = ref(false)
const previewImgUrl = ref('')
const previewImgName = ref('')
const previewImgId = ref('')
const previewImgDownloadUrl = ref('')
const imgLoading = ref(false)

const docs = computed(() => {
  if (props.device.files && props.device.files.length > 0) {
    return props.device.files.map(f => {
      const type = f.fileType || f.FileType
      return {
        id: f.fileId || f.FileId,
        name: f.fileName || f.FileName,
        path: f.filePath || f.FilePath,
        ext: (type || getExt(f.fileName || f.FileName) || '').toUpperCase()
      }
    })
  }
  return []
})

// 图片轮播与导航
const imageDocs = computed(() => {
  return docs.value.filter(d => ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(d.ext))
})

const currentImgIndex = computed(() => {
  return imageDocs.value.findIndex(d => d.id === previewImgId.value)
})

const hasPrev = computed(() => currentImgIndex.value > 0)
const hasNext = computed(() => currentImgIndex.value >= 0 && currentImgIndex.value < imageDocs.value.length - 1)

const handlePrevImage = () => {
  if (hasPrev.value) {
    const prevDoc = imageDocs.value[currentImgIndex.value - 1]
    setPreviewImage(prevDoc)
  }
}

const handleNextImage = () => {
  if (hasNext.value) {
    const nextDoc = imageDocs.value[currentImgIndex.value + 1]
    setPreviewImage(nextDoc)
  }
}

const setPreviewImage = (d) => {
  previewImgName.value = d.name
  previewImgId.value = d.id
  if (d.id) {
    imgLoading.value = true
    const url = `${BASE_URL}/Equipment/getFile?fileId=${d.id}`
    previewImgUrl.value = url
    previewImgDownloadUrl.value = url
  } else {
    previewImgUrl.value = ''
    previewImgDownloadUrl.value = ''
    imgLoading.value = false
  }
}

const handlePreview = (f) => {
  if (f.id) {
    const url = `${BASE_URL}/Equipment/getFile?fileId=${f.id}`
    if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(f.ext)) {
      setPreviewImage(f)
      showPreviewModal.value = true
    } else {
      // 其它格式文件直接在新标签页中打开（例如 PDF 等）
      window.open(url, '_blank')
    }
  }
}

const triggerDownload = async (url, filename) => {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Network response was not ok')
    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error('下载失败，尝试新窗口打开:', error)
    window.open(url, '_blank')
  }
}

const handleDownload = (f) => {
  if (f.id) {
    const url = `${BASE_URL}/Equipment/getFile?fileId=${f.id}`
    triggerDownload(url, f.name)
  }
}
</script>

<template>
  <div class="da-wrap">
    <div class="eb-block-title">
      <AppIcon name="database" :size="13" stroke="var(--brand)" />
      设备档案
      <span class="da-count">{{ docs.length }}</span>
    </div>

    <div class="da-grid">
      <div v-for="f in docs" :key="f.id" class="da-item" :title="f.name" @click="handlePreview(f)">
        <div class="da-icon">
          <AppIcon name="doc" :size="26" stroke="var(--brand)" />
          <span class="da-ext">{{ f.ext }}</span>
        </div>
        <div class="da-name">{{ f.name }}</div>
        <button class="da-dl" title="下载" @click.stop="handleDownload(f)">
          <AppIcon name="download" :size="12" stroke="var(--brand)" />
        </button>
      </div>
    </div>

    <!-- 磨砂质感图片预览大图弹窗 -->
    <Transition name="fade">
      <div v-if="showPreviewModal" class="da-lightbox" @click="showPreviewModal = false">
        <div class="da-lightbox-close" @click.stop="showPreviewModal = false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
        
        <div class="da-lightbox-content" @click.stop>
          <!-- 上一张按钮 -->
          <button v-if="hasPrev" class="da-lightbox-btn prev" @click="handlePrevImage" title="上一张">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          
          <div class="da-lightbox-main">
            <div class="da-lightbox-img-wrap">
              <!-- 骨架屏 / Loading 旋转指示器（内嵌静止文档图标） -->
              <div v-if="imgLoading" class="da-lightbox-loading">
                <div style="position:relative; width:36px; height:36px; display:grid; place-items:center">
                  <div class="ocr-spinner" style="width:36px; height:36px; border-width:3px; border-top-color:#fff; position:absolute"></div>
                  <AppIcon name="doc" :size="13" stroke="rgba(255,255,255,0.9)" style="position:absolute" />
                </div>
                <div style="margin-top:12px; color:rgba(255,255,255,0.85); font-size:12.5px; font-weight:500">正在加载...</div>
              </div>
              <img 
                v-if="previewImgUrl" 
                :src="previewImgUrl" 
                :alt="previewImgName" 
                class="da-lightbox-img" 
                :style="{ opacity: imgLoading ? 0 : 1 }"
                @load="imgLoading = false" 
                @error="imgLoading = false" 
              />
              <div v-else class="da-lightbox-noimg">暂无可用预览图片</div>
            </div>
            
            <div class="da-lightbox-meta">
              <span class="da-lightbox-title" :title="previewImgName" style="display:flex; align-items:center; gap:6px; min-width:0; flex:1">
                <AppIcon name="doc" :size="13" stroke="rgba(255,255,255,0.85)" />
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">{{ previewImgName }}</span>
              </span>
              <button v-if="previewImgDownloadUrl" class="da-lightbox-dl-btn" title="下载此图片" @click.stop="handleDownload({ id: previewImgId, name: previewImgName })">
                <AppIcon name="download" :size="12" stroke="#fff" /> 下载
              </button>
            </div>
          </div>
          
          <!-- 下一张按钮 -->
          <button v-if="hasNext" class="da-lightbox-btn next" @click="handleNextImage" title="下一张">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.da-wrap {
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
  margin-bottom: 12px; position: relative;
}

.eb-block-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; color: var(--text-2);
  letter-spacing: 0.05em; text-transform: uppercase;
  padding: 7px 14px; background: #f6f9ff;
  border-bottom: 1px solid var(--line);
}
.da-count { margin-left: auto; font-size: 10px; color: var(--text-3); font-family: "JetBrains Mono", monospace; }

.da-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px; padding: 12px; background: #fff;
}

.da-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 5px; padding: 10px 6px 8px; border-radius: 8px;
  border: 1px solid var(--line); background: #fafbff;
  cursor: pointer; position: relative; min-width: 0;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.da-item:hover { border-color: var(--brand); box-shadow: 0 2px 10px rgba(47,127,255,0.1); }

.da-icon {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 40px; height: 44px; flex-shrink: 0;
}
.da-ext {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  font-size: 7px; font-weight: 700; color: #fff; letter-spacing: 0.03em;
  background: var(--brand); padding: 1px 4px; border-radius: 3px; white-space: nowrap;
}

.da-name {
  font-size: 10px; color: var(--text-1); text-align: center;
  width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.da-dl {
  position: absolute; top: 5px; right: 5px;
  width: 18px; height: 18px; border-radius: 4px;
  background: rgba(255, 255, 255, 0.9); border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  padding: 0; margin: 0; outline: none; cursor: pointer; opacity: 0.6;
  transition: all 0.15s;
}
.da-item:hover .da-dl { opacity: 1; background: white; border-color: var(--brand); }
.da-dl:hover { border-color: var(--brand); background: var(--brand-light); color: var(--brand); }

/* 图片预览灯箱效果 */
.da-lightbox {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px); z-index: 9999;
  display: grid; place-items: center;
  transition: opacity 0.25s ease;
}
.da-lightbox-close {
  position: absolute; top: 20px; right: 20px;
  width: 36px; height: 36px; border-radius: 50%;
  background: transparent; border: none;
  display: grid; place-items: center; cursor: pointer; color: rgba(255, 255, 255, 0.75);
  transition: all 0.2s;
}
.da-lightbox-close:hover { color: #fff; transform: rotate(90deg); }

.da-lightbox-content {
  display: flex; align-items: center; justify-content: center;
  gap: 20px; max-width: 90%; max-height: 90%; position: relative;
}

.da-lightbox-main {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}

.da-lightbox-img-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  min-width: 480px;
  max-width: 80vw;
  max-height: 70vh;
}

.da-lightbox-img {
  max-width: 80vw; max-height: 70vh; border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  object-fit: contain; background: #1a2233;
  border: 1px solid rgba(255,255,255,0.05);
  transition: opacity 0.2s ease;
}
.da-lightbox-noimg {
  width: 300px; height: 200px; border-radius: 8px;
  display: grid; place-items: center; color: var(--text-3);
  background: #1a2233; font-size: 13px;
}

.da-lightbox-meta {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; color: white; font-size: 12px;
  background: rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
}
.da-lightbox-title {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;
}
.da-lightbox-dl-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: var(--brand); color: white; text-decoration: none;
  padding: 4px 12px; border-radius: 12px; font-size: 11px;
  border: none; outline: none; box-shadow: none; cursor: pointer;
  transition: all 0.2s; font-weight: 500;
}
.da-lightbox-dl-btn:hover { background: var(--brand-2); transform: translateY(-1px); }

.da-lightbox-btn {
  width: 44px; height: 44px; border-radius: 50%;
  background: transparent; border: none;
  display: grid; place-items: center; cursor: pointer; color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s;
}
.da-lightbox-btn:hover { color: #fff; transform: scale(1.15); }

/* Fade 动画 */
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }

.da-lightbox-loading {
  position: absolute;
  top: calc(50% - 20px);
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.ocr-spinner {
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #ffffff;
  animation: spin-arch 0.8s linear infinite;
  box-sizing: border-box;
}
@keyframes spin-arch {
  to { transform: rotate(360deg); }
}
</style>

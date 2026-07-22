<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  tag: { type: Object, default: null } // 判定结果明细数据
})
const emit = defineEmits(['close'])

const showRawJson = ref(false)

const formattedJson = computed(() => {
  if (!props.tag) return ''
  return JSON.stringify(props.tag, null, 2)
})

// 扁平化数据源 (将基本属性与命中规则对象等所有字段合并到一个扁平的对象中)
const flatFormFields = computed(() => {
  if (!props.tag) return {}
  const result = {}
  
  // 1. 顶层非对象非数组属性
  for (const [key, val] of Object.entries(props.tag)) {
    if (typeof val !== 'object' || val === null) {
      result[key] = val
    }
  }
  
  // 2. 嵌套对象属性，铺平其内部子键值对 (如：命中规则中的子项)
  for (const [key, val] of Object.entries(props.tag)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      for (const [subKey, subVal] of Object.entries(val)) {
        result[subKey] = subVal
      }
    }
  }
  
  // 3. 数组属性 (如：已排查的相似规则, 缺失字段)
  for (const [key, val] of Object.entries(props.tag)) {
    if (Array.isArray(val)) {
      result[key] = val
    }
  }
  
  return result
})
</script>

<template>
  <Teleport to="body">
    <div v-if="props.tag" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-panel">
        <!-- 头部 -->
        <div class="modal-head">
          <div class="modal-head-left">
            <AppIcon name="rule" :size="16" stroke="var(--brand)" />
            <span class="modal-title">AI 智能判定明细</span>
          </div>
          <button class="modal-close" @click="emit('close')">
            <AppIcon name="close" :size="14" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="modal-body">
          <!-- 统一的大表单区域，展示不全支持换行与滚动 -->
          <div class="section main-form-section">
            <div class="fields main-fields-container">
              <div 
                v-for="(val, key) in flatFormFields" 
                :key="key" 
                class="field"
              >
                <span class="l">{{ key }}</span>
                
                <!-- 情况 A：如果是数组 -->
                <template v-if="Array.isArray(val)">
                  <!-- 情况 A1：基本类型数组 (如：缺失字段) -->
                  <div v-if="val.length > 0 && typeof val[0] !== 'object'" class="tag-list-inner">
                    <span v-for="item in val" :key="item" class="tag-item-inner">{{ item }}</span>
                  </div>
                  
                  <!-- 情况 A2：对象数组 (如：已排查的相似规则) -->
                  <div v-else-if="val.length > 0 && typeof val[0] === 'object'" class="similar-list-inner">
                    <div v-for="(item, idx) in val" :key="idx" class="similar-row">
                      <span class="s-idx">规则 #{{ idx + 1 }}</span>
                      <div class="s-kv-grid">
                        <span v-for="(subVal, subKey) in item" :key="subKey" class="s-kv">
                          <span class="sk">{{ subKey }}:</span>
                          <span class="sv">{{ subVal || '—' }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <span v-else class="v">—</span>
                </template>
                
                <!-- 情况 B：常规字段 (普通字体与普通样式) -->
                <template v-else>
                  <span class="v">
                    {{ val === null || val === '' ? '—' : val }}
                  </span>
                </template>
              </div>
            </div>
          </div>

          <!-- 原始 JSON 数据 -->
          <div class="section raw-json-section">
            <div class="section-title toggle-header" @click="showRawJson = !showRawJson">
              <span>原始判定数据 (JSON)</span>
              <span class="toggle-btn">{{ showRawJson ? '收起' : '展开' }}</span>
            </div>
            <pre v-if="showRawJson" class="raw-json">{{ formattedJson }}</pre>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(10,20,40,0.45); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 40px;
}

.modal-panel {
  background: #fff; border-radius: 14px; overflow: hidden;
  width: 100%; max-width: 620px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; max-height: 85vh;
}

.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--line);
  background: #f8faff; flex-shrink: 0;
}
.modal-head-left { display: flex; align-items: center; gap: 8px; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-0); }
.modal-close {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--line);
  background: white; cursor: pointer; display: grid; place-items: center;
  color: var(--text-2); transition: all 0.15s;
}
.modal-close:hover { border-color: #e0394f; color: #e0394f; }

.modal-body { overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }

/* 表单外层容器限制高度并支持纵向滚动 */
.main-form-section {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow-y: auto;
  max-height: 420px;
  background: #fff;
}
.main-form-section::-webkit-scrollbar {
  width: 6px;
}
.main-form-section::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

/* 表单网格 - 统一为 100% 宽度，消除“只有一半”的不饱满排版 */
.fields {
  display: flex;
  flex-direction: column;
  background: #fff;
}
.field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  box-sizing: border-box;
  background: #fff;
}
.field:last-child {
  border-bottom: none;
}

.field .l { font-size: 10px; color: var(--text-3); margin-bottom: 2px; }
.field .v { font-size: 12px; color: var(--text-0); line-height: 1.5; word-break: break-all; white-space: pre-wrap; }

/* 嵌套数组 - 缺失字段 */
.tag-list-inner { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.tag-item-inner { font-size: 11px; padding: 2px 8px; border-radius: 4px; border: 1px solid var(--line); background: #fafbff; color: var(--text-1); }

/* 嵌套数组 - 相似规则 */
.similar-list-inner { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 2px; }
.similar-row {
  display: flex; gap: 10px; padding: 8px; background: #fafbff; border: 1px solid var(--line); border-radius: 6px;
}
.s-idx {
  font-family: "JetBrains Mono", monospace; font-size: 10px; font-weight: 700;
  background: var(--brand); color: #fff; padding: 1px 6px; border-radius: 4px; align-self: flex-start;
}
.s-kv-grid { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.s-kv { font-size: 11px; color: var(--text-1); line-height: 1.4; word-break: break-all; }
.s-kv .sk { font-weight: 600; margin-right: 4px; }

/* 原始 JSON 区 */
.raw-json-section { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.toggle-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; padding: 8px 12px; background: #f6f9ff; font-size: 11px; font-weight: 600; color: var(--text-2); }
.toggle-header:hover { background: #f0f4ff; }
.toggle-btn { color: var(--brand); font-size: 10px; }
.raw-json {
  margin: 0; padding: 12px; font-family: "JetBrains Mono", monospace; font-size: 11px;
  background: #282c34; color: #abb2bf; overflow-x: auto; max-height: 200px; border-top: 1px solid var(--line);
}
</style>

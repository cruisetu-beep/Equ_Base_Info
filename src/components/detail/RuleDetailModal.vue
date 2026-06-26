<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  rule: { type: Object, default: null }, // 前端 Mock 或 后端 RuleDto 格式
})
const emit = defineEmits(['close'])

// 批次 → 目录标题 / 发布单位 / 生效时间
const BATCH_META = {
  '第一批': { title: '高耗能落后机电设备（产品）淘汰目录（第一批）', authority: '工业和信息化部', effectiveDate: '2009-12-31' },
  '第二批': { title: '高耗能落后机电设备（产品）淘汰目录（第二批）', authority: '工业和信息化部', effectiveDate: '2012-06-29' },
  '第三批': { title: '高耗能落后机电设备（产品）淘汰目录（第三批）', authority: '工业和信息化部', effectiveDate: '2014-03-27' },
  '第四批': { title: '高耗能落后机电设备（产品）淘汰目录（第四批）', authority: '工业和信息化部', effectiveDate: '2016-04-18' },
}

const normalizedRule = computed(() => {
  const r = props.rule
  if (!r) return null

  // 1. 获取规则ID
  const ruleId = r.ruleId || r.RuleID || r.ruleID || ''

  // 2. 获取批次名称
  const batch = r.batch || r.Catalog || ''

  // 3. 获取淘汰类型并进行标准化清洗 (兼容接口转换后的 typeE 字段)
  let actionType = r.actionType || r.typeE || r.EliminationType || ''
  if (actionType.includes('限期')) {
    actionType = '限期'
  } else if (actionType.includes('强制') || actionType.includes('立即') || actionType === '淘汰') {
    actionType = '强制'
  } else if (actionType.includes('鼓励') || actionType.includes('建议')) {
    actionType = '鼓励'
  }

  // 4. 获取产品名称
  const product = r.product || r.ProductName || ''

  // 5. 设备一级分类
  let typeK = r.typeK || ''
  if (!typeK) {
    const l1 = r.EquipTypeLevel1 || ''
    if (l1.includes('电机') || l1.includes('电动机')) typeK = 'motor'
    else if (l1.includes('风机')) typeK = 'fan'
    else if (l1.includes('泵')) typeK = 'pump'
    else if (l1.includes('变压器')) typeK = 'transformer'
    else if (l1.includes('锅炉')) typeK = 'boiler'
    else if (l1.includes('压缩机')) typeK = 'compressor'
    else typeK = l1
  }

  // 6. 设备二级分类
  const subType = r.subType || r.EquipTypeLevel2 || ''

  // 7. 截止日期
  const deadline = r.deadline || r.Deadline || ''

  // 8. 淘汰原因
  const reason = r.reason || r.EliminationReason || ''

  // 9. 相关标准并进行格式规范化 (防原始 JSON 数组字符字面量展示)
  let standard = r.standard || r.NationalStandard || ''
  if (standard) {
    if (typeof standard === 'string') {
      const trimmed = standard.trim()
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            standard = parsed.join('，')
          }
        } catch (e) {
          // 解析失败保留原貌
        }
      }
    } else if (Array.isArray(standard)) {
      standard = standard.join('，')
    }
  }

  // 10. 设备系列列表 (优先选用完整列表 ModelListRaw 以展示全部型号，其次用通配列表 ModelPattern)
  let modelPattern = []
  if (r.modelPattern) {
    if (Array.isArray(r.modelPattern)) {
      modelPattern = r.modelPattern.map(m => typeof m === 'object' ? (m.modelName || m.ModelName) : m)
    } else {
      modelPattern = [r.modelPattern]
    }
  } else if (r.ModelListRaw && r.ModelListRaw.length > 0) {
    if (Array.isArray(r.ModelListRaw)) {
      modelPattern = r.ModelListRaw
    }
  } else if (r.ModelPattern) {
    if (Array.isArray(r.ModelPattern)) {
      modelPattern = r.ModelPattern.map(m => m.ModelName || m.modelName)
    }
  }

  // 11. 发布机构/单位、生效日期、发文标题
  const issuingAuthority = r.issuingAuthority || r.IssuingAuthority || ''
  const issuingTitle = r.issuingTitle || r.IssuingTitle || ''
  const effectiveDate = r.effectiveDate || r.EffectiveDate || ''

  return {
    ruleId,
    batch,
    actionType,
    product,
    typeK,
    subType,
    deadline,
    reason,
    standard,
    modelPattern,
    issuingAuthority,
    issuingTitle,
    effectiveDate
  }
})

const meta = computed(() => {
  if (!normalizedRule.value) return {}
  const mockMeta = BATCH_META[normalizedRule.value.batch] || BATCH_META[normalizedRule.value.batch.trim()] || {}
  return {
    title: normalizedRule.value.issuingTitle || mockMeta.title || '—',
    authority: normalizedRule.value.issuingAuthority || mockMeta.authority || '—',
    effectiveDate: normalizedRule.value.effectiveDate || mockMeta.effectiveDate || '—'
  }
})

const elimColor = computed(() => {
  const t = normalizedRule.value?.actionType
  if (t === '强制') return { color: '#e0394f', bg: 'rgba(224,57,79,0.08)', border: 'rgba(224,57,79,0.28)' }
  if (t === '限期') return { color: '#ea8c2e', bg: 'rgba(234,140,46,0.08)', border: 'rgba(234,140,46,0.28)' }
  if (t === '鼓励') return { color: 'var(--brand)', bg: 'rgba(47,127,255,0.08)', border: 'rgba(47,127,255,0.28)' }
  return { color: 'var(--text-2)', bg: '#f8faff', border: 'var(--line)' }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="normalizedRule" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-panel">

        <!-- 头部 -->
        <div class="modal-head">
          <div class="modal-head-left">
            <AppIcon name="rule" :size="16" stroke="var(--brand)" />
            <span class="modal-title">规则详情</span>
            <span class="rule-id-badge">{{ normalizedRule.ruleId }}</span>
          </div>
          <button class="modal-close" @click="emit('close')">✕</button>
        </div>

        <!-- 内容 -->
        <div class="modal-body">

          <!-- 淘汰类型横幅 -->
          <div class="elim-banner" :style="{ background: elimColor.bg, borderColor: elimColor.border }">
            <span class="elim-title" :style="{ color: elimColor.color }">{{ meta.title || '—' }}</span>
          </div>

          <!-- 发布信息 -->
          <div class="section">
            <div class="section-title">发布信息</div>
            <div class="fields">
              <div class="field">
                <span class="l">发布单位</span>
                <span class="v">{{ meta.authority || '—' }}</span>
              </div>
              <div class="field">
                <span class="l">生效时间</span>
                <span class="v mono">{{ meta.effectiveDate || '—' }}</span>
              </div>
              <div class="field">
                <span class="l">规则编号</span>
                <span class="v mono bold brand">{{ normalizedRule.ruleId }}</span>
              </div>
              <div class="field">
                <span class="l">淘汰批次</span>
                <span class="v">{{ normalizedRule.batch }}</span>
              </div>
            </div>
          </div>

          <!-- 设备信息 -->
          <div class="section">
            <div class="section-title">设备信息</div>
            <div class="fields fields-2">
              <div class="field full">
                <span class="l">设备名称</span>
                <span class="v">{{ normalizedRule.product }}</span>
              </div>
              <div class="fields fields-3 full-grid">
                <div class="field">
                  <span class="l">设备分类</span>
                  <span class="v">{{ normalizedRule.typeK === 'motor' ? '电动机' : normalizedRule.typeK === 'fan' ? '风机' : normalizedRule.typeK === 'pump' ? '泵' : normalizedRule.typeK === 'transformer' ? '变压器' : normalizedRule.typeK === 'compressor' ? '压缩机' : normalizedRule.typeK === 'boiler' ? '锅炉' : normalizedRule.typeK === 'welder' ? '焊机' : normalizedRule.typeK }}</span>
                </div>
                <div class="field">
                  <span class="l">设备分类详细</span>
                  <span class="v">{{ normalizedRule.subType || '—' }}</span>
                </div>
                <div class="field" v-if="normalizedRule.modelPattern?.length">
                  <span class="l">设备系列</span>
                  <span class="v mono ellipsis" :title="normalizedRule.modelPattern.join(', ')">{{ normalizedRule.modelPattern.join(', ') }}</span>
                </div>
              </div>
              <div class="field full model-list" v-if="normalizedRule.modelPattern?.length">
                <span class="l">设备系列清单</span>
                <span class="v mono ellipsis" :title="normalizedRule.modelPattern.join(', ')">{{ normalizedRule.modelPattern.join(', ') }}</span>
              </div>
            </div>
          </div>

          <!-- 淘汰信息 -->
          <div class="section">
            <div class="section-title">淘汰信息</div>
            <div class="fields">
              <div class="field">
                <span class="l">淘汰类型</span>
                <span class="v bold" :style="{ color: elimColor.color }">
                  {{ normalizedRule.actionType === '鼓励' ? '鼓励替换' : (normalizedRule.actionType + '淘汰') }}
                </span>
              </div>
              <div class="field">
                <span class="l">淘汰日期</span>
                <span class="v mono" :style="{ color: elimColor.color }">{{ normalizedRule.deadline || '—' }}</span>
              </div>
              <div class="field full">
                <span class="l">说明</span>
                <span class="v">{{ normalizedRule.reason || '—' }}</span>
              </div>
              <div class="field full" v-if="normalizedRule.standard">
                <span class="l">相关标准</span>
                <span class="v mono small ellipsis-2" :title="normalizedRule.standard">{{ normalizedRule.standard }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(10,20,40,0.45); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 40px;
}

.modal-panel {
  background: #fff; border-radius: 14px; overflow: hidden;
  width: 100%; max-width: 620px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; max-height: 80vh;
}

/* 头部 */
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--line);
  background: #f8faff; flex-shrink: 0;
}
.modal-head-left { display: flex; align-items: center; gap: 10px; }
.modal-title { font-size: 15px; font-weight: 600; color: var(--text-0); }
.rule-id-badge {
  font-family: "JetBrains Mono", monospace; font-size: 12px; font-weight: 700;
  background: var(--brand); color: #fff; padding: 2px 9px; border-radius: 5px;
}
.modal-close {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--line);
  background: white; cursor: pointer; font-size: 13px; color: var(--text-2);
  display: grid; place-items: center;
}
.modal-close:hover { border-color: #e0394f; color: #e0394f; }

/* 内容区 */
.modal-body { overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; }

/* 横幅 */
.elim-banner {
  display: flex; align-items: center; gap: 14px;
  border: 1px solid; border-radius: 8px; padding: 10px 16px;
}
.elim-title { font-size: 14px; font-weight: 700; line-height: 1.5; }
.elim-type {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.elim-product { font-size: 13px; color: var(--text-1); }

/* 分组 */
.section { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.section-title {
  font-size: 12px; font-weight: 600; color: var(--text-2);
  letter-spacing: 0.05em; text-transform: uppercase;
  padding: 6px 14px; background: #f6f9ff; border-bottom: 1px solid var(--line);
}
.fields { display: grid; grid-template-columns: 1fr 1fr; }
.fields-3 { grid-template-columns: 1fr 1fr 1fr; }
.full-grid { grid-column: 1 / -1; border-top: 1px solid var(--line); }
.field {
  display: flex; flex-direction: column; gap: 3px;
  padding: 6px 14px; border-bottom: 1px solid var(--line); border-right: 1px solid var(--line);
  background: #fff;
  min-width: 0;
}
.field .v.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.field .v.ellipsis-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-all;
  width: 100%;
}
.field:nth-child(even) { background: #fafbff; }
.fields-3 .field:nth-child(3n) { border-right: none; }
.fields-3 .field:nth-child(even) { background: #fff; }
.fields-3 .field:nth-child(3n-1) { background: #fafbff; }
.field.full { grid-column: 1 / -1; border-right: none; }
.field .l { font-size: 10px; color: var(--text-3); }
.field .v { font-size: 12px; color: var(--text-0); line-height: 1.5; white-space: pre-line; }
.field .v.mono { font-family: "JetBrains Mono", monospace; }
.field .v.small { font-size: 12px; }
.field .v.bold { font-weight: 700; }
.field.model-list { flex-direction: column; gap: 6px; }
.model-list-body {
  font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--text-0);
  white-space: pre-line !important; line-height: 1.8 !important;
  max-height: 120px !important;
  overflow-y: auto !important;
  height: auto !important;
  padding: 4px 0;
}
.model-list-body::-webkit-scrollbar {
  width: 4px;
}
.model-list-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 2px;
}
</style>

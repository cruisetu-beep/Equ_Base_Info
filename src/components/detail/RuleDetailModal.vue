<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  rule: { type: Object, default: null }, // RULES_LIB_INIT 中的一条
})
const emit = defineEmits(['close'])

// 批次 → 目录标题 / 发布单位 / 生效时间
const BATCH_META = {
  '第一批': { title: '高耗能落后机电设备（产品）淘汰目录（第一批）', authority: '工业和信息化部', effectiveDate: '2009-12-31' },
  '第二批': { title: '高耗能落后机电设备（产品）淘汰目录（第二批）', authority: '工业和信息化部', effectiveDate: '2012-06-29' },
  '第三批': { title: '高耗能落后机电设备（产品）淘汰目录（第三批）', authority: '工业和信息化部', effectiveDate: '2014-03-27' },
  '第四批': { title: '高耗能落后机电设备（产品）淘汰目录（第四批）', authority: '工业和信息化部', effectiveDate: '2016-04-18' },
}

const meta = computed(() => props.rule ? (BATCH_META[props.rule.batch] || {}) : {})

const elimColor = computed(() => {
  const t = props.rule?.actionType
  if (t === '强制') return { color: '#e0394f', bg: 'rgba(224,57,79,0.08)', border: 'rgba(224,57,79,0.28)' }
  if (t === '限期') return { color: '#ea8c2e', bg: 'rgba(234,140,46,0.08)', border: 'rgba(234,140,46,0.28)' }
  return { color: 'var(--text-2)', bg: '#f8faff', border: 'var(--line)' }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="rule" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-panel">

        <!-- 头部 -->
        <div class="modal-head">
          <div class="modal-head-left">
            <AppIcon name="rule" :size="16" stroke="var(--brand)" />
            <span class="modal-title">规则详情</span>
            <span class="rule-id-badge">{{ rule.ruleId }}</span>
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
                <span class="v mono bold brand">{{ rule.ruleId }}</span>
              </div>
              <div class="field">
                <span class="l">淘汰批次</span>
                <span class="v">{{ rule.batch }}</span>
              </div>
            </div>
          </div>

          <!-- 设备信息 -->
          <div class="section">
            <div class="section-title">设备信息</div>
            <div class="fields fields-2">
              <div class="field full">
                <span class="l">设备名称</span>
                <span class="v">{{ rule.product }}</span>
              </div>
              <div class="fields fields-3 full-grid">
                <div class="field">
                  <span class="l">设备分类</span>
                  <span class="v">{{ rule.typeK === 'motor' ? '电动机' : rule.typeK === 'fan' ? '风机' : rule.typeK === 'pump' ? '泵' : rule.typeK === 'transformer' ? '变压器' : rule.typeK === 'compressor' ? '压缩机' : rule.typeK === 'boiler' ? '锅炉' : rule.typeK === 'welder' ? '焊机' : rule.typeK }}</span>
                </div>
                <div class="field">
                  <span class="l">设备分类详细</span>
                  <span class="v">{{ rule.subType || '—' }}</span>
                </div>
                <div class="field" v-if="rule.modelPattern?.length">
                  <span class="l">设备系列</span>
                  <span class="v mono">{{ rule.modelPattern.join(' / ') }}</span>
                </div>
              </div>
              <div class="field full model-list" v-if="rule.modelPattern?.length">
                <span class="l">设备系列清单</span>
                <div class="model-list-body">{{ rule.modelPattern.join('\n') }}</div>
              </div>
            </div>
          </div>

          <!-- 淘汰信息 -->
          <div class="section">
            <div class="section-title">淘汰信息</div>
            <div class="fields">
              <div class="field">
                <span class="l">淘汰类型</span>
                <span class="v bold" :style="{ color: elimColor.color }">{{ rule.actionType }}淘汰</span>
              </div>
              <div class="field">
                <span class="l">淘汰日期</span>
                <span class="v mono" :style="{ color: elimColor.color }">{{ rule.deadline || '—' }}</span>
              </div>
              <div class="field full">
                <span class="l">说明</span>
                <span class="v">{{ rule.reason || '—' }}</span>
              </div>
              <div class="field full" v-if="rule.standard">
                <span class="l">相关标准</span>
                <span class="v mono small">{{ rule.standard }}</span>
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
.section { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
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
  padding: 9px 14px; border-bottom: 1px solid var(--line); border-right: 1px solid var(--line);
  background: #fff;
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
  white-space: pre-line; line-height: 1.8;
  max-height: 120px; overflow-y: auto;
}
.model-list-body::-webkit-scrollbar { width: 4px; }
.model-list-body::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 2px; }
</style>

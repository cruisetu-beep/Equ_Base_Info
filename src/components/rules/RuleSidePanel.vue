<script setup>
// ── components/rules/RuleSidePanel.vue ────────────────────────────
// 只读淘汰规则详情面板组件
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'
import { BATCH_COLORS, ACTION_COLORS } from '@/data/rules'

const props = defineProps({
  selRule: { type: Object, default: null },
  editing: { type: Boolean, default: false },
})
const emit = defineEmits(['update:editing', 'delete-rule'])

// ── 只读视图计算属性 ──
const devType = computed(() => props.selRule ? (DEV_TYPE_MAP[props.selRule.typeK] || DEV_TYPE_MAP.other) : null)
const bc      = computed(() => props.selRule ? BATCH_COLORS[props.selRule.batch] : { bg: '#888', year: '未知' })
const ac      = computed(() => props.selRule ? ACTION_COLORS[props.selRule.typeE] : { color: '#000', bg: '#eee', border: '#ccc' })
const enabled = computed(() => props.selRule && props.selRule.enabled !== false)

// 翻译置信度
const confidenceLabel = computed(() => {
  if (!props.selRule) return ''
  const c = props.selRule.confidence
  if (c === 'H') return '高置信度 (H)'
  if (c === 'M') return '中置信度 (M)'
  if (c === 'L') return '低置信度 (L)'
  return c || '高置信度 (H)'
})

const confidenceColor = computed(() => {
  if (!props.selRule) return 'var(--text-3)'
  const c = props.selRule.confidence
  if (c === 'H') return 'var(--ok)'
  if (c === 'M') return '#e28743'
  if (c === 'L') return 'var(--danger)'
  return 'var(--ok)'
})

function formatSpec(c) {
  if (!c) return ''
  const unitStr = c.unit ? ` ${c.unit}` : ''
  if (c.op === '=') {
    return `${c.field}: 精确等于 ${c.val1}${unitStr}`
  } else if (c.op === 'range') {
    if (c.val1 !== null && c.val1 !== undefined && c.val2 !== null && c.val2 !== undefined) {
      return `${c.field}: 在区间 ${c.val1}${unitStr} ~ ${c.val2}${unitStr} 内`
    } else if (c.val1 !== null && c.val1 !== undefined) {
      return `${c.field}: 大于等于 ${c.val1}${unitStr}`
    } else if (c.val2 !== null && c.val2 !== undefined) {
      return `${c.field}: 小于等于 ${c.val2}${unitStr}`
    }
  }
  return `${c.field}: ${c.op} ${c.val1 || ''} ~ ${c.val2 || ''}${unitStr}`
}
</script>

<template>
  <!-- 只读详情 -->
  <div v-if="selRule" class="rule-detail-ro" :style="{ '--cl': bc?.bg || '#888' }">
    <div class="rd-head">
      <div class="ridrow">
        <span class="rid">{{ selRule.ruleId }}</span>
        <span class="batch-tag">{{ selRule.batch }} ({{ bc?.year || '未知' }})</span>
        <span style="flex:1" />
        <span class="action-tag" :style="{ color: ac?.color, background: ac?.bg, border: `1px solid ${ac?.border}` }">
          {{ selRule.typeE }}淘汰
        </span>
      </div>
      <div class="product">{{ selRule.product }}</div>
      
      <!-- 扩展字段：章节与页码 -->
      <div class="section-page-row" v-if="selRule.section || selRule.originalPage">
        <span v-if="selRule.section" class="sec-span">
          <AppIcon name="rule" :size="10" /> 
          章节：第 {{ selRule.sectionNum || 1 }} 章节 {{ selRule.section }}
        </span>
        <span v-if="selRule.originalPage" class="page-span">
          <AppIcon name="doc" :size="10" /> 
          页码：第 {{ selRule.originalPage }} 页
        </span>
      </div>

      <div class="meta-row">
        <span>
          <AppIcon :name="devType?.icon || 'settings'" :size="11" :stroke="devType?.color || '#888'" />
          一级类型：{{ selRule.typeK || '未知' }} <span v-if="selRule.subType">/ 二级类型：{{ selRule.subType }}</span>
        </span>
      </div>
      
      <div class="toggle-row">
        <AppIcon :name="enabled ? 'check' : 'ban'" :size="12" :stroke="enabled ? 'var(--ok)' : 'var(--text-3)'" />
        <span>规则状态：<strong :style="{ color: enabled ? 'var(--ok)' : 'var(--text-2)' }">{{ enabled ? '已启用' : '已禁用' }}</strong></span>
        <span style="color:var(--text-3);font-size:11px;margin-left:auto">判定引擎{{ enabled ? '实时使用' : '已忽略' }}</span>
      </div>
    </div>

    <div class="rd-body">
      <!-- 置信度信息 -->
      <div class="rd-section">
        <h5><AppIcon name="star" :size="11" /> 判定置信度</h5>
        <div class="conf-badge-wrap">
          <span class="conf-dot" :style="{ background: confidenceColor }" />
          <span class="conf-text" :style="{ color: confidenceColor }">{{ confidenceLabel }}</span>
        </div>
      </div>

      <!-- 型号匹配规则 -->
      <div class="rd-section">
        <h5><AppIcon name="tag" :size="11" /> 型号匹配规则</h5>
        <div v-if="selRule.modelPattern && selRule.modelPattern.length > 0" class="model-patterns-list">
          <span 
            v-for="(m, i) in selRule.modelPattern" :key="i"
            :class="['model-pattern-badge', m.isPrefixMatch ? 'prefix' : 'exact']"
          >
            <span class="badge-id">ID:{{ m.modelId > 0 ? m.modelId : '-' }}</span>
            <AppIcon :name="m.isPrefixMatch ? 'chevron-right' : 'check'" :size="10" />
            {{ m.isPrefixMatch ? `以 "${m.modelName}" 开头` : `精确匹配 "${m.modelName}"` }}
          </span>
        </div>
        <div class="v" style="color:var(--text-3)" v-else>(匹配该分类下的任意型号)</div>
      </div>

      <!-- 参数范围规则 -->
      <div class="rd-section">
        <h5><AppIcon name="zap" :size="11" /> 参数范围规则</h5>
        <div v-if="selRule.specConstraints && selRule.specConstraints.length > 0" class="conditions-list">
          <div v-for="(c, i) in selRule.specConstraints" :key="i" class="cond">
            <span class="spec-id-badge" title="规格ID">ID:{{ c.specId > 0 ? c.specId : '-' }}</span>
            <span class="spec-group-badge" title="条件分组">组:{{ c.groupSeq || 1 }}</span>
            <span class="spec-text">{{ formatSpec(c) }}</span>
          </div>
        </div>
        <div v-else class="v" style="color:var(--text-3)">(无规格区间约束)</div>
      </div>

      <!-- 投运年份与截止日期 -->
      <div class="rd-grid">
        <div class="item">
          <div class="l">投运年份约束</div>
          <div class="v">{{ selRule.yearOp || '(无约束)' }}</div>
        </div>
        <div class="item">
          <div class="l">截止日期</div>
          <div class="v">{{ selRule.deadline || '永久' }}</div>
        </div>
      </div>

      <!-- 淘汰理由 -->
      <div class="rd-section" style="margin-top:18px">
        <h5><AppIcon name="warn" :size="11" /> 淘汰理由</h5>
        <div class="reason-box">{{ selRule.reason || '无理由' }}</div>
      </div>

      <!-- 依据国家标准 -->
      <div class="rd-section">
        <h5><AppIcon name="doc" :size="11" /> 依据国家标准</h5>
        <div class="standard-list">
          <span v-for="(std, i) in (Array.isArray(selRule.standard) ? selRule.standard : (selRule.standard ? selRule.standard.split(';').map(s => s.trim()).filter(Boolean) : []))" :key="i" class="standard-badge">
            <AppIcon name="doc" :size="10" />
            {{ std }}
          </span>
          <span v-if="(!selRule.standard || selRule.standard.length === 0) && (!Array.isArray(selRule.standard) || selRule.standard.length === 0)" class="v" style="color:var(--text-3)">无标准依据</span>
        </div>
      </div>

      <!-- 改造建议 -->
      <div class="rd-section">
        <h5><AppIcon name="sparkles" :size="11" /> 改造建议</h5>
        <div class="advice-box">
          <AppIcon name="sparkles" :size="12" class="sparks" />
          <div>{{ selRule.remark || '无建议' }}</div>
        </div>
      </div>
    </div>

    <div class="rd-foot">
      <button class="btn ghost" @click="$emit('delete-rule', selRule.ruleId)">
        <AppIcon name="trash" :size="12" /> 删除
      </button>
      <button class="btn primary" @click="$emit('update:editing', true)">
        <AppIcon name="edit" :size="12" /> 编辑规则
      </button>
    </div>
  </div>

  <!-- 空态 -->
  <div v-else class="rule-side-empty">
    <div class="ic"><AppIcon name="rule" :size="36" stroke="var(--text-3)" /></div>
    <div class="h">未选中规则</div>
    <div class="s">点击表格中任一条规则查看完整详情<br/>或点击右上角「新建规则」</div>
  </div>
</template>

<style scoped>
/* ── 空态 ── */
.rule-side-empty { padding: 24px; text-align: center; background: white; border: 1px dashed var(--line-strong); border-radius: 12px; color: var(--text-2); height: 100%; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rule-side-empty .ic { color: var(--text-3); margin-bottom: 12px; display:flex; justify-content:center; }
.rule-side-empty .h { font-size: 14px; color: var(--text-1); margin-bottom: 6px; }
.rule-side-empty .s { font-size: 12px; color: var(--text-3); line-height: 1.6; }

/* ── 只读详情 ── */
.rule-detail-ro { background: white; border: 1px solid var(--line); border-radius: 12px; height: 100%; min-height: 0; min-width: 0; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(60,110,200,0.04); overflow: hidden; }
.rd-head { padding: 16px 20px; border-bottom: 1px solid var(--line); background: linear-gradient(135deg, color-mix(in srgb, var(--cl) 8%, white), white); }
.rd-head .ridrow { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.rd-head .rid { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 16px; color: var(--text-0); letter-spacing: 0.5px; }
.rd-head .batch-tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: color-mix(in srgb, var(--cl) 14%, white); color: color-mix(in srgb, var(--cl) 80%, black); border: 1px solid color-mix(in srgb, var(--cl) 30%, transparent); }
.rd-head .product { font-size: 14px; color: var(--text-0); font-weight: 500; line-height: 1.45; }

.section-page-row { display: flex; gap: 12px; font-size: 11px; color: var(--text-2); margin-top: 6px; }
.section-page-row span { display: inline-flex; align-items: center; gap: 4px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }

.rd-head .meta-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 11px; color: var(--text-2); }
.rd-head .action-tag { padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.rd-head .toggle-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-top: 10px; background: rgba(255,255,255,0.6); border: 1px solid var(--line); border-radius: 8px; font-size: 12px; color: var(--text-1); }
.rd-head .toggle-row strong { color: var(--text-0); }
.rd-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
.rd-section { margin-bottom: 18px; }
.rd-section h5 { margin: 0 0 8px; font-size: 11px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
.rd-section .v { font-size: 12.5px; color: var(--text-0); line-height: 1.6; }
.rd-section .v.mono { font-family: "JetBrains Mono", monospace; font-size: 12px; }

.conf-badge-wrap { display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line); font-size: 12px; font-weight: 500; }
.conf-dot { width: 8px; height: 8px; border-radius: 50%; }

.rd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rd-grid .item .l { font-size: 11px; color: var(--text-2); margin-bottom: 4px; }
.rd-grid .item .v { font-size: 12.5px; color: var(--text-0); font-family: "JetBrains Mono", monospace; }

.conditions-list { padding: 10px 12px; background: #f7f9fd; border: 1px dashed var(--line); border-radius: 8px; font-family: "JetBrains Mono", monospace; font-size: 12px; line-height: 1.8; color: var(--text-1); display: flex; flex-direction: column; gap: 6px; }
.conditions-list .cond { display: flex; align-items: center; gap: 8px; }
.spec-id-badge { background: #e2e8f0; color: #475569; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 500; }
.spec-group-badge { background: #dbeafe; color: #1e40af; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 500; }
.spec-text { color: var(--text-1); }

.reason-box { padding: 12px 14px; background: linear-gradient(90deg, rgba(224,57,79,0.06), rgba(224,57,79,0.02)); border-left: 3px solid var(--eol-red); border-radius: 4px; font-size: 12px; color: var(--text-1); line-height: 1.6; }
.advice-box { padding: 12px 14px; background: linear-gradient(90deg, rgba(43,217,168,0.08), rgba(43,217,168,0.02)); border-left: 3px solid var(--ok); border-radius: 4px; font-size: 12px; color: var(--text-1); line-height: 1.6; display: flex; gap: 8px; }
.advice-box .sparks { color: var(--ok); flex-shrink: 0; }
.advice-box strong { color: var(--ok); }
.rd-foot { padding: 12px 20px; border-top: 1px solid var(--line); display: flex; gap: 8px; background: #f8faff; }
.rd-foot .btn { padding: 7px 14px; font-size: 12px; flex: 1; justify-content: center; }

/* ── 编辑/新建表单 ── */
.rule-edit-form { background: linear-gradient(180deg, #eaf2ff, white 18%); border: 2px solid var(--brand); border-radius: 12px; height: 100%; min-height: 0; min-width: 0; display: flex; flex-direction: column; box-shadow: 0 8px 28px rgba(47,127,255,0.18); overflow: hidden; animation: edit-mode-in 0.3s ease; }
@keyframes edit-mode-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.ef-head { padding: 14px 18px; background: linear-gradient(90deg, var(--brand), var(--brand-2)); color: white; display: flex; align-items: center; gap: 10px; }
.ef-head .ic { color: rgba(255,255,255,0.9); }
.ef-head h4 { margin: 0; font-size: 14px; flex: 1; font-weight: 600; }
.ef-head .badge-mode { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.30); font-family: "JetBrains Mono", monospace; }
.ef-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
.ef-row { margin-bottom: 14px; }
.ef-row label { display: block; font-size: 11.5px; color: var(--text-2); margin-bottom: 5px; }
.ef-row label .req { color: var(--danger); }
.ef-row .input, .ef-row .select, .ef-row .textarea { width: 100%; padding: 8px 10px; font-size: 12.5px; background: white; border: 1px solid var(--line); border-radius: 6px; color: var(--text-0); outline: none; font-family: inherit; transition: all 0.15s; }
.ef-row .input:focus, .ef-row .select:focus, .ef-row .textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(47,127,255,0.12); }
.ef-row .textarea { resize: vertical; min-height: 60px; }
.ef-row .helper { font-size: 10.5px; color: var(--text-3); margin-top: 4px; }
.ef-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ef-foot { padding: 12px 20px; border-top: 1px solid var(--line); display: flex; gap: 8px; background: #f8faff; }
.ef-foot .btn { padding: 7px 14px; font-size: 12px; flex: 1; justify-content: center; }

/* 深度定制的额外详情样式 */
.model-patterns-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.model-pattern-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 500;
}
.model-pattern-badge .badge-id {
  opacity: 0.5;
  margin-right: 2px;
}
.model-pattern-badge.prefix {
  background: rgba(31, 111, 235, 0.08);
  color: var(--brand);
  border: 1px solid rgba(31, 111, 235, 0.2);
}
.model-pattern-badge.exact {
  background: rgba(43, 217, 168, 0.08);
  color: var(--ok);
  border: 1px solid rgba(43, 217, 168, 0.2);
}
.standard-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.standard-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: #fff8f0;
  color: #d97706;
  border: 1px solid #fde8d0;
  font-weight: 500;
}
</style>


<script setup>
// ── components/rules/RuleSidePanel.vue ────────────────────────────
// 三态面板：空态 / 只读详情 / 编辑表单（含新建）
import { ref, watch, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPES, DEV_TYPE_MAP } from '@/data/devices'
import { BATCH_COLORS, ACTION_COLORS } from '@/data/rules'
import { formatConditions, parseConditions } from '@/utils/logHelpers'

const props = defineProps({
  selRule:  { type: Object,  default: null },
  creating: { type: Boolean, default: false },
  editing:  { type: Boolean, default: false },
  rules:    { type: Array,   required: true },
})
const emit = defineEmits(['update:editing', 'update-rule', 'delete-rule', 'add-rule', 'cancel-create'])

// ── 表单状态 ────────────────────────────────────────────────────
const form = ref(null)

watch(
  [() => props.creating, () => props.editing, () => props.selRule],
  () => {
    if (props.creating) {
      form.value = {
        ruleId: 'B?-?-?', batch: '第四批', typeK: 'motor', subType: '',
        product: '', modelPattern: '', conditions: '', yearOp: '',
        actionType: '限期', deadline: '', reason: '',
        standard: '', confidence: 0.85, advice: '', enabled: true,
      }
    } else if (props.editing && props.selRule) {
      form.value = {
        ...props.selRule,
        modelPattern: (props.selRule.modelPattern || []).join(', '),
        conditions:   formatConditions(props.selRule.conditions),
      }
    } else {
      form.value = null
    }
  },
  { immediate: true }
)

const setF = (k, v) => { form.value = { ...form.value, [k]: v } }

function handleSave() {
  const patch = {
    ...form.value,
    modelPattern: form.value.modelPattern.split(',').map(s => s.trim()).filter(Boolean),
    conditions:   parseConditions(form.value.conditions),
    confidence:   parseFloat(form.value.confidence) || 0.85,
  }
  if (props.creating) {
    let newId = patch.ruleId
    if (newId === 'B?-?-?' || props.rules.some(r => r.ruleId === newId)) {
      newId = `BX-${Date.now().toString().slice(-6)}`
    }
    emit('add-rule', { ...patch, ruleId: newId })
  } else {
    emit('update-rule', props.selRule.ruleId, patch)
    emit('update:editing', false)
  }
}

function handleCancel() {
  if (props.creating) emit('cancel-create')
  else emit('update:editing', false)
}

// ── 只读视图计算属性 ─────────────────────────────────────────────
const devType = computed(() => props.selRule ? (DEV_TYPE_MAP[props.selRule.typeK] || DEV_TYPE_MAP.other) : null)
const bc      = computed(() => props.selRule ? BATCH_COLORS[props.selRule.batch] : null)
const ac      = computed(() => props.selRule ? ACTION_COLORS[props.selRule.actionType] : null)
const enabled = computed(() => props.selRule && props.selRule.enabled !== false)

const showEdit = computed(() => (props.creating || props.editing) && form.value)
const showDetail = computed(() => !props.creating && !props.editing && props.selRule)
</script>

<template>
  <!-- 编辑 / 新建表单 -->
  <div v-if="showEdit" class="rule-edit-form">
    <div class="ef-head">
      <AppIcon :name="creating ? 'plus' : 'edit'" :size="14" class="ic" />
      <h4>{{ creating ? '新建规则' : '编辑规则' }}</h4>
      <span v-if="!creating" class="badge-mode">{{ form.ruleId }}</span>
    </div>

    <div class="ef-body">
      <div v-if="creating" class="ef-row">
        <label>规则 ID <span class="req">*</span></label>
        <input class="input mono" placeholder="例如 B4-1-X（留空则自动生成）"
               :value="form.ruleId === 'B?-?-?' ? '' : form.ruleId"
               @input="setF('ruleId', $event.target.value || 'B?-?-?')" />
        <div class="helper">建议格式 B[批次]-[类型]-[序号]</div>
      </div>

      <div class="ef-grid-2">
        <div class="ef-row">
          <label>批次 <span class="req">*</span></label>
          <select class="select" :value="form.batch" @change="setF('batch', $event.target.value)">
            <option v-for="b in Object.keys(BATCH_COLORS)" :key="b">{{ b }}</option>
          </select>
        </div>
        <div class="ef-row">
          <label>淘汰类型 <span class="req">*</span></label>
          <select class="select" :value="form.actionType" @change="setF('actionType', $event.target.value)">
            <option value="强制">强制（立即淘汰）</option>
            <option value="限期">限期（截止前淘汰）</option>
            <option value="鼓励">鼓励（建议替换）</option>
          </select>
        </div>
      </div>

      <div class="ef-grid-2">
        <div class="ef-row">
          <label>设备一级类型 <span class="req">*</span></label>
          <select class="select" :value="form.typeK" @change="setF('typeK', $event.target.value)">
            <option v-for="t in DEV_TYPES" :key="t.k" :value="t.k">{{ t.label }}</option>
          </select>
        </div>
        <div class="ef-row">
          <label>截止日期 <span class="req">*</span></label>
          <input class="input mono" placeholder="YYYY-MM-DD"
                 :value="form.deadline" @input="setF('deadline', $event.target.value)" />
        </div>
      </div>

      <div class="ef-row">
        <label>设备二级类型</label>
        <input class="input" placeholder="例如 中小型三相异步电动机"
               :value="form.subType" @input="setF('subType', $event.target.value)" />
      </div>

      <div class="ef-row">
        <label>产品名称 <span class="req">*</span></label>
        <input class="input" placeholder="例如 Y2 系列 中小型三相异步电动机"
               :value="form.product" @input="setF('product', $event.target.value)" />
      </div>

      <div class="ef-row">
        <label>型号系列匹配</label>
        <input class="input mono" placeholder="多个用逗号分隔，例如 Y2, YE2"
               :value="form.modelPattern" @input="setF('modelPattern', $event.target.value)" />
        <div class="helper">设备型号以任一前缀开头即匹配，留空表示匹配所有型号</div>
      </div>

      <div class="ef-row">
        <label>规格区间约束</label>
        <textarea class="textarea mono" rows="3"
                  :placeholder="'每行一个约束，格式：参数 单位 最小值 最大值\n例如：\n功率 kW 0.55 315'"
                  :value="form.conditions" @input="setF('conditions', $event.target.value)" />
        <div class="helper">格式：「参数名 单位 最小值 最大值」每行一条</div>
      </div>

      <div class="ef-grid-2">
        <div class="ef-row">
          <label>投运年份约束</label>
          <input class="input mono" placeholder="例如 <=2003 或 >2005"
                 :value="form.yearOp || ''" @input="setF('yearOp', $event.target.value)" />
        </div>
        <div class="ef-row">
          <label>置信度 (0-1)</label>
          <input class="input mono" type="number" step="0.01" min="0" max="1"
                 :value="form.confidence"
                 @input="setF('confidence', parseFloat($event.target.value) || 0)" />
        </div>
      </div>

      <div class="ef-row">
        <label>淘汰理由</label>
        <textarea class="textarea" rows="3"
                  :value="form.reason" @input="setF('reason', $event.target.value)" />
      </div>

      <div class="ef-row">
        <label>依据国家标准</label>
        <input class="input mono" placeholder="例如 GB 18613-2012"
               :value="form.standard" @input="setF('standard', $event.target.value)" />
      </div>

      <div class="ef-row">
        <label>改造建议</label>
        <textarea class="textarea" rows="2"
                  :value="form.advice" @input="setF('advice', $event.target.value)" />
      </div>
    </div>

    <div class="ef-foot">
      <button class="btn ghost" @click="handleCancel">
        <AppIcon name="chevron-left" :size="12" /> 取消
      </button>
      <button class="btn primary" @click="handleSave">
        <AppIcon name="check" :size="12" /> {{ creating ? '创建规则' : '保存修改' }}
      </button>
    </div>
  </div>

  <!-- 只读详情 -->
  <div v-else-if="showDetail" class="rule-detail-ro" :style="{ '--cl': bc.bg }">
    <div class="rd-head">
      <div class="ridrow">
        <span class="rid">{{ selRule.ruleId }}</span>
        <span class="batch-tag">{{ selRule.batch }} ({{ bc.year }})</span>
        <span style="flex:1" />
        <span class="action-tag" :style="{ color: ac.color, background: ac.bg, border: `1px solid ${ac.border}` }">
          {{ selRule.actionType }}淘汰
        </span>
      </div>
      <div class="product">{{ selRule.product }}</div>
      <div class="meta-row">
        <span>
          <AppIcon :name="devType.icon" :size="11" :stroke="devType.color" />
          {{ devType.label }} / {{ selRule.subType }}
        </span>
      </div>
      <div class="toggle-row">
        <AppIcon :name="enabled ? 'check' : 'ban'" :size="12" :stroke="enabled ? 'var(--ok)' : 'var(--text-3)'" />
        <span>规则状态：<strong :style="{ color: enabled ? 'var(--ok)' : 'var(--text-2)' }">{{ enabled ? '已启用' : '已禁用' }}</strong></span>
        <span style="color:var(--text-3);font-size:11px;margin-left:auto">判定引擎{{ enabled ? '实时使用' : '已忽略' }}</span>
      </div>
    </div>

    <div class="rd-body">
      <div class="rd-section">
        <h5><AppIcon name="tag" :size="11" /> 型号系列匹配</h5>
        <div class="v mono">
          {{ selRule.modelPattern && selRule.modelPattern.length > 0
            ? selRule.modelPattern.map(m => `"${m}*"`).join(' / ')
            : '(任意型号)' }}
        </div>
      </div>

      <div class="rd-section">
        <h5><AppIcon name="zap" :size="11" /> 规格区间约束</h5>
        <div v-if="selRule.conditions && selRule.conditions.length > 0" class="conditions-list">
          <div v-for="(c, i) in selRule.conditions" :key="i" class="cond">
            {{ c.key }}: {{ c.min }}{{ c.unit || '' }} ~ {{ c.max }}{{ c.unit || '' }}
          </div>
        </div>
        <div v-else class="v" style="color:var(--text-3)">(无规格区间约束)</div>
      </div>

      <div class="rd-grid">
        <div class="item">
          <div class="l">投运年份约束</div>
          <div class="v">{{ selRule.yearOp || '(无约束)' }}</div>
        </div>
        <div class="item">
          <div class="l">截止日期</div>
          <div class="v">{{ selRule.deadline }}</div>
        </div>
      </div>

      <div class="rd-section" style="margin-top:18px">
        <h5><AppIcon name="warn" :size="11" /> 淘汰理由</h5>
        <div class="reason-box">{{ selRule.reason }}</div>
      </div>

      <div class="rd-section">
        <h5><AppIcon name="doc" :size="11" /> 依据国家标准</h5>
        <div class="v mono" style="color:var(--warn)">{{ selRule.standard }}</div>
      </div>

      <div class="rd-section">
        <h5><AppIcon name="sparkles" :size="11" /> 改造建议</h5>
        <div class="advice-box">
          <AppIcon name="sparkles" :size="12" class="sparks" />
          <div>{{ selRule.advice }}</div>
        </div>
      </div>

      <div class="rd-section">
        <h5><AppIcon name="info" :size="11" /> 置信度</h5>
        <div class="v mono">
          {{ selRule.confidence?.toFixed(2) }}
          <span style="color:var(--text-3);font-size:11px"> · 来自 v1.3 规则置信度评估</span>
        </div>
        <div class="conf-bar">
          <div class="conf-fill" :style="{ width: `${(selRule.confidence || 0) * 100}%` }" />
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
.rule-side-empty { padding: 60px 24px; text-align: center; background: white; border: 1px dashed var(--line-strong); border-radius: 12px; color: var(--text-2); position: sticky; top: 80px; }
.rule-side-empty .ic { color: var(--text-3); margin-bottom: 12px; display:flex; justify-content:center; }
.rule-side-empty .h { font-size: 14px; color: var(--text-1); margin-bottom: 6px; }
.rule-side-empty .s { font-size: 12px; color: var(--text-3); line-height: 1.6; }

/* ── 只读详情 ── */
.rule-detail-ro { background: white; border: 1px solid var(--line); border-radius: 12px; position: sticky; top: 80px; max-height: calc(100vh - 100px); display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(60,110,200,0.04); overflow: hidden; }
.rd-head { padding: 16px 20px; border-bottom: 1px solid var(--line); background: linear-gradient(135deg, color-mix(in srgb, var(--cl) 8%, white), white); }
.rd-head .ridrow { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.rd-head .rid { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 16px; color: var(--text-0); letter-spacing: 0.5px; }
.rd-head .batch-tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: color-mix(in srgb, var(--cl) 14%, white); color: color-mix(in srgb, var(--cl) 80%, black); border: 1px solid color-mix(in srgb, var(--cl) 30%, transparent); }
.rd-head .product { font-size: 14px; color: var(--text-0); font-weight: 500; line-height: 1.45; }
.rd-head .meta-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 11px; color: var(--text-2); }
.rd-head .action-tag { padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.rd-head .toggle-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-top: 10px; background: rgba(255,255,255,0.6); border: 1px solid var(--line); border-radius: 8px; font-size: 12px; color: var(--text-1); }
.rd-head .toggle-row strong { color: var(--text-0); }
.rd-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
.rd-section { margin-bottom: 18px; }
.rd-section h5 { margin: 0 0 8px; font-size: 11px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
.rd-section .v { font-size: 12.5px; color: var(--text-0); line-height: 1.6; }
.rd-section .v.mono { font-family: "JetBrains Mono", monospace; font-size: 12px; }
.rd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rd-grid .item .l { font-size: 11px; color: var(--text-2); margin-bottom: 4px; }
.rd-grid .item .v { font-size: 12.5px; color: var(--text-0); font-family: "JetBrains Mono", monospace; }
.conditions-list { padding: 10px 12px; background: #f7f9fd; border: 1px dashed var(--line); border-radius: 8px; font-family: "JetBrains Mono", monospace; font-size: 12px; line-height: 1.8; color: var(--text-1); }
.conditions-list .cond { display: flex; align-items: center; gap: 6px; }
.conditions-list .cond::before { content:"▸"; color: var(--brand); }
.reason-box { padding: 12px 14px; background: linear-gradient(90deg, rgba(224,57,79,0.06), rgba(224,57,79,0.02)); border-left: 3px solid var(--eol-red); border-radius: 4px; font-size: 12px; color: var(--text-1); line-height: 1.6; }
.advice-box { padding: 12px 14px; background: linear-gradient(90deg, rgba(43,217,168,0.08), rgba(43,217,168,0.02)); border-left: 3px solid var(--ok); border-radius: 4px; font-size: 12px; color: var(--text-1); line-height: 1.6; display: flex; gap: 8px; }
.advice-box .sparks { color: var(--ok); flex-shrink: 0; }
.advice-box strong { color: var(--ok); }
.conf-bar { width: 100%; height: 6px; background: #e3ebf7; border-radius: 3px; overflow: hidden; margin-top: 6px; }
.conf-fill { height: 100%; background: linear-gradient(90deg, var(--brand), var(--brand-glow)); border-radius: 3px; }
.rd-foot { padding: 12px 20px; border-top: 1px solid var(--line); display: flex; gap: 8px; background: #f8faff; }
.rd-foot .btn { padding: 7px 14px; font-size: 12px; flex: 1; justify-content: center; }

/* ── 编辑/新建表单 ── */
.rule-edit-form { background: linear-gradient(180deg, #eaf2ff, white 18%); border: 2px solid var(--brand); border-radius: 12px; position: sticky; top: 80px; max-height: calc(100vh - 100px); display: flex; flex-direction: column; box-shadow: 0 8px 28px rgba(47,127,255,0.18); overflow: hidden; animation: edit-mode-in 0.3s ease; }
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
</style>

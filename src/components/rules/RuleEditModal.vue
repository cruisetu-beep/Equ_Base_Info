<script setup>
// ── components/rules/RuleEditModal.vue ────────────────────────────
// 新建与编辑/只读查看淘汰规则的模态框组件，支持只读/编辑双模式切换，多标签页展示
import { ref, watch, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { BATCH_COLORS } from '@/data/rules'
import { getAttributeNames, getLogicOperations, getConfidenceOptions, getEliminationTypes, getAllRuleIds } from '@/api/rules'

const props = defineProps({
  show:     { type: Boolean, default: false },
  creating: { type: Boolean, default: false },
  selRule:  { type: Object,  default: null },
  rules:    { type: Array,   required: true },
  mode:     { type: String,  default: 'edit' }, // 'view' (只读查看) | 'edit' (编辑)
  loading:  { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'save'])

// ── 标签页状态 ──
const activeTab = ref('basic') // 'basic' | 'models' | 'specs'

// 本地只读模式控制状态
const readonlyMode = ref(false)

// ── 表单状态 ──
const form = ref({
  ruleId: '',
  batch: '第四批',
  typeK: '',
  subType: '',
  product: '',
  typeE: '限期',
  deadline: '',
  enabled: true,
  reason: '',
  standard: [],
  remark: '',
  confidence: 'H',
  section: '',
  sectionNum: 1,
  originalPage: '',
  modelPattern: [],
  specConstraints: [],
  modelSeries: '',
  productionYearConstraint: '',
  modelListRaw: [],
  specConditionDesc: ''
})

// ── 规则 ID 查重校验 ──
const allRuleIds = ref([])
const ruleIdConflict = ref(false)

// ── 外部词典与运算符列表 ──
const attributeNames = ref([])
const logicOps = ref([
  { key: '=', name: '精确等于 (=)' },
  { key: 'range', name: '范围区间 (range)' }
])
const confidenceOptions = ref([
  { key: 'H', name: '高置信度 (H)' },
  { key: 'M', name: '中置信度 (M)' },
  { key: 'L', name: '低置信度 (L)' }
])
const eliminationTypes = ref([
  { key: '强制', name: '强制（立即淘汰）' },
  { key: '限期', name: '限期（截止前淘汰）' }
])

// 拉取外部数据
onMounted(async () => {
  try {
    const names = await getAttributeNames()
    attributeNames.value = names || []
    
    const ops = await getLogicOperations()
    if (ops && ops.length > 0) {
      logicOps.value = ops
    }
    
    const confs = await getConfidenceOptions()
    if (confs && confs.length > 0) {
      confidenceOptions.value = confs
    }
    
    const types = await getEliminationTypes()
    if (types && types.length > 0) {
      eliminationTypes.value = types
    }
  } catch (err) {
    console.error('获取参数名称词典、逻辑符号、置信度或淘汰类型选项失败：', err)
  }
})

// 监听弹窗显示与选中规则，回填数据
watch(
  [() => props.show, () => props.selRule, () => props.creating, () => props.mode],
  () => {
    if (!props.show) return
    activeTab.value = 'basic' // 默认重置回第一个标签页
    ruleIdConflict.value = false

    try {
      if (props.creating) {
        readonlyMode.value = false
        form.value = {
          ruleId: '',
          batch: '第四批',
          typeK: '',
          subType: '',
          product: '',
          typeE: '限期',
          deadline: '',
          enabled: true,
          reason: '',
          standard: [],
          remark: '',
          confidence: 'H',
          section: '',
          sectionNum: 1,
          originalPage: '',
          modelPattern: [],
          specConstraints: [],
          modelSeries: '',
          productionYearConstraint: '',
          modelListRaw: [],
          specConditionDesc: ''
        }
        
        allRuleIds.value = (props.rules || []).map(r => r.ruleId)
      } else {
        readonlyMode.value = (props.mode === 'view')
        if (props.selRule) {
          // 深度拷贝详情数据
          let formattedDeadline = props.selRule.deadline || ''
          if (formattedDeadline && formattedDeadline.includes(' ')) {
            formattedDeadline = formattedDeadline.split(' ')[0]
          }
          form.value = {
            ...props.selRule,
            deadline: formattedDeadline,
            standard: Array.isArray(props.selRule.standard) ? [...props.selRule.standard] : [],
            modelPattern: (props.selRule.modelPattern || []).map(m => ({ ...m })),
            specConstraints: (props.selRule.specConstraints || []).map(s => ({ ...s })),
            modelSeries: props.selRule.modelSeries || '',
            productionYearConstraint: props.selRule.productionYearConstraint || '',
            modelListRaw: Array.isArray(props.selRule.modelListRaw) ? [...props.selRule.modelListRaw] : [],
            specConditionDesc: props.selRule.specConditionDesc || ''
          }
        }
      }
    } catch (err) {
      console.error('表单回填发生异常：', err)
      alert('表单数据加载与回填失败：' + (err.stack || err.message || err))
    }
  },
  { immediate: true }
)

// 监听输入的规则 ID 进行实时查重对比
watch(
  () => form.value.ruleId,
  (newId) => {
    if (props.creating && newId) {
      ruleIdConflict.value = allRuleIds.value.includes(newId.trim())
    } else {
      ruleIdConflict.value = false
    }
  }
)

// ── 型号列表操作 ──
function addModelRow() {
  form.value.modelPattern.push({
    modelId: 0,
    modelName: '',
    matchValue: '',
    isPrefixMatch: true
  })
}
function removeModelRow(index) {
  form.value.modelPattern.splice(index, 1)
}

// ── 规格约束列表操作 ──
function addSpecRow() {
  form.value.specConstraints.push({
    specId: 0,
    groupSeq: 1,
    field: '',
    op: 'range',
    val1: null,
    val2: null,
    unit: ''
  })
}
function removeSpecRow(index) {
  form.value.specConstraints.splice(index, 1)
}

// ── 提交保存 ──
function handleSave() {
  // 1. 数据校验
  if (props.creating && !form.value.ruleId.trim()) {
    alert('请输入规则 ID！')
    return
  }
  if (props.creating && ruleIdConflict.value) {
    alert('该规则 ID 已存在，请换一个编号！')
    return
  }
  if (!form.value.product.trim()) {
    alert('请输入产品名称！')
    return
  }

  // 2. 构建发送 Payload
  const payload = {
    ...form.value,
    ruleId: form.value.ruleId.trim(),
    section: form.value.section.trim() || form.value.typeK.trim(),
    sectionNum: parseInt(form.value.sectionNum) || 1,
    standard: (form.value.standard || []).map(x => x.trim()).filter(Boolean),
    modelPattern: form.value.modelPattern.filter(m => m.modelName.trim()),
    specConstraints: form.value.specConstraints
      .filter(s => s.field.trim())
      .map(s => {
        // 根据运算符清理无用字段
        if (s.op === '=') {
          return { ...s, val2: null }
        }
        return { ...s }
      }),
    modelListRaw: (form.value.modelListRaw || []).map(x => x.trim()).filter(Boolean),
    specConditionDesc: (form.value.specConditionDesc || '').trim()
  }

  emit('save', payload)
}

// 取消编辑
function handleCancelEdit() {
  if (props.mode === 'view') {
    // 如果原先是查看模式进入，退回到查看模式并重载原始数据
    readonlyMode.value = true
    if (props.selRule) {
      let formattedDeadline = props.selRule.deadline || ''
      if (formattedDeadline && formattedDeadline.includes(' ')) {
        formattedDeadline = formattedDeadline.split(' ')[0]
      }
      form.value = {
        ...props.selRule,
        deadline: formattedDeadline,
        standard: Array.isArray(props.selRule.standard) ? [...props.selRule.standard] : [],
        modelPattern: (props.selRule.modelPattern || []).map(m => ({ ...m })),
        specConstraints: (props.selRule.specConstraints || []).map(s => ({ ...s })),
        modelSeries: props.selRule.modelSeries || '',
        productionYearConstraint: props.selRule.productionYearConstraint || '',
        modelListRaw: Array.isArray(props.selRule.modelListRaw) ? [...props.selRule.modelListRaw] : [],
        specConditionDesc: props.selRule.specConditionDesc || ''
      }
    }
  } else {
    emit('close')
  }
}
</script>

<template>
  <div v-if="show" class="modal-backdrop float-in">
    <div class="modal-window">
      <!-- 头部 -->
      <div class="modal-head">
        <AppIcon :name="readonlyMode ? 'eye' : (creating ? 'plus' : 'edit')" :size="16" class="ic" />
        <h3>{{ readonlyMode ? '淘汰设备规则详情' : (creating ? '新建淘汰设备规则' : '编辑淘汰设备规则') }}</h3>
        <span v-if="!creating" class="rule-badge">{{ form.ruleId }}</span>
        <button class="close-btn" @click="$emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <!-- 标签导航页签 -->
      <div class="modal-tabs">
        <button 
          :class="['tab-btn', activeTab === 'basic' && 'active']"
          @click="activeTab = 'basic'"
        >
          <AppIcon name="info" :size="12" /> 基本选项
        </button>
        <button 
          :class="['tab-btn', activeTab === 'models' && 'active']"
          @click="activeTab = 'models'"
        >
          <AppIcon name="tag" :size="12" /> 型号系列 ({{ form.modelPattern.length }})
        </button>
        <button 
          :class="['tab-btn', activeTab === 'specs' && 'active']"
          @click="activeTab = 'specs'"
        >
          <AppIcon name="zap" :size="12" /> 参数规格约束 ({{ form.specConstraints.length }})
        </button>
      </div>

      <!-- 滚动体区域 -->
      <div class="modal-body">
        <!-- 加载中状态 -->
        <div v-if="loading" class="modal-loading-state">
          <div class="spinner"></div>
          <span>正在获取规则详情，请稍候...</span>
        </div>

        <template v-else>
          <!-- 标签页一：基本信息 -->
        <div v-show="activeTab === 'basic'" class="tab-pane">
          <div class="form-grid-2">
            <div class="form-row">
              <label>规则 ID <span class="req" v-if="creating">*</span></label>
              <input 
                class="input mono" 
                placeholder="例如 B4-1-X（保存后不可更改）"
                :disabled="!creating"
                v-model="form.ruleId"
              />
              <div v-if="creating && ruleIdConflict" class="error-tip" style="color: var(--danger); font-size: 11px; margin-top: 4px; font-weight: 500;">
                ❌ 该规则 ID 已存在，请换一个编号！
              </div>
              <div v-else-if="creating" class="helper">建议格式：B[批次]-[分类编号]-[序号]</div>
            </div>

            <div class="form-row">
              <label>淘汰批次 <span class="req">*</span></label>
              <select class="select" v-model="form.batch" :disabled="readonlyMode">
                <option v-for="b in Object.keys(BATCH_COLORS)" :key="b">{{ b }}</option>
              </select>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-row">
              <label>设备一级类型 <span class="req">*</span></label>
              <input class="input" placeholder="例如 电机、变压器" v-model="form.typeK" :disabled="readonlyMode" />
            </div>
            <div class="form-row">
              <label>设备二级类型</label>
              <input class="input" placeholder="例如 中小型三相异步电动机" v-model="form.subType" :disabled="readonlyMode" />
            </div>
            <div class="form-row">
              <label>型号系列</label>
              <input class="input" placeholder="例如 Y2、YE3" v-model="form.modelSeries" :disabled="readonlyMode" />
            </div>
          </div>

          <div class="form-row">
            <label>原始型号清单文本</label>
            <div class="string-list-editor">
              <div v-for="(str, idx) in form.modelListRaw" :key="idx" class="string-list-item">
                <input class="input mono" v-model="form.modelListRaw[idx]" :disabled="readonlyMode" placeholder="例如：J02-4" />
                <button v-if="!readonlyMode" class="btn-item-del" @click="form.modelListRaw.splice(idx, 1)">
                  <AppIcon name="trash" :size="12" />
                </button>
              </div>
              <button v-if="!readonlyMode" class="btn ghost btn-item-add" @click="form.modelListRaw.push('')">
                <AppIcon name="plus" :size="11" /> 添加型号文本
              </button>
            </div>
          </div>

          <div class="form-row">
            <label>产品名称 <span class="req">*</span></label>
            <input class="input" placeholder="例如 Y 系列三相异步电动机" v-model="form.product" :disabled="readonlyMode" />
          </div>

          <div class="form-grid-3">
            <div class="form-row">
              <label>置信度等级 <span class="req">*</span></label>
              <select class="select" v-model="form.confidence" :disabled="readonlyMode">
                <option v-for="c in confidenceOptions" :key="c.key" :value="c.key">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>生产年份约束</label>
              <input class="input" placeholder="例如 2012年及以前" v-model="form.productionYearConstraint" :disabled="readonlyMode" />
            </div>
            <div class="form-row">
              <label>原始文档页码</label>
              <input class="input mono" placeholder="例如 12" v-model="form.originalPage" :disabled="readonlyMode" />
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-row">
              <label>章节名称</label>
              <input class="input" placeholder="例如 1、电动机" v-model="form.section" :disabled="readonlyMode" />
            </div>
            <div class="form-row">
              <label>章节序号</label>
              <input class="input mono" type="number" min="1" placeholder="1" v-model.number="form.sectionNum" :disabled="readonlyMode" />
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-row">
              <label>淘汰类型 <span class="req">*</span></label>
              <select class="select" v-model="form.typeE" :disabled="readonlyMode">
                <option v-for="t in eliminationTypes" :key="t.key" :value="t.key">{{ t.name }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>淘汰截止日期</label>
              <input class="input mono" type="date" v-model="form.deadline" :disabled="readonlyMode" />
            </div>
            <div class="form-row">
              <label>淘汰具体原因</label>
              <input class="input" placeholder="输入淘汰理由..." v-model="form.reason" :disabled="readonlyMode" />
            </div>
          </div>

          <div class="form-row">
            <label>规格条件描述</label>
            <textarea class="textarea" rows="2" placeholder="输入规格条件描述，例如：电机额定效率低于限值..." v-model="form.specConditionDesc" :disabled="readonlyMode" />
          </div>

          <div class="form-row">
            <label>备注</label>
            <textarea class="textarea" rows="2" placeholder="输入备注与修正记录..." v-model="form.remark" :disabled="readonlyMode" />
          </div>

          <div class="form-row">
            <label>所依据国家标准</label>
            <div class="string-list-editor">
              <div v-for="(str, idx) in form.standard" :key="idx" class="string-list-item">
                <input class="input mono" v-model="form.standard[idx]" :disabled="readonlyMode" placeholder="例如：GB 18613-2012" />
                <button v-if="!readonlyMode" class="btn-item-del" @click="form.standard.splice(idx, 1)">
                  <AppIcon name="trash" :size="12" />
                </button>
              </div>
              <button v-if="!readonlyMode" class="btn ghost btn-item-add" @click="form.standard.push('')">
                <AppIcon name="plus" :size="11" /> 添加依据标准
              </button>
            </div>
          </div>

          <div class="form-row toggle-row">
            <div class="toggle-switch-wrap">
              <div 
                :class="['toggle-switch', form.enabled !== false && 'on', readonlyMode && 'disabled']"
                @click="!readonlyMode && (form.enabled = !form.enabled)"
              />
              <span>规则启用状态：<strong>{{ form.enabled ? '已启用' : '已停用' }}</strong></span>
            </div>
            <div class="helper">禁用的规则将不会被判定引擎调用。</div>
          </div>
        </div>

        <!-- 标签页二：型号系列 -->
        <div v-show="activeTab === 'models'" class="tab-pane">
          <div class="table-section-desc">
            为规则绑定对应的设备型号匹配模式，持久化于表 <strong>T_ST_ObsoleteCatalogModel</strong>。
          </div>
          <table class="edit-table">
            <thead>
              <tr>
                <th style="width: 80px">型号 ID</th>
                <th>型号匹配名称 / 前缀</th>
                <th style="width: 150px">判定匹配值</th>
                <th style="width: 150px">匹配模式</th>
                <th style="width: 60px; text-align: center" v-if="!readonlyMode">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="form.modelPattern.length === 0">
                <td :colspan="readonlyMode ? 4 : 5" class="empty-row-tip">
                  暂无匹配型号，默认将匹配所有型号。{{ readonlyMode ? '' : '点击下方按钮添加。' }}
                </td>
              </tr>
              <tr v-for="(m, idx) in form.modelPattern" :key="idx">
                <td class="id-col mono">{{ m.modelId > 0 ? m.modelId : '新增' }}</td>
                <td>
                  <input class="input-cell" placeholder="例如 Y2系列" v-model="m.modelName" :disabled="readonlyMode" />
                </td>
                <td>
                  <input class="input-cell mono" placeholder="不填默认用型号名称" v-model="m.matchValue" :disabled="readonlyMode" />
                </td>
                <td>
                  <select class="select-cell" :value="m.isPrefixMatch ? 'prefix' : 'exact'" @change="m.isPrefixMatch = ($event.target.value === 'prefix')" :disabled="readonlyMode">
                    <option value="prefix">前缀匹配</option>
                    <option value="exact">精确相等</option>
                  </select>
                </td>
                <td style="text-align: center" v-if="!readonlyMode">
                  <button class="cell-del-btn" @click="removeModelRow(idx)">
                    <AppIcon name="trash" :size="12" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <button v-if="!readonlyMode" class="add-row-btn" @click="addModelRow">
            <AppIcon name="plus" :size="12" /> 添加型号匹配
          </button>
        </div>

        <!-- 标签页三：参数规格约束 -->
        <div v-show="activeTab === 'specs'" class="tab-pane">
          <div class="table-section-desc">
            限制规则命中的参数指标区间，持久化于表 <strong>T_ST_ObsoleteCatalogSpecRange</strong>。
          </div>
          <table class="edit-table">
            <thead>
              <tr>
                <th style="width: 80px">规格 ID</th>
                <th style="width: 80px">条件组</th>
                <th style="width: 140px">参数名 (下拉联想)</th>
                <th style="width: 140px">逻辑运算符</th>
                <th>限制数值</th>
                <th style="width: 90px">单位</th>
                <th style="width: 60px; text-align: center" v-if="!readonlyMode">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="form.specConstraints.length === 0">
                <td :colspan="readonlyMode ? 6 : 7" class="empty-row-tip">
                  暂无任何技术参数规格限制条件。{{ readonlyMode ? '' : '点击下方按钮添加。' }}
                </td>
              </tr>
              <tr v-for="(s, idx) in form.specConstraints" :key="idx">
                <td class="id-col mono">{{ s.specId > 0 ? s.specId : '新增' }}</td>
                <td>
                  <input class="input-cell mono" type="number" min="1" v-model.number="s.groupSeq" :disabled="readonlyMode" />
                </td>
                <td>
                  <input list="attributes-list" class="input-cell" placeholder="如：功率" v-model="s.field" :disabled="readonlyMode" />
                </td>
                <td>
                  <select class="select-cell" v-model="s.op" :disabled="readonlyMode">
                    <option v-for="op in logicOps" :key="op.key" :value="op.key">{{ op.name }}</option>
                  </select>
                </td>
                <td>
                  <div class="cell-vals">
                    <template v-if="s.op === '='">
                      <input class="input-cell mono" type="number" step="0.0001" placeholder="等于值" v-model.number="s.val1" :disabled="readonlyMode" />
                    </template>
                    <template v-else>
                      <input class="input-cell mono" type="number" step="0.0001" placeholder="最小值" v-model.number="s.val1" :disabled="readonlyMode" />
                      <span class="sep">~</span>
                      <input class="input-cell mono" type="number" step="0.0001" placeholder="最大值" v-model.number="s.val2" :disabled="readonlyMode" />
                    </template>
                  </div>
                </td>
                <td>
                  <input class="input-cell mono" placeholder="如：kW" v-model="s.unit" :disabled="readonlyMode" />
                </td>
                <td style="text-align: center" v-if="!readonlyMode">
                  <button class="cell-del-btn" @click="removeSpecRow(idx)">
                    <AppIcon name="trash" :size="12" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <button v-if="!readonlyMode" class="add-row-btn" @click="addSpecRow">
            <AppIcon name="plus" :size="12" /> 添加参数规格约束
          </button>
        </div>
      </template>
    </div>

      <!-- 底部操作按钮 -->
      <div class="modal-foot">
        <template v-if="readonlyMode">
          <button class="btn ghost" @click="$emit('close')">
            关闭
          </button>
          <button class="btn primary" @click="readonlyMode = false">
            <AppIcon name="edit" :size="12" /> 编辑此规则
          </button>
        </template>
        <template v-else>
          <button class="btn ghost" @click="handleCancelEdit">
            <AppIcon name="chevron-left" :size="12" /> {{ props.mode === 'view' ? '取消编辑' : '取消' }}
          </button>
          <button class="btn primary" :disabled="props.creating && ruleIdConflict" @click="handleSave">
            <AppIcon name="check" :size="12" /> 保存规则
          </button>
        </template>
      </div>
    </div>
  </div>

  <!-- 全局属性名称词典联想库 -->
  <datalist id="attributes-list">
    <option v-for="name in attributeNames" :key="name" :value="name" />
  </datalist>
</template>

<style scoped>
/* ── 模态框背景 ── */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
}

/* ── 模态窗口 ── */
.modal-window {
  width: 100%;
  max-width: 820px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 60px);
  overflow: hidden;
  animation: modal-zoom-in 0.25s ease-out;
}
@keyframes modal-zoom-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── 头部 ── */
.modal-head {
  padding: 16px 24px;
  background: #f8fafc;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 12px;
}
.modal-head .ic {
  color: var(--brand);
}
.modal-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-0);
  flex: 1;
}
.modal-head .rule-badge {
  padding: 3px 8px;
  background: rgba(47, 127, 255, 0.1);
  color: var(--brand);
  font-family: "JetBrains Mono", monospace;
  font-weight: 600;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid rgba(47, 127, 255, 0.2);
}
.close-btn {
  background: none;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.close-btn:hover {
  background: #f1f5f9;
  color: var(--text-1);
}

/* ── 页签卡片 ── */
.modal-tabs {
  display: flex;
  border-bottom: 1px solid var(--line);
  background: #f8fafc;
  padding: 0 16px;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  font-size: 12.5px;
  color: var(--text-2);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s;
}
.tab-btn:hover {
  color: var(--text-0);
}
.tab-btn.active {
  color: var(--brand);
  border-bottom-color: var(--brand);
  font-weight: 600;
}

/* ── 滚动区域 ── */
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── 表单排版 ── */
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
.form-row {
  display: flex;
  flex-direction: column;
}
.form-row label {
  font-size: 11.5px;
  color: var(--text-2);
  margin-bottom: 6px;
  font-weight: 500;
}
.form-row label .req {
  color: var(--danger);
}
.form-row .helper {
  font-size: 10.5px;
  color: var(--text-3);
  margin-top: 4px;
}
.input, .select, .textarea {
  width: 100%;
  padding: 8px 12px;
  font-size: 12.5px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text-0);
  outline: none;
  font-family: inherit;
  transition: all 0.15s;
}
.input:focus, .select:focus, .textarea:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(47, 127, 255, 0.1);
}
.input:disabled, .select:disabled, .textarea:disabled {
  background: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
  border-color: #cbd5e1;
}
.textarea {
  resize: vertical;
}

/* ── 开关选项 ── */
.toggle-row {
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px dashed var(--line);
}
.toggle-switch-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.toggle-switch {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: #cbd5e1;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}
.toggle-switch.on {
  background: var(--ok);
}
.toggle-switch::after {
  content: "";
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: left 0.2s;
}
.toggle-switch.on::after {
  left: 18px;
}
.toggle-switch.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── 表格化列表编辑 ── */
.table-section-desc {
  font-size: 12px;
  color: var(--text-2);
  margin-bottom: 8px;
}
.table-section-desc strong {
  color: var(--text-0);
  font-family: "JetBrains Mono", monospace;
}
.edit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
}
.edit-table th {
  padding: 10px 12px;
  background: #f8fafc;
  color: var(--text-2);
  font-weight: 500;
  text-align: left;
  border-bottom: 1px solid var(--line);
}
.edit-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}
.edit-table .id-col {
  color: var(--text-3);
  font-weight: 600;
}
.edit-table .empty-row-tip {
  text-align: center;
  padding: 32px;
  color: var(--text-3);
}
.input-cell, .select-cell {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 12px;
  background: white;
  outline: none;
  font-family: inherit;
}
.input-cell:focus, .select-cell:focus {
  border-color: var(--brand);
}
.input-cell:disabled, .select-cell:disabled {
  background: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}
.cell-vals {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cell-vals .sep {
  color: var(--text-3);
}
.cell-del-btn {
  background: none;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
}
.cell-del-btn:hover {
  background: #fef2f2;
  color: var(--danger);
}
.add-row-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-1);
  cursor: pointer;
  font-weight: 500;
  margin-top: 12px;
  transition: all 0.12s;
}
.add-row-btn:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: #f8fafc;
}

/* ── 底部操作栏 ── */
.modal-foot {
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.modal-foot .btn {
  padding: 8px 20px;
  font-size: 12.5px;
}

/* ── 加载中状态 ── */
.modal-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 16px;
  color: var(--text-2);
  font-size: 13px;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(47, 127, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--brand);
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 列表式编辑器样式 ── */
.string-list-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  max-height: 180px;
  overflow-y: auto;
}
.string-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.string-list-item .input {
  flex: 1;
  padding: 6px 10px;
}
.btn-item-del {
  background: none;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.btn-item-del:hover {
  background: #fef2f2;
  color: var(--danger);
}
.btn-item-add {
  align-self: flex-start;
  font-size: 11.5px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: white;
  border: 1px dashed var(--line);
  color: var(--text-1);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}
.btn-item-add:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: #f1f5f9;
}
</style>

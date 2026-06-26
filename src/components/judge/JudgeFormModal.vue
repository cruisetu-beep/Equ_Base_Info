<script setup>
// ── components/judge/JudgeFormModal.vue ───────────────────────────
// 设备淘汰判定档案查看与人工直判表单统一弹窗，支持只读查看/人工直判/档案二次修改
import { ref, watch, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { getObsoleteBatches, getEliminationTypesFromDb, saveJudgeResults } from '@/api/judge'
import { getRuleList } from '@/api/rules'

const props = defineProps({
  show:   { type: Boolean, default: false },
  device: { type: Object,  required: true },
  basis:  { type: Object,  default: null }  // 已存的淘汰档案依据，为空代表“新建人工判定”
})
const emit = defineEmits(['close', 'success'])

const isEdit       = ref(false)
const saving       = ref(false)

// 表单输入
const selectedStatus   = ref('正常') // 正常 | 限期淘汰 | 强制淘汰
const selectedBatch    = ref('')
const selectedRuleId   = ref('')
const judgmentCriteria = ref('')
const desc             = ref('')

// 下拉字典数据
const batches          = ref([])
const rulesOfBatch     = ref([])
const eliminationTypes = ref(['强制淘汰', '限期淘汰', '正常'])

// 初始化状态
const initForm = async () => {
  saving.value = false
  
  // 1. 获取动态淘汰类型列表
  try {
    const types = await getEliminationTypesFromDb()
    if (types && types.length > 0) {
      // 规范化加上“淘汰”后缀以兼容回显
      const list = types.map(t => {
        if (!t || t === '正常') return t
        return t.endsWith('淘汰') ? t : t + '淘汰'
      })
      // 确保包含“正常”选项
      if (!list.includes('正常')) list.push('正常')
      eliminationTypes.value = list
    }
  } catch (err) {
    console.error('获取淘汰类型列表失败:', err)
  }

  // 2. 获取批次列表
  try {
    const batchList = await getObsoleteBatches()
    batches.value = batchList || []
  } catch (err) {
    console.error('获取批次列表失败:', err)
  }

  // 3. 根据是否传入已有的 basis 档案决定模式
  if (props.basis) {
    isEdit.value = false // 默认只读查看模式
    selectedStatus.value = props.basis.eliminationType || '正常'
    judgmentCriteria.value = props.basis.judgmentCriteria || ''
    desc.value = props.basis.desc || ''
    selectedRuleId.value = props.basis.ruleId || ''

    if (props.basis.ruleId) {
      // 如果已绑定规则，查出该规则详情以匹配批次，并拉取该批次下的全部规则列表以供编辑时重新选择
      try {
        // 通过 ruleId 查规则（通过 getRuleList 检索）
        const ruleRes = await getRuleList({ Q: props.basis.ruleId, PageSize: 1 })
        if (ruleRes && ruleRes.table && ruleRes.table.length > 0) {
          const ruleObj = ruleRes.table[0]
          selectedBatch.value = ruleObj.batch || ''
          if (ruleObj.batch) {
            const batchRulesRes = await getRuleList({ FilterBatch: ruleObj.batch, PageSize: 9999 })
            rulesOfBatch.value = batchRulesRes.table || []
          } else {
            rulesOfBatch.value = [ruleObj]
          }
        }
      } catch (err) {
        console.error('拉取已绑定规则详情及同批次规则失败:', err)
      }
    }
  } else {
    isEdit.value = true // 默认新建人工判定模式
    selectedStatus.value = '正常'
    selectedBatch.value = ''
    selectedRuleId.value = ''
    judgmentCriteria.value = '经核对物理铭牌参数，不满足任何高耗能落后目录判定特征，判定为能效正常设备。'
    desc.value = '人工直接判定正常。'
    rulesOfBatch.value = []
  }
}

// 监听弹窗显示
watch(() => props.show, (newVal) => {
  if (newVal) {
    initForm()
  }
})

// 级联选择：批次联动拉取规则
watch(selectedBatch, async (newBatch) => {
  if (!isEdit.value) return // 移除限制，允许在修改已有档案时重选批次联动更新规则
  if (!newBatch) {
    rulesOfBatch.value = []
    return
  }
  try {
    const res = await getRuleList({ FilterBatch: newBatch, PageSize: 9999 })
    rulesOfBatch.value = res.table || []
  } catch (err) {
    console.error('根据批次获取规则列表失败:', err)
  }
})

// 级联选择：规则选择后自动带入参数
watch(selectedRuleId, (newRuleId) => {
  if (!isEdit.value) return // 移除限制，允许在修改已有档案时重新绑定规则并联动预填
  if (!newRuleId) return
  const ruleObj = rulesOfBatch.value.find(r => r.ruleId === newRuleId)
  if (ruleObj) {
    // 联动预填
    selectedStatus.value = ruleObj.typeE === '强制' ? '强制淘汰' : '限期淘汰'
    judgmentCriteria.value = `型号${ruleObj.modelSeries ? '前缀' : '精确'}匹配: ${ruleObj.modelSeries || props.device.model || '—'}, 规则: ${ruleObj.ruleId}, 批次: ${selectedBatch.value}`
    desc.value = `依据标准：${ruleObj.nationalStandard || ruleObj.product || '无'}; 截止淘汰日期：${ruleObj.deadline || '无'}`
  }
})

// 保存人工判定 / 更新
const handleSave = async () => {
  if (!selectedStatus.value) {
    alert('请选择判定结论状态！')
    return
  }
  if (!judgmentCriteria.value.trim()) {
    alert('请输入判定依据描述！')
    return
  }

  saving.value = true
  try {
    const saveItem = {
      equId: props.device.id || props.device.equId,
      buildId: props.device.buildingId || props.device.buildId || 'BUILD-0001',
      ruleId: selectedRuleId.value || null,
      eliminationType: selectedStatus.value,
      matchMethod: props.basis 
        ? (props.basis.matchMethod || '人工二次修正') 
        : '规则库级联选择判定',
      judgmentCriteria: judgmentCriteria.value.trim(),
      desc: desc.value.trim()
    }

    const success = await saveJudgeResults([saveItem])
    if (success) {
      alert(props.basis ? '淘汰判定档案已成功订正更新！' : '设备判定档案已建立成功！')
      emit('success', saveItem)
      emit('close')
    } else {
      throw new Error('写档未返回成功状态')
    }
  } catch (err) {
    console.error('保存淘汰判定失败:', err)
    alert('保存失败，请检查网络或后台服务！')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-window">
      
      <!-- 头部 -->
      <div class="modal-head">
        <div class="ic">
          <AppIcon :name="props.basis ? 'archive' : 'zap'" :size="20" stroke="var(--brand-2)" />
        </div>
        <h3>{{ props.basis ? '设备淘汰判定档案' : '人工淘汰判定直录表' }}</h3>
        <span class="dev-badge">{{ props.device.name }} ({{ props.device.code }})</span>
        <button class="close-btn" @click="$emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <!-- 主滚动区域 -->
      <div class="modal-body">
        
        <!-- 设备基本档案（只读展示，带锁定锁标志） -->
        <div class="form-section">
          <h5><AppIcon name="lock" :size="12" /> 受保护唯一标识（不可改）</h5>
          <div class="readonly-badge-grid">
            <div class="rb-item">
              <span class="k">系统主键 (F_BasisID)</span>
              <span class="v mono">{{ props.basis ? props.basis.basisId : '（自动生成）' }}</span>
            </div>
            <div class="rb-item">
              <span class="k">设备编码 (F_EquID)</span>
              <span class="v mono">{{ props.device.id || props.device.equId }}</span>
            </div>
            <div class="rb-item">
              <span class="k">建筑编码 (F_BuildID)</span>
              <span class="v mono">{{ props.device.buildingId || props.device.buildId || 'BUILD-0001' }}</span>
            </div>
          </div>
        </div>

        <div class="form-divider" />

        <!-- 判定条件与录入区域 -->
        <div class="form-section">
          <h5><AppIcon name="edit" :size="12" /> 判定内容与调整结论</h5>
          
          <div class="form-grid-2" style="margin-top:12px">
            <!-- 判定状态 -->
            <div class="form-row">
              <label>判定最终结论 (F_EliminationType) <span class="req" v-if="isEdit">*</span></label>
              <select v-model="selectedStatus" :disabled="!isEdit" class="select">
                <option v-for="t in eliminationTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>

          <!-- 级联选择规则 -->
          <div class="cascade-section form-grid-2" style="margin-top:12px">
            <div class="form-row">
              <label>1. 筛选淘汰批次</label>
              <select v-model="selectedBatch" :disabled="!isEdit" class="select">
                <option value="">-- 请选择判定批次 --</option>
                <option v-for="b in batches" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>2. 关联目录规则 (F_RuleID)</label>
              <select v-model="selectedRuleId" :disabled="!isEdit || !selectedBatch" class="select">
                <option value="">-- 请选择匹配规则 --</option>
                <option v-for="r in rulesOfBatch" :key="r.ruleId" :value="r.ruleId">
                  [{{ r.ruleId }}] {{ r.product || r.modelSeries }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row" style="margin-top:14px">
            <label>判定依据文字描述 (F_JudgmentCriteria) <span class="req" v-if="isEdit">*</span></label>
            <textarea 
              v-model="judgmentCriteria" 
              :disabled="!isEdit" 
              rows="3" 
              class="textarea" 
              placeholder="请输入最终归档的淘汰判定文字证据或事实依据描述..."
            />
          </div>

          <div class="form-row" style="margin-top:14px">
            <label>备注补充说明 (F_Desc)</label>
            <textarea 
              v-model="desc" 
              :disabled="!isEdit" 
              rows="2" 
              class="textarea" 
              placeholder="可输入判定档案的备注说明，如改造计划、现场踏勘结论等..."
            />
          </div>

          <!-- 如果是只读查看，展示归档人与时间 -->
          <div class="archive-meta" v-if="props.basis && !isEdit">
            <div><span class="lbl">判定方式：</span>{{ props.basis.matchMethod || '规则自动判定' }}</div>
            <div><span class="lbl">判定日期：</span>{{ props.basis.judgmentDate ? props.basis.judgmentDate.slice(0, 10) : '—' }}</div>
          </div>
        </div>

      </div>

      <!-- 底部控制栏 -->
      <div class="modal-foot">
        <template v-if="!isEdit">
          <button class="btn ghost" @click="$emit('close')">关闭</button>
          <button class="btn primary" @click="isEdit = true">
            <AppIcon name="edit" :size="13" /> 修改判定档案
          </button>
        </template>
        <template v-else>
          <button class="btn ghost" :disabled="saving" @click="props.basis ? (isEdit = false) : $emit('close')">取消</button>
          <button class="btn primary" :disabled="saving" @click="handleSave">
            <div v-if="saving" class="spin-icon"></div>
            <AppIcon v-else name="save" :size="13" />
            保存判定档案
          </button>
        </template>
      </div>

    </div>
  </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  overflow-y: auto;
}

.modal-window {
  width: 100%;
  max-width: 680px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  margin-top: 60px; /* 弹窗打开时的位置往上调一点 */
  max-height: calc(100vh - 120px);
  overflow: hidden;
  animation: modal-zoom-in 0.22s ease-out;
}

@keyframes modal-zoom-in {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-head {
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
}
.modal-head .ic { color: var(--brand); display: flex; align-items: center; }
.modal-head h3 { margin: 0; font-size: 14.5px; font-weight: 600; color: var(--text-0); flex: 1; }
.modal-head .dev-badge {
  padding: 3px 8px; background: rgba(77,201,255,0.10); color: var(--brand);
  font-size: 11px; font-weight: 500; border-radius: 4px; border: 1px solid rgba(77,201,255,0.20);
}
.close-btn { background: none; border: none; color: var(--text-3); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; }
.close-btn:hover { background: #eef2f6; color: var(--text-1); }

.modal-body { padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }

.form-section h5 { margin: 0 0 12px; font-size: 12px; color: var(--text-1); display: flex; align-items: center; gap: 6px; font-weight: 600; }
.form-divider { height: 1px; background: var(--line); margin: 4px 0; }

/* 核心唯一只读项 */
.readonly-badge-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.rb-item {
  padding: 8px 12px; background: #f8fafc; border: 1px solid var(--line); border-radius: 6px;
  display: flex; flex-direction: column; gap: 3px;
}
.rb-item .k { font-size: 10.5px; color: var(--text-3); }
.rb-item .v { font-size: 12px; color: var(--text-1); font-weight: 500; }
.rb-item .v.highlight { color: var(--brand); }

.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-row { display: flex; flex-direction: column; }
.form-row label { font-size: 11.5px; color: var(--text-2); margin-bottom: 6px; font-weight: 500; }
.form-row label .req { color: var(--danger); }

.select, .textarea {
  width: 100%; padding: 8px 12px; font-size: 12.5px; background: white;
  border: 1px solid var(--line-strong); border-radius: 6px; color: var(--text-0);
  outline: none; font-family: inherit; transition: all 0.15s; box-sizing: border-box;
}
.select:focus, .textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(47,127,255,0.1); }
.select:disabled, .textarea:disabled { background: #f1f5f9; color: #64748b; cursor: not-allowed; border-color: #cbd5e1; }

.cascade-section {
  background: #f7f9fd; border: 1px dashed rgba(47,127,255,0.30); border-radius: 8px;
  padding: 12px; margin-top: 12px;
}

.toggle-switch-wrap { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-1); margin-top: 6px; height: 32px; }
.toggle-switch {
  width: 34px; height: 18px; border-radius: 9px; background: #cbd5e1; cursor: pointer;
  position: relative; transition: background 0.2s;
}
.toggle-switch.on { background: var(--brand); }
.toggle-switch::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: left 0.2s;
}
.toggle-switch.on::after { left: 18px; }

.archive-meta {
  display: flex; gap: 20px; font-size: 11px; color: var(--text-2); margin-top: 14px;
  background: #fafafa; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--line);
}
.archive-meta .lbl { color: var(--text-3); }

.modal-foot { padding: 14px 20px; background: #f8fafc; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; gap: 10px; }

.spin-icon {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.25); border-radius: 50%;
  border-top-color: white; animation: spin 0.8s linear infinite; display: inline-block; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

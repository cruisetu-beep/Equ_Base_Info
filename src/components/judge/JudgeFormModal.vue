<script setup>
// ── components/judge/JudgeFormModal.vue ───────────────────────────
// 设备淘汰判定档案多Tab查看与单独修改弹窗，支持多维度判定显示、自定义流程增加、单条极速保存
import { ref, onMounted, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { getObsoleteBatches, getEliminationTypesFromDb, getJudgeBasisList, saveSingleBasis } from '@/api/judge'
import { getRuleList } from '@/api/rules'

const props = defineProps({
  show:   { type: Boolean, default: false },
  device: { type: Object,  required: true }
})
const emit = defineEmits(['close', 'success'])

const saving       = ref(false)
const basisList    = ref([]) // 该设备的所有有效淘汰档案列表
const activeTab    = ref('') // 当前处于活跃状态的流程 Tab 名称

// 当前 Tab 对应的档案编辑表单数据
const activeForm = ref({
  basisId: 0,
  judgmentProcess: '',
  eliminationType: '正常',
  selectedBatch: '',
  selectedRuleId: '',
  judgmentCriteria: '',
  desc: '',
  rulesOfBatch: [],
  isEdit: false
})



// 下拉字典数据
const batches          = ref([])
const eliminationTypes = ref(['强制淘汰', '限期淘汰', '正常'])

// 统一标准化的最终结论回显转换函数，防止前后端字样差异导致下拉框空白
const normType = (type) => {
  if (!type || type === '正常') return '正常'
  if (type.includes('强制')) return '强制淘汰'
  if (type.includes('限期')) return '限期淘汰'
  if (type.includes('过渡')) return '过渡淘汰'
  return type
}

// 加载该设备的全部淘汰判定记录
const loadBasisList = async () => {
  try {
    const equId = props.device.id || props.device.equId
    const list = await getJudgeBasisList(equId)
    basisList.value = list || []
    
    // 对存量数据进行流程分类名称的智能识别与兜底映射，防止页面上显示空白页签
    basisList.value.forEach(x => {
      const p = x.judgmentProcess || x.JudgmentProcess
      if (!p) {
        const method = x.matchMethod || x.MatchMethod || ''
        const ruleId = x.ruleId || x.RuleId
        if (method.includes('能效') || method.includes('能耗')) {
          x.judgmentProcess = '能效判定'
        } else if (method.includes('AI') || method.includes('智能')) {
          x.judgmentProcess = 'AI判定'
        } else if (ruleId) {
          x.judgmentProcess = '规则判定'
        } else {
          x.judgmentProcess = '人工判定'
        }
      } else {
        x.judgmentProcess = p
      }
    })
    
    // 如果没有任何判定记录，默认在本地塞入一条“人工判定”作为初始展示
    if (basisList.value.length === 0) {
      basisList.value.push({
        basisId: 0,
        equId: equId,
        buildId: props.device.buildingId || props.device.buildId || 'BUILD-0001',
        judgmentProcess: '人工判定',
        eliminationType: '正常',
        judgmentCriteria: '经核对物理铭牌参数，不满足任何高耗能落后目录判定特征，判定为能效正常设备。',
        desc: '人工直接判定正常。'
      })
    }
    
    // 默认选中现有的第一个流程 Tab，如果之前已有选中且该流程仍然存在则保留
    const defaultProc = activeTab.value && basisList.value.some(x => x.judgmentProcess === activeTab.value)
      ? activeTab.value
      : basisList.value[0].judgmentProcess
      
    selectTab(defaultProc)
  } catch (err) {
    console.error('加载设备判定档案失败:', err)
    // 降级防空保护：即使查询接口故障（如后端未重新编译部署），也默认提供人工判定 Tab 供使用
    const equId = props.device.id || props.device.equId
    basisList.value = [{
      basisId: 0,
      equId: equId,
      buildId: props.device.buildingId || props.device.buildId || 'BUILD-0001',
      judgmentProcess: '人工判定',
      eliminationType: '正常',
      judgmentCriteria: '经核对物理铭牌参数，不满足任何高耗能落后目录判定特征，判定为能效正常设备。',
      desc: '由于拉取失败，已自动降级开启人工直接判定。'
    }]
    selectTab('人工判定')
  }
}

// 切换流程 Tab (在此状态下切换完全不会触发多余的 API 请求)
const selectTab = (procName) => {
  activeTab.value = procName
  
  const match = basisList.value.find(x => x.judgmentProcess === procName)
  
  if (match) {
    const bId = match.basisId || match.BasisId || 0
    activeForm.value = {
      basisId: bId,
      judgmentProcess: procName,
      eliminationType: normType(match.eliminationType || match.EliminationType || '正常'),
      selectedBatch: '',
      selectedRuleId: match.ruleId || match.RuleId || '',
      judgmentCriteria: match.judgmentCriteria || match.JudgmentCriteria || '',
      desc: match.desc || match.Desc || '',
      rulesOfBatch: [],
      isEdit: bId === 0 // 尚未写入过数据库的新增 Tab 默认可编辑，已有的默认只读
    }
  } else {
    activeForm.value = {
      basisId: 0,
      judgmentProcess: procName,
      eliminationType: '正常',
      selectedBatch: '',
      selectedRuleId: '',
      judgmentCriteria: `经${procName}校验，该设备符合能效标准，未检出落后指标。`,
      desc: '',
      rulesOfBatch: [],
      isEdit: true
    }
  }
}

// 进入编辑状态时延迟拉取规则数据
const enterEditMode = async () => {
  activeForm.value.isEdit = true
  const ruleId = activeForm.value.selectedRuleId
  if (ruleId && activeForm.value.rulesOfBatch.length === 0) {
    try {
      const ruleRes = await getRuleList({ Q: ruleId, PageSize: 1 })
      if (ruleRes && ruleRes.table && ruleRes.table.length > 0) {
        const ruleObj = ruleRes.table[0]
        activeForm.value.selectedBatch = ruleObj.batch || ''
        if (ruleObj.batch) {
          const batchRulesRes = await getRuleList({ FilterBatch: ruleObj.batch, PageSize: 9999 })
          activeForm.value.rulesOfBatch = batchRulesRes.table || []
        } else {
          activeForm.value.rulesOfBatch = [ruleObj]
        }
      }
    } catch (err) {
      console.error('拉取已绑定规则详情失败:', err)
    }
  }
}

// 初始化状态
let isInitializing = false
const initForm = async () => {
  if (isInitializing) return
  isInitializing = true
  try {
    saving.value = false
    
    // 1. 获取动态淘汰类型列表
    const p1 = (async () => {
      try {
        const types = await getEliminationTypesFromDb()
        if (types && types.length > 0) {
          const list = types.map(t => (t === '正常') ? t : (t.endsWith('淘汰') ? t : t + '淘汰'))
          if (!list.includes('正常')) list.push('正常')
          eliminationTypes.value = list
        }
      } catch (err) {
        console.error('获取淘汰类型列表失败:', err)
      }
    })()

    // 2. 获取批次列表
    const p2 = (async () => {
      try {
        const batchList = await getObsoleteBatches()
        batches.value = batchList || []
      } catch (err) {
        console.error('获取批次列表失败:', err)
      }
    })()
    
    // 3. 拉取并初始化该设备的判定记录列表
    const p3 = loadBasisList()

    // 并发执行所有无依赖的请求，大幅缩短打开弹窗时的等待时间
    await Promise.all([p1, p2, p3])
  } finally {
    isInitializing = false
  }
}

// 挂载时与 show 状态变化时双通道执行初始化，拉取该设备的全部淘汰判定记录
onMounted(initForm)
watch(() => props.show, (newVal) => {
  if (newVal) {
    initForm()
  }
})

// 级联选择：批次联动拉取规则
const handleBatchChange = async () => {
  activeForm.value.selectedRuleId = ''
  if (!activeForm.value.selectedBatch) {
    activeForm.value.rulesOfBatch = []
    return
  }
  try {
    const res = await getRuleList({ FilterBatch: activeForm.value.selectedBatch, PageSize: 9999 })
    activeForm.value.rulesOfBatch = res.table || []
  } catch (err) {
    console.error('根据批次获取规则列表失败:', err)
  }
}

// 级联选择：规则选择后自动带入参数
const handleRuleChange = () => {
  const newRuleId = activeForm.value.selectedRuleId
  if (!newRuleId) return
  const ruleObj = activeForm.value.rulesOfBatch.find(r => r.ruleId === newRuleId)
  if (ruleObj) {
    activeForm.value.eliminationType = ruleObj.typeE === '强制' ? '强制淘汰' : '限期淘汰'
    activeForm.value.judgmentCriteria = `型号${ruleObj.modelSeries ? '前缀' : '精确'}匹配: ${ruleObj.modelSeries || props.device.model || '—'}, 规则: ${ruleObj.ruleId}, 批次: ${activeForm.value.selectedBatch}`
    activeForm.value.desc = `依据标准：${ruleObj.nationalStandard || ruleObj.product || '无'}; 截止淘汰日期：${ruleObj.deadline || '无'}`
  }
}

// 点击 '+' 新增一个判定流程，自动按已有序号递增生成
const handleAddProcess = () => {
  const customCount = basisList.value.filter(x => x.judgmentProcess.startsWith('人工判定')).length
  const name = `人工判定${customCount + 1}`
  
  // 在本地列表插入一个临时的空白档案项
  const equId = props.device.id || props.device.equId
  const newTemp = {
    basisId: 0,
    equId: equId,
    buildId: props.device.buildingId || props.device.buildId || 'BUILD-0001',
    judgmentProcess: name,
    eliminationType: '正常',
    judgmentCriteria: `经【${name}】人工校验，判定为正常。`,
    desc: '用户新增判定流程。',
    isNew: true
  }
  basisList.value.push(newTemp)
  
  // 切换过去并开启编辑
  selectTab(name)
}

// 处理取消编辑
const handleCancelEdit = () => {
  if (activeForm.value.basisId > 0) {
    activeForm.value.isEdit = false
  } else {
    // 对于新增的判定流程，如果当前设备没有任何已保存的记录，则取消直接关闭弹窗
    const hasSaved = basisList.value.some(x => x.basisId > 0)
    if (!hasSaved) {
      emit('close')
    } else {
      // 否则丢弃未保存的临时页签，重新加载已有记录
      loadBasisList()
    }
  }
}

// 单条判定结果独立保存
const handleSave = async () => {
  const form = activeForm.value
  if (!form.judgmentProcess.trim()) {
    alert('请输入判定流程名称！')
    return
  }
  if (!form.eliminationType) {
    alert('请选择判定结论状态！')
    return
  }
  if (!form.judgmentCriteria.trim()) {
    alert('请输入判定依据描述！')
    return
  }

  saving.value = true
  try {
    const saveItem = {
      basisId: form.basisId,
      equId: props.device.id || props.device.equId,
      buildId: props.device.buildingId || props.device.buildId || 'BUILD-0001',
      ruleId: form.selectedRuleId || null,
      eliminationType: form.eliminationType,
      matchMethod: form.basisId > 0 ? '人工二次修正' : '人工直接判定',
      judgmentCriteria: form.judgmentCriteria.trim(),
      desc: form.desc.trim(),
      judgmentProcess: form.judgmentProcess.trim()
    }

    const success = await saveSingleBasis(saveItem)
    if (success) {
      alert('当前判定流程的档案已成功保存！')
      
      // 重新加载列表保持同步
      await loadBasisList()
      emit('success')
    } else {
      throw new Error('单条写档未返回成功状态')
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
      <div class="modal-head" style="padding:16px 20px; border-bottom:1px solid var(--line);">
        <div class="ic">
          <AppIcon name="archive" :size="20" stroke="var(--brand-2)" />
        </div>
        <h3>设备淘汰判定档案</h3>
        <span class="dev-badge">{{ props.device.name }} ({{ props.device.code }})</span>
        <button class="close-btn" @click="$emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <!-- 主滚动区域 -->
      <div class="modal-body" style="padding:16px 20px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
        
        <!-- 判定流程选项卡及追加功能 (挪到最顶层) -->
        <div class="form-section" style="padding:0; margin:0;">
          <div class="modal-proc-tabs" style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
            <button 
              v-for="proc in basisList" 
              :key="proc.judgmentProcess"
              class="proc-tab-btn"
              :class="{ active: activeTab === proc.judgmentProcess }"
              @click="selectTab(proc.judgmentProcess)"
              style="padding:6px 12px; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; border:1px solid var(--line); transition:all 0.2s;"
              :style="(!proc.eliminationType && !proc.EliminationType) || ['未判定', '待判定'].includes(proc.eliminationType || proc.EliminationType)
                ? (activeTab === proc.judgmentProcess ? 'background: var(--brand-08); color: var(--brand); border-color: var(--brand);' : 'background: var(--bg-hover); color: var(--text-2);')
                : (proc.eliminationType || proc.EliminationType).includes('正常')
                  ? (activeTab === proc.judgmentProcess ? 'background: rgba(43,217,168,0.15); color: #2bd9a8; border-color: #2bd9a8;' : 'background: rgba(43,217,168,0.08); color: #2bd9a8; border-color: rgba(43,217,168,0.30);')
                  : (activeTab === proc.judgmentProcess ? 'background: rgba(224,57,79,0.15); color: #ff8da0; border-color: #ff8da0;' : 'background: rgba(224,57,79,0.10); color: #ff8da0; border-color: rgba(224,57,79,0.30);')"
            >
              {{ proc.judgmentProcess }} ({{ (!proc.eliminationType && !proc.EliminationType) || ['未判定', '待判定'].includes(proc.eliminationType || proc.EliminationType) ? '未判定' : (proc.eliminationType || proc.EliminationType).includes('正常') ? '正常' : '淘汰' }})
            </button>

            <!-- 动态增加判定结果入口 (点击直接一键添加) -->
            <div class="add-proc-trigger" @click="handleAddProcess" 
                 style="padding:5px 12px; border-radius:6px; border:1px dashed var(--brand); color:var(--brand); font-size:13px; cursor:pointer; display:flex; align-items:center; gap:4px;">
              <AppIcon name="plus" :size="12" />
              <span>增加结果</span>
            </div>
          </div>
        </div>

        <!-- 判定数据表单区（数据跟随 Tab 切换） -->
        <div class="form-section" style="padding:0; margin:0; display:flex; flex-direction:column; gap:12px;">
          
          <!-- 设备与系统底层关联键（无显式分组标题，直观且不可编辑） -->
          <div class="readonly-badge-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
            <div class="rb-item" style="padding:6px 10px; background:var(--bg-hover); border-radius:6px; border:1px solid var(--line); display:flex; flex-direction:column;">
              <span class="k" style="font-size:11px; color:var(--text-3);">系统主键</span>
              <span class="mono" style="font-size:12px; font-weight:600; color:var(--text-2); margin-top:2px;">{{ activeForm.basisId > 0 ? activeForm.basisId : '（自动生成）' }}</span>
            </div>
            <div class="rb-item" style="padding:6px 10px; background:var(--bg-hover); border-radius:6px; border:1px solid var(--line); display:flex; flex-direction:column;">
              <span class="k" style="font-size:11px; color:var(--text-3);">设备编码</span>
              <span class="mono" style="font-size:12px; font-weight:600; color:var(--text-2); margin-top:2px;">{{ props.device.id || props.device.equId }}</span>
            </div>
            <div class="rb-item" style="padding:6px 10px; background:var(--bg-hover); border-radius:6px; border:1px solid var(--line); display:flex; flex-direction:column;">
              <span class="k" style="font-size:11px; color:var(--text-3);">建筑编码</span>
              <span class="mono" style="font-size:12px; font-weight:600; color:var(--text-2); margin-top:2px;">{{ props.device.buildingId || props.device.buildId || 'BUILD-0001' }}</span>
            </div>
          </div>

          <!-- 核心属性表单录入网格 -->
          <div class="form-grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:4px;">
            <!-- 判定流程大类 (支持手动修改或输入分类) -->
            <div class="form-row" style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:12px; font-weight:500; color:var(--text-1);">判定流程大类<span class="req" v-if="activeForm.isEdit" style="color:var(--eol-red);">*</span></label>
              <input 
                v-model="activeForm.judgmentProcess" 
                :disabled="!activeForm.isEdit" 
                type="text" 
                class="input"
                placeholder="例如：规则判定、能效判定、人工判定"
                style="height:36px; border-radius:6px; border:1px solid var(--line); padding:0 10px; font-size:13px; outline:none; background:var(--bg-card);"
              />
            </div>
            <!-- 判定状态 -->
            <div class="form-row" style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:12px; font-weight:500; color:var(--text-1);">判定最终结论<span class="req" v-if="activeForm.isEdit" style="color:var(--eol-red);">*</span></label>
              <select v-model="activeForm.eliminationType" :disabled="!activeForm.isEdit" class="select" style="height:36px; border-radius:6px; border:1px solid var(--line); padding:0 10px; font-size:13px; outline:none; background:var(--bg-card);">
                <option v-for="t in eliminationTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>

          <!-- 级联选择规则 -->
          <div class="cascade-section form-grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="form-row" style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:12px; font-weight:500; color:var(--text-1);">1. 筛选淘汰批次</label>
              <select v-model="activeForm.selectedBatch" :disabled="!activeForm.isEdit" class="select" @change="handleBatchChange" style="height:36px; border-radius:6px; border:1px solid var(--line); padding:0 10px; font-size:13px; outline:none; background:var(--bg-card);">
                <option value="">-- 请选择判定批次 --</option>
                <option v-for="b in batches" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
            <div class="form-row" style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:12px; font-weight:500; color:var(--text-1);">2. 关联目录规则</label>
              <select v-model="activeForm.selectedRuleId" :disabled="!activeForm.isEdit || !activeForm.selectedBatch" class="select" @change="handleRuleChange" style="height:36px; border-radius:6px; border:1px solid var(--line); padding:0 10px; font-size:13px; outline:none; background:var(--bg-card);">
                <option value="">-- 请选择匹配规则 --</option>
                <option v-for="r in activeForm.rulesOfBatch" :key="r.ruleId" :value="r.ruleId">
                  [{{ r.ruleId }}] {{ r.product || r.modelSeries }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row" style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:12px; font-weight:500; color:var(--text-1);">判定依据文字描述<span class="req" v-if="activeForm.isEdit" style="color:var(--eol-red);">*</span></label>
            <textarea 
              v-model="activeForm.judgmentCriteria" 
              :disabled="!activeForm.isEdit" 
              rows="3" 
              class="textarea" 
              placeholder="请输入最终归档的淘汰判定文字证据或事实依据描述..."
              style="border-radius:6px; border:1px solid var(--line); padding:8px 10px; font-size:13px; outline:none; background:var(--bg-card); resize:vertical;"
            />
          </div>

          <div class="form-row" style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:12px; font-weight:500; color:var(--text-1);">备注补充说明</label>
            <textarea 
              v-model="activeForm.desc" 
              :disabled="!activeForm.isEdit" 
              rows="2" 
              class="textarea" 
              placeholder="可输入判定档案的备注说明，如改造计划、现场踏勘结论等..."
              style="border-radius:6px; border:1px solid var(--line); padding:8px 10px; font-size:13px; outline:none; background:var(--bg-card); resize:vertical;"
            />
          </div>

          <!-- 只读模式且已有数据库记录时显示历史回显 -->
          <div class="archive-meta" v-if="activeForm.basisId > 0 && !activeForm.isEdit" style="margin-top:4px; padding:10px 12px; background:var(--bg-hover); border-radius:6px; border:1px solid var(--line); font-size:12px; display:flex; justify-content:space-between; color:var(--text-3);">
            <div>
              <span class="lbl" style="font-weight:500;">判定方式：</span>
              {{ basisList.find(x => x.basisId === activeForm.basisId)?.matchMethod || basisList.find(x => x.basisId === activeForm.basisId)?.MatchMethod || '人工直接判定' }}
            </div>
            <div>
              <span class="lbl" style="font-weight:500;">判定时间：</span>
              {{ (basisList.find(x => x.basisId === activeForm.basisId)?.judgmentDate || basisList.find(x => x.basisId === activeForm.basisId)?.JudgmentDate || '').slice(0, 19).replace('T', ' ') || '—' }}
            </div>
          </div>
        </div>

      </div>

      <!-- 底部控制栏 -->
      <div class="modal-foot" style="padding:14px 20px; border-top:1px solid var(--line); display:flex; justify-content:flex-end; gap:10px; background:var(--bg-card);">
        <template v-if="!activeForm.isEdit">
          <button class="btn ghost" @click="$emit('close')">关闭</button>
          <button class="btn primary" @click="enterEditMode">
            <AppIcon name="edit" :size="13" /> 修改判定档案
          </button>
        </template>
        <template v-else>
          <button class="btn ghost" :disabled="saving" @click="handleCancelEdit">
            取消
          </button>
          <button class="btn primary" :disabled="saving" @click="handleSave">
            <div v-if="saving" class="spin-icon"></div>
            <AppIcon v-else name="save" :size="13" />
            保存此流程档案
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

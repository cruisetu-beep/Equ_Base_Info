<script setup>
// ── components/judge/JudgeResult.vue ──────────────────────────────
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'
import { JUDGE_STATUS_MAP } from '@/data/rules'
import { RULES_LIB_INIT } from '@/data/rules'
import { saveJudgeResults, getEliminationTypesFromDb, getObsoleteBatches } from '@/api/judge'
import { getRuleList } from '@/api/rules'

const props = defineProps({
  results:  { type: Array, required: true },
})
const emit = defineEmits(['restart', 'back'])

const expandedId = ref(props.results.length === 1 ? 0 : null)
const saving = ref(false)

// 初始化勾选状态（默认全选）
const selected = ref({})
props.results.forEach(r => {
  const id = r.device.equId || r.device.id
  if (id) selected.value[id] = true
})

const selectedCnt = computed(() => Object.keys(selected.value).filter(k => selected.value[k]).length)

const allSelected = computed(() => {
  if (props.results.length === 0) return false
  return props.results.every(r => {
    const id = r.device.equId || r.device.id
    return selected.value[id]
  })
})

const toggleAll = () => {
  const target = !allSelected.value
  const newSels = {}
  props.results.forEach(r => {
    const id = r.device.equId || r.device.id
    if (id) newSels[id] = target
  })
  selected.value = newSels
}

const toggle = (id) => {
  selected.value = { ...selected.value, [id]: !selected.value[id] }
}

const eliminationTypes = ref(['强制淘汰', '限期淘汰', '正常'])
const batches = ref([])
const editData = ref([])

onMounted(async () => {
  // 1. 获取去重淘汰类型
  try {
    const list = await getEliminationTypesFromDb()
    if (list && list.length > 0) {
      // 规范化加上“淘汰”后缀以兼容回显
      const uniqueTypes = list.map(t => {
        if (!t || t === '正常') return t
        return t.endsWith('淘汰') ? t : t + '淘汰'
      })
      if (!uniqueTypes.includes('正常')) uniqueTypes.push('正常')
      eliminationTypes.value = uniqueTypes
    }
  } catch (err) {
    console.error('获取去重淘汰类型失败:', err)
  }

  // 2. 获取批次列表
  try {
    const batchList = await getObsoleteBatches()
    batches.value = batchList || []
  } catch (err) {
    console.error('获取批次列表失败:', err)
  }

  // 3. 初始化用户可编辑的判定依据与备注以及批次和规则选中项
  const list = []
  for (let idx = 0; idx < props.results.length; idx++) {
    const r = props.results[idx]
    const firstHit = r.hits?.[0]
    const defaultCriteria = firstHit?.apiHit?.judgmentCriteria || 
                            firstHit?.judgmentCriteria || 
                            (r.status === 'normal' 
                               ? '经低效设备规则库三级指标扫描，该设备能效等级、参数指标及投运年限均达标，判定为正常运行。' 
                               : '命中工信部低效淘汰设备目录相关条款，存在超期服役或高能耗特征。')
    const defaultDesc = firstHit?.apiHit?.desc || firstHit?.desc || ''
    const matchedStatus = r.status === 'phaseout-mandatory' ? '强制淘汰'
                        : (r.status === 'phaseout-deadline' || r.status === 'low_eff') ? '限期淘汰' : '正常'
    
    const ruleObj = firstHit?.rule || firstHit?.apiHit
    const ruleId = ruleObj?.ruleId || ''
    let batch = ruleObj?.batch || ''

    const item = {
      eliminationType: matchedStatus,
      judgmentCriteria: defaultCriteria,
      desc: defaultDesc,
      selectedBatch: batch,
      selectedRuleId: ruleId,
      rulesOfBatch: []
    }

    if (ruleId) {
      try {
        const ruleRes = await getRuleList({ Q: ruleId, PageSize: 1 })
        if (ruleRes && ruleRes.table && ruleRes.table.length > 0) {
          const matchedRule = ruleRes.table[0]
          batch = matchedRule.batch || ''
          item.selectedBatch = batch
        }
      } catch (err) {
        console.error(`根据 ruleId ${ruleId} 查询规则详情失败:`, err)
      }
    }

    if (batch) {
      try {
        const batchRulesRes = await getRuleList({ FilterBatch: batch, PageSize: 9999 })
        item.rulesOfBatch = batchRulesRes.table || []
      } catch (err) {
        console.error(`获取批次 ${batch} 规则列表失败:`, err)
      }
    }
    list.push(item)
  }
  editData.value = list
})

// 联动选择：批次联动拉取规则
const handleBatchChange = async (idx) => {
  const item = editData.value[idx]
  if (!item) return
  item.selectedRuleId = ''
  if (!item.selectedBatch) {
    item.rulesOfBatch = []
    return
  }
  try {
    const res = await getRuleList({ FilterBatch: item.selectedBatch, PageSize: 9999 })
    item.rulesOfBatch = res.table || []
  } catch (err) {
    console.error('根据批次获取规则列表失败:', err)
  }
}

// 级联选择：规则选择后自动带入参数
const handleRuleChange = (idx) => {
  const item = editData.value[idx]
  if (!item || !item.selectedRuleId) return
  const ruleObj = item.rulesOfBatch.find(r => r.ruleId === item.selectedRuleId)
  if (ruleObj) {
    // 联动预填
    item.eliminationType = ruleObj.typeE === '强制' ? '强制淘汰' : '限期淘汰'
    item.judgmentCriteria = `型号${ruleObj.modelSeries ? '前缀' : '精确'}匹配: ${ruleObj.modelSeries || props.results[idx].device.model || '—'}, 规则: ${ruleObj.ruleId}, 批次: ${item.selectedBatch}`
    item.desc = `依据标准：${ruleObj.nationalStandard || ruleObj.product || '无'}; 截止淘汰日期：${ruleObj.deadline || '无'}`
  }
}

const summary = computed(() => ({
  total:     props.results.length,
  normal:    props.results.filter(r => r.status === 'normal').length,
  low_eff:   props.results.filter(r => r.status === 'low_eff').length,
  deadline:  props.results.filter(r => r.status === 'phaseout-deadline').length,
  mandatory: props.results.filter(r => r.status === 'phaseout-mandatory').length,
}))

const phaseoutTotal = computed(() => summary.value.deadline + summary.value.mandatory)
const enabledCount  = computed(() => RULES_LIB_INIT.filter(r => r.enabled !== false).length)

// 保存判定结果至后台数据库（仅保存当前勾选设备）
async function handleSave() {
  const selectedResults = props.results.filter(r => {
    const id = r.device.equId || r.device.id
    return selected.value[id]
  })

  if (selectedResults.length === 0) {
    alert('请先勾选需要保存判定档案的设备！')
    return
  }

  saving.value = true
  try {
    const items = selectedResults.map(r => {
      const originalIdx = props.results.findIndex(x => (x.device.equId || x.device.id) === (r.device.equId || r.device.id))
      const edited = editData.value[originalIdx]
      const firstHit = r.hits?.[0]
      const originalRuleId = firstHit?.rule?.ruleId || firstHit?.apiHit?.ruleId || null
      
      const ruleId = edited?.selectedRuleId || null
      let matchMethod = firstHit?.apiHit?.matchMethod || '规则库自动三级匹配'
      if (ruleId !== originalRuleId) {
        matchMethod = '规则库级联选择判定'
      }

      return {
        equId: r.device.equId || r.device.id,
        buildId: r.device.buildId || '',
        ruleId: ruleId,
        eliminationType: edited?.eliminationType, // 直接读取用户手工订正干预后的淘汰类型
        matchMethod: matchMethod,
        judgmentCriteria: edited?.judgmentCriteria,
        desc: edited?.desc
      }
    })

    await saveJudgeResults(items)
    alert(`保存成功！已为 ${items.length} 台勾选设备建立淘汰判定档案。`)
  } catch (e) {
    console.error('保存淘汰判定结果失败:', e)
    alert('保存失败，请检查网络或后台服务！')
  } finally {
    saving.value = false
  }
}

// 重新判定勾选的设备
const handleRestart = () => {
  const selectedDevices = props.results
    .filter(r => {
      const id = r.device.equId || r.device.id
      return selected.value[id]
    })
    .map(r => r.device)

  if (selectedDevices.length === 0) {
    alert('请先勾选需要重新判定的设备！')
    return
  }
  emit('restart', selectedDevices)
}

function pct(n) {
  return summary.value.total > 0 ? `${Math.round(n / summary.value.total * 100)}%` : '0%'
}

function statusCls(status) {
  return status === 'normal' ? 'normal' : status === 'low_eff' ? 'low_eff' : 'phaseout'
}

function statusColor(status) {
  if (status === 'normal')             return 'var(--ok)'
  if (status === 'low_eff')            return 'var(--eol-low)'
  if (status === 'phaseout-deadline')  return 'var(--eol-deadline)'
  return 'var(--eol-red)'
}

function actionColor(type) {
  if (type === '强制') return 'var(--eol-red)'
  if (type === '限期') return 'var(--eol-deadline)'
  return 'var(--eol-low)'
}

function checkActual(c) {
  if (c.step === '规格区间' && c.conditions)
    return c.conditions.map(cc => `${cc.key}=${cc.actual}${cc.unit || ''}`).join(', ')
  if (Array.isArray(c.actual)) return c.actual.join(',')
  return c.actual ?? '—'
}
</script>

<template>
  <div class="judge-result float-in">
    <!-- 汇总卡 -->
    <div class="result-summary">
      <h2><AppIcon name="check" :size="24" stroke="#4dc9ff" /> 判定分析完成</h2>
      <div class="sub">基于规则库 v1.3 · 共 {{ enabledCount }} 条启用规则进行实时判定</div>
      <div class="summary-stats">
        <div class="ss-item">
          <div class="l">本次判定总数</div><div class="v">{{ summary.total }}</div><div class="pct">台</div>
        </div>
        <div class="ss-item ok">
          <div class="l">正常运行</div><div class="v">{{ summary.normal }}</div><div class="pct">{{ pct(summary.normal) }}</div>
        </div>
        <div class="ss-item warn">
          <div class="l">低效设备</div><div class="v">{{ summary.low_eff }}</div><div class="pct">{{ pct(summary.low_eff) }}</div>
        </div>
        <div class="ss-item danger">
          <div class="l">限期淘汰</div><div class="v">{{ summary.deadline }}</div><div class="pct">{{ pct(summary.deadline) }}</div>
        </div>
        <div class="ss-item danger">
          <div class="l">强制淘汰</div><div class="v">{{ summary.mandatory }}</div><div class="pct">{{ pct(summary.mandatory) }}</div>
        </div>
      </div>
    </div>

    <!-- 全选控制栏 -->
    <div class="result-toolbar">
      <div class="check-all-wrapper" @click="toggleAll">
        <div :class="['result-ck', allSelected && 'sel']">
          <AppIcon v-if="allSelected" name="check" :size="12" />
        </div>
        <span>全选所有判定设备（已选中 <strong style="color:var(--brand)">{{ selectedCnt }}</strong> / {{ results.length }} 台）</span>
      </div>
    </div>

    <!-- 结果列表 -->
    <div class="result-list">
      <div
        v-for="(r, idx) in results" :key="idx"
        :class="['result-item', statusCls(r.status)]"
        :style="{ '--cl': statusColor(r.status) }"
      >
        <!-- 折叠头 -->
        <div
          :class="['ri-head', expandedId === idx && 'open']"
          @click="expandedId = expandedId === idx ? null : idx"
        >
          <!-- 复选框（阻止冒泡以防触发折叠） -->
          <div class="card-ck-wrapper" @click.stop="toggle(r.device.equId || r.device.id)">
            <div :class="['result-ck', selected[r.device.equId || r.device.id] && 'sel']">
              <AppIcon v-if="selected[r.device.equId || r.device.id]" name="check" :size="12" />
            </div>
          </div>
          <div class="thumb">
            <AppIcon :name="(DEV_TYPE_MAP[r.device.typeK] || DEV_TYPE_MAP.other).icon" :size="20"
                     :stroke="(DEV_TYPE_MAP[r.device.typeK] || DEV_TYPE_MAP.other).color" />
          </div>
          <div class="info">
            <div class="code">{{ r.device.equId || r.device.code }}</div>
            <div class="name">{{ r.device.equipmentName || r.device.name || '未命名设备' }}</div>
            <div class="meta">
              {{ (DEV_TYPE_MAP[r.device.typeK] || DEV_TYPE_MAP.other).label }} ·
              <span class="mono">{{ r.device.model || '—' }}</span> ·
              {{ r.device.year || '—' }} 年投运
            </div>
          </div>
          <div class="hits-cnt">
            <strong>{{ r.hits.length }}</strong>
            <span>{{ r.hits.length === 0 ? '未命中' : '条命中' }}</span>
          </div>
          <div :class="['level-tag', statusCls(r.status)]" style="justify-self:end">
            <AppIcon :name="JUDGE_STATUS_MAP[r.status].icon" :size="11" />
            {{ JUDGE_STATUS_MAP[r.status].label }}
          </div>
          <div class="chev"><AppIcon name="chevron-right" :size="16" /></div>
        </div>

        <!-- 展开详情 -->
        <div v-if="expandedId === idx" class="ri-body">
          <!-- 无命中 -->
          <div v-if="r.hits.length === 0" class="empty-rules-card">
            <AppIcon name="check" :size="28" stroke="var(--ok)" />
            <div class="h">设备能效符合现行标准，未命中任何淘汰规则</div>
            <div class="s">建议保持当前运行状态，定期能效检测。</div>
          </div>

          <template v-else>
            <!-- 命中规则 -->
            <div class="section">
              <h5><AppIcon name="rule" :size="12" /> 命中规则详情（{{ r.hits.length }} 条）</h5>
              <div
                v-for="(h, i) in r.hits" :key="i"
                class="hit-rule-card"
                :style="{ '--cl': actionColor(h.rule.actionType || h.rule.eliminationType) }"
              >
                <div class="header">
                  <span class="rid">{{ h.rule.ruleId }}</span>
                  <span class="action-tag">{{ h.rule.actionType || h.rule.eliminationType }}淘汰</span>
                  <span class="meta">{{ h.rule.batch || '工信部目录' }} · 置信度 {{ h.rule.confidence || 'H' }}</span>
                </div>
                <div class="product">{{ h.rule.product || h.rule.ruleName }}</div>
                <div class="reason">
                  <strong>判定详情：</strong>{{ h.apiHit?.judgmentCriteria || h.judgmentCriteria }}
                  <div style="margin-top:6px;font-size:11px;color:var(--text-2);font-family:'JetBrains Mono',monospace">
                    ▸ 依据与参考文档：{{ h.rule.standard || h.rule.nationalStandard || h.apiHit?.desc }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 判定细节 -->
            <div class="section">
              <h5><AppIcon name="check" :size="12" /> 规则匹配节点明细</h5>
              <div class="checks-grid">
                <div v-for="(c, i) in r.hits[0].checks" :key="i"
                     :class="['check-cell', (c.expect && c.expect.includes('无约束')) ? '' : 'warning']">
                  <div class="ck">
                    <AppIcon v-if="c.expect && c.expect.includes('无约束')" name="check" :size="11" />
                    <AppIcon v-else name="warn" :size="10" stroke="white" />
                  </div>
                  <div class="info">
                    <div class="step">{{ c.step }}</div>
                    <div class="actual">{{ checkActual(c) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 编辑保存的表单字段 -->
          <div class="section edit-section">
            <h5><AppIcon name="edit" :size="12" /> 调整并确立判定档案</h5>
            <div v-if="editData[idx]" class="edit-fields">
              <div class="edit-field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                <!-- 筛选淘汰批次 -->
                <div class="edit-field">
                  <span class="field-label">筛选淘汰批次</span>
                  <select v-model="editData[idx].selectedBatch" class="edit-select" @change="handleBatchChange(idx)">
                    <option value="">-- 请选择判定批次 --</option>
                    <option v-for="b in batches" :key="b" :value="b">{{ b }}</option>
                  </select>
                </div>
                <!-- 关联目录规则 -->
                <div class="edit-field">
                  <span class="field-label">关联目录规则 (F_RuleID)</span>
                  <select v-model="editData[idx].selectedRuleId" :disabled="!editData[idx].selectedBatch" class="edit-select" @change="handleRuleChange(idx)">
                    <option value="">-- 请选择匹配规则 --</option>
                    <option v-for="r in editData[idx].rulesOfBatch" :key="r.ruleId" :value="r.ruleId">
                      [{{ r.ruleId }}] {{ r.product || r.modelSeries }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="edit-field-row" style="display:grid;grid-template-columns:180px 1fr;gap:14px;margin-top:4px">
                <div class="edit-field">
                  <span class="field-label">判定结论 F_EliminationType</span>
                  <select v-model="editData[idx].eliminationType" class="edit-select">
                    <option v-for="t in eliminationTypes" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
              </div>
              <div class="edit-field">
                <span class="field-label">判定依据文字描述 (T_ST_EquipmentEliminationBasis.F_JudgmentCriteria)</span>
                <textarea v-model="editData[idx].judgmentCriteria" rows="2" class="edit-textarea" placeholder="输入或调整最终写档的判定依据..."></textarea>
              </div>
              <div class="edit-field">
                <span class="field-label">备注补充说明 (T_ST_EquipmentEliminationBasis.F_Desc)</span>
                <textarea v-model="editData[idx].desc" rows="2" class="edit-textarea" placeholder="填写现场勘察备注或改造实施意见..."></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="action-footer">
      <div class="footer-msg">
        <span v-if="phaseoutTotal > 0" style="color:var(--eol-red)">
          <AppIcon name="warn" :size="11" />
          共有 <strong>{{ phaseoutTotal }}</strong> 台设备不达标（强制淘汰 {{ summary.mandatory }} 台 · 限期淘汰 {{ summary.deadline }} 台）
        </span>
        <span v-else-if="summary.low_eff === 0" style="color:var(--ok)">
          <AppIcon name="check" :size="11" /> 全部判定设备能效达标，未检测出低效设备。
        </span>
      </div>
      <div class="footer-btns">
        <button class="btn ghost" @click="$emit('back')"><AppIcon name="chevron-left" :size="13" /> 返回选择</button>
        <button class="btn ghost" @click="handleRestart"><AppIcon name="zap" :size="13" /> 重新判定</button>
        <button class="btn primary" :disabled="saving" @click="handleSave">
          <div v-if="saving" class="spin-icon"></div>
          <AppIcon v-else name="save" :size="13" />
          {{ saving ? '正在保存档案...' : '保存判定档案' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.judge-result { display: flex; flex-direction: column; gap: 18px; }
.result-summary { padding: 24px 28px; background: linear-gradient(135deg, #0f1d3d 0%, #1a2a55 100%); border-radius: 14px; color: white; position: relative; overflow: hidden; }
.result-summary::before { content: ""; position: absolute; right: -40px; top: -40px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(77,201,255,0.20), transparent 70%); }
.result-summary h2 { margin: 0; font-size: 22px; font-weight: 600; display: flex; align-items: center; gap: 12px; }
.result-summary .sub { font-size: 12.5px; color: #8da3c8; margin-top: 6px; }
.summary-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-top: 22px; position: relative; z-index: 1; }
.ss-item { padding: 14px 16px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
.ss-item.danger { border-color: rgba(224,57,79,0.40); background: rgba(224,57,79,0.10); }
.ss-item.warn   { border-color: rgba(234,140,46,0.40); background: rgba(234,140,46,0.08); }
.ss-item.ok     { border-color: rgba(43,217,168,0.40); background: rgba(43,217,168,0.08); }
.ss-item .l { font-size: 11px; color: #8da3c8; }
.ss-item .v { font-family: "Orbitron", sans-serif; font-size: 28px; font-weight: 600; color: white; margin-top: 4px; line-height: 1; }
.ss-item.danger .v { color: #ff8da0; }
.ss-item.warn .v   { color: #ffb547; }
.ss-item.ok .v     { color: #2bd9a8; }
.ss-item .pct { font-size: 11px; color: #8da3c8; margin-top: 4px; }

/* 复选框及工具栏样式 */
.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 10px;
}
.check-all-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  color: var(--text-1);
}
.check-all-wrapper:hover {
  color: var(--text-0);
}
.check-all-wrapper strong {
  font-weight: 600;
}
.card-ck-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.result-ck {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 2px solid var(--line-strong);
  background: white;
  display: grid;
  place-items: center;
  color: white;
  font-size: 13px;
  transition: all 0.15s;
}
.result-ck.sel {
  background: var(--brand);
  border-color: var(--brand);
}

.result-list { display: flex; flex-direction: column; gap: 10px; }
.result-item { background: white; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; transition: all 0.2s; }
.result-item:hover { box-shadow: 0 4px 16px rgba(60,110,200,0.06); }
.result-item.phaseout { border-color: rgba(224,57,79,0.30); }
.result-item.low_eff  { border-color: rgba(234,140,46,0.30); }
.result-item.normal   { border-color: rgba(43,217,168,0.30); }

.ri-head { padding: 16px 20px; display: grid; grid-template-columns: 30px 56px 1fr 130px 110px 28px; gap: 16px; align-items: center; cursor: pointer; }
.ri-head .thumb { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, rgba(77,201,255,0.15), rgba(77,201,255,0.05)); border: 1px solid rgba(77,201,255,0.22); display: grid; place-items: center; color: var(--cl); }
.ri-head .info .code { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-2); }
.ri-head .info .name { font-size: 14px; color: var(--text-0); font-weight: 500; margin-top: 2px; }
.ri-head .info .meta { font-size: 11.5px; color: var(--text-2); margin-top: 4px; }
.ri-head .hits-cnt { font-size: 12px; color: var(--text-1); display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
.ri-head .hits-cnt strong { font-family: "Orbitron", sans-serif; font-size: 22px; color: var(--cl); }
.ri-head .chev { color: var(--text-3); transition: transform 0.2s; }
.ri-head.open .chev { transform: rotate(90deg); }

.ri-body { padding: 0 20px 20px; border-top: 1px dashed var(--line); margin-top: -1px; }
.ri-body .section { margin-top: 18px; }
.ri-body .section h5 { margin: 0 0 10px; font-size: 12px; color: var(--text-1); display: flex; align-items: center; gap: 6px; }

.checks-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.check-cell { padding: 10px 12px; border-radius: 8px; background: rgba(43,217,168,0.06); border: 1px solid rgba(43,217,168,0.25); font-size: 12px; display: flex; align-items: center; gap: 8px; }
.check-cell.warning { background: rgba(230,162,60,0.08); border-color: rgba(230,162,60,0.30); }
.check-cell .ck { width: 18px; height: 18px; border-radius: 50%; background: var(--ok); color: white; display: grid; place-items: center; flex-shrink: 0; }
.check-cell.warning .ck { background: #e6a23c; }
.check-cell .info { flex: 1; min-width: 0; }
.check-cell .step { font-size: 11px; color: var(--text-2); }
.check-cell .actual { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--text-0); }

.hit-rule-card { padding: 14px 18px; border-radius: 10px; background: #fff8f9; border: 1px solid rgba(224,57,79,0.22); border-left: 4px solid var(--cl); margin-bottom: 10px; }
.hit-rule-card .header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.hit-rule-card .rid { font-family: "JetBrains Mono", monospace; padding: 3px 8px; background: var(--cl); color: white; border-radius: 4px; font-size: 11px; font-weight: 600; }
.hit-rule-card .action-tag { font-size: 11.5px; font-weight: 500; color: var(--cl); }
.hit-rule-card .meta { margin-left: auto; font-size: 11px; color: var(--text-2); font-family: "JetBrains Mono", monospace; }
.hit-rule-card .product { font-size: 13px; color: var(--text-0); font-weight: 500; }
.hit-rule-card .reason { margin-top: 8px; padding: 10px 12px; background: white; border-radius: 6px; font-size: 12px; color: var(--text-1); line-height: 1.6; border: 1px dashed var(--line); }

.empty-rules-card { padding: 24px; text-align: center; background: linear-gradient(180deg, rgba(43,217,168,0.06), rgba(43,217,168,0.02)); border: 1px dashed rgba(43,217,168,0.30); border-radius: 8px; color: var(--ok); }
.empty-rules-card .h { font-size: 13px; font-weight: 500; }
.empty-rules-card .s { font-size: 11.5px; color: var(--text-2); margin-top: 6px; }

/* 编辑表单样式 */
.edit-section {
  background: #f7f9fc;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  margin-top: 18px;
}
.edit-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12px;
  color: var(--text-1);
  font-weight: 500;
}
.edit-textarea {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-0);
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: white;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.edit-textarea:focus {
  border-color: var(--brand);
}

.edit-select {
  width: 100%;
  padding: 8px 12px;
  font-size: 12.5px;
  color: var(--text-0);
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: white;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  height: 34px;
}
.edit-select:focus {
  border-color: var(--brand);
}

/* 底部操作栏 */
.action-footer {
  padding: 14px 18px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.footer-msg {
  font-size: 12.5px;
  color: var(--text-2);
}
.footer-btns {
  display: flex;
  gap: 10px;
}

.spin-icon {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.25);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  margin-right: 6px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

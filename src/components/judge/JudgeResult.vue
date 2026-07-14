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

const activeTabs = ref({})
const setTab = (idx, proc) => {
  activeTabs.value[idx] = proc
}
const getTab = (idx, r) => {
  if (activeTabs.value[idx]) return activeTabs.value[idx]
  const keys = Object.keys(r.hits || {})
  return keys.length > 0 ? keys[0] : null
}

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

  // 3. 初始化用户可编辑的判定依据与备注以及批次和规则选中项（各判定流程隔离存放）
  const list = []
  for (let idx = 0; idx < props.results.length; idx++) {
    const r = props.results[idx]
    const procMap = {}
    
    if (r.hits) {
      const procs = Object.keys(r.hits)
      for (const proc of procs) {
        const procHits = r.hits[proc] || []
        const firstHit = procHits[0]
        
        const defaultCriteria = firstHit?.apiHit?.judgmentCriteria || 
                                firstHit?.judgmentCriteria || 
                                (procHits.length === 0 
                                   ? `经${proc}流程能效指标判定，该设备能效等级、参数指标及投运年限均达标，判定为正常运行。` 
                                   : `命中${proc}相关条款，存在超期服役或高能耗特征。`)
        const defaultDesc = firstHit?.apiHit?.desc || firstHit?.desc || ''
        
        let matchedStatus = '正常'
        if (procHits.length > 0) {
          const type = firstHit?.rule?.eliminationType || firstHit?.apiHit?.eliminationType || ''
          matchedStatus = type.includes('强制') ? '强制淘汰' : (type.includes('限期') ? '限期淘汰' : '正常')
        }
        
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
        
        procMap[proc] = item
      }
    }
    list.push(procMap)
  }
  editData.value = list
})

// 联动选择：批次联动拉取规则
const handleBatchChange = async (idx, proc) => {
  const item = editData.value[idx]?.[proc]
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
const handleRuleChange = (idx, proc) => {
  const item = editData.value[idx]?.[proc]
  if (!item || !item.selectedRuleId) return
  const ruleObj = item.rulesOfBatch.find(r => r.ruleId === item.selectedRuleId)
  if (ruleObj) {
    // 联动预填
    item.eliminationType = ruleObj.typeE === '强制' ? '强制淘汰' : '限期淘汰'
    item.judgmentCriteria = `型号${ruleObj.modelSeries ? '前缀' : '精确'}匹配: ${ruleObj.modelSeries || props.results[idx].device.model || '—'}, 规则: ${ruleObj.ruleId}, 批次: ${item.selectedBatch}`
    item.desc = `依据标准：${ruleObj.nationalStandard || ruleObj.product || '无'}; 截止淘汰日期：${ruleObj.deadline || '无'}`
  }
}

const getDeviceCombinedStatus = (idx, r) => {
  const deviceEdits = editData.value[idx]
  if (!deviceEdits) {
    let hasMandatory = false
    let hasDeadline = false
    let hasOtherElimination = false
    
    if (r.hits) {
      Object.keys(r.hits).forEach(proc => {
        const pArray = r.hits[proc] || []
        pArray.forEach(h => {
          const type = h.rule?.actionType || h.rule?.eliminationType || h.apiHit?.eliminationType || ''
          if (type.includes('强制')) hasMandatory = true
          else if (type.includes('限期')) hasDeadline = true
          else hasOtherElimination = true
        })
      })
    }
    
    if (hasMandatory) return 'phaseout-mandatory'
    if (hasDeadline) return 'phaseout-deadline'
    return 'normal'
  }
  
  let hasMandatory = false
  let hasDeadline = false
  
  Object.keys(deviceEdits).forEach(proc => {
    const type = deviceEdits[proc].eliminationType || ''
    if (type.includes('强制')) {
      hasMandatory = true
    } else if (type.includes('限期')) {
      hasDeadline = true
    }
  })
  
  if (hasMandatory) return 'phaseout-mandatory'
  if (hasDeadline) return 'phaseout-deadline'
  return 'normal'
}

const summary = computed(() => {
  let total = props.results.length
  let normal = 0, low_eff = 0, deadline = 0, mandatory = 0
  
  props.results.forEach((r, idx) => {
    const status = getDeviceCombinedStatus(idx, r)
    if (status === 'normal') normal++
    else if (status === 'low_eff') low_eff++
    else if (status === 'phaseout-deadline') deadline++
    else if (status === 'phaseout-mandatory') mandatory++
  })
  
  return { total, normal, low_eff, deadline, mandatory }
})

const phaseoutTotal = computed(() => summary.value.deadline + summary.value.mandatory)
const enabledCount  = computed(() => RULES_LIB_INIT.filter(r => r.enabled !== false).length)

const processStats = computed(() => {
  const stats = {}
  props.results.forEach((r, idx) => {
    const procs = Object.keys(r.hits || {})
    procs.forEach(proc => {
      if (!stats[proc]) stats[proc] = { normal: 0, phaseout: 0 }
      
      const edited = editData.value[idx]?.[proc]
      let type = '正常'
      if (edited) {
        type = edited.eliminationType || '正常'
      } else {
        const procHits = r.hits[proc] || []
        const firstHit = procHits[0]
        if (procHits.length > 0) {
          const rawType = firstHit?.rule?.eliminationType || firstHit?.apiHit?.eliminationType || ''
          type = rawType.includes('强制') ? '强制淘汰' : (rawType.includes('限期') ? '限期淘汰' : '正常')
        }
      }
      
      if (type === '正常') {
        stats[proc].normal++
      } else {
        stats[proc].phaseout++
      }
    })
  })
  
  return Object.keys(stats).map(name => ({
    name,
    normal: stats[name].normal,
    phaseout: stats[name].phaseout
  }))
})

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
    const items = selectedResults.flatMap(r => {
      const originalIdx = props.results.findIndex(x => (x.device.equId || x.device.id) === (r.device.equId || r.device.id))
      const deviceEdits = editData.value[originalIdx] || {}
      
      const resList = []
      
      if (r.hits && Object.keys(r.hits).length > 0) {
        Object.keys(r.hits).forEach(proc => {
          const edited = deviceEdits[proc] || {}
          const hitsList = r.hits[proc] || []
          
          if (hitsList.length > 0) {
            hitsList.forEach(hitObj => {
               const originalRuleId = hitObj.rule?.ruleId || hitObj.apiHit?.ruleId || null
               const ruleId = edited.selectedRuleId || null
               let matchMethod = hitObj.apiHit?.matchMethod || '规则库自动三级匹配'
               if (ruleId !== originalRuleId && ruleId) {
                 matchMethod = '规则库级联选择判定'
               }
               
               resList.push({
                 equId: r.device.equId || r.device.id,
                 buildId: r.device.buildId || r.device.buildingId || '',
                 ruleId: ruleId,
                 eliminationType: edited.eliminationType || '正常',
                 matchMethod: matchMethod,
                 judgmentCriteria: edited.judgmentCriteria,
                 desc: edited.desc,
                 judgmentProcess: proc
               })
            })
          } else {
             // 如果此流程没有淘汰命中，同样根据表单建立“正常/达标”的记录归档
             resList.push({
               equId: r.device.equId || r.device.id,
               buildId: r.device.buildId || r.device.buildingId || '',
               ruleId: null,
               eliminationType: edited.eliminationType || '正常',
               matchMethod: '规则未命中（默认通过）',
               judgmentCriteria: edited.judgmentCriteria || '设备参数符合现行标准或未触发淘汰规则',
               desc: edited.desc,
               judgmentProcess: proc
             })
          }
        })
      }
      return resList
    })

    await saveJudgeResults(items)
    alert('保存成功！')
    emit('saved')
  } catch (err) {
    alert('保存失败：' + err.message)
  } finally {
    saving.value = false
  }
}

function getPhaseoutCount(idx, r) {
  const deviceEdits = editData.value[idx]
  if (!deviceEdits) {
     // 如果还没初始化编辑数据，按原始 hit 数量统计
     return Object.values(r.hits || {}).reduce((a, b) => a + b.length, 0)
  }
  
  let count = 0
  Object.keys(deviceEdits).forEach(proc => {
     if (deviceEdits[proc].eliminationType && deviceEdits[proc].eliminationType !== '正常') {
         count++
     }
  })
  return count
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

function mapEnergyLevel(val) {
  const num = parseInt(val)
  if (isNaN(num)) return val
  if (num === 0) return '无法判定'
  if (num === 9) return '高能耗设备'
  const ZH = ['零', '一', '二', '三', '四', '五', '六', '七', '八']
  if (num > 0 && num <= 8) return ZH[num] + '级能效'
  return val
}

function getEnergyLevelDesc(r) {
  const flow = r.apiRaw?.flowSteps?.['能效判定']
  
  if (flow && flow.length > 0) {
    const logs = flow[0].logs || []
    
    // 尝试找 "查询到能效数据: {Value}，尝试提取..."
    const dbMatch = logs.find(l => l.includes('查询到能效数据:'))
    if (dbMatch) {
      let val = dbMatch.split('查询到能效数据:')[1].split('，尝试提取')[0].trim()
      val = mapEnergyLevel(val)
      return `当前能效等级级别为：${val}，符合现行标准，未触发淘汰阈值。`
    }
    
    // 尝试找 "AI成功提取出能效等级: {Level}"
    const aiMatch = logs.find(l => l.includes('AI成功提取出能效等级:'))
    if (aiMatch) {
      let val = aiMatch.split('AI成功提取出能效等级:')[1].split('(')[0].trim()
      if (!val.includes('能效') && !val.includes('高能耗') && !val.includes('判定')) {
        val = mapEnergyLevel(val)
      }
      return `当前能效等级级别为：${val}，符合现行标准，未触发淘汰阈值。`
    }
  }

  // 从 mock 数据提取（如果存在）
  if (r.device?.paramGroups) {
    for (const g of r.device.paramGroups) {
      const item = g.items?.find(i => i.name && i.name.includes('能效等级'))
      if (item && item.value && item.value !== '待判定') {
        return `当前能效等级级别为：${item.value}，符合现行标准，未触发淘汰阈值。`
      }
    }
  }

  return '设备能效符合现行标准，或暂无实测数据无法精确判定能效等级。'
}
</script>

<template>
  <div class="judge-result float-in">
    <!-- 汇总卡 -->
    <div class="result-summary">
      <div class="rs-left">
        <div class="summary-left">
          <h2><AppIcon name="check" :size="28" stroke="#4dc9ff" /> 分析完成</h2>
        </div>
        <div class="ss-item big-card">
          <div class="l">本次设备数量</div>
          <div class="v">{{ summary.total }}<span class="unit">台</span></div>
        </div>
        
        <div class="ss-item big-card">
          <div class="l">发现可淘汰设备</div>
          <div class="v" style="color: #ff8da0;">{{ summary.total - summary.normal }}<span class="unit" style="color: rgba(255,141,160,0.8);">台</span></div>
        </div>
        
        <div class="ss-item big-card">
          <div class="l">本次判定方法</div>
          <div class="v">{{ processStats.length }}<span class="unit">种</span></div>
        </div>
      </div>
      
      <div class="rs-right">
        <div class="methods-col">
          <div v-for="method in processStats" :key="method.name" class="method-row">
            <div class="m-name">{{ method.name }}</div>
            <div class="m-stat ok">
              <div class="stat-info">
                <span>正常数量</span>
              </div>
              <div class="stat-num">
                <span class="pct">{{ pct(method.normal) }}</span>
                <strong>{{ method.normal }}</strong>
              </div>
            </div>
            <div class="m-stat danger">
              <div class="stat-info">
                <span>淘汰数量</span>
              </div>
              <div class="stat-num">
                <span class="pct">{{ pct(method.phaseout) }}</span>
                <strong>{{ method.phaseout }}</strong>
              </div>
            </div>
          </div>
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
        :class="['result-item', statusCls(getDeviceCombinedStatus(idx, r))]"
        :style="{ '--cl': statusColor(getDeviceCombinedStatus(idx, r)) }"
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
          <div :class="['level-tag', getDeviceCombinedStatus(idx, r) === 'normal' ? 'normal' : 'phaseout']" style="font-size: 14px; font-weight: 600; padding: 4px 12px; border-radius: 6px; display: flex; align-items: center; gap: 6px;">
            <AppIcon :name="getDeviceCombinedStatus(idx, r) === 'normal' ? 'check' : 'ban'" :size="15" />
            {{ getDeviceCombinedStatus(idx, r) === 'normal' ? '正常' : '淘汰' }}
          </div>
          
          <div style="flex: 1"></div>
          
          <div class="hits-cnt">
            <template v-if="getPhaseoutCount(idx, r) === 0">
              <span style="color:var(--text-2); font-weight: 500">未淘汰</span>
            </template>
            <template v-else>
              <strong>{{ getPhaseoutCount(idx, r) }}</strong>
              <span>条淘汰判定</span>
            </template>
          </div>
          <div class="chev"><AppIcon name="chevron-right" :size="16" /></div>
        </div>

        <!-- 展开详情 -->
        <div v-if="expandedId === idx" class="ri-body">
          <div class="proc-tabs" style="display:flex; gap:10px; padding:10px; border-bottom:1px solid var(--line); overflow-x: auto;">
            <button 
              v-for="proc in Object.keys(r.hits || {})" 
              :key="proc"
              :class="['btn ghost', getTab(idx, r) === proc && 'active']"
              @click="setTab(idx, proc)"
              style="padding:6px 14px; border-radius: 6px; background: transparent; cursor: pointer; font-weight: 500; font-size: 13px; transition: all 0.2s;"
              :style="getTab(idx, r) === proc 
                ? (editData[idx]?.[proc]?.eliminationType !== '正常' 
                    ? 'background: rgba(245,34,45,0.08); color: #ff4d4f; font-weight: bold; border: 1px solid rgba(245,34,45,0.2);' 
                    : 'background: rgba(82,196,26,0.08); color: #52c41a; font-weight: bold; border: 1px solid rgba(82,196,26,0.2);')
                : (editData[idx]?.[proc]?.eliminationType !== '正常' 
                    ? 'color: #ff7875; border: 1px solid transparent; background: transparent;' 
                    : 'color: #73d13d; border: 1px solid transparent; background: transparent;')"
            >
              {{ proc }} ({{ editData[idx]?.[proc]?.eliminationType !== '正常' ? '淘汰' : '正常' }})
            </button>
          </div>
          
          <div class="proc-content" style="padding:15px; padding-top:20px;">
            <template v-if="!getTab(idx, r) || r.hits[getTab(idx, r)].length === 0">
              <div class="empty-rules-card" style="padding: 20px; text-align: center;">
                <AppIcon name="check" :size="28" stroke="var(--ok)" />
                <div class="h">{{ getTab(idx, r) || '该' }}判定为正常，未命中淘汰规则</div>
                <div class="s" v-if="getTab(idx, r) === '能效判定'">
                  {{ getEnergyLevelDesc(r) }}
                </div>
                <div class="s" v-else>设备参数符合现行标准或未触发该流程淘汰阈值。</div>
              </div>
            </template>

            <template v-else>
              <!-- 命中规则 -->
              <div class="section">
                <h5><AppIcon name="rule" :size="12" /> 命中规则详情（{{ r.hits[getTab(idx, r)].length }} 条）</h5>
                <div
                  v-for="(h, i) in r.hits[getTab(idx, r)]" :key="i"
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

              <!-- 判定细节 (仅显示判定淘汰的限制节点理由，过滤无约束节点) -->
              <div class="section" v-if="r.hits[getTab(idx, r)][0].checks && r.hits[getTab(idx, r)][0].checks.filter(x => x.expect && !x.expect.includes('无约束')).length > 0">
                <h5><AppIcon name="check" :size="12" /> 规则匹配节点明细</h5>
                <div class="checks-grid">
                  <div v-for="(c, i) in r.hits[getTab(idx, r)][0].checks.filter(x => x.expect && !x.expect.includes('无约束'))" :key="i"
                       class="check-cell warning">
                    <div class="ck">
                      <AppIcon name="warn" :size="10" stroke="white" />
                    </div>
                    <div class="info">
                      <div class="step">{{ c.step }}</div>
                      <div class="actual">{{ checkActual(c) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 编辑保存的表单字段 (绑定在对应的判定流程下，联动变化) -->
          <div class="section edit-section">
            <h5><AppIcon name="edit" :size="12" /> 调整并确立【{{ getTab(idx, r) }}】判定档案</h5>
            <div v-if="editData[idx] && editData[idx][getTab(idx, r)]" class="edit-fields">
              <div class="edit-field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                <!-- 筛选淘汰批次 -->
                <div class="edit-field">
                  <span class="field-label">筛选淘汰批次</span>
                  <select v-model="editData[idx][getTab(idx, r)].selectedBatch" class="edit-select" @change="handleBatchChange(idx, getTab(idx, r))">
                    <option value="">-- 未命中判定批次 --</option>
                    <option v-for="b in batches" :key="b" :value="b">{{ b }}</option>
                  </select>
                </div>
                <!-- 关联目录规则 -->
                <div class="edit-field">
                  <span class="field-label">关联目录规则</span>
                  <select v-model="editData[idx][getTab(idx, r)].selectedRuleId" :disabled="!editData[idx][getTab(idx, r)].selectedBatch" class="edit-select" @change="handleRuleChange(idx, getTab(idx, r))">
                    <option value="">-- 未命中匹配规则 --</option>
                    <option v-for="ruleItem in editData[idx][getTab(idx, r)].rulesOfBatch" :key="ruleItem.ruleId" :value="ruleItem.ruleId">
                      [{{ ruleItem.ruleId }}] {{ ruleItem.product || ruleItem.modelSeries }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="edit-field-row" style="display:grid;grid-template-columns:180px 1fr;gap:14px;margin-top:4px">
                <div class="edit-field">
                  <span class="field-label">判定结论</span>
                  <select v-model="editData[idx][getTab(idx, r)].eliminationType" class="edit-select">
                    <option v-for="t in eliminationTypes" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
              </div>
              <div class="edit-field">
                <span class="field-label">判定依据文字描述</span>
                <textarea v-model="editData[idx][getTab(idx, r)].judgmentCriteria" rows="2" class="edit-textarea" placeholder="输入或调整最终写档的判定依据..."></textarea>
              </div>
              <div class="edit-field">
                <span class="field-label">备注补充说明</span>
                <textarea v-model="editData[idx][getTab(idx, r)].desc" rows="2" class="edit-textarea" placeholder="填写现场勘察备注或改造实施意见..."></textarea>
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
.judge-result { display: flex; flex-direction: column; gap: 18px; margin-top: 20px; }
.result-summary { padding: 16px 20px; background: linear-gradient(135deg, #0f1d3d 0%, #1a2a55 100%); border-radius: 12px; color: white; position: relative; overflow: hidden; display: flex; align-items: stretch; gap: 24px; }
.result-summary::before { content: ""; position: absolute; right: -40px; top: -40px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(77,201,255,0.20), transparent 70%); }
.rs-left { display: flex; flex: 1; gap: 16px; position: relative; z-index: 1; }
.rs-right { flex: 1; display: flex; flex-direction: column; justify-content: center; position: relative; z-index: 1; }

.summary-left { flex-shrink: 0; min-width: 140px; display: flex; flex-direction: column; justify-content: center; }
.summary-left h2 { margin: 0; font-size: 24px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
.summary-left .sub { font-size: 13px; color: #c5d3e8; margin-top: 6px; }

.ss-item.big-card { flex: 1; padding: 16px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
.ss-item.big-card .l { font-size: 13px; color: #c5d3e8; }
.ss-item.big-card .v { font-family: "Orbitron", sans-serif; font-size: 26px; font-weight: 600; color: white; margin-top: 8px; line-height: 1; display: flex; align-items: baseline; gap: 4px; }
.ss-item.big-card .unit { font-size: 13px; color: #c5d3e8; font-family: sans-serif; font-weight: normal; }

.methods-col { display: flex; flex-direction: column; gap: 8px; }
.method-row { display: flex; align-items: stretch; gap: 12px; padding: 0 14px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); overflow: hidden; min-height: 42px; }
.method-row .m-name { flex: 1.2; color: #c5d3e8; font-size: 14px; font-weight: 500; display: flex; align-items: center; }
.method-row .m-stat { flex: 1; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; border-radius: 0; font-size: 13px; }
.method-row .m-stat.ok { background: rgba(43,217,168,0.08); border-left: 1px solid rgba(43,217,168,0.20); border-right: 1px solid rgba(43,217,168,0.20); color: #2bd9a8; }
.method-row .m-stat.danger { background: rgba(224,57,79,0.10); border-left: 1px solid rgba(224,57,79,0.20); border-right: 1px solid rgba(224,57,79,0.20); color: #ff8da0; }
.method-row .m-stat .stat-info { display: flex; flex-direction: column; }
.method-row .m-stat .stat-info span { color: #c5d3e8; font-size: 13px; }
.method-row .m-stat .stat-num { display: flex; align-items: baseline; gap: 8px; }
.method-row .m-stat .stat-num .pct { font-size: 12px; color: rgba(255,255,255,0.6); font-family: sans-serif; }
.method-row .m-stat .stat-num strong { font-family: "Orbitron", sans-serif; font-size: 18px; }

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

.ri-head { padding: 16px 20px; display: flex; gap: 16px; align-items: center; cursor: pointer; }
.ri-head .thumb { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, rgba(77,201,255,0.15), rgba(77,201,255,0.05)); border: 1px solid rgba(77,201,255,0.22); display: grid; place-items: center; color: var(--cl); flex-shrink: 0; }
.ri-head .info { width: 320px; flex-shrink: 0; }
.ri-head .info .code { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-2); }
.ri-head .info .name { font-size: 14px; color: var(--text-0); font-weight: 500; margin-top: 2px; }
.ri-head .info .meta { font-size: 11.5px; color: var(--text-2); margin-top: 4px; }
.ri-head .level-tag { flex-shrink: 0; }
.ri-head .level-tag.normal { color: var(--ok); }
.ri-head .level-tag.phaseout { color: var(--cl); }
.ri-head .hits-cnt { font-size: 12px; color: var(--text-1); display: flex; align-items: center; gap: 6px; justify-content: flex-end; flex-shrink: 0; }
.ri-head .hits-cnt strong { font-family: "Orbitron", sans-serif; font-size: 22px; color: var(--cl); }
.ri-head .chev { color: var(--text-3); transition: transform 0.2s; flex-shrink: 0; }
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

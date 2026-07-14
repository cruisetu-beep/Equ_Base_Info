<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { RULES_LIB_INIT } from '@/data/rules'
import { getRuleDetail } from '@/api/rules'
import DeviceArchive from './DeviceArchive.vue'
import RuleDetailModal from './RuleDetailModal.vue'

const props = defineProps({
  device: { type: Object, required: true },
  ext:    { type: Object, required: true },
})
const showRuleModal = ref(false)
const selectedRule = ref(null)
const loadingRule = ref(false)

const matchedRule = computed(() =>
  props.device.ruleHit ? RULES_LIB_INIT.find(r => r.ruleId === props.device.ruleHit) : null
)

const handleViewRule = async () => {
  const ruleId = props.device.ruleHit || props.device.ruleId
  if (!ruleId) return

  loadingRule.value = true
  try {
    const res = await getRuleDetail(ruleId)
    if (res) {
      selectedRule.value = res
      showRuleModal.value = true
    } else {
      alert('未找到该规则的详细配置')
    }
  } catch (err) {
    console.error('加载规则详情失败:', err)
    alert('加载规则详情失败，请重试')
  } finally {
    loadingRule.value = false
  }
}

function getRecordStyle(rec) {
  const t = (rec.eliminationType || '').trim()
  if (t === '正常') {
    return { color: 'var(--ok)', bg: 'rgba(43,217,168,0.03)', border: 'rgba(43,217,168,0.18)', label: '正常运行', icon: 'check' }
  } else if (t === '待判定') {
    return { color: 'var(--warn)', bg: 'rgba(234,140,46,0.03)', border: 'rgba(234,140,46,0.18)', label: '待判定', icon: 'info' }
  } else if (t.includes('低效') || t.includes('落后')) {
    return { color: '#d4a017', bg: 'rgba(212,160,23,0.03)', border: 'rgba(212,160,23,0.18)', label: rec.eliminationType || '低效设备', icon: 'warn' }
  } else {
    return { color: '#e0394f', bg: 'rgba(224,57,79,0.03)', border: 'rgba(224,57,79,0.18)', label: rec.eliminationType || '淘汰设备', icon: 'ban' }
  }
}

const records = computed(() => {
  const originRecords = props.device.eliminationRecords
  if (originRecords && originRecords.length > 0) {
    return originRecords.map(x => {
      const ruleId = x.ruleId || x.RuleId || ''
      const matchRule = ruleId ? RULES_LIB_INIT.find(r => r.ruleId === ruleId) : null
      
      const rawType = (x.eliminationType || x.EliminationType || '正常').trim()
      const elimType = rawType.includes('强制') ? '强制淘汰' : (rawType.includes('限期') ? '限期淘汰' : (rawType.includes('过渡') ? '过渡淘汰' : rawType))
      
      // 根据 eliminationType 快速分类 status 样式控制字段 (只要不是正常就是淘汰)
      const status = elimType.trim() === '正常' ? 'normal' : 'phaseout'

      let process = x.judgmentProcess || x.JudgmentProcess || ''
      if (!process) {
        const method = x.matchMethod || x.MatchMethod || ''
        const ruleId = x.ruleId || x.RuleId
        if (method.includes('能效') || method.includes('能耗')) {
          process = '能效判定'
        } else if (method.includes('AI') || method.includes('智能')) {
          process = 'AI判定'
        } else if (ruleId) {
          process = '规则判定'
        } else {
          process = '人工判定'
        }
      }

      let dateStr = x.judgmentDate || x.JudgmentDate || '—'
      if (dateStr && dateStr !== '—') {
        try {
          const d = new Date(dateStr)
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            dateStr = `${y}-${m}-${day}`
          }
        } catch (e) {
          console.error('日期解析错误:', e)
        }
      }

      let ruleBatch = x.ruleBatch || x.RuleBatch || ''
      if (!ruleBatch && matchRule) {
        ruleBatch = matchRule.batch
      }
      if (!ruleBatch && (x.reason || x.judgmentCriteria)) {
        const criteriaText = x.reason || x.judgmentCriteria || ''
        const m = criteriaText.match(/(?:批次[:：]\s*)([^\,\，\s]+)/)
        if (m) ruleBatch = m[1]
      }

      let ruleDeadline = x.ruleDeadline || x.RuleDeadline || ''
      if (!ruleDeadline && matchRule) {
        ruleDeadline = matchRule.deadline
      }
      if (!ruleDeadline && (x.reason || x.desc)) {
        const descText = x.reason || x.desc || ''
        const m = descText.match(/(?:截止淘汰日期|截止日期)[:：]\s*(\d{4}-\d{2}-\d{2})/)
        if (m) ruleDeadline = m[1]
      }

      return {
        basisId: x.basisId || x.BasisId || 0,
        judgmentProcess: process,
        eliminationType: elimType,
        status: status,
        reason: x.reason || x.judgmentCriteria || x.desc || '',
        judgmentBy: x.judgmentBy || x.JudgmentBy || '',
        judgmentDate: dateStr,
        matchMethod: x.matchMethod || x.MatchMethod || '',
        ruleId: ruleId,
        ruleBatch: ruleBatch,
        ruleDeadline: ruleDeadline,
        isRealRule: process === '规则判定' && !!ruleId
      }
    })
  }

  return [
    {
      judgmentProcess: "待判定",
      eliminationType: "待判定",
      reason: '该设备暂未发起能效淘汰判定，或运行数据未齐全，暂无已保存的判定记录。',
      judgmentBy: '—',
      judgmentDate: '—',
      matchMethod: '—',
      ruleId: '',
      ruleBatch: '',
      ruleDeadline: '',
      isRealRule: false
    }
  ]
})

const handleViewRecordRule = async (ruleId) => {
  if (!ruleId) return
  loadingRule.value = true
  try {
    const res = await getRuleDetail(ruleId)
    if (res) {
      selectedRule.value = res
      showRuleModal.value = true
    } else {
      alert('未找到该规则的详细配置')
    }
  } catch (err) {
    console.error('加载规则详情失败:', err)
    alert('加载规则详情失败，请重试')
  } finally {
    loadingRule.value = false
  }
}

const activeProcess = ref("规则判定")
watch(records, (newRecs) => {
  if (newRecs && newRecs.length > 0) {
    if (!newRecs.some(r => r.judgmentProcess === activeProcess.value)) {
      activeProcess.value = newRecs[0].judgmentProcess
    }
  }
}, { immediate: true })

const activeRecord = computed(() => {
  return records.value.find(r => r.judgmentProcess === activeProcess.value) || records.value[0]
})

function getTabStyle(rec, isActive) {
  const t = (rec.eliminationType || '').trim()
  let color = 'var(--ok)'
  let bg = 'rgba(43,217,168,0.03)'
  let border = 'rgba(43,217,168,0.22)'
  
  if (t === '待判定') {
    color = 'var(--warn)'
    bg = 'rgba(234,140,46,0.03)'
    border = 'rgba(234,140,46,0.22)'
  } else if (t.includes('低效') || t.includes('落后')) {
    color = '#d4a017'
    bg = 'rgba(212,160,23,0.04)'
    border = 'rgba(212,160,23,0.25)'
  } else if (t !== '正常') {
    color = '#e0394f'
    bg = 'rgba(224,57,79,0.04)'
    border = 'rgba(224,57,79,0.25)'
  }
  
  if (isActive) {
    let activeBg = 'rgba(43,217,168,0.1)'
    if (t === '待判定') activeBg = 'rgba(234,140,46,0.1)'
    else if (t.includes('低效') || t.includes('落后')) activeBg = 'rgba(212,160,23,0.1)'
    else if (t !== '正常') activeBg = 'rgba(224,57,79,0.1)'

    return {
      color,
      borderColor: color,
      background: activeBg,
      fontWeight: '700',
      transform: 'scale(1.02)'
    }
  } else {
    return {
      color,
      borderColor: border,
      background: bg,
      fontWeight: '500',
      opacity: '0.85'
    }
  }
}
</script>

<template>
  <div class="card dd-card">
    <div class="dd-card-head">
      <AppIcon name="rule" :size="16" stroke="var(--brand)" />
      <h3>淘汰判定详情</h3>
    </div>

    <!-- 判定流程切换药丸 -->
    <div class="proc-tabs">
      <button 
        v-for="rec in records" 
        :key="rec.judgmentProcess"
        class="proc-tab"
        :style="getTabStyle(rec, activeProcess === rec.judgmentProcess)"
        @click="activeProcess = rec.judgmentProcess"
      >
        <div style="font-weight: 600;">{{ rec.judgmentProcess }}</div>
        <div v-if="rec.judgmentProcess !== '待判定'" style="font-size: 10px; margin-top: 2px; font-weight: normal; opacity: 0.85;">
          <template v-if="(rec.eliminationType || '').trim() === '正常'">(正常)</template>
          <template v-else-if="(rec.eliminationType || '').includes('低效') || (rec.eliminationType || '').includes('落后')">(低效)</template>
          <template v-else>(淘汰)</template>
        </div>
      </button>
    </div>
    <!-- 正常运行 (如果当前选中的流程结果是 normal) -->
    <!-- 正常运行 (如果当前选中的流程结果是正常) -->
    <div v-if="activeRecord.eliminationType.trim() === '正常'" class="eb-empty ok">
      <AppIcon name="check" :size="28" stroke="var(--ok)" />
      <div class="h">设备能效合格</div>
      <div class="s">{{ activeRecord.reason || '该设备各项指标运行正常，未被纳入任何落后淘汰设备目录。' }}</div>
    </div>

    <!-- 已判定（淘汰） -->
    <template v-else>
      <!-- ① 结论横幅 -->
      <div class="elim-banner" :style="{ background: getRecordStyle(activeRecord).bg, borderColor: getRecordStyle(activeRecord).border }">
        <div class="elim-banner-type" :style="{ color: getRecordStyle(activeRecord).color }">
          <AppIcon name="ban" :size="15" :stroke="getRecordStyle(activeRecord).color" />
          {{ getRecordStyle(activeRecord).label }}
        </div>
        <div class="elim-banner-desc">{{ activeRecord.reason || '—' }}</div>
      </div>

      <!-- ② 判定记录 -->
      <div class="eb-block">
        <div class="eb-block-title">判定记录</div>
        <div class="eb-rows">
          <div class="eb-row">
            <span class="l">淘汰类型</span>
            <span class="v bold" :style="{ color: getRecordStyle(activeRecord).color }">{{ getRecordStyle(activeRecord).label }}</span>
          </div>
          <div class="eb-row">
            <span class="l">匹配规则</span>
            <span class="v">{{ activeRecord.matchMethod || '—' }}</span>
          </div>
          <div class="eb-row" v-if="activeRecord.ruleBatch">
            <span class="l">淘汰批次</span>
            <span class="v">{{ activeRecord.ruleBatch }}</span>
          </div>
          <div class="eb-row" v-if="activeRecord.ruleId">
            <span class="l">命中规则</span>
            <span class="v rule-inline">
              <span class="rule-id">{{ activeRecord.ruleId }}</span>
              <button v-if="activeRecord.isRealRule" class="view-btn" @click="handleViewRecordRule(activeRecord.ruleId)" :disabled="loadingRule">
                <AppIcon name="search" :size="11" /> {{ loadingRule ? '加载中...' : '查看' }}
              </button>
            </span>
          </div>
          <div class="eb-row" v-if="activeRecord.ruleDeadline">
            <span class="l">截止日期</span>
            <span class="v mono" style="color:var(--eol-red)">{{ activeRecord.ruleDeadline }}</span>
          </div>
          <div class="eb-row">
            <span class="l">判定日期</span>
            <span class="v mono">{{ activeRecord.judgmentDate || '—' }}</span>
          </div>
          <div class="eb-row">
            <span class="l">判定人</span>
            <span class="v">{{ activeRecord.judgmentBy || '—' }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ③ 设备档案 -->
    <div style="margin-top: 24px;">
      <DeviceArchive :device="props.device" />
    </div>

    <!-- 规则详情弹窗 -->
    <RuleDetailModal :rule="showRuleModal ? selectedRule : null" @close="showRuleModal = false" />
  </div>
</template>

<style scoped>
.dd-card-head {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 14px; margin-bottom: 16px;
  border-bottom: 1px dashed var(--line);
  flex-wrap: nowrap; white-space: nowrap;
}
.dd-card-head h3 { margin: 0; font-size: 15px; color: var(--text-0); }

/* 空状态 */
.eb-empty {
  padding: 36px 20px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.eb-empty .h { font-size: 14px; font-weight: 600; color: var(--text-1); }
.eb-empty.ok .h { color: var(--ok); }
.eb-empty .s { font-size: 12px; color: var(--text-3); line-height: 1.6; }

/* 结论横幅 */
.elim-banner {
  border: 1px solid; border-radius: 10px;
  padding: 14px 16px; margin-bottom: 14px;
}
.elim-banner-type {
  display: flex; align-items: center; gap: 7px;
  font-size: 16px; font-weight: 700; margin-bottom: 9px;
}
.elim-banner-desc {
  font-size: 12px; color: var(--text-1); line-height: 1.75;
}

/* 信息块 */
.eb-block {
  margin-bottom: 12px;
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
}
.eb-block-title {
  font-size: 11px; font-weight: 600; color: var(--text-2);
  letter-spacing: 0.05em; text-transform: uppercase;
  padding: 7px 14px; background: #f6f9ff;
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 6px;
}

/* 行 */
.eb-rows { display: flex; flex-direction: column; }
.eb-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; gap: 12px; background: #fff;
  border-bottom: 1px solid var(--line);
}
.eb-row:last-child { border-bottom: none; }
.eb-row:nth-child(even) { background: #f9fbff; }
.eb-row .l { font-size: 11px; color: var(--text-3); flex-shrink: 0; font-family: "JetBrains Mono", monospace; }
.eb-row .v { font-size: 12px; color: var(--text-0); text-align: right; }
.eb-row .v.bold { font-weight: 700; }
.eb-row .v.mono { font-family: "JetBrains Mono", monospace; }
.eb-row .v.small { font-size: 11px; }

/* 规则行内展示 */
.rule-inline { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
.rule-id {
  font-family: "JetBrains Mono", monospace; font-size: 11px; font-weight: 700;
  background: var(--brand); color: #fff; padding: 2px 7px; border-radius: 4px; flex-shrink: 0;
}
.rule-product { font-size: 11px; color: var(--text-2); }
.view-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; font-size: 11px; color: var(--brand);
  background: white; border: 1px solid var(--line-strong);
  border-radius: 5px; cursor: pointer; flex-shrink: 0;
}
.view-btn:hover { border-color: var(--brand); background: rgba(47,127,255,0.06); }

/* 流程卡片列表 */
.proc-cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.proc-card {
  border: 1px solid;
  border-radius: 8px;
  padding: 12px 14px;
  transition: all 0.2s ease;
}
.proc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.proc-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}
.l-flow {
  display: flex;
  align-items: center;
  gap: 6px;
}
.flow-name {
  font-weight: 700;
  font-size: 13px;
}
.r-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid var(--line);
}
.proc-desc {
  font-size: 12px;
  color: var(--text-1);
  line-height: 1.6;
}

/* 切换选项卡 Tabs */
.proc-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap; /* 允许在多于 4-5 个按钮、或者分辨率极小时优雅折行 */
}
.proc-tab {
  flex: 1 1 90px; /* 默认均分，并限制最小基准宽度 */
  min-width: 75px; /* 限制按钮的最小宽度，防止文字被挤爆 */
  padding: 5px 4px; /* 压缩边距 */
  font-size: 11px; /* 字体微调保证在小宽度下完美容纳 */
  text-align: center;
  white-space: nowrap;
  border-radius: 8px;
  border: 1px solid;
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  box-sizing: border-box;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 46px; /* 固定高度，确保不管是单行待判定还是双行判定，高度均保持一致 */
}
.proc-tab:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.04);
}
.proc-tab:active {
  transform: translateY(0);
}


</style>

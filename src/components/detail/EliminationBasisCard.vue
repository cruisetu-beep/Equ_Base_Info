<script setup>
// ── components/detail/EliminationBasisCard.vue ────────────────────
// 淘汰判定详情卡：对应数据库设计 T_ST_EquipmentEliminationBasis
// 命中规则 / 匹配方法 / 判定依据 / 寿命对比 / 能效差距 / 优先级评分

import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { RULES_LIB_INIT, ACTION_COLORS } from '@/data/rules'

const props = defineProps({
  device: { type: Object, required: true },
  ext:    { type: Object, required: true },
})
defineEmits(['view-rule'])

const matchedRule = computed(() =>
  props.device.ruleHit ? RULES_LIB_INIT.find(r => r.ruleId === props.device.ruleHit) : null
)

const lifeUsedPct = computed(() => {
  if (!props.ext.designLife) return 0
  return Math.min(100, Math.round((props.ext.serviceYears / props.ext.designLife) * 100))
})

const lifeBarColor = computed(() => {
  if (lifeUsedPct.value >= 100) return 'var(--eol-red)'
  if (lifeUsedPct.value >= 80) return 'var(--eol-low)'
  return 'var(--ok)'
})

const priorityLevel = computed(() => {
  const s = props.ext.priorityScore
  if (s >= 80) return { label: '高优先级', color: 'var(--eol-red)' }
  if (s >= 50) return { label: '中优先级', color: 'var(--eol-low)' }
  return { label: '低优先级', color: 'var(--ok)' }
})
</script>

<template>
  <div class="card dd-card">
    <div class="dd-card-head">
      <AppIcon name="rule" :size="16" stroke="var(--brand)" />
      <h3>淘汰判定详情</h3>
    </div>

    <!-- 正常运行：无判定记录 -->
    <div v-if="device.status === 'normal'" class="eb-empty ok">
      <AppIcon name="check" :size="24" stroke="var(--ok)" />
      <div class="h">设备能效合格，未命中任何淘汰规则</div>
      <div class="s">建议保持当前运行状态，定期能效检测</div>
    </div>

    <!-- 待判定 -->
    <div v-else-if="device.status === 'pending'" class="eb-empty">
      <AppIcon name="info" :size="24" stroke="var(--warn)" />
      <div class="h">待判定</div>
      <div class="s">{{ device.reason || '运行数据未齐全，暂无法完成判定' }}</div>
    </div>

    <!-- 已有判定结果（低效/限期/强制） -->
    <template v-else>
      <!-- 命中规则 -->
      <div v-if="matchedRule" class="eb-rule-card" :style="{ '--cl': ACTION_COLORS[matchedRule.actionType]?.color }">
        <div class="header">
          <span class="rid">{{ matchedRule.ruleId }}</span>
          <span class="action-tag">{{ matchedRule.actionType }}淘汰</span>
          <span class="meta">{{ matchedRule.batch }} · 截止 {{ matchedRule.deadline }}</span>
          <button class="view-rule-btn" @click="$emit('view-rule', matchedRule.ruleId)">
            <AppIcon name="search" :size="11" /> 查看规则
          </button>
        </div>
        <div class="product">{{ matchedRule.product }}</div>
        <div class="reason">
          <strong>淘汰理由：</strong>{{ device.reason || matchedRule.reason }}
        </div>
        <div class="advice">
          <AppIcon name="sparkles" :size="13" class="sparks" />
          <div><strong>改造建议：</strong>{{ matchedRule.advice }}</div>
        </div>
      </div>
      <div v-else class="eb-rule-card manual" style="--cl:var(--text-2)">
        <div class="header">
          <span class="action-tag" style="color:var(--text-1)">人工判定</span>
        </div>
        <div class="reason"><strong>判定说明：</strong>{{ device.reason || '—' }}</div>
      </div>

      <!-- 判定依据明细 -->
      <div class="eb-section">
        <div class="eb-section-label">判定依据</div>
        <div class="grid-3 eb-fields">
          <div class="eb-field"><span class="l">匹配方法</span><span class="v">型号前缀匹配</span></div>
          <div class="eb-field"><span class="l">判定日期</span><span class="v mono">{{ device.updated.slice(0, 10) }}</span></div>
          <div class="eb-field"><span class="l">判定人</span><span class="v">SYSTEM（规则引擎）</span></div>
        </div>
      </div>

      <!-- 寿命对比 -->
      <div class="eb-section">
        <div class="eb-section-label">寿命周期</div>
        <div class="life-bar-wrap">
          <div class="life-bar-track">
            <div class="life-bar-fill" :style="{ width: `${lifeUsedPct}%`, background: lifeBarColor }" />
          </div>
          <div class="life-bar-labels">
            <span>已用 {{ ext.serviceYears }} 年</span>
            <span class="mono">{{ lifeUsedPct }}%</span>
            <span>设计寿命 {{ ext.designLife }} 年</span>
          </div>
        </div>
        <div class="grid-3 eb-fields" style="margin-top:14px">
          <div class="eb-field"><span class="l">剩余寿命</span><span class="v mono" :style="{ color: ext.remainingLife <= 2 ? 'var(--eol-red)' : 'var(--text-0)' }">{{ ext.remainingLife }} 年</span></div>
          <div class="eb-field"><span class="l">能效差距</span><span class="v mono" style="color:var(--eol-low)">{{ ext.energyEfficiencyGap }}%</span></div>
          <div class="eb-field"><span class="l">年超额能耗</span><span class="v mono" style="color:var(--eol-red)">{{ ext.annualExcessEnergy }} 吨标煤</span></div>
        </div>
      </div>

      <!-- 优先级评分 -->
      <div class="eb-section" style="margin-bottom:0">
        <div class="eb-section-label">更新优先级评分</div>
        <div class="priority-row">
          <div class="priority-score" :style="{ color: priorityLevel.color }">{{ ext.priorityScore }}</div>
          <div class="priority-bar-track">
            <div class="priority-bar-fill" :style="{ width: `${ext.priorityScore}%`, background: priorityLevel.color }" />
          </div>
          <span class="priority-tag" :style="{ color: priorityLevel.color, borderColor: priorityLevel.color }">{{ priorityLevel.label }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.eb-empty {
  padding: 30px 24px; text-align: center; color: var(--text-2);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.eb-empty.ok { color: var(--ok); }
.eb-empty .h { font-size: 13px; font-weight: 500; color: var(--text-1); }
.eb-empty.ok .h { color: var(--ok); }
.eb-empty .s { font-size: 11.5px; color: var(--text-3); }

.eb-rule-card {
  padding: 16px 18px; border-radius: 10px;
  background: #fff8f9; border: 1px solid rgba(224,57,79,0.22);
  border-left: 4px solid var(--cl); margin-bottom: 18px;
}
.eb-rule-card.manual { background: #f8faff; border-color: var(--line); }
.eb-rule-card .header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.eb-rule-card .rid { font-family: "JetBrains Mono", monospace; padding: 3px 8px; background: var(--cl); color: white; border-radius: 4px; font-size: 11px; font-weight: 600; }
.eb-rule-card .action-tag { font-size: 11.5px; font-weight: 500; color: var(--cl); }
.eb-rule-card .meta { font-size: 11px; color: var(--text-2); font-family: "JetBrains Mono", monospace; }
.eb-rule-card .view-rule-btn {
  margin-left: auto; display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; font-size: 11px; color: var(--brand); background: white;
  border: 1px solid var(--line-strong); border-radius: 5px; cursor: pointer;
}
.eb-rule-card .view-rule-btn:hover { border-color: var(--brand); background: rgba(47,127,255,0.06); }
.eb-rule-card .product { font-size: 13px; color: var(--text-0); font-weight: 500; }
.eb-rule-card .reason { margin-top: 8px; padding: 10px 12px; background: white; border-radius: 6px; font-size: 12px; color: var(--text-1); line-height: 1.6; border: 1px dashed var(--line); }
.eb-rule-card .advice { margin-top: 8px; padding: 10px 12px; background: linear-gradient(90deg, rgba(43,217,168,0.08), rgba(43,217,168,0.02)); border: 1px solid rgba(43,217,168,0.25); border-radius: 6px; font-size: 12px; color: var(--text-1); line-height: 1.6; display: flex; gap: 8px; align-items: flex-start; }
.eb-rule-card .advice .sparks { color: var(--ok); flex-shrink: 0; margin-top: 1px; }
.eb-rule-card .advice strong { color: var(--ok); }

.eb-section { margin-bottom: 22px; }
.eb-section-label { font-size: 11px; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; margin-bottom: 12px; }
.eb-fields { gap: 14px 20px; }
.eb-field { display: flex; flex-direction: column; gap: 4px; }
.eb-field .l { font-size: 11.5px; color: var(--text-2); }
.eb-field .v { font-size: 13px; color: var(--text-0); }

.life-bar-wrap { display: flex; flex-direction: column; gap: 8px; }
.life-bar-track { height: 10px; background: #e3ebf7; border-radius: 5px; overflow: hidden; position: relative; }
.life-bar-fill { height: 100%; border-radius: 5px; transition: width 0.4s; }
.life-bar-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-2); }

.priority-row { display: flex; align-items: center; gap: 14px; }
.priority-score { font-family: "Orbitron", sans-serif; font-size: 26px; font-weight: 700; min-width: 50px; }
.priority-bar-track { flex: 1; height: 8px; background: #e3ebf7; border-radius: 4px; overflow: hidden; }
.priority-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }
.priority-tag { font-size: 11px; padding: 3px 10px; border-radius: 999px; border: 1px solid; flex-shrink: 0; }
</style>

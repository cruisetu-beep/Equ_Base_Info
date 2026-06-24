<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { RULES_LIB_INIT } from '@/data/rules'

const props = defineProps({
  device: { type: Object, required: true },
  ext:    { type: Object, required: true },
})
defineEmits(['view-rule'])

const matchedRule = computed(() =>
  props.device.ruleHit ? RULES_LIB_INIT.find(r => r.ruleId === props.device.ruleHit) : null
)

const elimStyle = computed(() => {
  const t = props.device.eliminationType || props.device.level || ''
  if (t.includes('强制')) return { color: '#e0394f', bg: 'rgba(224,57,79,0.07)', border: 'rgba(224,57,79,0.28)', label: '强制淘汰' }
  if (t.includes('限期')) return { color: '#ea8c2e', bg: 'rgba(234,140,46,0.07)', border: 'rgba(234,140,46,0.28)', label: '限期淘汰' }
  if (t.includes('低效')) return { color: '#d4a017', bg: 'rgba(212,160,23,0.07)', border: 'rgba(212,160,23,0.28)', label: '低效设备' }
  return { color: 'var(--text-2)', bg: '#f8faff', border: 'var(--line)', label: '—' }
})

// 从 F_JudgmentCriteria 格式解析：型号前缀匹配: S, 规则:B1-3-1, 批次:第一批
const criteria = computed(() => {
  const r = matchedRule.value
  if (!r) return null
  return {
    prefix: props.device.model?.split('-')[0] || '—',
    ruleId: r.ruleId,
    batch: r.batch,
  }
})
</script>

<template>
  <div class="card dd-card">
    <div class="dd-card-head">
      <AppIcon name="rule" :size="16" stroke="var(--brand)" />
      <h3>淘汰判定详情</h3>
    </div>

    <!-- 正常运行 -->
    <div v-if="device.status === 'normal'" class="eb-empty ok">
      <AppIcon name="check" :size="28" stroke="var(--ok)" />
      <div class="h">设备能效合格</div>
      <div class="s">未命中任何淘汰规则，建议保持当前运行状态</div>
    </div>

    <!-- 待判定 -->
    <div v-else-if="device.status === 'pending'" class="eb-empty">
      <AppIcon name="info" :size="28" stroke="var(--warn)" />
      <div class="h">待判定</div>
      <div class="s">{{ device.reason || '运行数据未齐全，暂无法完成判定' }}</div>
    </div>

    <!-- 已判定 -->
    <template v-else>

      <!-- ① 结论横幅 -->
      <div class="elim-banner" :style="{ background: elimStyle.bg, borderColor: elimStyle.border }">
        <div class="elim-banner-type" :style="{ color: elimStyle.color }">
          <AppIcon name="ban" :size="15" :stroke="elimStyle.color" />
          {{ elimStyle.label }}
        </div>
        <div class="elim-banner-desc">{{ device.reason || '—' }}</div>
      </div>

      <!-- ② 判定记录 -->
      <div class="eb-block">
        <div class="eb-block-title">判定记录</div>
        <div class="eb-rows">
          <div class="eb-row">
            <span class="l">F_EliminationType</span>
            <span class="v bold" :style="{ color: elimStyle.color }">{{ elimStyle.label }}</span>
          </div>
          <div class="eb-row">
            <span class="l">F_MatchMethod</span>
            <span class="v">{{ matchedRule ? '型号匹配' : '人工判定' }}</span>
          </div>
          <div class="eb-row" v-if="criteria">
            <span class="l">F_JudgmentCriteria</span>
            <span class="v mono small">
              型号前缀匹配: {{ criteria.prefix }}，规则: {{ criteria.ruleId }}，批次: {{ criteria.batch }}
            </span>
          </div>
          <div class="eb-row">
            <span class="l">F_JudgmentDate</span>
            <span class="v mono">{{ device.updated?.slice(0, 10) || '—' }}</span>
          </div>
          <div class="eb-row">
            <span class="l">F_JudgmentBy</span>
            <span class="v">SYSTEM</span>
          </div>
        </div>
      </div>

      <!-- ③ 命中规则 -->
      <div class="eb-block" v-if="matchedRule">
        <div class="eb-block-title">命中规则 · F_RuleID</div>
        <div class="eb-rule-header">
          <span class="rule-id">{{ matchedRule.ruleId }}</span>
          <span class="rule-product">{{ matchedRule.product }}</span>
          <button class="view-btn" @click="$emit('view-rule', matchedRule.ruleId)">
            <AppIcon name="search" :size="11" /> 查看
          </button>
        </div>
        <div class="eb-rows">
          <div class="eb-row">
            <span class="l">淘汰批次</span>
            <span class="v mono">{{ matchedRule.batch }}</span>
          </div>
          <div class="eb-row" v-if="matchedRule.deadline">
            <span class="l">截止日期</span>
            <span class="v mono" style="color:var(--eol-red)">{{ matchedRule.deadline }}</span>
          </div>
        </div>
      </div>

      <!-- ④ 改造建议 -->
      <div class="eb-block eb-advice" v-if="matchedRule?.advice">
        <div class="eb-block-title">
          <AppIcon name="sparkles" :size="13" stroke="var(--ok)" />
          改造建议
        </div>
        <div class="advice-text">{{ matchedRule.advice }}</div>
      </div>

    </template>
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
  display: flex; align-items: flex-start; justify-content: space-between;
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

/* 规则行 */
.eb-rule-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; background: #fff; border-bottom: 1px solid var(--line);
}
.rule-id {
  font-family: "JetBrains Mono", monospace; font-size: 12px; font-weight: 700;
  background: var(--brand); color: #fff; padding: 2px 9px; border-radius: 4px; flex-shrink: 0;
}
.rule-product { font-size: 12px; color: var(--text-1); flex: 1; }
.view-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; font-size: 11px; color: var(--brand);
  background: white; border: 1px solid var(--line-strong);
  border-radius: 5px; cursor: pointer; flex-shrink: 0;
}
.view-btn:hover { border-color: var(--brand); background: rgba(47,127,255,0.06); }

/* 改造建议 */
.eb-advice { border-color: rgba(43,217,168,0.3); }
.eb-advice .eb-block-title { background: rgba(43,217,168,0.06); color: var(--ok); border-color: rgba(43,217,168,0.25); }
.advice-text { padding: 12px 14px; font-size: 12px; color: var(--text-1); line-height: 1.8; background: #fff; }
</style>

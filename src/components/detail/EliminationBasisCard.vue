<script setup>
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

// 淘汰类型配色
const elimTypeStyle = computed(() => {
  const t = props.device.level || ''
  if (t.includes('强制')) return { color: '#e0394f', bg: 'rgba(224,57,79,0.08)', border: 'rgba(224,57,79,0.3)' }
  if (t.includes('限期')) return { color: '#ea8c2e', bg: 'rgba(234,140,46,0.08)', border: 'rgba(234,140,46,0.3)' }
  if (t.includes('低效')) return { color: '#f0c040', bg: 'rgba(240,192,64,0.08)', border: 'rgba(240,192,64,0.3)' }
  return { color: 'var(--text-2)', bg: '#f8faff', border: 'var(--line)' }
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

    <!-- 已判定（低效/限期/强制） -->
    <template v-else>

      <!-- ① 判定结论 -->
      <div class="elim-conclusion" :style="{ background: elimTypeStyle.bg, borderColor: elimTypeStyle.border }">
        <div class="elim-type-label" :style="{ color: elimTypeStyle.color }">
          <AppIcon name="ban" :size="14" :stroke="elimTypeStyle.color" />
          {{ device.level }}
        </div>
        <div class="elim-reason">{{ device.reason || matchedRule?.reason || '—' }}</div>
      </div>

      <!-- ② 判定信息 -->
      <div class="eb-block">
        <div class="eb-block-title">判定信息</div>
        <div class="eb-rows">
          <div class="eb-row">
            <span class="l">淘汰类型</span>
            <span class="v" :style="{ color: elimTypeStyle.color, fontWeight: 600 }">
              {{ device.level?.replace('（建议改造）','') || '—' }}
            </span>
          </div>
          <div class="eb-row">
            <span class="l">匹配方法</span>
            <span class="v">{{ matchedRule ? '型号前缀匹配' : '人工判定' }}</span>
          </div>
          <div class="eb-row">
            <span class="l">判定标准</span>
            <span class="v mono" v-if="matchedRule">
              型号前缀匹配: {{ device.model?.split('-')[0] }}，规则: {{ matchedRule.ruleId }}，批次: {{ matchedRule.batch }}
            </span>
            <span class="v" v-else>—</span>
          </div>
          <div class="eb-row">
            <span class="l">判定日期</span>
            <span class="v mono">{{ device.updated?.slice(0, 10) || '—' }}</span>
          </div>
          <div class="eb-row">
            <span class="l">判定方式</span>
            <span class="v">SYSTEM（规则引擎）</span>
          </div>
        </div>
      </div>

      <!-- ③ 命中规则 -->
      <div class="eb-block" v-if="matchedRule">
        <div class="eb-block-title">命中规则</div>
        <div class="eb-rule-row">
          <span class="rule-id">{{ matchedRule.ruleId }}</span>
          <span class="rule-product">{{ matchedRule.product }}</span>
          <button class="view-rule-btn" @click="$emit('view-rule', matchedRule.ruleId)">
            <AppIcon name="search" :size="11" /> 查看
          </button>
        </div>
        <div class="eb-rows" style="margin-top:10px">
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
          <AppIcon name="sparkles" :size="13" stroke="var(--ok)" /> 改造建议
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

/* 判定结论横幅 */
.elim-conclusion {
  border: 1px solid; border-radius: 10px;
  padding: 14px 16px; margin-bottom: 16px;
}
.elim-type-label {
  display: flex; align-items: center; gap: 7px;
  font-size: 15px; font-weight: 700; margin-bottom: 8px;
}
.elim-reason {
  font-size: 12px; color: var(--text-1); line-height: 1.7;
}

/* 信息块 */
.eb-block {
  margin-bottom: 16px;
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
}
.eb-block-title {
  font-size: 11px; font-weight: 600; color: var(--text-2);
  letter-spacing: 0.05em; text-transform: uppercase;
  padding: 8px 14px; background: #f6f9ff;
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 6px;
}

/* 行列表 */
.eb-rows { display: flex; flex-direction: column; }
.eb-row {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 9px 14px; gap: 12px; background: #fff;
  border-bottom: 1px solid var(--line);
}
.eb-row:last-child { border-bottom: none; }
.eb-row:nth-child(even) { background: #f9fbff; }
.eb-row .l { font-size: 12px; color: var(--text-2); flex-shrink: 0; }
.eb-row .v { font-size: 12px; color: var(--text-0); text-align: right; }
.eb-row .v.mono { font-family: "JetBrains Mono", monospace; font-size: 11px; }

/* 命中规则行 */
.eb-rule-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; background: #fff; border-bottom: 1px solid var(--line);
}
.rule-id {
  font-family: "JetBrains Mono", monospace; font-size: 12px; font-weight: 700;
  background: var(--brand); color: #fff; padding: 2px 8px; border-radius: 4px;
  flex-shrink: 0;
}
.rule-product { font-size: 12px; color: var(--text-1); flex: 1; }
.view-rule-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; font-size: 11px; color: var(--brand);
  background: white; border: 1px solid var(--line-strong);
  border-radius: 5px; cursor: pointer; flex-shrink: 0;
}
.view-rule-btn:hover { border-color: var(--brand); background: rgba(47,127,255,0.06); }

/* 改造建议 */
.eb-advice { border-color: rgba(43,217,168,0.3); }
.eb-advice .eb-block-title { background: rgba(43,217,168,0.06); color: var(--ok); border-color: rgba(43,217,168,0.25); }
.advice-text {
  padding: 12px 14px; font-size: 12px; color: var(--text-1);
  line-height: 1.75; background: #fff;
}
</style>

<script setup>
// ── components/judge/JudgeResult.vue ──────────────────────────────
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'
import { JUDGE_STATUS_MAP } from '@/data/rules'
import { RULES_LIB_INIT } from '@/data/rules'

const props = defineProps({
  results:  { type: Array, required: true },
})
defineEmits(['restart', 'back'])

const expandedId = ref(props.results.length === 1 ? 0 : null)

const summary = computed(() => ({
  total:     props.results.length,
  normal:    props.results.filter(r => r.status === 'normal').length,
  low_eff:   props.results.filter(r => r.status === 'low_eff').length,
  deadline:  props.results.filter(r => r.status === 'phaseout-deadline').length,
  mandatory: props.results.filter(r => r.status === 'phaseout-mandatory').length,
}))

const phaseoutTotal = computed(() => summary.value.deadline + summary.value.mandatory)
const enabledCount  = computed(() => RULES_LIB_INIT.filter(r => r.enabled !== false).length)

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
      <h2><AppIcon name="check" :size="24" stroke="#4dc9ff" /> 判定完成</h2>
      <div class="sub">基于规则库 v1.3 · 共 {{ enabledCount }} 条启用规则进行判定</div>
      <div class="summary-stats">
        <div class="ss-item">
          <div class="l">判定设备总数</div><div class="v">{{ summary.total }}</div><div class="pct">台</div>
        </div>
        <div class="ss-item ok">
          <div class="l">正常运行</div><div class="v">{{ summary.normal }}</div><div class="pct">{{ pct(summary.normal) }}</div>
        </div>
        <div class="ss-item warn">
          <div class="l">低效（建议改造）</div><div class="v">{{ summary.low_eff }}</div><div class="pct">{{ pct(summary.low_eff) }}</div>
        </div>
        <div class="ss-item danger">
          <div class="l">限期淘汰</div><div class="v">{{ summary.deadline }}</div><div class="pct">{{ pct(summary.deadline) }}</div>
        </div>
        <div class="ss-item danger">
          <div class="l">强制淘汰</div><div class="v">{{ summary.mandatory }}</div><div class="pct">{{ pct(summary.mandatory) }}</div>
        </div>
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
          <div class="thumb">
            <AppIcon :name="(DEV_TYPE_MAP[r.device.typeK] || DEV_TYPE_MAP.other).icon" :size="20"
                     :stroke="(DEV_TYPE_MAP[r.device.typeK] || DEV_TYPE_MAP.other).color" />
          </div>
          <div class="info">
            <div class="code">{{ r.device.code }}</div>
            <div class="name">{{ r.device.name || '未命名设备' }}</div>
            <div class="meta">
              {{ (DEV_TYPE_MAP[r.device.typeK] || DEV_TYPE_MAP.other).label }} ·
              <span class="mono">{{ r.device.model || '—' }}</span> ·
              {{ r.device.year || '—' }} 年
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
            <div class="s">建议保持当前运行状态，定期能效检测</div>
          </div>

          <template v-else>
            <!-- 命中规则 -->
            <div class="section">
              <h5><AppIcon name="rule" :size="12" /> 命中规则（{{ r.hits.length }} 条）</h5>
              <div
                v-for="(h, i) in r.hits" :key="i"
                class="hit-rule-card"
                :style="{ '--cl': actionColor(h.rule.actionType) }"
              >
                <div class="header">
                  <span class="rid">{{ h.rule.ruleId }}</span>
                  <span class="action-tag">{{ h.rule.actionType }}淘汰</span>
                  <span class="meta">{{ h.rule.batch }} · 截止 {{ h.rule.deadline }} · 置信度 {{ h.rule.confidence }}</span>
                </div>
                <div class="product">{{ h.rule.product }}</div>
                <div class="reason">
                  <strong>淘汰理由：</strong>{{ h.rule.reason }}
                  <div style="margin-top:6px;font-size:11px;color:var(--text-2);font-family:'JetBrains Mono',monospace">
                    ▸ 依据：{{ h.rule.standard }}
                  </div>
                </div>
                <div class="advice">
                  <AppIcon name="sparkles" :size="14" class="sparks" />
                  <div><strong>改造建议：</strong>{{ h.rule.advice }}</div>
                </div>
              </div>
            </div>

            <!-- 判定细节 -->
            <div class="section">
              <h5><AppIcon name="check" :size="12" /> 判定细节（首条命中规则）</h5>
              <div class="checks-grid">
                <div v-for="(c, i) in r.hits[0].checks" :key="i" class="check-cell">
                  <div class="ck"><AppIcon name="check" :size="11" /></div>
                  <div class="info">
                    <div class="step">{{ c.step }}</div>
                    <div class="actual">{{ checkActual(c) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="res-actions">
              <button class="btn ghost" style="padding:7px 14px;font-size:12px">
                <AppIcon name="download" :size="11" /> 导出此设备 PDF
              </button>
              <button class="btn ghost" style="padding:7px 14px;font-size:12px">
                <AppIcon name="doc" :size="11" /> 查看完整规则原文
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div style="padding:14px 18px;background:white;border:1px solid var(--line);border-radius:10px;display:flex;gap:10px">
      <div style="flex:1;font-size:12px;color:var(--text-2)">
        <span v-if="phaseoutTotal > 0" style="color:var(--eol-red)">
          <AppIcon name="warn" :size="11" />
          共有 <strong>{{ phaseoutTotal }}</strong> 台设备需要淘汰处理（强制 {{ summary.mandatory }} · 限期 {{ summary.deadline }}）
        </span>
        <span v-else-if="summary.low_eff === 0" style="color:var(--ok)">
          <AppIcon name="check" :size="11" /> 全部设备能效合格
        </span>
      </div>
      <button class="btn ghost" @click="$emit('back')"><AppIcon name="chevron-left" :size="13" /> 返回选择方式</button>
      <button class="btn ghost" @click="$emit('restart')"><AppIcon name="zap" :size="13" /> 重新判定</button>
      <button class="btn primary"><AppIcon name="download" :size="13" /> 导出完整 PDF 报告</button>
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

.result-list { display: flex; flex-direction: column; gap: 10px; }
.result-item { background: white; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; transition: all 0.2s; }
.result-item:hover { box-shadow: 0 4px 16px rgba(60,110,200,0.06); }
.result-item.phaseout { border-color: rgba(224,57,79,0.30); }
.result-item.low_eff  { border-color: rgba(234,140,46,0.30); }
.result-item.normal   { border-color: rgba(43,217,168,0.30); }

.ri-head { padding: 16px 20px; display: grid; grid-template-columns: 56px 1fr 130px 110px 28px; gap: 16px; align-items: center; cursor: pointer; }
.ri-head .thumb { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, rgba(77,201,255,0.15), rgba(77,201,255,0.05)); border: 1px solid rgba(77,201,255,0.22); display: grid; place-items: center; color: var(--cl); }
.ri-head .info .code { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-2); }
.ri-head .info .name { font-size: 14px; color: var(--text-0); font-weight: 500; margin-top: 2px; }
.ri-head .info .meta { font-size: 11px; color: var(--text-2); margin-top: 4px; }
.ri-head .hits-cnt { font-size: 12px; color: var(--text-1); display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
.ri-head .hits-cnt strong { font-family: "Orbitron", sans-serif; font-size: 22px; color: var(--cl); }
.ri-head .chev { color: var(--text-3); transition: transform 0.2s; }
.ri-head.open .chev { transform: rotate(90deg); }

.ri-body { padding: 0 20px 20px; border-top: 1px dashed var(--line); margin-top: -1px; }
.ri-body .section { margin-top: 18px; }
.ri-body .section h5 { margin: 0 0 10px; font-size: 12px; color: var(--text-1); display: flex; align-items: center; gap: 6px; }

.checks-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.check-cell { padding: 10px 12px; border-radius: 8px; background: rgba(43,217,168,0.06); border: 1px solid rgba(43,217,168,0.25); font-size: 12px; display: flex; align-items: center; gap: 8px; }
.check-cell .ck { width: 18px; height: 18px; border-radius: 50%; background: var(--ok); color: white; display: grid; place-items: center; flex-shrink: 0; }
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
.hit-rule-card .advice { margin-top: 8px; padding: 10px 12px; background: linear-gradient(90deg, rgba(43,217,168,0.08), rgba(43,217,168,0.02)); border: 1px solid rgba(43,217,168,0.25); border-radius: 6px; font-size: 12px; color: var(--text-1); line-height: 1.6; display: flex; gap: 8px; align-items: flex-start; }
.hit-rule-card .advice .sparks { color: var(--ok); flex-shrink: 0; }
.hit-rule-card .advice strong { color: var(--ok); }

.res-actions { display: flex; gap: 10px; margin-top: 6px; padding-top: 14px; border-top: 1px dashed var(--line); }
.empty-rules-card { padding: 24px; text-align: center; background: linear-gradient(180deg, rgba(43,217,168,0.06), rgba(43,217,168,0.02)); border: 1px dashed rgba(43,217,168,0.30); border-radius: 8px; color: var(--ok); }
.empty-rules-card .h { font-size: 13px; font-weight: 500; }
.empty-rules-card .s { font-size: 11.5px; color: var(--text-2); margin-top: 6px; }
</style>

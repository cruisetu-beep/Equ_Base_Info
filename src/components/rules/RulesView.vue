<script setup>
// ── components/rules/RulesView.vue ────────────────────────────────
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import AppIcon      from '@/components/common/AppIcon.vue'
import RulesSidebar from './RulesSidebar.vue'
import RulesTable   from './RulesTable.vue'
import RuleSidePanel from './RuleSidePanel.vue'
import { RULES_LIB_INIT } from '@/data/rules'

const PAGE_SIZE = 8

// ── 动态测算表格区域可用高度（精确填满剩余视口，不再猜固定 px）────
const rootEl   = ref(null)
const gridH    = ref(480) // 初始兜底值，measure 后立即覆盖

function measure() {
  if (!rootEl.value) return
  const rect = rootEl.value.getBoundingClientRect()
  const available = window.innerHeight - rect.top - 24 // 24px 底部呼吸距离
  gridH.value = Math.max(320, available)
}

onMounted(async () => {
  await nextTick()
  measure()
  window.addEventListener('resize', measure)
})
onUnmounted(() => {
  window.removeEventListener('resize', measure)
})

// ── 状态 ────────────────────────────────────────────────────────
const rules         = ref(RULES_LIB_INIT.map(r => ({ ...r })))
const filterBatch   = ref('all')
const filterType    = ref('all')
const filterStatus  = ref('all')
const qRuleId       = ref('')
const qProduct      = ref('')
const page          = ref(1)
const selId         = ref(null)
const editing       = ref(false)
const creating      = ref(false)
const deleteConfirm = ref(null)

// 筛选变化时重置分页
watch([filterBatch, filterType, filterStatus, qRuleId, qProduct], () => { page.value = 1 })

// ── 筛选 + 分页 ────────────────────────────────────────────────
const filtered = computed(() =>
  rules.value.filter(r => {
    if (filterBatch.value !== 'all' && r.batch  !== filterBatch.value) return false
    if (filterType.value  !== 'all' && r.typeK  !== filterType.value)  return false
    if (filterStatus.value === 'enabled'  && r.enabled === false)       return false
    if (filterStatus.value === 'disabled' && r.enabled !== false)       return false
    if (qRuleId.value) {
      if (!r.ruleId.toLowerCase().includes(qRuleId.value.toLowerCase())) return false
    }
    if (qProduct.value) {
      const s = qProduct.value.toLowerCase()
      if (!(r.product.toLowerCase().includes(s) ||
            (r.modelPattern || []).some(m => m.toLowerCase().includes(s)) ||
            (r.subType || '').toLowerCase().includes(s))) return false
    }
    return true
  })
)

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const pageRules  = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const selRule    = computed(() => selId.value ? rules.value.find(r => r.ruleId === selId.value) : null)

// ── 操作 handlers ───────────────────────────────────────────────
function toggleEnabled(ruleId) {
  rules.value = rules.value.map(r =>
    r.ruleId === ruleId ? { ...r, enabled: r.enabled !== false ? false : true } : r
  )
}

function handleUpdateRule(ruleId, patch) {
  rules.value = rules.value.map(r => r.ruleId === ruleId ? { ...r, ...patch } : r)
}

function handleDeleteRule(ruleId) {
  rules.value = rules.value.filter(r => r.ruleId !== ruleId)
  if (selId.value === ruleId) selId.value = null
  deleteConfirm.value = null
}

function handleAddRule(newRule) {
  rules.value = [...rules.value, newRule]
  selId.value = newRule.ruleId
  creating.value = false
}

function selectRule(id) {
  selId.value = id
  editing.value = false
  creating.value = false
}

function startCreate() {
  creating.value = true
  selId.value = null
  editing.value = false
}
</script>

<template>
  <div class="rules-view float-in">
    <!-- 页头 -->
    <div class="page-head">
      <div>
        <h1 class="page-title">
          <AppIcon name="rule" :size="24" stroke="var(--brand-2)" />
          规则库管理
        </h1>
        <div class="page-subtitle">
          《高耗能落后机电设备（产品）淘汰目录》全四批合并规则库 v1.3 ·
          管理设备类型 / 型号系列 / 规格区间 / 截止日期 / 启停状态等核心字段，所有变更对判定引擎实时生效。
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn ghost"><AppIcon name="download" :size="14" /> 导出规则库</button>
        <button class="btn primary" @click="startCreate">
          <AppIcon name="plus" :size="14" /> 新建规则
        </button>
      </div>
    </div>

    <!-- 横向筛选条 -->
    <RulesSidebar
      :rules="rules"
      :filter-batch="filterBatch"
      :filter-type="filterType"
      :filter-status="filterStatus"
      @update:filter-batch="filterBatch = $event"
      @update:filter-type="filterType = $event"
      @update:filter-status="filterStatus = $event"
    />

    <!-- 表格 + 详情两栏布局 -->
    <div ref="rootEl" class="rules-grid" :style="{ height: gridH + 'px' }">
      <RulesTable
        :page-rules="pageRules"
        :total-count="filtered.length"
        :page="page"
        :total-pages="totalPages"
        :q-rule-id="qRuleId"
        :q-product="qProduct"
        :sel-id="selId"
        :delete-confirm-id="deleteConfirm"
        @update:q-rule-id="qRuleId = $event"
        @update:q-product="qProduct = $event"
        @update:page="page = $event"
        @update:sel-id="selectRule($event)"
        @toggle-enabled="toggleEnabled($event)"
        @update:delete-confirm-id="deleteConfirm = $event"
        @delete-rule="handleDeleteRule($event)"
      />

      <RuleSidePanel
        :sel-rule="selRule"
        :creating="creating"
        :editing="editing"
        :rules="rules"
        @update:editing="editing = $event"
        @update-rule="handleUpdateRule"
        @delete-rule="handleDeleteRule"
        @add-rule="handleAddRule"
        @cancel-create="creating = false"
      />
    </div>
  </div>
</template>

<style scoped>
.rules-view { display: flex; flex-direction: column; gap: 16px; }
.rules-grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; min-height: 0; overflow: hidden; }
</style>

<script setup>
// ── components/rules/RulesView.vue ────────────────────────────────
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon      from '@/components/common/AppIcon.vue'
import RulesSidebar from './RulesSidebar.vue'
import RulesTable   from './RulesTable.vue'
import RuleSidePanel from './RuleSidePanel.vue'
import RuleEditModal from './RuleEditModal.vue'
import { getRuleStats, getRuleList, toggleRuleStatus, deleteRule as apiDeleteRule, updateRule as apiUpdateRule, createRule as apiCreateRule, getRuleDetail } from '@/api/rules'
import { DEV_TYPES } from '@/data/devices'

const props = defineProps({
  // 从设备详情页跳转时传入，自动选中并展开该规则详情
  initialSelId: { type: String, default: null },
})

const PAGE_SIZE = 8

// 中英文一级设备分类映射定义
const EN_TO_CN_TYPE = {
  motor: '电机',
  fan: '风机',
  pump: '泵',
  transformer: '变压器',
  boiler: '工业锅炉',
  compressor: '压缩机',
  chiller: '制冷设备',
  welder: '电弧焊机',
  resistor: '电阻炉',
  appliance: '电器',
  machine: '机床',
  forge: '锻压设备',
  heat: '热处理设备',
  valve: '阀',
  diesel: '柴油机'
}

const CN_TO_EN_TYPE = {
  '电机': 'motor',
  '电动机': 'motor',
  '风机': 'fan',
  '泵': 'pump',
  '变压器': 'transformer',
  '工业锅炉': 'boiler',
  '锅炉': 'boiler',
  '压缩机': 'compressor',
  '制冷设备': 'chiller',
  '制冷空调': 'chiller',
  '电弧焊机': 'welder',
  '焊机': 'welder',
  '电阻炉': 'resistor',
  '电器': 'appliance',
  '机床': 'machine',
  '锻压设备': 'forge',
  '热处理设备': 'heat',
  '阀': 'valve',
  '柴油机': 'diesel'
}

function cnToEn(cnType) {
  if (!cnType) return 'other'
  for (const [cn, en] of Object.entries(CN_TO_EN_TYPE)) {
    if (cnType.includes(cn) || cn.includes(cnType)) {
      return en
    }
  }
  return 'other'
}

function enToCn(enType) {
  return EN_TO_CN_TYPE[enType] || enType
}

// ── 状态 ────────────────────────────────────────────────────────
const allRules      = ref([])
const filterBatch   = ref('all')
const filterType    = ref('all')
const filterStatus  = ref('all')
const qRuleId       = ref('')
const qProduct      = ref('')
const page          = ref(1)
const selId         = ref(props.initialSelId || null)
const editing       = ref(false)
const creating      = ref(false)
const deleteConfirm = ref(null)

// 弹窗控制状态
const modalShow     = ref(false)
const modalMode     = ref('edit') // 'view' (查看) | 'edit' (编辑)
const modalLoading  = ref(false) // 加载中状态
const selRuleDetail = ref(null)

// ── 1. 过滤逻辑与计算属性 ──
const filteredRules = computed(() => {
  return allRules.value.filter(r => {
    // 状态筛选
    if (filterStatus.value !== 'all') {
      const isEnabled = filterStatus.value === 'enabled'
      if (r.enabled !== isEnabled) return false
    }
    // 批次筛选
    if (filterBatch.value !== 'all') {
      if (r.batch !== filterBatch.value) return false
    }
    // 类型筛选
    if (filterType.value !== 'all') {
      if (r.typeK !== filterType.value) return false
    }
    // 关键字模糊搜索
    if (qRuleId.value || qProduct.value) {
      const query = (qRuleId.value || qProduct.value).trim().toLowerCase()
      const matchRuleId = r.ruleId && r.ruleId.toLowerCase().includes(query)
      const matchProduct = r.product && r.product.toLowerCase().includes(query)
      const matchSubType = r.subType && r.subType.toLowerCase().includes(query)
      const matchModelSeries = r.modelSeries && r.modelSeries.toLowerCase().includes(query)
      if (!matchRuleId && !matchProduct && !matchSubType && !matchModelSeries) return false
    }
    return true
  })
})

// 分页数据
const rules = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  const end = page.value * PAGE_SIZE
  return filteredRules.value.slice(start, end)
})

// 深链接跳转：若带 initialSelId 进入，自动翻到该规则所在页
onMounted(() => {
  if (props.initialSelId) {
    const idx = filteredRules.value.findIndex(r => r.ruleId === props.initialSelId)
    if (idx !== -1) page.value = Math.floor(idx / PAGE_SIZE) + 1
  }
})

// 总条数
const totalCount = computed(() => filteredRules.value.length)

// 交叉统计筛选条件数量
const stats = computed(() => {
  // 基础过滤集 (只考虑搜索关键字，这是所有聚合的公共底子)
  const baseFiltered = allRules.value.filter(r => {
    if (qRuleId.value || qProduct.value) {
      const query = (qRuleId.value || qProduct.value).trim().toLowerCase()
      const matchRuleId = r.ruleId && r.ruleId.toLowerCase().includes(query)
      const matchProduct = r.product && r.product.toLowerCase().includes(query)
      const matchSubType = r.subType && r.subType.toLowerCase().includes(query)
      const matchModelSeries = r.modelSeries && r.modelSeries.toLowerCase().includes(query)
      if (!matchRuleId && !matchProduct && !matchSubType && !matchModelSeries) return false
    }
    return true
  })

  // 状态聚合所需集：受【批次 + 类型】过滤
  const statusFiltered = baseFiltered.filter(r => {
    if (filterBatch.value !== 'all' && r.batch !== filterBatch.value) return false
    if (filterType.value !== 'all' && r.typeK !== filterType.value) return false
    return true
  })
  const statusAll = statusFiltered.length
  const statusEnabled = statusFiltered.filter(r => r.enabled).length
  const statusDisabled = statusFiltered.filter(r => !r.enabled).length

  // 批次聚合所需集：受【状态 + 类型】过滤
  const batchFiltered = baseFiltered.filter(r => {
    if (filterStatus.value !== 'all') {
      const isEnabled = filterStatus.value === 'enabled'
      if (r.enabled !== isEnabled) return false
    }
    if (filterType.value !== 'all' && r.typeK !== filterType.value) return false
    return true
  })

  const batchCounts = {}
  batchFiltered.forEach(r => {
    if (r.batch) {
      batchCounts[r.batch] = (batchCounts[r.batch] || 0) + 1
    }
  })

  // 类型聚合所需集：受【状态 + 批次】过滤
  const typeFiltered = baseFiltered.filter(r => {
    if (filterStatus.value !== 'all') {
      const isEnabled = filterStatus.value === 'enabled'
      if (r.enabled !== isEnabled) return false
    }
    if (filterBatch.value !== 'all' && r.batch !== filterBatch.value) return false
    return true
  })

  const typeCounts = {}
  typeFiltered.forEach(r => {
    if (r.typeK) {
      typeCounts[r.typeK] = (typeCounts[r.typeK] || 0) + 1
    }
  })

  const statusList = [
    { key: 'all', name: '全部', count: statusAll },
    { key: 'enabled', name: '已启用', count: statusEnabled },
    { key: 'disabled', name: '已禁用', count: statusDisabled }
  ]

  const batchKeys = ['第一批', '第二批', '第三批', '第四批']
  const batchList = [
    { key: 'all', name: '全部', count: batchFiltered.length },
    ...batchKeys.map(k => ({
      key: k,
      name: k,
      count: batchCounts[k] || 0
    })).filter(b => b.count > 0 || filterBatch.value === b.key)
  ]

  const typeList = [
    { key: 'all', name: '全部', count: typeFiltered.length },
    ...DEV_TYPES.map(d => ({
      key: d.k,
      name: d.label,
      count: typeCounts[d.k] || 0
    })).filter(t => t.count > 0 || filterType.value === t.key)
  ]

  return {
    status: statusList,
    batches: batchList,
    types: typeList
  }
})

// ── 2. 数据获取与操作 ──
async function fetchData() {
  try {
    const result = await getRuleList({ pageSize: 10000, pageIndex: 1 })
    const rawTable = result.table || []
    allRules.value = rawTable.map(r => ({
      ...r,
      typeK: cnToEn(r.typeK)
    }))
  } catch (err) {
    console.error('获取所有规则数据失败：', err)
  }
}

onMounted(() => {
  fetchData()
})

// 筛选变化时重置分页，计算属性会自动更新响应，无需再次请求后端
watch([filterBatch, filterType, filterStatus, qRuleId, qProduct], () => { 
  page.value = 1 
})

// ── 操作 handlers ───────────────────────────────────────────────
async function toggleEnabled(ruleId) {
  const success = await toggleRuleStatus(ruleId)
  if (success) {
    allRules.value = allRules.value.map(r =>
      r.ruleId === ruleId ? { ...r, enabled: !r.enabled } : r
    )
  }
}

async function handleSaveRule(payload) {
  if (creating.value) {
    const success = await apiCreateRule(payload)
    if (success) {
      selId.value = payload.ruleId
      creating.value = false
      modalShow.value = false
      fetchData()
    }
  } else {
    const success = await apiUpdateRule(payload)
    if (success) {
      modalShow.value = false
      fetchData()
    }
  }
}

async function handleDeleteRule(ruleId) {
  const success = await apiDeleteRule(ruleId)
  if (success) {
    if (selId.value === ruleId) selId.value = null
    deleteConfirm.value = null
    fetchData()
  }
}

async function selectRule(id) {
  selId.value = id
  creating.value = false
  modalMode.value = 'view' 
  modalShow.value = true   
  modalLoading.value = true 
  try {
    const detail = await getRuleDetail(id)
    selRuleDetail.value = detail
    creating.value = false
    modalMode.value = 'view' 
    modalShow.value = true
  } catch (err) {
    console.error('获取规则详情失败，错误详情:', err)
    alert('获取规则详情失败，请确认后端 API 服务是否正常且已返回数据。错误信息：' + (err.stack || err.message || err))
  } finally {
    modalLoading.value = false 
  }
}

function startCreate() {
  creating.value = true
  selId.value = null
  modalMode.value = 'edit' 
  modalShow.value = true
}

function handleCloseModal() {
  modalShow.value = false
  creating.value = false
  selId.value = null
  modalLoading.value = false 
}

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
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
      :stats="stats"
      :filter-batch="filterBatch"
      :filter-type="filterType"
      :filter-status="filterStatus"
      @update:filter-batch="filterBatch = $event"
      @update:filter-type="filterType = $event"
      @update:filter-status="filterStatus = $event"
    />

    <!-- 表格单栏占满全宽布局 -->
    <div class="rules-table-container">
      <RulesTable
        :page-rules="rules"
        :total-count="totalCount"
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
    </div>

    <!-- 利用 Teleport 将弹窗移至 Body 下，解决定位污染及两侧漏白问题 -->
    <Teleport to="body">
      <RuleEditModal
        :show="modalShow"
        :loading="modalLoading"
        :creating="creating"
        :mode="modalMode"
        :sel-rule="selRuleDetail"
        :rules="allRules"
        @close="handleCloseModal"
        @save="handleSaveRule"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.rules-view { display: flex; flex-direction: column; gap: 16px; }
.rules-table-container { width: 100%; }
</style>

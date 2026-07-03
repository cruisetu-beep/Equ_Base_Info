<script setup>
// ── components/judge/FromExisting.vue ─────────────────────────────
import { ref, computed, onMounted, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'
import { getJudgeEquipmentList, getDistinctFilterYears, getDistinctFilterBrands, getJudgmentProcessDict } from '@/api/judge'
import JudgeFormModal from './JudgeFormModal.vue'

const showJudgeModal = ref(false)
const modalDevice = ref(null)
const modalBasis = ref(null)

const selectedProcesses = ref(['1', '2', '3'])
const processOptions = ref([])

const openFormModal = (dev) => {
  modalDevice.value = {
    id: dev.equId,
    code: dev.equId,
    name: dev.equipmentName,
    model: dev.model,
    year: dev.year,
    power: dev.power,
    manufactureDate: dev.manufactureDate,
    buildingId: dev.buildId,
    buildingName: dev.buildName
  }
  showJudgeModal.value = true
}

const handleJudgeSuccess = async () => {
  await loadData()
}

const props = defineProps({
  initialDevices: { type: Array, default: () => [] }
})

const emit = defineEmits(['start', 'back'])

// 反应式状态：存储当前页从后端拉取到的设备列表
const allDevices = ref([])
const total = ref(0)
const pageIndex = ref(1)
const pageSize = ref(8)
const judgeStatus = ref('all')
const q = ref('')
const loading = ref(false)

const filterYear = ref('all')
const filterBrand = ref('all')
const filterModel = ref('')

const yearOptions = ref([])
const brandOptions = ref([])

// 存储被选中设备的对象，键为 equId，值为设备对象
const selected = ref({})
const cnt = computed(() => Object.keys(selected.value).length)

// 获取选中的设备ID列表
const getSelectedIds = () => Object.keys(selected.value)
const getSelectedDevices = () => Object.values(selected.value)

// 拼接并请求后端设备列表接口
const loadData = async () => {
  loading.value = true
  try {
    const query = {
      PageIndex: pageIndex.value,
      PageSize: pageSize.value,
      JudgeStatus: judgeStatus.value === 'all' ? '' : judgeStatus.value,
      Q: q.value,
      FilterYear: filterYear.value === 'all' ? '' : filterYear.value,
      FilterBrand: filterBrand.value === 'all' ? '' : filterBrand.value,
      FilterModel: filterModel.value
    }
    const res = await getJudgeEquipmentList(query)
    if (res && res.table) {
      allDevices.value = res.table || []
      total.value = res.rowCount || res.total || 0
    } else {
      allDevices.value = []
      total.value = 0
    }
  } catch (e) {
    console.error('加载设备判定列表失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadData()
  
  if (props.initialDevices && props.initialDevices.length > 0) {
    const newSels = { ...selected.value }
    props.initialDevices.forEach(d => {
      const id = d.equId || d.id
      if (id) {
        const matched = allDevices.value.find(x => x.equId === id)
        newSels[id] = matched || { equId: id, equipmentName: d.equipmentName || d.name || `设备 ${id}`, ...d }
      }
    })
    selected.value = newSels
  }

  // 加载投运年份与厂家字典列表
  try {
    const [years, brands, processes] = await Promise.all([
      getDistinctFilterYears(),
      getDistinctFilterBrands(),
      getJudgmentProcessDict()
    ])
    yearOptions.value = years || []
    brandOptions.value = brands || []
    
    // 过滤出 F_JudgmentProcess value 大于 0 的项，并默认全选
    if (processes && processes.length) {
      processOptions.value = processes.filter(p => parseInt(p.key) > 0)
      selectedProcesses.value = processOptions.value.map(p => p.key)
    }
  } catch (err) {
    console.error('加载字典失败:', err)
  }
})

const handleStatusChange = (status) => {
  judgeStatus.value = status
}

const resetFilters = () => {
  q.value = ''
  judgeStatus.value = 'all'
  filterYear.value = 'all'
  filterBrand.value = 'all'
  filterModel.value = ''
  pageIndex.value = 1
}

// 监听多维度过滤条件变化时，自动将页码置回第一页，并拉取最新结果
watch([judgeStatus, q, filterYear, filterBrand, filterModel], () => {
  pageIndex.value = 1
  loadData()
})

// 监听分页与页大小变化
watch([pageIndex, pageSize], () => {
  loadData()
})

// 后端分页模式下，当前页显示的设备直接对应后端查得的列表
const devices = computed(() => allDevices.value)

// 当前过滤后的设备总数
const filteredTotal = computed(() => total.value)

// 总页数
const totalPages = computed(() => Math.ceil(filteredTotal.value / pageSize.value))

// 分页页码生成（最多展示 5 个页码）
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, pageIndex.value - 2)
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    if (i >= 1) pages.push(i)
  }
  return pages
})

const changePage = (idx) => {
  pageIndex.value = idx
}

// 勾选操作：向购物车添加/删除设备对象
const toggle = (dev) => {
  const id = dev.equId
  const newSels = { ...selected.value }
  if (newSels[id]) {
    delete newSels[id]
  } else {
    newSels[id] = dev
  }
  selected.value = newSels
}

// 全选：仅对当前页的设备进行一键全选
const selectAll = () => {
  const newSels = { ...selected.value }
  allDevices.value.forEach(d => {
    newSels[d.equId] = d
  })
  selected.value = newSels
}

const clearSel = () => {
  selected.value = {}
}

// 计算当前页是否被全选
const isAllSelected = computed(() => {
  if (allDevices.value.length === 0) return false
  return allDevices.value.every(d => selected.value[d.equId])
})

// 当前页全选/反选切换
const toggleSelectAll = () => {
  const newSels = { ...selected.value }
  if (isAllSelected.value) {
    allDevices.value.forEach(d => {
      delete newSels[d.equId]
    })
  } else {
    allDevices.value.forEach(d => {
      newSels[d.equId] = d
    })
  }
  selected.value = newSels
}

// 仅勾选当前页的“待判定”设备
const onlyPending = () => {
  const newSels = { ...selected.value }
  allDevices.value.forEach(d => {
    if (d.judgeStatus === '未判定') {
      newSels[d.equId] = d
    }
  })
  selected.value = newSels
}

// 仅勾选当前页中“≤2010年投运”的设备
const allOld = () => {
  const newSels = { ...selected.value }
  allDevices.value.forEach(d => {
    if (d.year && parseInt(d.year) <= 2010) {
      newSels[d.equId] = d
    }
  })
  selected.value = newSels
}

// 开始判定，将当前购物车内的全量设备传回父组件
function handleStart() {
  const devs = Object.values(selected.value)
  emit('start', devs, selectedProcesses.value)
}

// 类型与状态工具函数
function getDeviceColor(d) {
  return DEV_TYPE_MAP[d.equipmentTypeId]?.color || '#97a4c0'
}

function getDeviceIcon(d) {
  return DEV_TYPE_MAP[d.equipmentTypeId]?.icon || 'cube'
}

function getStatusTagClass(d) {
  if (d.judgeStatus === '未判定') return 'pending'
  const type = d.eliminationType || ''
  if (type.includes('强制')) return 'phaseout'
  if (type.includes('限期') || type.includes('落后') || type.includes('低效') || type.includes('过渡')) return 'low_eff'
  return 'normal'
}

function getStatusTagLabel(d) {
  if (d.judgeStatus === '未判定') return '待判定'
  return d.eliminationType || '正常'
}

const STATUS_ICON = {
  normal: 'check',
  pending: 'info',
  low_eff: 'warn',
  phaseout: 'ban'
}
</script>

<template>
  <div class="from-existing float-in">
    <div class="page-head">
      <div>
        <h1 class="page-title"><AppIcon name="list" :size="22" stroke="var(--brand-2)" /> 从已录入设备选择</h1>
        <div class="page-subtitle">勾选若干已入库设备，对其实时发起后台三级淘汰匹配判定。</div>
      </div>
      <button class="btn ghost" @click="$emit('back')"><AppIcon name="chevron-left" :size="14" /> 返回选择方式</button>
    </div>

    <!-- 搜索与筛选工具栏 -->
    <div class="filter-bar-group">
      <div class="filter-row single-line-filters" style="display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 10px 16px; background: #fcfdfe; border: 1px solid var(--line); border-radius: 10px; margin-bottom: 10px;">
        <div class="status-tabs" style="flex-shrink: 0;">
          <button 
            v-for="tab in [{k:'all', n:'全部'}, {k:'未判定', n:'待判定'}, {k:'已判定', n:'已判定'}]" 
            :key="tab.k"
            :class="['tab-btn', judgeStatus === tab.k && 'active']"
            @click="handleStatusChange(tab.k)"
          >
            {{ tab.n }}
          </button>
        </div>

        <div class="search-input" style="flex: 1; min-width: 180px;">
          <AppIcon name="search" :size="14" stroke="var(--text-2)" />
          <input v-model="q" placeholder="输入编码/名称模糊检索..." />
        </div>

        <div class="filter-item" style="flex-shrink: 0; display: flex; align-items: center; gap: 6px;">
          <span class="label" style="font-size: 12px; color: var(--text-2);">投运年份:</span>
          <select v-model="filterYear" class="select-input">
            <option value="all">全部</option>
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
          </select>
        </div>

        <div class="filter-item" style="flex-shrink: 0; display: flex; align-items: center; gap: 6px;">
          <span class="label" style="font-size: 12px; color: var(--text-2);">生产厂家:</span>
          <select v-model="filterBrand" class="select-input">
            <option value="all">全部</option>
            <option v-for="b in brandOptions" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>

        <div class="filter-item" style="flex-shrink: 0; display: flex; align-items: center; gap: 6px;">
          <span class="label" style="font-size: 12px; color: var(--text-2);">设备型号:</span>
          <input v-model="filterModel" placeholder="输入型号..." class="input-inline" style="width: 110px;" />
        </div>

        <button class="btn ghost btn-sm reset-btn" style="flex-shrink: 0;" @click="resetFilters">重置</button>
      </div>
    </div>

    <!-- 快捷勾选工具栏 -->
    <div class="ent-toolbar">
      <div class="l" style="display: flex; align-items: center; gap: 8px;">
        <label class="select-all-label" style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
          <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" style="width: 14px; height: 14px; cursor: pointer;" />
          <span style="font-size: 12px; font-weight: 600; color: var(--text-1)">全选本页</span>
        </label>
        <span style="color: var(--line-strong); margin: 0 4px;">|</span>
        满足当前检索共 <strong style="color:var(--brand-2)">{{ filteredTotal }}</strong> 台设备 · 已选 <strong style="color:var(--brand-2)">{{ cnt }}</strong> 台
      </div>
    </div>

    <!-- 设备列表 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <div>正在加载设备档案...</div>
    </div>

    <div v-else-if="devices.length === 0" class="empty-state">
      <AppIcon name="info" :size="32" stroke="var(--text-3)" />
      <div>暂无符合筛选要求的设备记录</div>
    </div>

    <div v-else class="ent-list">
      <div
        v-for="d in devices" :key="d.equId"
        :class="['ent-row', selected[d.equId] && 'sel']"
        :style="{ '--cl': getDeviceColor(d) }"
        @click="toggle(d)"
      >
        <div class="ck">
          <AppIcon v-if="selected[d.equId]" name="check" :size="14" />
        </div>
        <div class="thumb">
          <AppIcon :name="getDeviceIcon(d)" :size="20" :stroke="getDeviceColor(d)" />
        </div>
        <div class="info">
          <div class="code">{{ d.equId }}</div>
          <div class="name">{{ d.equipmentName }}</div>
          <div class="meta">
            {{ d.typeName || '通用设备' }} · 
            <span class="mono">{{ d.model || '未知型号' }}</span> · 
            {{ d.year ? `${d.year}年投运` : '未知年份' }}
          </div>
        </div>
        <div class="params-mini">
          <template v-if="d.attributes && d.attributes.length > 0">
            <div v-for="(attr, idx) in d.attributes.slice(0, 2)" :key="idx">
              {{ attr.key }}: <strong style="color:var(--text-0)">{{ attr.value || '—' }}</strong>
            </div>
          </template>
          <template v-else>
            <div>功率: <strong style="color:var(--text-0)">{{ d.power || '—' }}</strong></div>
            <div>出厂: <strong style="color:var(--text-0)">{{ d.manufactureDate ? d.manufactureDate.split('T')[0] : '—' }}</strong></div>
          </template>
        </div>
        <div class="building-mini" :title="d.buildName || d.buildId">建筑: {{ d.buildName || d.buildId }}</div>
        <div :class="['level-tag', getStatusTagClass(d)]">
          <AppIcon :name="STATUS_ICON[getStatusTagClass(d)]" :size="10" />
          {{ getStatusTagLabel(d) }}
        </div>
        <div class="action-cell">
          <span class="link-btn" @click.stop="openFormModal(d)">查看档案</span>
        </div>
      </div>
    </div>

    <!-- 统一人工判定与查看淘汰档案弹窗 -->
    <JudgeFormModal
      v-if="showJudgeModal"
      :show="showJudgeModal"
      :device="modalDevice"
      @close="showJudgeModal = false"
      @success="handleJudgeSuccess"
    />

    <!-- 前端分页栏 -->
    <div v-if="filteredTotal > 0" class="pagination-bar">
      <div class="pg-info">
        共 {{ filteredTotal }} 条记录 · 每页
        <select v-model="pageSize" class="pg-size-select">
          <option :value="8">8</option>
          <option :value="15">15</option>
          <option :value="30">30</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        条 · 第 {{ pageIndex }} / {{ totalPages }} 页
      </div>
      <div class="pg-btns">
        <button class="btn ghost btn-sm" :disabled="pageIndex <= 1" @click="changePage(pageIndex - 1)">上一页</button>
        <button 
          v-for="p in visiblePages" 
          :key="p"
          :class="['btn', 'btn-sm', p === pageIndex ? 'primary' : 'ghost']"
          @click="changePage(p)"
        >
          {{ p }}
        </button>
        <button class="btn ghost btn-sm" :disabled="pageIndex >= totalPages" @click="changePage(pageIndex + 1)">下一页</button>
      </div>
    </div>

    <!-- 悬浮操作栏 -->
    <div :class="['float-bar', cnt === 0 && 'empty']">
      <div class="info">
        <div class="h">{{ cnt > 0 ? `准备对选中的 ${cnt} 台设备发起后台判定` : '请先勾选需要进行判定的设备' }}</div>
        
        <!-- 已选设备小标签回显区域 -->
        <div v-if="cnt > 0" class="selected-tags">
          <div v-for="dev in getSelectedDevices()" :key="dev.equId" class="selected-tag" title="点击取消选择" @click.stop="toggle(dev)">
            <span class="tag-name">{{ dev.equipmentName }}</span>
            <span class="tag-close">&times;</span>
          </div>
        </div>

        <div class="s">{{ cnt > 0 ? `执行判定后可手动调整并保存结果。` : `当前共有 ${filteredTotal} 台在用设备可选` }}</div>
      </div>
      
      <div class="process-selector" v-if="cnt > 0 && processOptions.length > 0" style="display: flex; gap: 15px; margin-right: 10px; align-items: center;">
        <span style="font-size: 13px; color: var(--text-2);">启用流程:</span>
        <label v-for="proc in processOptions" :key="proc.key" style="display: flex; align-items: center; gap: 4px; font-size: 14px; cursor: pointer;">
          <input type="checkbox" :value="proc.key" v-model="selectedProcesses" /> {{ proc.value }}
        </label>
      </div>

      <button class="btn primary" :disabled="cnt === 0" @click="handleStart">
        <AppIcon name="zap" :size="14" /> 执行实时判定 <template v-if="cnt > 0">· {{ cnt }} 台</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.from-existing { display: flex; flex-direction: column; gap: 16px; }

/* 搜索与多维度筛选样式 */
.filter-bar-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: white;
  padding: 14px 18px;
  border: 1px solid var(--line);
  border-radius: 10px;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.filter-row.main-row {
  justify-content: space-between;
}
.filter-row.select-filters {
  border-top: 1px dashed var(--line);
  padding-top: 12px;
  flex-wrap: wrap;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-1);
}
.filter-item .label {
  font-weight: 500;
  white-space: nowrap;
}
.select-input {
  border: 1px solid var(--line);
  background: #f8fafc;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
  color: var(--text-0);
  outline: none;
  cursor: pointer;
  height: 28px;
  min-width: 110px;
}
.select-input:focus {
  border-color: var(--brand);
}
.input-inline {
  border: 1px solid var(--line);
  background: #f8fafc;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
  color: var(--text-0);
  outline: none;
  height: 28px;
  width: 140px;
}
.input-inline:focus {
  border-color: var(--brand);
}
.reset-btn {
  margin-left: auto;
  height: 28px;
  padding: 4px 12px !important;
  font-size: 12px !important;
}
.search-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f7fa;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 12px;
  flex: 1;
  max-width: 450px;
}
.search-input input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: var(--text-0);
  flex: 1;
}
.search-btn {
  padding: 4px 12px !important;
  font-size: 12px !important;
  height: 28px;
}
.status-tabs {
  display: flex;
  background: #f0f3f6;
  padding: 3px;
  border-radius: 8px;
}
.tab-btn {
  border: none;
  background: transparent;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: var(--text-0);
}
.tab-btn.active {
  background: white;
  color: var(--brand);
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

.ent-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: white; border: 1px solid var(--line); border-radius: 10px; }
.ent-toolbar .l { font-size: 13px; color: var(--text-1); }
.ent-toolbar .actions { display: flex; gap: 8px; }
.btn-sm { padding: 6px 12px !important; font-size: 12px !important; }

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 60px;
  color: var(--text-2);
  font-size: 14px;
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(47,127,255,0.15);
  border-radius: 50%;
  border-top-color: var(--brand);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.ent-list { display: flex; flex-direction: column; gap: 8px; }
.ent-row {
  padding: 14px 18px; background: white; border: 1px solid var(--line); border-radius: 10px;
  display: grid; grid-template-columns: 36px 56px 1fr 180px 120px 90px 80px; gap: 14px;
  align-items: center; cursor: pointer; transition: all 0.15s;
}

.action-cell {
  display: flex;
  justify-content: flex-end;
}
.action-cell .link-btn {
  color: var(--brand);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 5px;
  background: rgba(47, 127, 255, 0.05);
  border: 1px solid rgba(47, 127, 255, 0.15);
  transition: all 0.15s;
  white-space: nowrap;
}
.action-cell .link-btn:hover {
  background: var(--brand);
  color: white;
  border-color: transparent;
}
.ent-row:hover { border-color: var(--brand); background: #f8faff; }
.ent-row.sel { border-color: var(--brand); background: #eaf2ff; box-shadow: 0 2px 8px rgba(47,127,255,0.10); }
.ent-row .ck { width: 22px; height: 22px; border-radius: 5px; border: 2px solid var(--line-strong); background: white; display: grid; place-items: center; color: white; font-size: 14px; }
.ent-row.sel .ck { background: var(--brand); border-color: var(--brand); }
.ent-row .thumb { width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, rgba(77,201,255,0.15), rgba(77,201,255,0.05)); border: 1px solid rgba(77,201,255,0.22); display: grid; place-items: center; color: var(--cl); }
.ent-row .info .code { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-2); }
.ent-row .info .name { font-size: 13.5px; color: var(--text-0); font-weight: 500; margin-top: 2px; }
.ent-row .info .meta { font-size: 11.5px; color: var(--text-2); margin-top: 3px; }
.ent-row .params-mini { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-1); line-height: 1.5; }
.ent-row .building-mini { font-size: 11px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 分页栏样式 */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-2);
}
.pg-btns {
  display: flex;
  gap: 8px;
}

.float-bar {
  position: sticky; bottom: 0; margin-top: 10px;
  padding: 16px 22px; background: rgba(255,255,255,0.97);
  border: 1px solid var(--line); border-radius: 12px;
  box-shadow: 0 -2px 16px rgba(60,110,200,0.08);
  display: flex; align-items: center; gap: 14px;
  backdrop-filter: blur(10px);
}
.float-bar.empty { opacity: 0.65; }
.float-bar .info { flex: 1; }
.float-bar .info .h { font-size: 14px; color: var(--text-0); font-weight: 500; }
.float-bar .info .s { font-size: 11.5px; color: var(--text-2); margin-top: 2px; }

/* 跨页购物车标签面板 */
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
  max-height: 80px;
  overflow-y: auto;
}
.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(47, 127, 255, 0.08);
  border: 1px solid rgba(47, 127, 255, 0.18);
  color: var(--brand);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.selected-tag:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.25);
  color: #ef4444;
}
.selected-tag .tag-close {
  font-size: 14px;
  line-height: 1;
  font-weight: bold;
}
.pg-size-select {
  border: 1px solid var(--line);
  background: #f8fafc;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 12px;
  color: var(--text-0);
  outline: none;
  cursor: pointer;
  margin: 0 4px;
}
.pg-size-select:focus {
  border-color: var(--brand);
}
</style>

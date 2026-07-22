<script setup>
// ── components/overview/OverviewView.vue ───────────────────────────
// 对应原 React OverviewView 组件，完整迁移
// Emits: create（跳转录入）、judge（跳转判定）

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP, parseTypeK } from '@/data/devices'
import { getDevices, getEquipmentTypeDict, getBuildingList } from '@/api/devices'
import { useDeviceStore } from '@/stores/useDeviceStore'

defineEmits(['create', 'judge', 'view-detail'])

const deviceStore = useDeviceStore()

// ── 加载状态与数据 ──────────────────────────────────────────────────────
const isLoading  = ref(true)    // 是否在加载中
const devices    = ref([])       // 真实设备数据
const typeFilter = ref(deviceStore.filterType || 'all') // 从 store 记忆状态恢复类型筛选
const typeDict   = ref([])    // 字典表获取的设备类型列表
const stat       = ref(deviceStore.filterStatus || 'all')   // 从 store 记忆状态恢复状态筛选
const q          = ref(deviceStore.filterQuery || '')      // 从 store 记忆状态恢复搜索词
const buildingFilter = ref(deviceStore.filterBuilding || 'all') // 建筑维度（设备列表）筛选
const buildings      = ref([]) // 建筑字典列表
const displayLimit   = ref(60) // 限制首屏及单次渲染卡片数，解决全量 1600+ 卡片渲染带来的主线程阻塞卡顿问题

// 监听当前筛选参数并同步备份回 Pinia Store，以维持返回时的条件记忆，并在条件改变时重置懒加载页数
watch([q, typeFilter, stat, buildingFilter], ([newQ, newType, newStat, newBuild]) => {
  deviceStore.filterQuery = newQ
  deviceStore.filterType = newType
  deviceStore.filterStatus = newStat
  deviceStore.filterBuilding = newBuild
  displayLimit.value = 60 // 重置筛选条件时，将渲染上限重置，解决瞬间重排卡顿
})

// 自定义下拉框状态与引用
const showTypeDropdown = ref(false)
const selectWrapRef    = ref(null)
const showBuildingDropdown = ref(false)
const buildWrapRef = ref(null)
const buildInputRef = ref(null)
const buildingSearchQuery = ref('')

const selectedBuildingName = computed(() => {
  if (buildingFilter.value === 'all') return '请选择建筑'
  const found = buildings.value.find(b => b.code === buildingFilter.value)
  return found ? found.name : '请选择建筑'
})

// 根据输入过滤下拉大楼选项 (可搜索)
const filteredBuildings = computed(() => {
  const qStr = buildingSearchQuery.value.trim().toLowerCase()
  if (!qStr) return buildings.value
  return buildings.value.filter(b => (b.name || '').toLowerCase().includes(qStr))
})

// 监听下拉框的展开，控制聚焦和输入清除
watch(showBuildingDropdown, (isOpen) => {
  if (isOpen) {
    buildingSearchQuery.value = ''
    setTimeout(() => {
      buildInputRef.value?.focus()
    }, 50)
  }
})

// ── 生命周期加载 ──────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [res, dictRes, buildRes] = await Promise.all([
      getDevices(),
      getEquipmentTypeDict(),
      getBuildingList()
    ])
    devices.value = (res.table || res.rows || res || []).map(d => ({ ...d, typeK: d.typeK || parseTypeK(d.type2) }))
    deviceStore.devices = devices.value
    typeDict.value = dictRes || []
    buildings.value = buildRes || []
  } catch (err) {
    console.error('获取设备及字典数据失败:', err)
  } finally {
    isLoading.value = false
  }

  // 绑定全局点击事件及滚动懒加载监听，避免全量渲染卡死
  window.addEventListener('click', handleGlobalClick)
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
  window.removeEventListener('scroll', handleScroll)
})

// 滚动触发加载更多逻辑
function handleScroll() {
  const threshold = 200 // 距离底部 200 像素时自动追加加载
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const scrollHeight = document.documentElement.scrollHeight
  
  if (scrollHeight - scrollTop - windowHeight < threshold) {
    if (displayLimit.value < filtered.value.length) {
      displayLimit.value += 40 // 每次顺滑追加 40 个卡片
    }
  }
}

// 点击外部关闭下拉逻辑，使用 isConnected 判定防止被 v-if 销毁的组件节点在冒泡到 window 时触发误判关闭
function handleGlobalClick(e) {
  if (e.target && !e.target.isConnected) {
    return
  }
  if (selectWrapRef.value && !selectWrapRef.value.contains(e.target)) {
    showTypeDropdown.value = false
  }
  if (buildWrapRef.value && !buildWrapRef.value.contains(e.target)) {
    showBuildingDropdown.value = false
  }
}

const typeSearchQuery = ref('')
const typeInputRef = ref(null)

// 选中下拉类型
function selectType(id) {
  typeFilter.value = id
  showTypeDropdown.value = false
}

const selectedTypeName = computed(() => {
  if (typeFilter.value === 'all') return '请选择设备类型'
  const found = typeDict.value.find(t => t.equipmentTypeId === typeFilter.value)
  return found ? found.equipmentTypeName : '请选择设备类型'
})

// 根据输入过滤类型选项 (可搜索)
const filteredTypes = computed(() => {
  const qStr = typeSearchQuery.value.trim().toLowerCase()
  if (!qStr) return typeDict.value
  return typeDict.value.filter(t => (t.equipmentTypeName || '').toLowerCase().includes(qStr))
})

// 监听下拉框的展开，控制聚焦和输入清除
watch(showTypeDropdown, (isOpen) => {
  if (isOpen) {
    typeSearchQuery.value = ''
    setTimeout(() => {
      typeInputRef.value?.focus()
    }, 50)
  }
})

// 智能切换下拉菜单显示状态，高仿 el-select 点击整体包括 input 均可关闭，并使用时间戳防重入消除一闪而过的闪退 Bug
let lastBuildingOpenTime = 0
const toggleBuildingDropdown = () => {
  const now = Date.now()
  if (showBuildingDropdown.value) {
    if (now - lastBuildingOpenTime < 250) return
    showBuildingDropdown.value = false
  } else {
    showBuildingDropdown.value = true
    lastBuildingOpenTime = now
  }
}

let lastTypeOpenTime = 0
const toggleTypeDropdown = () => {
  const now = Date.now()
  if (showTypeDropdown.value) {
    if (now - lastTypeOpenTime < 250) return
    showTypeDropdown.value = false
  } else {
    showTypeDropdown.value = true
    lastTypeOpenTime = now
  }
}

// ── 统计数据 ──────────────────────────────────────────────────────
const total      = computed(() => devices.value.length)
const normalCnt  = computed(() => devices.value.filter(d => d.status === 'normal').length)
const pendingCnt = computed(() => devices.value.filter(d => d.status === 'pending').length)
const lowCnt     = computed(() => devices.value.filter(d => d.status === 'low_eff').length)
const phaseCnt   = computed(() => devices.value.filter(d => d.status === 'phaseout').length)

// 已有设备的一级类型（避免 16 个全列）
const haveTypes = computed(() => [...new Set(devices.value.map(d => d.typeK))])

// ── 筛选结果 ──────────────────────────────────────────────────────
const filtered = computed(() =>
    devices.value.filter(d => {
      // 增加设备列表（所属建筑）参数筛选
      if (buildingFilter.value !== 'all') {
        const bObj = buildings.value.find(b => b.code === buildingFilter.value)
        const bName = bObj ? bObj.name : buildingFilter.value
        if (d.building !== bName) return false
      }
      if (typeFilter.value !== 'all') {
        if (d.equipmentTypeId === typeFilter.value) {
          // 精确匹配
        } else {
          // 模糊匹配名称，用于 Mock 或子类兼容
          const selected = typeDict.value.find(t => t.equipmentTypeId === typeFilter.value)
          if (selected) {
            const name = selected.equipmentTypeName
            if (!(d.type2 || '').includes(name)) return false
          } else {
            return false
          }
        }
      }
      if (stat.value   !== 'all' && d.status !== stat.value)  return false
      if (q.value) {
        const kw = q.value.toLowerCase()
        if (!(d.name || '').toLowerCase().includes(kw)
            && !(d.code || '').toLowerCase().includes(kw)
            && !(d.model || '').toLowerCase().includes(kw)) return false
      }
      return true
    })
)

// 实际输出给模板渲染的设备列表 (增加懒加载限制)
const displayedDevices = computed(() => {
  return filtered.value.slice(0, displayLimit.value)
})

// 状态标签图标映射
const STATUS_ICON = {
  normal:   'check',
  pending:  'info',
  low_eff:  'warn',
  phaseout: 'ban',
}
</script>

<template>
  <div class="overview-view float-in">

    <!-- 页头 -->
    <div class="page-head">
      <div>
        <h1 class="page-title">
          <AppIcon name="cube" :size="26" stroke="var(--brand-2)" />
          设备总览
        </h1>
        <div class="page-subtitle">
          建筑用能设备档案与能效状态全景，规则引擎实时比对国家《高耗能落后机电设备（产品）淘汰目录》(2009/2012/2014/2016 四批)，识别低效与淘汰设备并给出依据。
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn ghost" @click="$emit('judge')">
          <AppIcon name="zap" :size="14" /> 发起判定
        </button>
        <button class="btn primary" @click="$emit('create')">
          <AppIcon name="plus" :size="14" /> 录入新设备
        </button>
      </div>
    </div>

    <!-- 5 个统计卡 -->
    <div class="stats-row">
      <div class="stat-tile" style="--cl:#4dc9ff">
        <div class="l"><AppIcon name="cube" :size="12" /> 设备总数</div>
        <div class="v">{{ total }}<span class="u">台</span></div>
        <div class="d">覆盖 {{ haveTypes.length }} 类一级设备</div>
      </div>
      <div class="stat-tile" style="--cl:#18a572">
        <div class="l"><AppIcon name="check" :size="12" /> 正常运行</div>
        <div class="v" style="color:var(--ok)">{{ normalCnt }}<span class="u">台</span></div>
        <div class="d">能效合格</div>
      </div>
      <div class="stat-tile" style="--cl:#d97706">
        <div class="l"><AppIcon name="info" :size="12" /> 待判定</div>
        <div class="v" style="color:var(--warn)">{{ pendingCnt }}<span class="u">台</span></div>
        <div class="d">数据未齐全</div>
      </div>
      <div class="stat-tile danger" style="--cl:#e0394f">
        <div class="l"><AppIcon name="ban" :size="12" /> 淘汰</div>
        <div class="v" style="color:var(--eol-red)">{{ phaseCnt }}<span class="u">台</span></div>
        <div class="d">规则命中 · 强制/限期</div>
      </div>
    </div>

    <!-- 筛选条 -->
    <div class="filter-bar">
      <!-- 搜索、类型、状态与操作 -->
      <div class="filter-row">
        <!-- 搜索框 -->
        <div class="search-box">
          <AppIcon name="search" :size="14" />
          <input
              v-model="q"
              placeholder="搜索设备名称 / 编号 / 型号"
          />
          <button v-if="q" class="search-clear-btn" @click="q = ''" title="清空搜索">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- 设备列表下拉框（即建筑维度筛选参数，高仿 el-select） -->
        <div 
          :class="['custom-select-wrap', buildingFilter !== 'all' && 'clearable']" 
          ref="buildWrapRef"
        >
          <div class="select-trigger" @click="toggleBuildingDropdown">
            <!-- 未展开时，只显示文字楼宇名 -->
            <span v-if="!showBuildingDropdown" class="selected-val" :style="{ color: buildingFilter === 'all' ? 'var(--text-1)' : 'var(--text-0)' }">
              {{ selectedBuildingName }}
            </span>
            <!-- 展开时，变为输入框支持可检索过滤 -->
            <input 
              v-else 
              ref="buildInputRef"
              v-model="buildingSearchQuery"
              class="select-search-input"
              placeholder="请选择建筑"
              style="border:none; outline:none; background:transparent; padding:0; font-size:13px; color:var(--text-0); width:100%;"
            />
            
            <!-- 清空按钮：平时隐藏，Hover 且有选中值时被 CSS 显示并替换箭头 -->
            <button 
              v-if="buildingFilter !== 'all'"
              class="clear-btn" 
              @click.stop="buildingFilter = 'all'; buildingSearchQuery = ''; showBuildingDropdown = false" 
              title="清空"
              style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0; cursor: pointer; color: var(--text-3); transition: color 0.15s; border-radius: 50%; width: 14px; height: 14px; z-index: 10;"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <AppIcon name="chevron-down" :size="12" stroke="var(--text-3)" :class="['arrow-icon', showBuildingDropdown && 'rotated']" />
          </div>
          
          <Transition name="dropdown-fade">
            <div v-show="showBuildingDropdown" class="custom-dropdown-list">

              <div 
                v-for="b in filteredBuildings" 
                :key="b.code" 
                :class="['dropdown-item', buildingFilter === b.code && 'active']"
                @click="buildingFilter = b.code; showBuildingDropdown = false"
              >
                {{ b.name }}
              </div>
              <div v-if="filteredBuildings.length === 0" class="dropdown-no-data" style="padding: 10px 12px; text-align: center; color: var(--text-3); font-size: 12.5px;">
                无匹配数据
              </div>
            </div>
          </Transition>
        </div>

        <!-- 设备类型下拉框（自定义模拟下拉框，与 WizardStepBasic 精细度对应，高仿 el-select） -->
        <div 
          :class="['custom-select-wrap', typeFilter !== 'all' && 'clearable']" 
          ref="selectWrapRef"
        >
          <div class="select-trigger" @click="toggleTypeDropdown">
            <!-- 未展开时，只显示文字设备类型名 -->
            <span v-if="!showTypeDropdown" class="selected-val" :style="{ color: typeFilter === 'all' ? 'var(--text-1)' : 'var(--text-0)' }">
              {{ selectedTypeName }}
            </span>
            <!-- 展开时，变为输入框支持可检索过滤 -->
            <input 
              v-else 
              ref="typeInputRef"
              v-model="typeSearchQuery"
              class="select-search-input"
              placeholder="请选择设备类型"
              style="border:none; outline:none; background:transparent; padding:0; font-size:13px; color:var(--text-0); width:100%;"
            />
            
            <!-- 清空按钮：平时隐藏，Hover 且有选中值时被 CSS 显示并替换箭头 -->
            <button 
              v-if="typeFilter !== 'all'"
              class="clear-btn" 
              @click.stop="typeFilter = 'all'; typeSearchQuery = ''; showTypeDropdown = false" 
              title="清空"
              style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; border: none; background: transparent; padding: 0; cursor: pointer; color: var(--text-3); transition: color 0.15s; border-radius: 50%; width: 14px; height: 14px; z-index: 10;"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <AppIcon name="chevron-down" :size="12" stroke="var(--text-3)" :class="['arrow-icon', showTypeDropdown && 'rotated']" />
          </div>
          
          <Transition name="dropdown-fade">
            <div v-show="showTypeDropdown" class="custom-dropdown-list">
              <div 
                v-for="t in filteredTypes" 
                :key="t.equipmentTypeId" 
                :class="['dropdown-item', typeFilter === t.equipmentTypeId && 'active']"
                @click="selectType(t.equipmentTypeId)"
              >
                {{ t.equipmentTypeName }}
              </div>
              <div v-if="filteredTypes.length === 0" class="dropdown-no-data" style="padding: 10px 12px; text-align: center; color: var(--text-3); font-size: 12.5px;">
                无匹配数据
              </div>
            </div>
          </Transition>
        </div>

        <!-- 状态筛选 -->
        <div class="filter-chips">
          <span :class="['chip', stat === 'all' && 'active']" @click="stat = 'all'">全部 {{ total }}</span>
          <span :class="['chip', stat === 'normal'   && 'active ok-tone']"      @click="stat = 'normal'">
            <span class="dot-s" style="background:var(--ok)" />正常 {{ normalCnt }}
          </span>
          <span :class="['chip', stat === 'pending'  && 'active pending-tone']" @click="stat = 'pending'">
            <span class="dot-s" style="background:var(--warn)" />待判定 {{ pendingCnt }}
          </span>
          <span :class="['chip', stat === 'phaseout' && 'active danger-tone']"  @click="stat = 'phaseout'">
            <span class="dot-s" style="background:var(--eol-red)" />淘汰 {{ phaseCnt }}
          </span>
        </div>

        <div style="flex:1" />

        <!-- <button class="btn ghost" style="padding:7px 14px;font-size:12px">
          <AppIcon name="download" :size="12" /> 导出
        </button> -->
      </div>
    </div>

    <!-- 设备卡片网格 -->
    <div class="dev-list">

      <!-- 录入新设备入口卡 -->
      <div class="create-tile" @click="$emit('create')">
        <div class="plus-orb">
          <AppIcon name="plus" :size="24" />
        </div>
        <div>
          <div class="h">录入新设备</div>
          <div class="s">铭牌照片自动识别 → 文档解析<br />大约需要 2-3 分钟</div>
        </div>
      </div>

      <!-- 骨架屏加载中占位卡片 -->
      <template v-if="isLoading">
        <div v-for="n in 14" :key="n" class="skeleton-card">
          <div class="sk-head">
            <div class="sk-thumb shinning"></div>
            <div class="sk-info">
              <div class="sk-title shinning"></div>
              <div class="sk-desc shinning"></div>
            </div>
          </div>
          <!-- 填补中间的参数线框骨架，避免空白导致的大行距视觉误差 -->
          <div class="sk-body">
            <div class="sk-bar shinning"></div>
            <div class="sk-bar shinning" style="width: 80%"></div>
          </div>
          <div class="sk-foot">
            <div class="sk-text shinning"></div>
            <div class="sk-text shinning"></div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 空状态 -->
        <div v-if="filtered.length === 0" class="empty-state">
          <AppIcon name="search" :size="28" stroke="var(--text-3)" />
          <div style="margin-top:8px">未找到符合条件的设备</div>
        </div>

        <!-- 设备卡片 -->
        <template v-else>
          <div
              v-for="d in displayedDevices"
              :key="d.id"
              :class="['dev-tile', d.status]"
              @click="$emit('view-detail', d.id)"
          >
            <!-- 卡头：图标 + 名称 + 状态标签 -->
            <div class="dev-head">
              <div class="dev-thumb" :style="{ '--cl': DEV_TYPE_MAP[d.typeK].color }">
                <AppIcon :name="DEV_TYPE_MAP[d.typeK].icon" :size="26" :stroke="DEV_TYPE_MAP[d.typeK].color" />
              </div>
              <div class="dev-info">
                <div class="name" :title="d.name">{{ d.name }}</div>
                <div class="type-line">
                  <span class="dot" :style="{ '--cl': DEV_TYPE_MAP[d.typeK].color }" />
                  <span class="text-ellipsis">{{ d.type2 }}</span>
                </div>
                <div class="type-line" style="margin-top:2px">
                  <span class="text-ellipsis">
                    <span style="font-family:'JetBrains Mono',monospace;color:var(--text-1)">{{ d.model }}</span>
                    <span> · {{ d.year }} 年投运</span>
                  </span>
                </div>
              </div>
              <div :class="['level-tag', d.status]">
                <AppIcon :name="STATUS_ICON[d.status]" :size="11" />
                {{ d.level }}
              </div>
            </div>

            <!-- 原因依据框 -->
            <div v-if="d.reason" class="reason-box" :title="d.reason">
              <span v-if="d.judgmentProcess === '规则判定' && d.ruleId" class="rule-id" :title="d.ruleId">{{ d.ruleId }}</span>
              <span v-else-if="d.judgmentProcess && d.judgmentProcess !== '规则判定'" class="rule-id" :title="d.judgmentProcess">{{ d.judgmentProcess }}</span>
              <span class="reason-text">{{ d.reason }}</span>
            </div>

            <!-- 卡底：所属建筑 + 更新时间 -->
            <div class="dev-foot">
              <span class="building">
                <AppIcon name="panel" :size="10" /> {{ d.building }}
              </span>
              <span class="upd">
                <AppIcon name="check" :size="10" /> {{ d.updated || '—' }}
              </span>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ── 原 OverviewView 内嵌 <style> 完整迁入，零改动 ── */
.overview-view { display: flex; flex-direction: column; gap: 20px; }

/* 统计卡 */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.stat-tile {
  padding: 18px 20px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  position: relative; overflow: hidden;
  box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}
.stat-tile::before {
  content: ""; position: absolute; right: -20px; top: -20px;
  width: 80px; height: 80px; border-radius: 50%;
  background: var(--cl); opacity: 0.10;
}
.stat-tile.danger { border-color: rgba(224,57,79,0.20); }
.stat-tile.danger::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--eol-red), transparent);
  animation: scan-h 2.4s linear infinite;
}
.stat-tile .l { font-size: 11.5px; color: var(--text-2); display:flex; align-items:center; gap:6px; }
.stat-tile .v { font-family: "Orbitron", sans-serif; font-size: 30px; font-weight: 600; color: var(--text-0); margin-top: 6px; line-height: 1; }
.stat-tile .v .u { font-size: 13px; color: var(--text-2); margin-left: 6px; font-weight: 400; }
.stat-tile .d { font-size: 11px; color: var(--text-3); margin-top: 6px; }

/* 筛选条 */
.filter-bar {
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px 20px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}
.filter-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.filter-row.type-row {
  border-top: 1px dashed var(--line);
  padding-top: 12px;
}
.search-box {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; background: #f5f9ff;
  border: 1px solid var(--line); border-radius: 8px;
  flex: 1; max-width: 320px;
  color: var(--text-2);
}
.search-box input {
  flex: 1; padding: 9px 0; background: transparent; border: 0;
  color: var(--text-0); font-size: 13px; outline: none; font-family: inherit;
}
.search-clear-btn {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: transparent; border: none; outline: none;
  color: var(--text-3); cursor: pointer; padding: 0;
  transition: all 0.15s ease;
}
.search-clear-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-1);
}


/* 自定义模拟下拉框样式 */
.custom-select-wrap {
  position: relative;
  user-select: none;
}
/* 清除按钮 Hover 切换逻辑 (高仿 el-select clearable) */
.custom-select-wrap.clearable:hover .clear-btn {
  display: flex !important;
}
.custom-select-wrap.clearable:hover .arrow-icon {
  display: none !important;
}
.select-trigger .clear-btn {
  display: none;
}
.select-trigger .clear-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-1);
}
.select-trigger {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 32px 9px 12px; background: #f5f9ff;
  border: 1px solid var(--line); border-radius: 8px;
  color: var(--text-0); font-size: 13px; cursor: pointer;
  transition: all 0.2s ease;
  width: 150px; /* 固定宽度，防止展开变成输入框时被撑宽 */
  box-sizing: border-box;
}
.selected-val {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
.select-trigger:hover {
  border-color: var(--brand-3);
  background: white;
  box-shadow: 0 0 0 3px rgba(47,127,255,0.06);
}
.arrow-icon {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  transition: transform 0.2s ease;
}
.arrow-icon.rotated {
  transform: translateY(-50%) rotate(180deg);
}

.custom-dropdown-list {
  position: absolute; top: calc(100% + 6px); left: 0; min-width: 160px; z-index: 100;
  background: #fff; border: 1px solid var(--line-strong); border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden; max-height: 250px; overflow-y: auto;
  padding: 4px;
}
.dropdown-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; font-size: 12.5px; color: var(--text-1);
  border-radius: 6px; cursor: pointer; transition: all 0.15s;
  white-space: nowrap;
}
.dropdown-item:hover {
  background: #f0f6ff; color: var(--brand);
}
.dropdown-item.active {
  background: #eaf2ff; color: var(--brand); font-weight: normal !important;
}

/* 下拉菜单动画 */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.filter-chips { display: flex; gap: 6px; flex-wrap:wrap; }
.chip {
  padding: 6px 12px; border-radius: 6px;
  background: #f5f9ff; border: 1px solid var(--line);
  color: var(--text-1); font-size: 12px; cursor: pointer;
  display:inline-flex; align-items:center; gap: 5px;
  user-select: none;
}
.chip:hover { border-color: var(--line-strong); background: white; }
.chip.active { background: #eaf2ff; border-color: var(--brand); color: var(--brand); font-weight: 500; }
.chip.active.danger-tone  { background: rgba(224,57,79,0.08);  border-color: var(--eol-red); color: var(--eol-red); }
.chip.active.warn-tone    { background: rgba(234,140,46,0.10); border-color: var(--eol-low); color: var(--eol-low); }
.chip.active.ok-tone      { background: rgba(24,165,114,0.08); border-color: var(--ok);      color: var(--ok); }
.chip.active.pending-tone { background: rgba(217,119,6,0.10);  border-color: var(--warn);    color: var(--warn); }
/* 筛选 chip 内小圆点 */
.dot-s { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

/* 卡片网格 */
.dev-list { 
  display: grid; 
  grid-template-columns: repeat(5, 1fr); /* 调整为一排 5 列，卡片宽度更小更紧凑 */
  grid-auto-rows: max-content; /* 保证行高紧凑包裹内容，不受最小高度拉伸影响 */
  align-content: start; /* 剩余高度在底部留白，绝不顶开卡片行距 */
  gap: 16px; 
  min-height: 520px; /* 保证页面刷新或无数据时高度不突然塌陷缩拢 */
}
.dev-tile {
  padding: 18px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  position: relative; overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(60,110,200,0.04);
  display: flex;
  flex-direction: column;
  min-height: 180px; /* 统一最小高度，使带与不带依据原因的卡片保持一致 */
  box-sizing: border-box;
}
.dev-tile:hover {
  border-color: var(--brand);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(60,110,200,0.12);
}
.dev-tile.phaseout { border-color: rgba(224,57,79,0.30); }
.dev-tile.phaseout::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--eol-red), #c12a3f);
}
.dev-tile.phaseout::after {
  content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 60px;
  background: radial-gradient(circle at 100% 0%, rgba(224,57,79,0.08), transparent 60%);
  pointer-events: none;
}
.dev-tile.low_eff { border-color: rgba(234,140,46,0.30); }
.dev-tile.low_eff::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--eol-low);
}
.dev-tile.pending::before {
  content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--warn), transparent);
  animation: scan-h 2s linear infinite;
}

/* 卡头 */
.dev-head { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
.dev-thumb {
  width: 52px; height: 52px; border-radius: 10px;
  background: linear-gradient(135deg, #eaf2ff, #e2dcff);
  border: 1px solid var(--line-strong);
  display: grid; place-items: center;
  color: var(--cl); flex-shrink: 0; position: relative;
}
.dev-thumb::after {
  content: ""; position: absolute; inset: 4px; border-radius: 8px;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), transparent 50%);
  pointer-events: none;
}
.dev-info { flex: 1; min-width: 0; }
.dev-info .code { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-2); }
.dev-info .name {
  font-size: 14.5px;
  color: var(--text-0);
  font-weight: 500;
  margin-top: 2px;
  line-height: 1.35;
  padding-right: 85px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dev-info .type-line { font-size: 11px; color: var(--text-2); margin-top: 4px; display:flex; gap:8px; align-items:center; min-width: 0; }
.dev-info .type-line .dot { width:5px; height:5px; border-radius:50%; background: var(--cl); flex-shrink: 0; }
.dev-info .text-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }

/* 状态标签 */
.level-tag {
  padding: 4px 10px; font-size: 10.5px; font-weight: 500;
  border-radius: 6px; flex-shrink: 0;
  display:inline-flex; align-items:center; gap: 4px;
  font-family: "JetBrains Mono", monospace; letter-spacing: 0.3px;
  position: absolute;
  top: 18px;
  right: 18px;
}
.level-tag.normal   { background: rgba(24,165,114,0.10);  color: var(--ok);           border: 1px solid rgba(24,165,114,0.25); }
.level-tag.pending  { background: rgba(217,119,6,0.10);   color: var(--warn);          border: 1px solid rgba(217,119,6,0.25); }
.level-tag.low_eff  { background: rgba(234,140,46,0.12);  color: var(--eol-low);       border: 1px solid rgba(234,140,46,0.30); }
.level-tag.phaseout { background: linear-gradient(135deg, var(--eol-red), #c12a3f); color: white; border: 1px solid transparent; box-shadow: 0 2px 6px rgba(224,57,79,0.25); }

/* 参数格 */
.dev-tile .params {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #f7f9fd, #fbfcfe);
  border-radius: 8px;
  border: 1px dashed var(--line);
}
.param-row { display: flex; justify-content: space-between; align-items: center; gap: 6px; min-width: 0; }
.param-row .pl { font-size: 10.5px; color: var(--text-2); flex-shrink: 0; }
.param-row .pv { font-family: "JetBrains Mono", monospace; font-size: 11.5px; color: var(--text-0); font-weight: 500; text-align: right;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 原因框 */
.dev-tile .reason-box {
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(224,57,79,0.05);
  border-left: 2px solid var(--eol-red);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-1);
  line-height: 1.5;
  display: flex; gap: 6px;
  align-items: center;
}
.dev-tile.low_eff .reason-box  { background: rgba(234,140,46,0.06); border-left-color: var(--eol-low); }
.dev-tile.normal  .reason-box  { display: none; }
.dev-tile.pending .reason-box  { background: rgba(217,119,6,0.06);  border-left-color: var(--warn); }
.reason-box .rule-id {
  font-family: "JetBrains Mono", monospace; font-size: 10.5px;
  padding: 1px 6px; border-radius: 3px;
  background: rgba(224,57,79,0.12); color: var(--eol-red);
  margin-right: 6px; flex-shrink: 0;
  max-width: 90px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reason-box .reason-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 卡底 */
.dev-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
  font-size: 10.5px; color: var(--text-3);
}
.dev-foot .upd      { font-family: "JetBrains Mono", monospace; display:flex; align-items:center; gap: 4px; }
.dev-foot .building { color: var(--text-2); display:flex; align-items:center; gap: 4px; max-width: 50%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* 录入新设备卡 */
.create-tile {
  padding: 22px;
  background: linear-gradient(135deg, #eaf2ff, #fff0f3);
  border: 1.5px dashed var(--brand);
  border-radius: 12px;
  cursor: pointer;
  display: flex; align-items: center; gap: 16px;
  position: relative; overflow: hidden;
  transition: all 0.2s;
  height: 180px; /* 统一高度，与普通卡片对齐 */
  box-sizing: border-box;
}
.create-tile:hover {
  border-color: var(--brand);
  background: linear-gradient(135deg, #d8e4fb, #fde0e6);
}
.create-tile .plus-orb {
  width: 50px; height: 50px; border-radius: 12px;
  background: linear-gradient(135deg, var(--brand), var(--eol-red));
  display: grid; place-items: center;
  color: white;
  box-shadow: 0 4px 16px rgba(31,111,235,0.25);
  flex-shrink: 0;
}
.create-tile .h { font-size: 15px; color: var(--text-0); font-weight: 600; }
.create-tile .s { font-size: 11.5px; color: var(--text-1); margin-top: 4px; line-height:1.4; }

/* 骨架屏闪烁动画 */
@keyframes shinning {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}
.shinning {
  animation: shinning 1.5s ease-in-out infinite;
  background: #eef2f8 !important;
}

.skeleton-card {
  padding: 18px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: 180px; /* 与真实设备卡片高度一致 */
  box-sizing: border-box;
}
.sk-head { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
.sk-thumb { width: 52px; height: 52px; border-radius: 10px; flex-shrink: 0; }
.sk-info { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.sk-title { height: 16px; border-radius: 4px; width: 70%; }
.sk-desc { height: 12px; border-radius: 4px; width: 40%; }
.sk-body { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; }
.sk-bar { height: 12px; border-radius: 4px; width: 95%; }
.sk-foot {
  display: flex; justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.sk-text { height: 12px; border-radius: 4px; width: 30%; }

/* 空状态 */
.empty-state {
  grid-column: 1/-1; padding: 60px 24px; text-align: center; color: var(--text-3);
  border: 1px dashed var(--line); border-radius: 12px; background: white;
}
</style>


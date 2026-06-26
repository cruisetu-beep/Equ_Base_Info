<script setup>
// ── components/overview/OverviewView.vue ───────────────────────────
// 对应原 React OverviewView 组件，完整迁移
// Emits: create（跳转录入）、judge（跳转判定）

import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP, parseTypeK } from '@/data/devices'
import { getDevices, getEquipmentTypeDict } from '@/api/devices'
import { useDeviceStore } from '@/stores/useDeviceStore'

defineEmits(['create', 'judge', 'view-detail'])

const deviceStore = useDeviceStore()

// ── 加载状态与数据 ──────────────────────────────────────────────────────
const isLoading  = ref(true)    // 是否在加载中
const devices    = ref([])       // 真实设备数据
const typeFilter = ref('all') // 选中的设备类型筛选ID
const typeDict   = ref([])    // 字典表获取的设备类型列表
const stat       = ref('all')   // 状态
const q          = ref('')      // 搜索关键字

// 自定义下拉框状态与引用
const showTypeDropdown = ref(false)
const selectWrapRef    = ref(null)

// ── 生命周期加载 ──────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [res, dictRes] = await Promise.all([
      getDevices(),
      getEquipmentTypeDict()
    ])
    devices.value = (res || []).map(d => ({ ...d, typeK: d.typeK || parseTypeK(d.type2) }))
    deviceStore.devices = devices.value
    typeDict.value = dictRes || []
  } catch (err) {
    console.error('获取设备及字典数据失败:', err)
  } finally {
    isLoading.value = false
  }

  // 绑定全局点击事件以实现点击外部关闭下拉框
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})

// 点击外部关闭下拉逻辑
function handleGlobalClick(e) {
  if (selectWrapRef.value && !selectWrapRef.value.contains(e.target)) {
    showTypeDropdown.value = false
  }
}

// 选中下拉类型
function selectType(id) {
  typeFilter.value = id
  showTypeDropdown.value = false
}

// 当前选中的设备类型名称显示
const selectedTypeName = computed(() => {
  if (typeFilter.value === 'all') return '全部类型'
  const found = typeDict.value.find(t => t.equipmentTypeId === typeFilter.value)
  return found ? found.equipmentTypeName : '全部类型'
})

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
      <div class="stat-tile" style="--cl:#ea8c2e">
        <div class="l"><AppIcon name="warn" :size="12" /> 低效</div>
        <div class="v" style="color:var(--eol-low)">{{ lowCnt }}<span class="u">台</span></div>
        <div class="d">建议改造</div>
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
        </div>

        <!-- 设备类型下拉框（自定义模拟下拉框，与 WizardStepBasic 精细度对应） -->
        <div class="custom-select-wrap" ref="selectWrapRef">
          <div class="select-trigger" @click="showTypeDropdown = !showTypeDropdown">
            <AppIcon name="filter" :size="12" stroke="var(--text-3)" />
            <span class="selected-val">{{ selectedTypeName }}</span>
            <AppIcon name="chevron-down" :size="12" stroke="var(--text-3)" :class="['arrow-icon', showTypeDropdown && 'rotated']" />
          </div>
          
          <Transition name="dropdown-fade">
            <div v-show="showTypeDropdown" class="custom-dropdown-list">
              <div 
                :class="['dropdown-item', typeFilter === 'all' && 'active']"
                @click="selectType('all')"
              >
                全部类型
              </div>
              <div 
                v-for="t in typeDict" 
                :key="t.equipmentTypeId" 
                :class="['dropdown-item', typeFilter === t.equipmentTypeId && 'active']"
                @click="selectType(t.equipmentTypeId)"
              >
                {{ t.equipmentTypeName }}
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
          <span :class="['chip', stat === 'low_eff'  && 'active warn-tone']"    @click="stat = 'low_eff'">
            <span class="dot-s" style="background:var(--eol-low)" />低效 {{ lowCnt }}
          </span>
          <span :class="['chip', stat === 'phaseout' && 'active danger-tone']"  @click="stat = 'phaseout'">
            <span class="dot-s" style="background:var(--eol-red)" />淘汰 {{ phaseCnt }}
          </span>
        </div>

        <div style="flex:1" />

        <button class="btn ghost" style="padding:7px 14px;font-size:12px">
          <AppIcon name="download" :size="12" /> 导出
        </button>
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
        <div v-for="n in 9" :key="n" class="skeleton-card">
          <div class="sk-head">
            <div class="sk-thumb shinning"></div>
            <div class="sk-info">
              <div class="sk-title shinning"></div>
              <div class="sk-desc shinning"></div>
            </div>
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
              v-for="d in filtered"
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
                <div class="name">{{ d.name }}</div>
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
            <div v-if="d.reason" class="reason-box">
              <span v-if="d.ruleId" class="rule-id">{{ d.ruleId }}</span>
              <span>{{ d.reason }}</span>
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
.stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
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

/* 自定义模拟下拉框样式 */
.custom-select-wrap {
  position: relative;
  user-select: none;
}
.select-trigger {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 32px 9px 12px; background: #f5f9ff;
  border: 1px solid var(--line); border-radius: 8px;
  color: var(--text-0); font-size: 13px; cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
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
  padding: 8px 12px; font-size: 12.5px; color: var(--text-1);
  border-radius: 6px; cursor: pointer; transition: all 0.15s;
  white-space: nowrap;
}
.dropdown-item:hover {
  background: #f0f6ff; color: var(--brand);
}
.dropdown-item.active {
  background: #eaf2ff; color: var(--brand); font-weight: 500;
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
  height: 180px; /* 统一高度，使带与不带依据原因的卡片保持一致 */
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
.dev-info .name { font-size: 14.5px; color: var(--text-0); font-weight: 500; margin-top: 2px; line-height:1.35; padding-right: 85px; }
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
  display:flex; gap:6px;
}
.dev-tile.low_eff .reason-box  { background: rgba(234,140,46,0.06); border-left-color: var(--eol-low); }
.dev-tile.normal  .reason-box  { display: none; }
.dev-tile.pending .reason-box  { background: rgba(217,119,6,0.06);  border-left-color: var(--warn); }
.reason-box .rule-id {
  font-family: "JetBrains Mono", monospace; font-size: 10.5px;
  padding: 1px 6px; border-radius: 3px;
  background: rgba(224,57,79,0.12); color: var(--eol-red);
  margin-right: 6px; flex-shrink: 0;
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


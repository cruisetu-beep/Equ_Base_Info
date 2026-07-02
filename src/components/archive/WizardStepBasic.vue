<script setup>
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import NameplateOCR from './NameplateOCR.vue'
import { getBuildingList, getEquipmentTypeDict } from '@/api/devices'

const props = defineProps({
  data: { type: Object, required: true },
})
const emit = defineEmits(['update:data', 'next'])

const pkg = ref({ ...props.data })
const errors = ref({})

const buildings = ref([])
const typeOptions = ref([])

onMounted(async () => {
  try {
    const bList = await getBuildingList()
    buildings.value = bList || []
  } catch (e) {
    console.error('获取建筑列表异常:', e)
  }

  try {
    const tList = await getEquipmentTypeDict()
    typeOptions.value = tList || []
  } catch (e) {
    console.error('获取设备类型字典异常:', e)
  }
})

function set(k, v) {
  pkg.value = { ...pkg.value, [k]: v }
  emit('update:data', { ...pkg.value })
  if (v && String(v).trim()) {
    errors.value = { ...errors.value, [k]: '' }
  }
}

// ── 建筑搜索下拉 ──────────────────────────────────
const buildingKeyword = ref(pkg.value.building || '')
const buildingDropdown = ref(false)

const filteredBuildings = computed(() =>
  buildings.value.filter(b =>
    (b.name && b.name.includes(buildingKeyword.value)) || (b.code && b.code.includes(buildingKeyword.value))
  )
)

function selectBuilding(b) {
  buildingKeyword.value = b.name
  pkg.value = { ...pkg.value, building: b.name, buildingCode: b.code }
  emit('update:data', { ...pkg.value })
  buildingDropdown.value = false
  errors.value = { ...errors.value, building: '', buildingCode: '' }
}

function onBuildingInput(e) {
  buildingKeyword.value = e.target.value
  buildingDropdown.value = true
  pkg.value = { ...pkg.value, building: '', buildingCode: '' }
  emit('update:data', { ...pkg.value })
}

function clearBuilding() {
  buildingKeyword.value = ''
  buildingDropdown.value = true
  pkg.value = { ...pkg.value, building: '', buildingCode: '' }
  emit('update:data', { ...pkg.value })
}

function onBuildingBlur() {
  setTimeout(() => { buildingDropdown.value = false }, 160)
}

// ── 设备参数（动态行）──────────────────────────────
const paramRows = ref(
  (pkg.value.paramGroups?.[0]?.items || []).map(i => ({ ...i }))
)
if (paramRows.value.length === 0) {
  paramRows.value = [{ name: '', value: '' }]
}

function addParam() {
  paramRows.value.push({ name: '', value: '' })
}
function removeParam(i) {
  if (paramRows.value.length > 1) paramRows.value.splice(i, 1)
  syncParams()
}
function syncParams() {
  const items = paramRows.value.filter(r => r.name.trim())
  const groups = items.length ? [{ group: '设备参数', items }] : []
  pkg.value = { ...pkg.value, paramGroups: groups }
  emit('update:data', { ...pkg.value })
}

// OCR 智能回填与字典转换匹配
function onOcrDone(ocr) {
  let matchedTypeId = ''
  let matchedTypeName = ocr.type2 || ''

  if (typeOptions.value.length > 0) {
    // 优先采用大类字典进行中文模糊匹配
    const matched = typeOptions.value.find(t => 
      t.equipmentTypeName.includes(ocr.type2) || 
      ocr.type2.includes(t.equipmentTypeName) ||
      t.equipmentTypeName === ocr.type2
    )
    if (matched) {
      matchedTypeId = matched.equipmentTypeId
      matchedTypeName = matched.equipmentTypeName
    } else {
      // 降级使用 type1 进行粗粒度大类映射
      const mapping = {
        'motor': '电动机',
        'fan': '风机',
        'pump': '泵',
        'transformer': '变压器',
        'boiler': '锅炉',
        'compressor': '压缩机',
        'chiller': '制冷'
      }
      const chineseName = mapping[ocr.type1] || ''
      const fallbackMatched = typeOptions.value.find(t => t.equipmentTypeName.includes(chineseName))
      if (fallbackMatched) {
        matchedTypeId = fallbackMatched.equipmentTypeId
        matchedTypeName = fallbackMatched.equipmentTypeName
      }
    }
  }

  pkg.value = { ...pkg.value,
    typeK: matchedTypeId || ocr.typeK || ocr.type1 || '',
    type2: matchedTypeName || ocr.type2 || '',
    model: ocr.model,
    manufacturer: ocr.manufacturer,
    year: ocr.year,
    ocrApplied: true,
  }
  
  // OCR 回填后自动清除错误
  errors.value = {
    ...errors.value,
    building: pkg.value.building ? '' : errors.value.building,
    buildingCode: pkg.value.buildingCode ? '' : errors.value.buildingCode,
    code: pkg.value.code ? '' : errors.value.code,
    name: pkg.value.name ? '' : errors.value.name,
    typeK: pkg.value.typeK ? '' : errors.value.typeK
  }

  if (ocr.params?.length) {
    paramRows.value = ocr.params.map(p => ({ name: p.k, value: p.v }))
    syncParams()
  }
  emit('update:data', { ...pkg.value })
}

function handleTypeChange(e) {
  const val = e.target.value
  const matched = typeOptions.value.find(t => t.equipmentTypeId === val)
  if (matched) {
    pkg.value = { ...pkg.value, typeK: val, type2: matched.equipmentTypeName }
    errors.value = { ...errors.value, typeK: '' }
  } else {
    pkg.value = { ...pkg.value, typeK: '', type2: '' }
  }
  emit('update:data', { ...pkg.value })
}

// 必填验证逻辑
function validate() {
  const errs = {}
  if (!pkg.value.building || !pkg.value.building.trim()) errs.building = '请选择或搜索建筑名称'
  if (!pkg.value.buildingCode || !pkg.value.buildingCode.trim()) errs.buildingCode = '建筑编号不能为空'
  if (!pkg.value.code || !pkg.value.code.trim()) errs.code = '请输入设备编号'
  if (!pkg.value.name || !pkg.value.name.trim()) errs.name = '请输入设备名称'
  if (!pkg.value.typeK) errs.typeK = '请选择设备类型'

  errors.value = errs
  return Object.keys(errs).length === 0
}

defineExpose({
  validate
})

// 完成度
const progress = computed(() => {
  const required = ['buildingCode', 'building', 'code', 'name', 'typeK']
  const filled = required.filter(k => pkg.value[k]).length
  return Math.round(filled / required.length * 100)
})
</script>

<template>
  <div class="step-basic float-in">

    <!-- 铭牌识别 -->
    <div class="form-section">
      <div class="section-head">
        <div class="ico"><AppIcon name="scan" :size="18" /></div>
        <div>
          <h3>设备铭牌识别</h3>
          <div class="desc">上传铭牌照片，AI 自动提取型号、参数等关键字段</div>
        </div>
      </div>
      <NameplateOCR @recognized="onOcrDone" />
      <div v-if="pkg.ocrApplied" class="ocr-banner">
        <div class="check-orb"><AppIcon name="check" :size="12" /></div>
        <div>已识别铭牌字段并自动写入表单</div>
      </div>
    </div>

    <!-- 基础信息（5个必填） -->
    <div class="form-section">
      <div class="section-head">
        <div class="ico"><AppIcon name="cube" :size="18" /></div>
        <div>
          <h3>基础信息</h3>
          <div class="desc">以下 5 项为必填项</div>
        </div>
      </div>

      <div class="section-content">
        <div class="info-grid">
        <div :class="['field', errors.building && 'has-err']">
          <label class="field-label">建筑名称 <span class="req">*</span></label>
          <div class="building-wrap">
            <input class="input" placeholder="输入关键字搜索..."
                   :value="buildingKeyword"
                   :readonly="!!pkg.building"
                   @input="onBuildingInput"
                   @focus="buildingDropdown = true"
                   @blur="onBuildingBlur" />
            <button v-if="pkg.building" class="b-clear" @mousedown.prevent="clearBuilding">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text-2)" stroke-width="1.8" stroke-linecap="round">
                <path d="M1 1l8 8M9 1L1 9"/>
              </svg>
            </button>
            <AppIcon v-else name="chevron-down" :size="14" stroke="var(--text-3)" class="dd-arrow" />
            <div v-if="buildingDropdown && filteredBuildings.length" class="building-dropdown">
              <div
                v-for="b in filteredBuildings" :key="b.code"
                class="building-option"
                @mousedown.prevent="selectBuilding(b)"
              >
                <span class="b-name">{{ b.name }}</span>
                <span class="b-code mono">{{ b.code }}</span>
              </div>
            </div>
            <div v-if="buildingDropdown && !pkg.building && filteredBuildings.length === 0" class="building-dropdown">
              <div class="building-empty">无匹配建筑</div>
            </div>
          </div>
          <div v-if="errors.building" class="err-msg">{{ errors.building }}</div>
        </div>

        <div :class="['field', errors.buildingCode && 'has-err']">
          <label class="field-label">建筑编号 <span class="req">*</span></label>
          <input class="input mono" placeholder="选择建筑后自动填写"
                 :value="pkg.buildingCode || ''" readonly
                 style="background:#f8faff; color:var(--text-2); cursor:not-allowed" />
          <div v-if="errors.buildingCode" class="err-msg">{{ errors.buildingCode }}</div>
        </div>

        <div :class="['field', errors.code && 'has-err']">
          <label class="field-label">设备编号 <span class="req">*</span></label>
          <input class="input mono" placeholder="例如 DEV-MTR-2018-0042"
                 :value="pkg.code || ''"
                 @input="e => set('code', e.target.value)" />
          <div v-if="errors.code" class="err-msg">{{ errors.code }}</div>
        </div>

        <div :class="['field', errors.name && 'has-err']">
          <label class="field-label">设备名称 <span class="req">*</span></label>
          <input class="input" placeholder="例如 地下泵房 1# 给水泵电机"
                 :value="pkg.name || ''"
                 @input="e => set('name', e.target.value)" />
          <div v-if="errors.name" class="err-msg">{{ errors.name }}</div>
        </div>

        <div :class="['field', errors.typeK && 'has-err']">
          <label class="field-label">设备类型 <span class="req">*</span></label>
          <select class="input" :value="pkg.typeK || ''" @change="handleTypeChange">
            <option value="">请选择设备类型</option>
            <option v-for="t in typeOptions" :key="t.equipmentTypeId" :value="t.equipmentTypeId">
              {{ t.equipmentTypeName }}
            </option>
          </select>
          <div v-if="errors.typeK" class="err-msg">{{ errors.typeK }}</div>
        </div>

        <div class="field">
          <label class="field-label">设备数量</label>
          <input class="input mono" type="number" min="1" placeholder="1"
                 :value="pkg.equCount || ''"
                 @input="e => set('equCount', e.target.value)" />
        </div>
      </div>
      </div>
    </div>

    <!-- 设备参数（动态增删） -->
    <div class="form-section">
      <div class="section-head">
        <div class="ico"><AppIcon name="bolt" :size="18" /></div>
        <div>
          <h3>设备参数</h3>
          <div class="desc">根据设备实际情况填写，参数数量不固定</div>
        </div>
      </div>

      <div class="section-content">
        <div class="param-table">
        <!-- 表头 -->
        <div class="param-header">
          <span class="ph-name">参数名称</span>
          <span class="ph-value">参数值</span>
          <span class="ph-del"></span>
        </div>
        <!-- 参数行 -->
        <div v-for="(row, i) in paramRows" :key="i" class="param-row">
          <input class="input param-input" placeholder="例如 额定功率"
                 v-model="row.name" @blur="syncParams" />
          <input class="input param-input mono" placeholder="例如 30 kW"
                 v-model="row.value" @blur="syncParams" />
          <button class="del-btn" @click="removeParam(i)" :disabled="paramRows.length === 1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round">
              <path d="M1 1l10 10M11 1L1 11"/>
            </svg>
          </button>
        </div>
      </div>

      <button class="add-param-btn" @click="addParam">
        <AppIcon name="plus" :size="14" stroke="var(--brand)" />
        添加参数行
      </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.form-section { padding: 20px 28px; }

.section-content {
  border: 1px solid var(--line); border-radius: 10px;
  overflow: hidden; padding: 16px;
}

.section-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }

.section-head .ico {
  width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(135deg,#eaf2ff,#e2dcff);
  display: grid; place-items: center; color: var(--brand);
}
.section-head h3 { margin: 0 0 3px; font-size: 14px; color: var(--text-0); }
.section-head .desc { font-size: 12px; color: var(--text-3); }

/* 基础信息网格 */
.info-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field-full { grid-column: 1 / -1; }
.field-label { font-size: 14px; color: var(--text-2); font-weight: 500; }
.req { color: var(--danger); margin-left: 2px; }
.err-msg { font-size: 11px; color: var(--danger); }
.has-err .input, .has-err .select { border-color: var(--danger); }

/* 设备类型选择 */
.type-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; }
.type-card {
  padding: 10px 6px; border-radius: 8px;
  background: #f8faff; border: 1px solid var(--line);
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  cursor: pointer; transition: all 0.15s;
  color: var(--text-1); font-size: 11px; user-select: none; text-align: center;
}
.type-card:hover { border-color: var(--line-strong); background: white; }
.type-card.active {
  background: linear-gradient(180deg,#eaf2ff,#f5f9ff);
  border-color: var(--brand); color: var(--text-0);
  box-shadow: 0 4px 12px rgba(47,127,255,0.12);
}

/* 参数表格 */
.param-table {
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
  margin-bottom: 10px;
}
.param-header {
  display: grid; grid-template-columns: 1fr 1fr 36px;
  padding: 7px 12px; background: #f6f9ff;
  border-bottom: 1px solid var(--line);
  font-size: 11px; font-weight: 600; color: var(--text-2);
}
.param-row {
  display: grid; grid-template-columns: 1fr 1fr 36px;
  align-items: center; gap: 0;
  border-bottom: 1px solid var(--line);
}
.param-row:last-child { border-bottom: none; }
.param-row:nth-child(even) { background: #fafbff; }
.param-input {
  border: none; border-right: 1px solid var(--line);
  border-radius: 0; padding: 8px 12px;
  font-size: 12px; background: transparent;
  outline: none;
}
.param-input:last-of-type { border-right: none; }
.param-input:focus { background: #f0f6ff; }
.del-btn {
  display: grid; place-items: center; width: 36px; height: 100%;
  border: none; background: transparent; cursor: pointer; opacity: 0.5;
  transition: opacity 0.15s, background 0.15s;
}
.del-btn:hover:not(:disabled) { opacity: 1; background: rgba(224,57,79,0.08); }
.del-btn:disabled { opacity: 0.15; cursor: not-allowed; }

.add-param-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 12px; color: var(--brand);
  background: #f0f6ff; border: 1px dashed var(--brand);
  border-radius: 6px; cursor: pointer;
}
.add-param-btn:hover { background: #e2edff; }

/* OCR 提示 */
.ocr-banner {
  margin-top: 12px; padding: 10px 14px;
  background: rgba(43,217,168,0.08); border: 1px solid rgba(43,217,168,0.3);
  border-radius: 8px; display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: var(--text-1);
}
.check-orb {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(43,217,168,0.2); color: var(--ok);
  display: grid; place-items: center; flex-shrink: 0;
}

/* 建筑搜索下拉 */
.building-wrap { position: relative; }
.building-wrap .input { padding-right: 32px; }
.dd-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.building-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 100;
  background: #fff; border: 1px solid var(--line-strong); border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.10); overflow: hidden; max-height: 200px; overflow-y: auto;
  cursor: pointer;
}
.building-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; cursor: pointer; gap: 12px;
  transition: background 0.1s; user-select: none;
}
.building-option:hover { background: #f0f6ff; }
.b-name { font-size: 13px; color: var(--text-0); }
.b-code { font-size: 11px; color: var(--text-3); }
.b-clear {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  width: 18px; height: 18px; border-radius: 50%; border: none;
  background: var(--line-strong); display: grid; place-items: center;
  cursor: pointer; padding: 0;
}
.b-clear:hover { background: #ccd4e0; }


.form-actions {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 28px; background: #f8faff;
  border-top: 1px solid var(--line);
}
.form-progress { display: flex; align-items: center; gap: 10px; flex: 1; font-size: 12px; color: var(--text-2); }
.bar { flex: 1; height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--brand); border-radius: 3px; transition: width 0.3s; }
</style>

<script setup>
// ── components/judge/QuickEntry.vue ───────────────────────────────
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'
import { getEquipmentTypeDict, getAttributeNames } from '@/api/devices'

defineProps({ rules: { type: Array, required: true } })
const emit = defineEmits(['start', 'back'])

const d = ref({
  name: '', typeK: 'motor', typeDbId: '', type2: '中小型三相异步电动机',
  model: '', year: '', manufacturer: '', params: {},
})
const paramK = ref('功率')
const paramV = ref('')

const setF = (k, v) => { d.value = { ...d.value, [k]: v } }

function addParam() {
  if (paramK.value && paramV.value) {
    d.value = { ...d.value, params: { ...d.value.params, [paramK.value]: paramV.value } }
    paramV.value = ''
  }
}
function removeParam(k) {
  const np = { ...d.value.params }
  delete np[k]
  d.value = { ...d.value, params: np }
}

const SAMPLES = [
  { name: '电机示例', typeK: 'motor', type2: '中小型三相异步电动机', model: 'Y-160L-4',
    year: '2008', manufacturer: '上海电机厂', params: { 功率: '15 kW', 电压: '380 V', 频率: '50 Hz' } },
  { name: '风机示例', typeK: 'fan',   type2: '锅炉引风机', model: 'Y9-35-12',
    year: '2003', manufacturer: '上海鼓风机厂', params: { 流量: '42500 m³/h', 全压: '2.8 kPa', 电机: '45 kW' } },
  { name: '变压器示例', typeK: 'transformer', type2: '油浸式无励磁调压变压器', model: 'S9-630/10',
    year: '2009', manufacturer: '特变电工', params: { 容量: '630 kVA', 电压: '10/0.4 kV' } },
]

const typeOptions = ref([])
const attributeOptions = ref([])
const canSubmit    = computed(() => d.value.name && d.value.typeK && d.value.model)

const mapTypeNameToIconAndColor = (name) => {
  if (name.includes("电动机") || name.includes("电机")) return { k: "motor", icon: "motor", color: "#4dc9ff" };
  if (name.includes("风机")) return { k: "fan", icon: "fan", color: "#7ad6ff" };
  if (name.includes("泵")) return { k: "pump", icon: "pump", color: "#2bd9a8" };
  if (name.includes("变压器")) return { k: "transformer", icon: "transformer", color: "#a799ff" };
  if (name.includes("锅炉")) return { k: "boiler", icon: "boiler", color: "#ff8a47" };
  if (name.includes("压缩机")) return { k: "compressor", icon: "compressor", color: "#ffb547" };
  if (name.includes("制冷") || name.includes("空调")) return { k: "chiller", icon: "sun", color: "#7be9d4" };
  if (name.includes("焊机")) return { k: "welder", icon: "bolt", color: "#ff6b8a" };
  if (name.includes("电阻") || name.includes("加热")) return { k: "resistor", icon: "factory", color: "#ff8a47" };
  if (name.includes("电器")) return { k: "appliance", icon: "plug", color: "#5bb8ff" };
  if (name.includes("机床")) return { k: "machine", icon: "cpu", color: "#a799ff" };
  if (name.includes("锻压")) return { k: "forge", icon: "factory", color: "#9c8bff" };
  if (name.includes("热处理")) return { k: "heat", icon: "factory", color: "#ff7d6a" };
  if (name.includes("阀")) return { k: "valve", icon: "chip", color: "#7ad6ff" };
  if (name.includes("柴油")) return { k: "diesel", icon: "factory", color: "#9c8bff" };
  return { k: "other", icon: "cube", color: "#97a4c0" };
};



const handleTypeInput = (val) => {
  d.value.type2 = val
  const matched = typeOptions.value.find(t => t.label === val)
  if (matched) {
    d.value.typeK = matched.k
    d.value.typeDbId = matched.dbId
  } else {
    d.value.typeK = 'other'
    d.value.typeDbId = ''
  }
}

const handleSampleClick = (s) => {
  const opt = typeOptions.value.find(t => t.label === s.type2 || t.k === s.typeK)
  d.value = {
    ...s,
    typeDbId: opt ? opt.dbId : '',
    params: { ...s.params }
  }
}

onMounted(async () => {
  try {
    const list = await getEquipmentTypeDict()
    typeOptions.value = list.map(item => {
      const typeName = item.EquipmentTypeName || item.equipmentTypeName || '';
      const typeId = item.EquipmentTypeId || item.equipmentTypeId || '';
      const match = mapTypeNameToIconAndColor(typeName)
      return {
        k: match.k,
        dbId: typeId,
        label: typeName,
        icon: match.icon,
        color: match.color
      }
    })
    if (typeOptions.value.length > 0) {
      const motorOpt = typeOptions.value.find(t => t.k === 'motor')
      if (motorOpt) {
        d.value.typeDbId = motorOpt.dbId
      }
    }
  } catch (err) {
    console.error('加载设备一级类型字典失败:', err)
  }

  try {
    const attrs = await getAttributeNames()
    attributeOptions.value = (attrs || []).map(opt => ({
      id: opt.Id || opt.id,
      name: opt.Name || opt.name
    }))
  } catch (err) {
    console.error('加载关键参数属性字典失败:', err)
  }
})

function handleStart() {
  emit('start', [{
    ...d.value,
    id:   `quick-${Date.now()}`,
    code: `QUICK-${Date.now().toString().slice(-6)}`,
  }])
}
</script>


<template>
  <div class="quick-entry float-in">
    <div class="card glow quick-form">
      <div class="card-corner-tl" /><div class="card-corner-br" />

      <div class="page-head" style="padding:24px 28px 0;border:0">
        <div>
          <h1 class="page-title" style="font-size:20px">
            <AppIcon name="edit" :size="20" stroke="var(--brand-2)" />
            快速录入判定
          </h1>
          <div class="page-subtitle" style="max-width:none;margin-top:6px">
            填写关键参数即可对单台设备发起临时判定，本次操作不会保存到设备库。
          </div>
        </div>
        <button class="btn ghost" @click="$emit('back')"><AppIcon name="chevron-left" :size="14" /> 返回</button>
      </div>

      <div class="form-section">
        <div class="quick-tip">
          <AppIcon name="info" :size="14" class="ic" />
          <div><strong>提示：</strong>仅作单次临时判定，不会保存设备档案。如需正式入库请使用「设备档案录入」。</div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label class="field-label">设备名称</label>
            <input class="input" placeholder="例如 1# 给水泵电机"
                   :value="d.name" @input="e => setF('name', e.target.value)" />
          </div>
          <div class="field">
            <label class="field-label">规格型号</label>
            <input class="input mono" placeholder="例如 Y-160L-4"
                   :value="d.model" @input="e => setF('model', e.target.value)" />
          </div>

          <div class="field">
            <label class="field-label">类型</label>
            <input class="input" placeholder="例如 中小型三相异步电动机"
                   :value="d.type2" 
                   @input="e => handleTypeInput(e.target.value)" 
                   @focus="e => e.target.select()"
                   list="type-options" />
            <datalist id="type-options">
              <option v-for="opt in typeOptions" :key="opt.dbId" :value="opt.label" />
            </datalist>
          </div>
          <div class="field">
            <label class="field-label">投运年份</label>
            <input class="input mono" placeholder="YYYY"
                   :value="d.year" @input="e => setF('year', e.target.value)" />
          </div>

          <div class="field" style="grid-column:1/-1">
            <label class="field-label">关键参数 <span style="color:var(--text-3)">（影响规格区间判定）</span></label>
            <div class="params-block">
              <div class="ph">
                <AppIcon name="sparkles" :size="12" stroke="var(--brand)" />
                添加参数（如功率 / 流量 / 容量 等）
              </div>
              <div class="param-input-row">
                <input class="input" placeholder="参数名" v-model="paramK" @input="e => paramK = e.target.value" @change="e => paramK = e.target.value" @focus="e => e.target.select()" list="attr-options" style="width: 100%;" />
                <datalist id="attr-options">
                  <option v-for="opt in attributeOptions" :key="opt.id" :value="opt.name" />
                </datalist>
                <input class="input mono" placeholder="数值 + 单位（例如 22 kW）"
                       v-model="paramV" @keydown.enter="addParam" />
                <button class="btn primary" style="padding:10px 14px;justify-content:center"
                        @click="addParam" :disabled="!paramK || !paramV">
                  <AppIcon name="plus" :size="12" />
                </button>
              </div>
              <div class="param-list">
                <span v-if="Object.keys(d.params).length === 0" style="font-size:11px;color:var(--text-3)">暂无参数</span>
                <span v-for="[k, v] in Object.entries(d.params)" :key="k" class="param-chip">
                  {{ k }}: <strong>{{ v }}</strong>
                  <span class="x" @click="removeParam(k)">×</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <div style="font-size:12px;color:var(--text-2);margin-right:auto">
          <AppIcon name="info" :size="11" /> 字段越完整，判定准确度越高
        </div>
        <button class="btn primary" :disabled="!canSubmit" @click="handleStart">
          <AppIcon name="zap" :size="14" /> 立即判定
        </button>
      </div>
    </div>

    <!-- 右：预设案例 -->
    <div class="preset-card">
      <h4><AppIcon name="sparkles" :size="14" stroke="var(--brand)" /> 预设案例</h4>
      <div class="ssub">点击下方任一预设案例可快速填充表单，方便快速演示判定流程。</div>
      <div v-for="(s, i) in SAMPLES" :key="i" class="preset-item" @click="handleSampleClick(s)">
        <div class="pn">{{ s.name }}</div>
        <div class="pmodel">{{ s.model }}</div>
        <div class="pyear">{{ DEV_TYPE_MAP[s.typeK]?.label }} · {{ s.year }} 年 · {{ Object.keys(s.params).length }} 项参数</div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.quick-entry { display: grid; grid-template-columns: 1fr 320px; gap: 18px; margin-top: 16px; }
.quick-form .form-section { padding: 24px 28px; }
.type-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; }
.type-card { padding: 10px 6px; border-radius: 8px; background: #f8faff; border: 1px solid var(--line); display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; transition: all 0.15s; color: var(--text-1); font-size: 11px; user-select: none; }
.type-card:hover { border-color: var(--line-strong); background: white; }
.type-card.active { background: linear-gradient(180deg, #eaf2ff, #f5f9ff); border-color: var(--brand); color: var(--text-0); box-shadow: 0 4px 12px rgba(47,127,255,0.12); }
.params-block { padding: 14px; background: #f7f9fd; border: 1px dashed var(--line-strong); border-radius: 10px; }
.params-block .ph { font-size: 12px; color: var(--text-1); margin-bottom: 10px; display:flex; align-items:center; gap:8px; }
.param-input-row { display: grid; grid-template-columns: 110px 1fr 60px; gap: 8px; margin-bottom: 10px; }
.param-list { display: flex; flex-wrap: wrap; gap: 6px; }
.param-chip { padding: 4px 8px 4px 10px; background: white; border: 1px solid var(--line); border-radius: 4px; font-size: 11.5px; color: var(--text-1); display: flex; align-items: center; gap: 4px; font-family: "JetBrains Mono", monospace; }
.param-chip strong { color: var(--text-0); }
.param-chip .x { width: 14px; height: 14px; border-radius: 3px; background: #f3f6fb; color: var(--text-3); display: grid; place-items: center; cursor: pointer; margin-left: 4px; }
.param-chip .x:hover { background: var(--danger); color: white; }
.quick-tip { background: linear-gradient(135deg, #fff8e6, #fff3d6); border: 1px solid rgba(217,119,6,0.25); border-radius: 10px; padding: 12px 16px; font-size: 12px; color: var(--text-1); display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; }
.quick-tip .ic { color: var(--warn); flex-shrink: 0; }
.preset-card { background: white; border: 1px solid var(--line); border-radius: 12px; padding: 18px; height: fit-content; position: sticky; top: 80px; box-shadow: 0 1px 2px rgba(60,110,200,0.04); }
.preset-card h4 { margin: 0 0 12px; font-size: 13px; color: var(--text-0); display: flex; align-items: center; gap: 8px; }
.preset-card .ssub { font-size: 11px; color: var(--text-2); margin-bottom: 14px; line-height: 1.6; }
.preset-item { padding: 12px 14px; background: #f8faff; border: 1px solid var(--line); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; }
.preset-item:hover { border-color: var(--brand); background: #eaf2ff; }
.preset-item .pn { font-size: 12.5px; color: var(--text-0); font-weight: 500; }
.preset-item .pmodel { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--brand-2); margin-top: 3px; }
.preset-item .pyear { font-size: 10.5px; color: var(--text-2); margin-top: 2px; }


</style>

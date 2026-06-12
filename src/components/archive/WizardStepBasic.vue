<script setup>
// ── components/archive/WizardStepBasic.vue ────────────────────────
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import NameplateOCR from './NameplateOCR.vue'
import { DEV_TYPES } from '@/data/devices'

const props = defineProps({
  data: { type: Object, required: true },
})
const emit = defineEmits(['update:data', 'next'])

// 本地表单副本，通过 emit 同步到父层
const pkg = ref({ ...props.data })

function set(k, v) {
  pkg.value = { ...pkg.value, [k]: v }
  emit('update:data', { ...pkg.value })
}

function onOcrDone(ocr) {
  pkg.value = {
    ...pkg.value,
    typeK:        ocr.type1,
    type2:        ocr.type2,
    model:        ocr.model,
    manufacturer: ocr.manufacturer,
    serial_no:    ocr.serial_no,
    year:         ocr.year,
    params:       ocr.params,
    ocrApplied:   true,
  }
  emit('update:data', { ...pkg.value })
}

const typeOptions = DEV_TYPES.slice(0, 8)

const progress = computed(() => {
  const fields = ['code', 'name', 'typeK', 'model', 'year', 'building', 'manufacturer', 'type2']
  const filled = fields.filter(k => pkg.value[k]).length
  return Math.round(filled / fields.length * 100)
})

const errors = ref({})
</script>

<template>
  <div class="step-basic-2 float-in">

    <!-- 铭牌识别 -->
    <div class="form-section">
      <div class="section-head">
        <div class="ico"><AppIcon name="scan" :size="18" /></div>
        <div>
          <h3>设备铭牌识别</h3>
          <div class="desc">上传铭牌照片，AI 视觉识别自动提取型号、参数等关键字段</div>
        </div>
      </div>
      <NameplateOCR @recognized="onOcrDone" />

      <div v-if="pkg.ocrApplied" class="ocr-banner">
        <div class="check-orb"><AppIcon name="check" :size="12" /></div>
        <div style="flex:1">
          已识别 <strong>{{ (pkg.params || []).length }}</strong> 项铭牌字段并自动写入表单 ·
          型号 <span class="mono" style="color:var(--text-0)">{{ pkg.model }}</span> ·
          制造商 <span style="color:var(--text-0)">{{ pkg.manufacturer }}</span>
        </div>
        <div class="params-tags">
          <span v-for="p in (pkg.params || []).slice(0, 3)" :key="p.k" class="param-tag">
            {{ p.k }}={{ p.v }}<span class="conf">{{ p.conf.toFixed(2) }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 基础信息表单 -->
    <div class="form-section" style="padding-top:0">
      <div class="section-head">
        <div class="ico"><AppIcon name="cube" :size="18" /></div>
        <div>
          <h3>设备基础信息</h3>
          <div class="desc">这些字段将作为知识图谱中"设备实体"的核心属性写入</div>
        </div>
      </div>

      <div class="grid-2">
        <div :class="['field', errors.code && 'has-err']">
          <label class="field-label">设备编号 <span class="req">*</span></label>
          <input class="input mono" placeholder="例如 DEV-MTR-2008-0042"
                 :value="pkg.code || ''" @input="e => set('code', e.target.value)" />
          <div v-if="errors.code" class="err-msg">{{ errors.code }}</div>
        </div>
        <div :class="['field', errors.name && 'has-err']">
          <label class="field-label">设备名称 <span class="req">*</span></label>
          <input class="input" placeholder="例如 地下泵房 1# 给水泵电机"
                 :value="pkg.name || ''" @input="e => set('name', e.target.value)" />
          <div v-if="errors.name" class="err-msg">{{ errors.name }}</div>
        </div>

        <div class="field">
          <label class="field-label">规格型号</label>
          <input class="input mono" placeholder="自动填充或手动输入"
                 :value="pkg.model || ''" @input="e => set('model', e.target.value)" />
        </div>
        <div class="field">
          <label class="field-label">出厂编号</label>
          <input class="input mono" placeholder="自动填充或手动输入"
                 :value="pkg.serial_no || ''" @input="e => set('serial_no', e.target.value)" />
        </div>

        <div class="field">
          <label class="field-label">制造商</label>
          <input class="input" placeholder="制造企业名称"
                 :value="pkg.manufacturer || ''" @input="e => set('manufacturer', e.target.value)" />
        </div>
        <div :class="['field', errors.year && 'has-err']">
          <label class="field-label">投运年份 <span class="req">*</span></label>
          <input class="input mono" type="number" placeholder="YYYY"
                 :value="pkg.year || ''" @input="e => set('year', e.target.value)" />
          <div v-if="errors.year" class="err-msg">{{ errors.year }}</div>
        </div>

        <!-- 设备一级类型 -->
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">设备一级类型 <span class="req">*</span></label>
          <div class="type-grid">
            <div
              v-for="t in typeOptions" :key="t.k"
              :class="['type-card', pkg.typeK === t.k && 'active']"
              @click="set('typeK', t.k)"
            >
              <AppIcon :name="t.icon" :size="20" :stroke="pkg.typeK === t.k ? 'var(--brand)' : t.color" />
              <div>{{ t.label }}</div>
            </div>
          </div>
          <div v-if="errors.typeK" class="err-msg" style="margin-top:8px">{{ errors.typeK }}</div>
        </div>

        <div class="field">
          <label class="field-label">设备二级类型</label>
          <input class="input" placeholder="例如 中小型三相异步电动机"
                 :value="pkg.type2 || ''" @input="e => set('type2', e.target.value)" />
        </div>
        <div :class="['field', errors.building && 'has-err']">
          <label class="field-label">所属建筑 <span class="req">*</span></label>
          <select class="select" :value="pkg.building || ''" @change="e => set('building', e.target.value)">
            <option value="">请选择</option>
            <option>浦东国际金融中心 T1</option>
            <option>环球港购物中心</option>
            <option>静安希尔顿酒店</option>
            <option>漕河泾智慧园区 B 座</option>
            <option>东方医院新院区</option>
            <option>虹桥商务区南楼</option>
          </select>
          <div v-if="errors.building" class="err-msg">{{ errors.building }}</div>
        </div>

        <div class="field">
          <label class="field-label">安装位置</label>
          <input class="input" placeholder="例如 地下二层 B2-机电间"
                 :value="pkg.location || ''" @input="e => set('location', e.target.value)" />
        </div>
        <div class="field">
          <label class="field-label">资产编号</label>
          <input class="input mono" placeholder="例如 ASSET-2008-1245"
                 :value="pkg.asset_no || ''" @input="e => set('asset_no', e.target.value)" />
        </div>
      </div>
    </div>

    <div class="form-actions">
      <div class="form-progress">
        <span>录入完成度</span>
        <div class="bar"><div class="bar-fill" :style="{ width: `${progress}%` }" /></div>
        <span class="mono">{{ progress }}%</span>
      </div>
      <button class="btn ghost">保存草稿</button>
      <button class="btn primary" @click="$emit('next')">
        下一步 · 照片与文档 <AppIcon name="chevron-right" :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.step-basic-2 .form-section { padding: 24px 28px; }
.type-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; }
.type-card {
  padding: 12px 6px; border-radius: 8px;
  background: #f8faff; border: 1px solid var(--line);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; transition: all 0.15s;
  color: var(--text-1); font-size: 11px; user-select: none;
}
.type-card:hover { border-color: var(--line-strong); background: white; }
.type-card.active {
  background: linear-gradient(180deg, #eaf2ff, #f5f9ff);
  border-color: var(--brand); color: var(--text-0);
  box-shadow: 0 4px 12px rgba(47,127,255,0.12);
}
.ocr-banner {
  margin-top: 14px; padding: 12px 16px;
  background: linear-gradient(90deg, rgba(43,217,168,0.10), rgba(43,217,168,0.02));
  border: 1px solid rgba(43,217,168,0.30); border-radius: 8px;
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: var(--text-1);
}
.ocr-banner .check-orb {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(43,217,168,0.20); color: var(--ok);
  display: grid; place-items: center; flex-shrink: 0;
}
.params-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.param-tag {
  font-size: 11px; padding: 3px 9px; border-radius: 4px;
  background: rgba(43,217,168,0.08); color: var(--ok);
  border: 1px solid rgba(43,217,168,0.25);
  font-family: "JetBrains Mono", monospace;
}
.param-tag .conf { color: var(--text-3); margin-left: 4px; font-size: 10px; }
</style>

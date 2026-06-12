<script setup>
// ── components/judge/BatchImport.vue ──────────────────────────────
import { ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'
import { tsNow } from '@/utils/logHelpers'

defineProps({ rules: { type: Array, required: true } })
const emit = defineEmits(['start', 'back'])

const BATCH_SAMPLE = [
  { id:'BD01', code:'BAT-MTR-001', name:'地下水泵电机 #1',    typeK:'motor',       type2:'中小型三相异步电动机',   model:'Y-200L-4',    year:'2009', building:'虹桥商务区南楼', params:{ 功率:'30 kW', 电压:'380 V' } },
  { id:'BD02', code:'BAT-MTR-002', name:'通风机电机',          typeK:'motor',       type2:'中小型三相异步电动机',   model:'Y2-180M-4',   year:'2007', building:'虹桥商务区南楼', params:{ 功率:'22 kW' } },
  { id:'BD03', code:'BAT-FAN-001', name:'屋顶送风机',          typeK:'fan',         type2:'通风机/鼓风机',          model:'4-72-6A',     year:'2018', building:'虹桥商务区南楼', params:{ 流量:'18000 m³/h' } },
  { id:'BD04', code:'BAT-FAN-002', name:'锅炉房 1# 引风机',   typeK:'fan',         type2:'锅炉引风机',             model:'Y9-35-12',    year:'2002', building:'虹桥商务区南楼', params:{ 流量:'45000 m³/h', 全压:'2.5 kPa' } },
  { id:'BD05', code:'BAT-PMP-001', name:'消防水泵',            typeK:'pump',        type2:'单级单吸离心泵',         model:'IS100-65-200',year:'2010', building:'虹桥商务区南楼', params:{ 流量:'100 m³/h', 扬程:'50 m' } },
  { id:'BD06', code:'BAT-TRF-001', name:'配电室 1# 主变',     typeK:'transformer', type2:'油浸式无励磁调压变压器', model:'S9-1000/10',  year:'2008', building:'虹桥商务区南楼', params:{ 容量:'1000 kVA' } },
  { id:'BD07', code:'BAT-TRF-002', name:'配电室 2# 主变',     typeK:'transformer', type2:'干式变压器',             model:'SCB13-800/10',year:'2020', building:'虹桥商务区南楼', params:{ 容量:'800 kVA' } },
  { id:'BD08', code:'BAT-WLD-001', name:'机修间弧焊机',        typeK:'welder',      type2:'抽头式整流弧焊机',       model:'ZX5-400',     year:'2013', building:'虹桥商务区南楼', params:{ 额定电流:'400 A' } },
]

const loaded = ref(false)
const log    = ref([])

function loadSample() {
  loaded.value = false
  log.value = [
    { ts: tsNow(), lv: 'info', msg: '读取文件 → equipment_list_2026Q1.csv' },
    { ts: tsNow(), lv: 'info', msg: `识别到 ${BATCH_SAMPLE.length} 条设备记录` },
    { ts: tsNow(), lv: 'info', msg: '字段映射：设备编号 / 名称 / 类型 / 型号 / 年份 / 参数 / 建筑' },
    { ts: tsNow(), lv: 'ok',   msg: '✓ 表头校验通过' },
    { ts: tsNow(), lv: 'ok',   msg: `✓ 数据行校验通过 ${BATCH_SAMPLE.length}/${BATCH_SAMPLE.length}` },
  ]
  setTimeout(() => loaded.value = true, 300)
}
</script>

<template>
  <div class="batch-import float-in">
    <div class="page-head">
      <div>
        <h1 class="page-title"><AppIcon name="import" :size="22" stroke="var(--brand-2)" /> 批量导入判定</h1>
        <div class="page-subtitle">上传设备清单（CSV/Excel），系统自动解析并对每台设备发起判定，输出汇总报告。</div>
      </div>
      <button class="btn ghost" @click="$emit('back')"><AppIcon name="chevron-left" :size="14" /> 返回</button>
    </div>

    <!-- 上传区 -->
    <div v-if="!loaded" class="upload-zone" @click="loadSample">
      <div class="ic"><AppIcon name="upload" :size="28" /></div>
      <div class="h">点击或拖拽设备清单到此处</div>
      <div class="s">支持 CSV / Excel · 单文件 ≤ 10MB · 字段须包含 设备名称 / 类型 / 型号 / 年份</div>
      <div class="links">
        <a><AppIcon name="download" :size="11" /> 下载导入模板</a>
        <span style="color:var(--text-3)">·</span>
        <a @click.stop="loadSample"><AppIcon name="sparkles" :size="11" /> 加载示例清单（{{ BATCH_SAMPLE.length }} 台）</a>
      </div>
    </div>

    <!-- 解析结果 -->
    <template v-else>
      <div class="parse-card">
        <h4><AppIcon name="cpu" :size="14" stroke="var(--brand)" /> 文件解析结果</h4>
        <div class="parse-log">
          <span v-for="(l, i) in log" :key="i" class="line" :style="{ animationDelay: `${i * 0.06}s` }">
            <span class="ts">{{ l.ts }}</span>
            <span :class="`lv-${l.lv}`">[{{ l.lv.toUpperCase() }}]</span> {{ l.msg }}
          </span>
        </div>

        <table class="batch-table">
          <thead>
            <tr><th>编号</th><th>设备名称</th><th>类型</th><th>型号</th><th>年份</th><th>关键参数</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in BATCH_SAMPLE" :key="d.id">
              <td class="mono">{{ d.code }}</td>
              <td>{{ d.name }}</td>
              <td>{{ DEV_TYPE_MAP[d.typeK]?.label }} / {{ d.type2 }}</td>
              <td class="mono">{{ d.model }}</td>
              <td class="mono">{{ d.year }}</td>
              <td class="mono">{{ Object.entries(d.params).map(([k,v]) => `${k}=${v}`).join(' · ') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="padding:14px 18px;background:white;border:1px solid var(--line);border-radius:10px;display:flex;align-items:center;gap:10px">
        <div style="flex:1;font-size:12px;color:var(--text-1)">
          已解析 <strong style="color:var(--brand-2)">{{ BATCH_SAMPLE.length }}</strong> 台设备 · 准备发起批量判定 · 预计耗时约 {{ BATCH_SAMPLE.length * 3 }} 秒
        </div>
        <button class="btn ghost" style="padding:7px 14px" @click="loaded = false">重新上传</button>
        <button class="btn primary" @click="$emit('start', BATCH_SAMPLE)">
          <AppIcon name="zap" :size="13" /> 开始批量判定
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.batch-import { display: flex; flex-direction: column; gap: 16px; }
.upload-zone { padding: 36px 24px; border-radius: 12px; background: linear-gradient(180deg, #f8faff, #f3f6fb); border: 2px dashed var(--line-strong); text-align: center; cursor: pointer; transition: all 0.2s; }
.upload-zone:hover { border-color: var(--brand); background: linear-gradient(180deg, #eaf2ff, #f5f9ff); }
.upload-zone .ic { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: white; margin: 0 auto 14px; display: grid; place-items: center; box-shadow: 0 6px 20px rgba(47,127,255,0.25); }
.upload-zone .h { font-size: 15px; color: var(--text-0); font-weight: 600; }
.upload-zone .s { font-size: 12px; color: var(--text-2); margin-top: 6px; }
.upload-zone .links { margin-top: 12px; display: inline-flex; gap: 12px; font-size: 11.5px; }
.upload-zone .links a { color: var(--brand); cursor: pointer; }
.upload-zone .links a:hover { text-decoration: underline; }
.parse-card { background: white; border: 1px solid var(--line); border-radius: 12px; padding: 20px; }
.parse-card h4 { margin: 0 0 12px; font-size: 13px; color: var(--text-0); display: flex; align-items: center; gap: 8px; }
.parse-log { background: #0f1d3d; border-radius: 8px; padding: 12px; font-family: "JetBrains Mono", monospace; font-size: 11px; color: #c5d3ed; line-height: 1.7; margin-bottom: 14px; }
.parse-log .line { display: block; opacity: 0; animation: log-in 0.3s ease forwards; }
.parse-log .ts { color: #6a7da3; margin-right: 8px; }
.parse-log .lv-info { color: #4dc9ff; }
.parse-log .lv-ok   { color: #2bd9a8; }
.batch-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.batch-table th { padding: 10px 12px; text-align: left; font-weight: 500; background: #f5f9ff; color: var(--text-2); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--line); }
.batch-table td { padding: 10px 12px; border-bottom: 1px solid var(--line); color: var(--text-1); }
.batch-table tr:hover td { background: #f8faff; }
.batch-table .mono { font-family: "JetBrains Mono", monospace; color: var(--text-0); }
</style>

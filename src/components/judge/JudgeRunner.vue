<script setup>
// ── components/judge/JudgeRunner.vue ──────────────────────────────
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import RuleHitMini from './RuleHitMini.vue'
import { judgeEquipments, judgeEquipmentQuick } from '@/api/judge'
import { DEV_TYPE_MAP } from '@/data/devices'
import { JUDGE_STATUS_MAP } from '@/data/rules'
import { tokenizeJudgeLog } from '@/utils/logHelpers'

// 辅助函数：由于详情页和列表页传入的数据结构不一致，这里对自定义参数进行智能扁平化归一提取
const getDevParams = (d) => {
  if (!d) return {}
  const raw = d.value || d
  
  // 1. 如果 raw.params 是非数组的扁平键值对对象：
  if (raw.params && typeof raw.params === 'object' && !Array.isArray(raw.params)) {
    return raw.params
  }
  
  // 2. 如果 raw.params 是一个对象数组，例如 [ { name: '型号', value: 'HZJ-1' } ]：
  const p = {}
  if (raw.params && Array.isArray(raw.params)) {
    raw.params.forEach(item => {
      if (item) {
        const name = item.name || item.Name || item.key || item.Key || ''
        const val = item.value !== undefined ? item.value : (item.Value !== undefined ? item.Value : '')
        if (name) {
          p[name] = val
        }
      }
    })
    return p
  }

  // 3. 如果有 paramGroups 嵌套组
  if (raw.paramGroups && Array.isArray(raw.paramGroups)) {
    raw.paramGroups.forEach(g => {
      if (g && g.items && Array.isArray(g.items)) {
        g.items.forEach(item => {
          if (item && item.name) {
            p[item.name] = item.value
          }
        })
      }
    })
  }
  return p
}

// 辅助函数：校验型号是否为空或属于占位符（如 "-", "—", "/", "null" 等）
const isModelEmpty = (m) => {
  if (m === null || m === undefined) return true
  const t = String(m).trim()
  return t === '' || t === '-' || t === '—' || t === '/' || t === 'null' || t === 'undefined'
}

const props = defineProps({
  devices: { type: Array, required: true },
  rules:   { type: Array, required: true },
  processes: { type: Array, default: () => ['1', '2', '3'] }
})
const emit = defineEmits(['done', 'cancel'])

const curIdx    = ref(0)
const curStep   = ref(-1)
const results   = ref([])
const logs      = ref([])
const judgeRes  = ref(null)
const phase     = ref('running') // running | done

// 动态的步骤列表，前两步固定，后续步骤在接口成功响应后由后端 flowSteps 动态追加
const STEPS = ref([
  { k: 'verify', n: '校验设备信息', d: '校验设备录入数据的完整性...', status: 'success' },
  { k: 'load',   n: '加载规则库',   d: '请求淘汰判定服务...', status: 'success' },
])

const curDevice  = computed(() => props.devices[curIdx.value])
const devType    = computed(() => DEV_TYPE_MAP[curDevice.value?.typeK] || DEV_TYPE_MAP.other)

const isDeviceFinished = ref(false)
const fetchedData = ref({})

const finalStatus = computed(() =>
  isDeviceFinished.value && judgeRes.value ? judgeRes.value.status : null)
const finalMeta = computed(() => finalStatus.value ? JUDGE_STATUS_MAP[finalStatus.value] : null)

const progressPct = computed(() => {
  if (!props.devices.length) return 0
  if (phase.value === 'done') return 100
  return Math.round((curIdx.value / props.devices.length) * 100)
})

// 时间格式化辅助
function tsNow() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

// 核心：单台设备接口提交与动态步骤日志推进
async function runDeviceJudge(index) {
  curStep.value = 0 // 第一步：校验设备信息
  logs.value = []
  isDeviceFinished.value = false
  
  const dev = props.devices[index]
  
  const devParams = getDevParams(dev)
  const logModel = !isModelEmpty(dev.model) ? dev.model : (devParams['型号'] || devParams['规格型号'] || '—')
  logs.value.push({ ts: tsNow(), lv: 'info', msg: `【INFO】开始校验设备 data：${dev.name || dev.equipmentName || '未命名'} (编号: ${dev.code || dev.equId || `TEMP-${index}`})` })
  logs.value.push({ ts: tsNow(), lv: 'info', msg: `【INFO】类型：${dev.typeName || dev.type2 || '—'}，型号：${logModel}` })
  
  // 模拟极短本地数据校验
  await new Promise(r => setTimeout(r, 200))
  logs.value.push({ ts: tsNow(), lv: 'ok', msg: `【OK】设备信息格式校验通过` })
  
  curStep.value = 1 // 第二步：加载规则库
  logs.value.push({ ts: tsNow(), lv: 'info', msg: `【INFO】发起规则库判定服务网络请求...` })
  
  try {
    const equId = dev.equId || dev.id
    
    // 优先从后台预加载的缓存中直接提取，使接口请求与动画彻底解耦
    let apiRes = fetchedData.value[equId]
    if (!apiRes) {
      const isQuick = !dev.equId || String(equId).startsWith('quick-');
      if (isQuick) {
        const devParams = getDevParams(dev);
        const attributes = Object.entries(devParams).map(([key, value]) => ({
          key: String(key),
          value: value !== null && value !== undefined ? String(value) : ''
        }));
        const brand = dev.manufacturer || dev.brand || devParams['品牌'] || devParams['生产厂家'] || '';
        const power = dev.power || devParams['功率'] || devParams['额定功率'] || '';
        const deviceModel = !isModelEmpty(dev.model) ? dev.model : (devParams['型号'] || devParams['规格型号'] || '');
        const payload = {
          EquipmentTypeId: dev.typeDbId || dev.typeK ? String(dev.typeDbId || dev.typeK) : null,
          EquipmentName: dev.name || dev.equipmentName ? String(dev.name || dev.equipmentName) : '',
          Model: deviceModel ? String(deviceModel) : '',
          Brand: brand ? String(brand) : '',
          Year: dev.year ? String(dev.year) : '',
          Power: power ? String(power) : '',
          ManufactureDate: dev.manufactureDate || (dev.year ? `${dev.year}-06-01` : ''),
          Attributes: attributes,
          JudgmentProcesses: props.processes
        };
        apiRes = await judgeEquipmentQuick(payload);
      } else {
        const res = await judgeEquipments([equId], props.processes);
        if (!res || res.length === 0) {
          throw new Error("判定接口未返回有效数据")
        }
        apiRes = res[0];
      }
      fetchedData.value[equId] = apiRes;
    }
    
    logs.value.push({ ts: tsNow(), lv: 'ok', msg: `【OK】规则库云端判定服务响应成功` })
    
    // 对齐淘汰判定状态
    let alignedStatus = 'normal'
    if (apiRes.judgeStatus === '强制淘汰') alignedStatus = 'phaseout-mandatory'
    else if (apiRes.judgeStatus === '限期淘汰') alignedStatus = 'phaseout-deadline'
    
    // 解析后端返回的 flowSteps (Dictionary)，扁平化作为后续步骤追加
    const backendSteps = []
    if (apiRes.flowSteps) {
      Object.keys(apiRes.flowSteps).forEach(procName => {
        const pSteps = apiRes.flowSteps[procName] || []
        pSteps.forEach(fs => {
          backendSteps.push({
            k: fs.key || procName,
            n: fs.name,
            d: fs.name,
            status: fs.status,
            logs: fs.logs || []
          })
        })
      })
    }
    
    // 初始化前两步
    STEPS.value = [
      { k: 'verify', n: '校验设备信息', d: '校验设备录入数据的完整性...', status: 'success' },
      { k: 'load',   n: '加载规则库',   d: '请求淘汰判定服务...', status: 'success' }
    ]
    
    // 转换 Hits: 保持后端字典结构，并添加前端依赖项
    const alignedHits = {}
    if (apiRes.hits) {
      Object.keys(apiRes.hits).forEach(procName => {
        alignedHits[procName] = []
        const pArray = apiRes.hits[procName] || []
        pArray.forEach(ah => {
          const localRule = props.rules.find(r => r.ruleId === ah.ruleId) || {
            ruleId: ah.ruleId,
            product: ah.ruleName,
            eliminationType: ah.eliminationType === '强制淘汰' ? '强制' : '限期',
            nationalStandard: ah.desc
          }
          
          const alignedChecks = (ah.checks || []).map(c => {
            let stepName = c.step
            if (c.step === '型号系列' || c.step === '型号匹配') stepName = '型号系列'
            if (c.step === '规格区间' || c.step === '规格匹配') stepName = '规格区间'
            if (c.step === '投运年份' || c.step === '年份约束') stepName = '投运年份'
            
            return {
              step: stepName,
              expect: c.expect,
              actual: c.actual,
              ok: c.ok,
              conditions: stepName === '规格区间' ? [
                { key: '参数', min: 0, max: 0, actual: c.actual, ok: c.ok, desc: c.expect }
              ] : []
            }
          })
          
          alignedHits[procName].push({
            rule: localRule,
            modelHit: dev.model,
            apiHit: ah,
            checks: alignedChecks
          })
        })
      })
    }
    
    judgeRes.value = {
      device: dev,
      equId: dev.equId || dev.id,
      equipmentName: dev.name || dev.equipmentName,
      model: dev.model || '',
      year: dev.year || '',
      power: dev.power || '',
      manufactureDate: dev.manufactureDate || '',
      status: alignedStatus,
      hits: alignedHits,
      apiRaw: apiRes
    }
    
    // 依次将后端各个节点追加到流水线，并逐个点亮和输出日志
    for (let i = 0; i < backendSteps.length; i++) {
      const stepItem = backendSteps[i]
      STEPS.value.push(stepItem)
      
      // 更新当前活跃步骤指向刚追加的这一步
      curStep.value = STEPS.value.length - 1
      await new Promise(r => setTimeout(r, 450)) // 步骤激活延迟
      
      // 将本步的日志打字机般逐行输出
      for (const line of stepItem.logs) {
        await new Promise(r => setTimeout(r, 100))
        logs.value.push({
          ts: tsNow(),
          lv: line.includes('【OK】') ? 'ok' : (line.includes('【WARN】') ? 'warn' : 'info'),
          msg: line
        })
        setTimeout(() => {
          const la = document.querySelector('.log-area')
          if (la) la.scrollTop = la.scrollHeight
          const sl = document.querySelector('.step-list')
          if (sl) sl.scrollTop = sl.scrollHeight
        }, 10)
      }
    }
    
    isDeviceFinished.value = true
    
    // 结束本台判定
    await new Promise(r => setTimeout(r, 500))
    results.value = [...results.value, judgeRes.value]
    
    const nextIdx = index + 1
    if (nextIdx >= props.devices.length) {
      phase.value = 'done'
      setTimeout(() => emit('done', results.value), 400)
    } else {
      curIdx.value = nextIdx
      STEPS.value = [
        { k: 'verify', n: '校验设备信息', d: '校验设备录入数据的完整性...', status: 'success' },
        { k: 'load',   n: '加载规则库',   d: '请求淘汰判定服务...', status: 'success' },
      ]
      setTimeout(() => runDeviceJudge(nextIdx), 400)
    }
    
  } catch (err) {
    console.error("依次提交设备判定接口出错:", err)
    STEPS.value[1].status = 'fail'
    curStep.value = 1
    logs.value.push({ ts: tsNow(), lv: 'err', msg: `【ERROR】连接规则库判定接口失败: ${err.message || err}` })
    logs.value.push({ ts: tsNow(), lv: 'err', msg: `【ERROR】判定流程非正常终止，请检查网络或后台服务配置` })
  }
}

onMounted(() => {
  if (props.devices.length > 0) {
    // 后台并行预请求所有设备的判定数据，不阻碍前台校验和动画的立即开始
    props.devices.forEach(async (dev, idx) => {
      if (idx === 0) return // 跳过第一台当前需要立即展示并请求的设备，防止并发网络请求重复
      try {
        const equId = dev.equId || dev.id
        const isQuick = !dev.equId || String(equId).startsWith('quick-');
        let res;
        if (isQuick) {
          const devParams = getDevParams(dev);
          const attributes = Object.entries(devParams).map(([key, value]) => ({
            key: String(key),
            value: value !== null && value !== undefined ? String(value) : ''
          }));
          const brand = dev.manufacturer || dev.brand || devParams['品牌'] || devParams['生产厂家'] || '';
          const power = dev.power || devParams['功率'] || devParams['额定功率'] || '';
          const deviceModel = !isModelEmpty(dev.model) ? dev.model : (devParams['型号'] || devParams['规格型号'] || '');
          const payload = {
            EquipmentTypeId: dev.typeDbId || dev.typeK ? String(dev.typeDbId || dev.typeK) : null,
            EquipmentName: dev.name || dev.equipmentName ? String(dev.name || dev.equipmentName) : '',
            Model: deviceModel ? String(deviceModel) : '',
            Brand: brand ? String(brand) : '',
            Year: dev.year ? String(dev.year) : '',
            Power: power ? String(power) : '',
            ManufactureDate: dev.manufactureDate || (dev.year ? `${dev.year}-06-01` : ''),
            Attributes: attributes,
            JudgmentProcesses: props.processes
          };
          res = await judgeEquipmentQuick(payload);
        } else {
          const temp = await judgeEquipments([equId], props.processes);
          res = temp && temp.length > 0 ? temp[0] : null;
        }
        if (res) {
          fetchedData.value[equId] = res;
        }
      } catch (e) {
        console.error(`后台静默预拉取接口出错: ${dev.equId || dev.id}`, e)
      }
    })

    runDeviceJudge(0)
  }
})
</script>

<template>
  <div v-if="phase === 'done'" style="padding:80px;text-align:center;color:var(--text-2)">
    <div class="ai-orb" style="width:48px;height:48px;margin:0 auto 14px"/>
    <div style="font-size:14px">判定完成，正在汇总结果…</div>
  </div>

  <div v-else-if="curDevice" class="judge-runner float-in">
    <!-- 顶部操作栏 -->
    <div class="actions-bar">
      <div class="lbl">
        <template v-if="devices.length === 1">
          正在判定 <strong style="color:var(--text-0)">{{ devices[0].name || '—' }}</strong>
        </template>
        <template v-else>
          批量判定 <strong style="color:var(--text-0)">{{ devices.length }}</strong> 台设备 ·
          当前 <strong style="color:var(--brand-2)">{{ Math.min(curIdx + 1, devices.length) }}</strong> / {{ devices.length }}
        </template>
      </div>
      <button class="btn ghost" style="padding:6px 12px" @click="$emit('cancel')">
        <AppIcon name="chevron-left" :size="12" /> 返回
      </button>
    </div>

    <!-- 进度条 -->
    <div class="runner-progress">
      <div class="lbl">
        <AppIcon name="zap" :size="14" stroke="var(--brand)" />
        {{ devices.length > 1 ? '批量判定进度' : '判定进度' }}
      </div>
      <div class="bar">
        <div class="bar-fill" :style="{ width: `${progressPct}%` }" />
      </div>
      <span class="pct">{{ progressPct }}%</span>
    </div>

    <div class="runner-grid">
      <!-- 左：当前设备卡 -->
      <div class="cur-dev-card" :style="{ '--cl': devType.color }">
        <div class="head">
          <span class="pulse" />
          正在判定 · 设备 #{{ curIdx + 1 }}
        </div>
        <div class="ic-row">
          <div class="thumb">
            <AppIcon :name="devType.icon" :size="26" :stroke="devType.color" />
          </div>
          <div>
            <div class="code">{{ curDevice.code || curDevice.equId || `TEMP-${curIdx}` }}</div>
            <div class="name">{{ curDevice.name || curDevice.equipmentName || '未命名设备' }}</div>
          </div>
        </div>
        <div class="params">
          <template v-if="curDevice.paramGroups && curDevice.paramGroups.length > 0">
            <div
              v-for="item in curDevice.paramGroups.flatMap(g => g.items).slice(0, 4)"
              :key="item.name"
              class="param-row"
            >
              <span class="pl">{{ item.name }}</span><span class="pv">{{ item.value }}</span>
            </div>
          </template>
          <template v-else>
            <div class="param-row" v-if="curDevice.power">
              <span class="pl">额定功率</span><span class="pv">{{ curDevice.power }}</span>
            </div>
            <div class="param-row" v-if="curDevice.brand">
              <span class="pl">品牌/厂家</span><span class="pv">{{ curDevice.brand }}</span>
            </div>
            <div class="param-row" v-if="curDevice.manufactureDate">
              <span class="pl">出厂日期</span><span class="pv">{{ curDevice.manufactureDate.split('T')[0] }}</span>
            </div>
            <div class="param-row" v-if="curDevice.buildName">
              <span class="pl">关联建筑</span><span class="pv">{{ curDevice.buildName }}</span>
            </div>
          </template>
        </div>
        <div class="info-rows">
          <div><span class="lbl">类型：</span>{{ devType.label }} / {{ curDevice.typeName || curDevice.type2 || '—' }}</div>
          <div><span class="lbl">型号：</span><span class="mono">{{ !isModelEmpty(curDevice.model) ? curDevice.model : (getDevParams(curDevice)['型号'] || getDevParams(curDevice)['规格型号'] || '—') }}</span></div>
          <div><span class="lbl">投运：</span>{{ curDevice.year || '—' }} 年</div>
          <div v-if="curDevice.building || curDevice.buildName"><span class="lbl">建筑：</span>{{ curDevice.buildName || curDevice.building }}</div>
        </div>
      </div>

      <!-- 中：步骤 + 日志 + 结果 banner -->
      <div class="runner-mid">
        <div class="head">
          <div class="ai-orb" style="width:30px;height:30px" />
          <div>
            <h4>判定流水线</h4>
            <div class="sub">JudgeEngine v1.3 · 435 条规则</div>
          </div>
        </div>

        <div class="step-list">
          <div
            v-for="(s, i) in STEPS" :key="s.k"
            :class="['step-row', curStep === i && 'active', curStep > i && 'done', curStep > i && s.status]"
          >
            <div class="dot">
              <AppIcon v-if="curStep === i" name="settings" :size="10" class="spin" stroke="var(--brand)" />
              <AppIcon v-else-if="curStep > i && s.status === 'warning'" name="warn" :size="10" stroke="var(--warn-color, #e6a23c)" />
              <AppIcon v-else-if="curStep > i && s.status === 'fail'" name="ban" :size="10" stroke="#f56c6c" />
              <AppIcon v-else-if="curStep > i" name="check" :size="10" />
              <template v-else>{{ String(i + 1).padStart(2, '0') }}</template>
            </div>
            <span>{{ s.n }}</span>
            <span v-if="curStep === i" class="step-stat" style="color:var(--brand)">
              <AppIcon name="settings" :size="12" class="spin" />
            </span>
            <span v-else-if="curStep > i && s.status === 'warning'" class="step-stat" style="color:#e6a23c">⚠️ 警告</span>
            <span v-else-if="curStep > i && s.status === 'fail'" class="step-stat" style="color:#f56c6c">❌ 错误</span>
            <span v-else-if="curStep > i" class="step-stat">✓</span>
          </div>
        </div>

        <div class="log-area">
          <template v-if="logs.length === 0">
            <span class="ll">> 初始化判定上下文…</span>
            <span class="ll">> 加载规则库 v1.3 · 解析设备特征…</span>
          </template>
          <span v-for="(l, i) in logs" :key="i" class="ll">
            <span class="ts">{{ l.ts }}</span>
            <span :class="`lv-${l.lv}`">[{{ l.lv.toUpperCase() }}]</span>
            <!-- token 着色 -->
            <template v-for="(tok, j) in tokenizeJudgeLog(l.msg)" :key="j">
              <span v-if="tok.type === 'ent'"    class="ent">{{ tok.value }}</span>
              <span v-else-if="tok.type === 'cyan'"   :style="{ color: '#4dc9ff' }">{{ tok.value }}</span>
              <span v-else-if="tok.type === 'yellow'" :style="{ color: '#ffb547' }">{{ tok.value }}</span>
              <span v-else-if="tok.type === 'pink'"   :style="{ color: '#ff8da0', fontWeight: 600 }">{{ tok.value }}</span>
              <template v-else>{{ tok.value }}</template>
            </template>
          </span>
        </div>

        <div v-if="finalMeta" :class="['final-banner', finalMeta.cls]">
          <div class="iconbox"><AppIcon :name="finalMeta.icon" :size="20" /></div>
          <div>
            <div class="h">判定结果：{{ finalMeta.label }}</div>
            <div class="d">
              {{ Object.values(judgeRes.hits || {}).flat().length > 0
                ? `命中 ${Object.values(judgeRes.hits || {}).flat().length} 条规则 · ${finalMeta.desc}`
                : finalMeta.desc }}
            </div>
          </div>
        </div>
        <div v-else class="final-banner pending" style="background: rgba(43,90,237,0.06); border: 1px solid rgba(43,90,237,0.18);">
          <div class="iconbox" style="background: var(--brand); color: white;"><AppIcon name="zap" :size="20" /></div>
          <div>
            <div class="h" style="color: var(--text-1); font-weight: 600;">淘汰判定引擎分析中...</div>
            <div class="d" style="color: var(--text-2);">正在核对匹配现行淘汰目录标准与大模型能效推理</div>
          </div>
        </div>
      </div>

      <!-- 右：队列 / 命中规则 -->
      <div class="runner-right">
        <!-- 批量：队列列表 -->
        <template v-if="devices.length > 1">
          <h4><AppIcon name="list" :size="14" stroke="var(--brand)" /> 判定队列 ({{ results.length }}/{{ devices.length }})</h4>
          <div class="queue-list">
            <div
              v-for="(d, i) in devices" :key="i"
              :class="['queue-item', i === curIdx && 'curr', results[i] && 'done']"
            >
              <div class="qidx">{{ i + 1 }}</div>
              <div class="qname">{{ d.name || d.equipmentName || `设备 ${i + 1}` }}</div>
              <span v-if="results[i]"
                    :class="['qstat level-tag', JUDGE_STATUS_MAP[results[i].status].cls]"
                    :style="{
                      background: JUDGE_STATUS_MAP[results[i].status].cls === 'phaseout' ? 'var(--eol-red)'
                                : JUDGE_STATUS_MAP[results[i].status].cls === 'low_eff'  ? 'var(--eol-low)'
                                : 'rgba(24,165,114,0.18)',
                      color: JUDGE_STATUS_MAP[results[i].status].cls === 'normal' ? 'var(--ok)' : 'white',
                    }">
                {{ JUDGE_STATUS_MAP[results[i].status].label }}
              </span>
              <span v-else-if="i === curIdx" class="qstat" style="color:var(--brand)">判定中…</span>
              <span v-else class="qstat" style="color:var(--text-3)">等待</span>
            </div>
          </div>
        </template>

        <!-- 单台 / 无队列：命中规则预览 -->
        <template v-else>
          <h4><AppIcon name="rule" :size="14" stroke="var(--brand)" /> 实时命中规则</h4>
          <div
            v-if="judgeRes && curStep >= STEPS.length - 1 && judgeRes.hits.length > 0"
            style="display:flex;flex-direction:column;gap:10px"
          >
            <RuleHitMini v-for="(h, i) in judgeRes.hits" :key="i" :hit="h" />
          </div>
          <div
            v-else-if="judgeRes && curStep >= STEPS.length - 1"
            style="padding:24px;text-align:center;color:var(--text-2);font-size:12px;
                   background:rgba(43,217,168,0.06);border:1px dashed rgba(43,217,168,0.30);border-radius:8px"
          >
            <AppIcon name="check" :size="28" stroke="var(--ok)" />
            <div style="margin-top:6px;color:var(--ok);font-weight:500">未命中任何淘汰规则</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:4px">设备能效符合现行标准</div>
          </div>
          <div v-else style="padding:30px;text-align:center;color:var(--text-3);font-size:11.5px">
            规则匹配中，命中后将在此显示…
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.judge-runner { display: flex; flex-direction: column; gap: 16px; }

.actions-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; background: white; border: 1px solid var(--line); border-radius: 10px;
}
.actions-bar .lbl { font-size: 12px; color: var(--text-2); }

.runner-progress {
  padding: 14px 20px; background: white; border: 1px solid var(--line); border-radius: 10px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}
.runner-progress .lbl { font-size: 13px; color: var(--text-0); font-weight: 500; display: flex; align-items: center; gap: 8px; }
.runner-progress .bar { flex: 1; height: 6px; background: #e3ebf7; border-radius: 3px; overflow: hidden; position: relative; }
.runner-progress .bar-fill {
  height: 100%; background: linear-gradient(90deg, var(--brand), var(--brand-glow));
  transition: width 0.4s; position: relative;
}
.runner-progress .bar-fill::after { content: ""; position: absolute; right: -2px; top: -2px; bottom: -2px; width: 6px; background: white; box-shadow: 0 0 12px var(--brand-glow); }
.runner-progress .pct { font-family: "JetBrains Mono", monospace; color: var(--text-1); font-size: 12px; min-width: 60px; text-align: right; }

.runner-grid { display: grid; grid-template-columns: 320px 1fr 320px; gap: 16px; }

.cur-dev-card {
  background: white; border: 1px solid var(--line); border-radius: 12px;
  padding: 20px; height: fit-content; position: sticky; top: 80px;
  box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}
.cur-dev-card .head { display: flex; align-items: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px dashed var(--line); margin-bottom: 14px; font-size: 12px; color: var(--text-2); }
.cur-dev-card .head .pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); box-shadow: 0 0 8px var(--brand); animation: pulse 1.4s ease-in-out infinite; }
.cur-dev-card .ic-row { display: flex; gap: 12px; margin-bottom: 14px; }
.cur-dev-card .thumb { width: 52px; height: 52px; border-radius: 10px; background: linear-gradient(135deg, #eaf2ff, #e2dcff); border: 1px solid var(--line-strong); display: grid; place-items: center; color: var(--cl); flex-shrink: 0; }
.cur-dev-card .name { font-size: 14.5px; color: var(--text-0); font-weight: 500; line-height: 1.35; }
.cur-dev-card .code { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-2); }
.cur-dev-card .params { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; padding: 10px 12px; background: #f7f9fd; border-radius: 8px; border: 1px dashed var(--line); margin-bottom: 12px; }
.cur-dev-card .param-row { display: flex; justify-content: space-between; gap: 6px; font-size: 11px; }
.cur-dev-card .param-row .pl { color: var(--text-2); }
.cur-dev-card .param-row .pv { font-family: "JetBrains Mono", monospace; color: var(--text-0); font-weight: 500; }
.cur-dev-card .info-rows { font-size: 12px; color: var(--text-1); line-height: 1.7; }
.cur-dev-card .info-rows .lbl { color: var(--text-2); }

.runner-mid {
  background: linear-gradient(180deg, #0f1d3d, #1a2a55);
  border: 1px solid #1a2950; border-radius: 12px;
  padding: 20px; height: 760px; color: #eaf2ff;
  display: flex; flex-direction: column;
}
.runner-mid .head { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; border-bottom: 1px dashed rgba(77,201,255,0.2); margin-bottom: 14px; flex-shrink: 0; }
.runner-mid .head h4 { margin: 0; font-size: 14px; color: #eaf2ff; }
.runner-mid .head .sub { font-size: 11px; color: #8da3c8; font-family: "JetBrains Mono", monospace; }

.step-list { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; overflow-y: auto; padding-right: 6px; }
.step-list::-webkit-scrollbar, .log-area::-webkit-scrollbar { width: 6px; }
.step-list::-webkit-scrollbar-thumb, .log-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
.step-list::-webkit-scrollbar-track, .log-area::-webkit-scrollbar-track { background: transparent; }
.step-row { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 6px; font-size: 12.5px; color: #6a7da3; transition: all 0.2s; }
.step-row .dot { width: 18px; height: 18px; border-radius: 50%; background: rgba(77,201,255,0.10); border: 1px solid rgba(77,201,255,0.2); display: grid; place-items: center; font-family: "JetBrains Mono", monospace; font-size: 9px; color: #6a7da3; flex-shrink: 0; }
.step-row.active { background: rgba(77,201,255,0.10); color: #eaf2ff; }
.step-row.active .dot { background: linear-gradient(135deg, #4dc9ff, #2f7fff); border-color: transparent; color: white; box-shadow: 0 0 12px rgba(77,201,255,0.5); }
.step-row.done { color: #c5d3ed; }
.step-row.done .dot { background: rgba(43,217,168,0.18); border-color: rgba(43,217,168,0.45); color: #2bd9a8; }
.step-row.done.warning { color: #fdd8a2; }
.step-row.done.warning .dot { background: rgba(230,162,60,0.18); border-color: rgba(230,162,60,0.45); color: #e6a23c; }
.step-row.done.fail { color: #feb8b8; }
.step-row.done.fail .dot { background: rgba(245,108,108,0.18); border-color: rgba(245,108,108,0.45); color: #f56c6c; }
.step-row .step-stat { margin-left: auto; font-size: 11px; font-family: "JetBrains Mono", monospace; }
.step-row.done .step-stat { color: #2bd9a8; }

.log-area {
  background: #0a142e; border: 1px solid #1a2950; border-radius: 8px;
  padding: 12px; font-family: "JetBrains Mono", monospace;
  font-size: 11px; color: #c5d3ed; line-height: 1.8;
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column;
}
.log-area .ll { display: block; animation: log-in 0.25s ease forwards; }
.log-area .ts    { color: #6a7da3; margin-right: 8px; }
.log-area .lv-info { color: #4dc9ff; }
.log-area .lv-ok   { color: #2bd9a8; }
.log-area .lv-warn { color: #ffb547; }
.log-area .lv-err  { color: #ff6b8a; }
.log-area .ent     { color: #b3a4ff; }

.final-banner { flex-shrink: 0; margin-top: 14px; padding: 14px 18px; border-radius: 10px; display: flex; align-items: center; gap: 14px; animation: float-in 0.4s ease both; }
.final-banner.normal  { background: linear-gradient(90deg, rgba(43,217,168,0.18), rgba(43,217,168,0.05)); border: 1px solid rgba(43,217,168,0.45); }
.final-banner.low_eff { background: linear-gradient(90deg, rgba(234,140,46,0.20), rgba(234,140,46,0.05)); border: 1px solid rgba(234,140,46,0.45); }
.final-banner.phaseout { background: linear-gradient(90deg, rgba(224,57,79,0.22), rgba(224,57,79,0.06)); border: 1px solid rgba(224,57,79,0.50); }
.final-banner .iconbox { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: white; flex-shrink: 0; }
.final-banner.normal .iconbox   { background: linear-gradient(135deg, #2bd9a8, #18a572); box-shadow: 0 0 16px rgba(43,217,168,0.4); }
.final-banner.low_eff .iconbox  { background: linear-gradient(135deg, #ffb547, #ea8c2e); box-shadow: 0 0 16px rgba(234,140,46,0.4); }
.final-banner.phaseout .iconbox { background: linear-gradient(135deg, #ff6b8a, #e0394f); box-shadow: 0 0 16px rgba(224,57,79,0.4); }
.final-banner .h { font-size: 15px; font-weight: 600; color: white; }
.final-banner .d { font-size: 11.5px; color: #c5d3ed; margin-top: 3px; }

.runner-right { background: white; border: 1px solid var(--line); border-radius: 12px; padding: 18px; height: fit-content; position: sticky; top: 80px; box-shadow: 0 1px 2px rgba(60,110,200,0.04); }
.runner-right h4 { margin: 0 0 12px; font-size: 13px; color: var(--text-0); display: flex; align-items: center; gap: 8px; }

.queue-list { display: flex; flex-direction: column; gap: 6px; max-height: 480px; overflow-y: auto; }
.queue-item { padding: 10px 12px; border-radius: 8px; background: #f8faff; border: 1px solid var(--line); font-size: 12px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
.queue-item.curr { background: linear-gradient(90deg, rgba(47,127,255,0.10), transparent); border-color: var(--brand); box-shadow: 0 2px 8px rgba(47,127,255,0.10); }
.queue-item.done { opacity: 0.85; }
.queue-item .qidx { width: 22px; height: 22px; border-radius: 6px; background: white; border: 1px solid var(--line); font-family: "JetBrains Mono", monospace; font-size: 10.5px; display: grid; place-items: center; color: var(--text-2); flex-shrink: 0; }
.queue-item.curr .qidx { background: linear-gradient(135deg, var(--brand), var(--brand-2)); border-color: transparent; color: white; }
.queue-item.done .qidx { background: rgba(24,165,114,0.10); border-color: var(--ok); color: var(--ok); }
.queue-item .qname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-1); }
.queue-item.curr .qname { color: var(--text-0); font-weight: 500; }
.queue-item .qstat { font-size: 10px; padding: 2px 7px; border-radius: 3px; font-family: "JetBrains Mono", monospace; flex-shrink: 0; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1.5s linear infinite;
  display: inline-block;
}
</style>

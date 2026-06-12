// ── utils/logHelpers.js ────────────────────────────────────────────
// 日志生成、文本渲染、条件格式化等工具函数
// 注意：renderLogMsg2 / renderJudgeLog 在 React 版中返回 JSX，
//       迁移为返回富文本描述的纯数据数组（tokens），由 Vue 组件渲染

import { DEV_TYPE_MAP } from '@/data/devices'
import { JUDGE_STATUS_MAP } from '@/data/rules'
import { countRulesByType } from '@/utils/judgeEngine'

// ── 基础工具 ──────────────────────────────────────────────────────

export function tsNow() {
  return new Date().toTimeString().slice(0, 8)
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── 文档类型随机标签 ──────────────────────────────────────────────

export function randomTags(catK) {
  const POOLS = {
    photo:    ['铭牌', '外观', '型号', '标识', '安装环境'],
    manual:   ['技术参数', '使用方法', '维护要求', '型号系列', '性能曲线'],
    archive:  ['采购合同', '出厂日期', '验收记录', '保修期', '供应商'],
    maintain: ['维保记录', '故障代码', '更换备件', '维护周期'],
    test:     ['能效等级', '检测方法', '实测值', 'GB标准', '判定结论'],
  }
  const pool = POOLS[catK] || ['设备']
  return shuffle([...pool]).slice(0, 3 + Math.floor(Math.random() * 3))
}

// ── 文档上传日志生成 ──────────────────────────────────────────────

export function randomDocLog(doc) {
  const events = {
    1: [
      { lv: 'info', msg: `OCR 引擎读取 "${doc.name}"，识别版式中…` },
      { lv: 'info', msg: `提取 #设备型号 #规格参数 #生产厂家 等字段` },
    ],
    2: [
      { lv: 'info', msg: `Chunking 完成，生成 ${Math.floor(8 + Math.random() * 15)} 个语义切片` },
      { lv: 'info', msg: `检测到 #表格 #设备清单` },
    ],
    3: [
      { lv: 'info', msg: `实体识别：#型号系列 #额定参数 #制造商` },
      { lv: 'info', msg: `术语标定 → 链接到 GB18613-2012 #能效限定值` },
      { lv: 'ok',   msg: `数值抽取：额定功率 22kW 转速 1470r/min` },
    ],
    4: [
      { lv: 'ok', msg: `向量化完成（1536 维），写入 #VectorDB` },
      { lv: 'ok', msg: `图谱节点 +${Math.floor(8 + Math.random() * 8)}，关系 +${Math.floor(15 + Math.random() * 10)}` },
    ],
  }
  const pool = events[doc.stage] || [{ lv: 'info', msg: '…' }]
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── 图谱融合日志生成 ──────────────────────────────────────────────

export function randomFusionLog(phase, data) {
  const events = {
    0: [
      { lv: 'info', msg: `抽取设备实体 #${data.name || '未命名设备'}` },
      { lv: 'info', msg: `识别铭牌字段 9 项 → 去重合并` },
      { lv: 'info', msg: `检测到型号 ${data.model || '—'} 为已知系列` },
    ],
    1: [
      { lv: 'info', msg: `建立 设备 ↔ 建筑(${data.building || '—'}) 隶属关系` },
      { lv: 'info', msg: `关联到 ${DEV_TYPE_MAP[data.typeK]?.label || '—'} 类型节点` },
      { lv: 'ok',   msg: `匹配到 ${Math.floor(3 + Math.random() * 5)} 台同型号相似设备` },
    ],
    2: [
      { lv: 'info', msg: `Embedding 模型 → BGE-M3-1024` },
      { lv: 'ok',   msg: `写入向量库（1024 维 × 切片）` },
    ],
    3: [
      { lv: 'info', msg: `链接到 GB18613-2012 #能效限定值` },
      { lv: 'info', msg: `链接到《淘汰目录》第三批 B3 章节` },
      { lv: 'ok',   msg: `命中 ${Math.floor(1 + Math.random() * 4)} 条潜在淘汰规则` },
    ],
    4: [
      { lv: 'info', msg: `一致性校验：实体唯一性 ✓ 关系闭合 ✓` },
      { lv: 'ok',   msg: `图谱版本 v3.${Math.floor(Math.random() * 100)} 已发布` },
    ],
  }
  const pool = events[phase] || [{ lv: 'info', msg: '…' }]
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── 判定步骤日志生成 ──────────────────────────────────────────────

export function generateStepLogs(stepK, judgeRes, device) {
  const ts = tsNow()
  const t = DEV_TYPE_MAP[device.typeK]?.label || '未知'
  const logs = []

  switch (stepK) {
    case 'load':
      logs.push({ ts, lv: 'info', msg: `加载规则库 v1.3 · 共 #435 条规则` })
      logs.push({ ts, lv: 'info', msg: `目标设备：${device.name || '未命名'} · 型号 ${device.model || '—'}` })
      break

    case 'type1':
      logs.push({ ts, lv: 'info', msg: `一级类型识别 → ${t} (${device.typeK})` })
      logs.push({ ts, lv: 'ok',   msg: `✓ 在规则库中匹配到 ${countRulesByType(device.typeK)} 条同类规则` })
      break

    case 'type2':
      logs.push({ ts, lv: 'info', msg: `二级类型："${device.type2 || '—'}" → 检索匹配规则` })
      break

    case 'model': {
      logs.push({ ts, lv: 'info', msg: `型号系列匹配：扫描型号前缀 "${device.model || '—'}"` })
      const hitModels = judgeRes.hits.map(h => h.modelHit).filter(Boolean)
      if (hitModels.length > 0) {
        const uniqs = [...new Set(hitModels)]
        for (const p of uniqs) {
          logs.push({ ts, lv: 'ok', msg: `✓ 命中型号系列 "${p}*"` })
        }
      } else {
        logs.push({ ts, lv: 'info', msg: `未命中淘汰目录中的型号系列` })
      }
      break
    }

    case 'spec':
      if (judgeRes.hits.length === 0) {
        logs.push({ ts, lv: 'info', msg: `无型号匹配，跳过规格区间校验` })
      } else {
        for (const h of judgeRes.hits.slice(0, 2)) {
          const specCheck = h.checks.find(c => c.step === '规格区间')
          if (specCheck && specCheck.conditions && specCheck.conditions.length > 0) {
            for (const c of specCheck.conditions) {
              const m = `${c.key}: ${c.actual}${c.unit || ''} ∈ [${c.min}, ${c.max}]${c.unit || ''}`
              logs.push({ ts, lv: 'ok', msg: `✓ ${h.rule.ruleId} ${m}` })
            }
          } else {
            logs.push({ ts, lv: 'info', msg: `${h.rule.ruleId} 无规格区间约束` })
          }
        }
      }
      break

    case 'year':
      if (judgeRes.hits.length === 0) {
        logs.push({ ts, lv: 'info', msg: `无候选规则，跳过年份校验` })
      } else {
        for (const h of judgeRes.hits.slice(0, 2)) {
          const yc = h.checks.find(c => c.step === '投运年份')
          if (yc && yc.expect !== '(无约束)') {
            logs.push({ ts, lv: 'ok', msg: `✓ ${h.rule.ruleId} 投运年份 ${yc.actual} 满足约束 ${yc.expect}` })
          }
        }
      }
      break

    case 'final':
      if (judgeRes.hits.length === 0) {
        logs.push({ ts, lv: 'ok', msg: `━━━━━━━━━━━━━━━━━━━━━━━━━━` })
        logs.push({ ts, lv: 'ok', msg: `综合判定：未命中任何淘汰规则 → 状态 #正常` })
      } else {
        logs.push({ ts, lv: 'warn', msg: `━━━━━━━━━━━━━━━━━━━━━━━━━━` })
        logs.push({ ts, lv: 'warn', msg: `综合判定：命中 ${judgeRes.hits.length} 条规则` })
        const meta = JUDGE_STATUS_MAP[judgeRes.status]
        const lv = judgeRes.status === 'low_eff' ? 'warn' : 'err'
        logs.push({ ts, lv, msg: `▸ 最终状态 → #${meta.label}（${meta.desc}）` })
      }
      break
  }
  return logs
}

// ── 日志文本 token 化（替代 React JSX renderXxx）────────────────
// 返回 token 数组，每项 { type: 'text'|'ent'|'cyan'|'yellow'|'pink', value }
// Vue 组件使用 v-for 渲染，用 span 着色

export function tokenizeJudgeLog(s) {
  const parts = s.split(/(#[\u4e00-\u9fa5A-Za-z0-9_]+|"[^"]+"|\bGB[/\d-]+\b|\bB\d-[\d\-A-Z]+\b)/g)
  return parts.map(p => {
    if (/^#/.test(p))   return { type: 'ent',    value: p }
    if (/^"/.test(p))   return { type: 'cyan',   value: p }
    if (/^GB/.test(p))  return { type: 'yellow', value: p }
    if (/^B\d/.test(p)) return { type: 'pink',   value: p }
    return { type: 'text', value: p }
  })
}

export function tokenizeDocLog(s) {
  const parts = s.split(/(#[\u4e00-\u9fa5A-Za-z0-9_]+|"[^"]+"|\bGB[/\d-]+\b)/g)
  return parts.map(p => {
    if (/^#/.test(p))  return { type: 'ent',    value: p }
    if (/^"/.test(p))  return { type: 'cyan',   value: p }
    if (/^GB/.test(p)) return { type: 'yellow', value: p }
    return { type: 'text', value: p }
  })
}

// ── 规则条件格式化 / 解析 ─────────────────────────────────────────

export function formatConditions(conditions) {
  if (!conditions || conditions.length === 0) return ''
  return conditions.map(c => `${c.key} ${c.unit || ''} ${c.min} ${c.max}`.trim()).join('\n')
}

export function parseConditions(text) {
  if (!text || !text.trim()) return []
  return text.trim().split('\n').map(line => {
    const parts = line.trim().split(/\s+/)
    if (parts.length === 4) {
      return { key: parts[0], unit: parts[1], min: parseFloat(parts[2]), max: parseFloat(parts[3]) }
    } else if (parts.length === 3) {
      return { key: parts[0], unit: '', min: parseFloat(parts[1]), max: parseFloat(parts[2]) }
    }
    return null
  }).filter(Boolean)
}

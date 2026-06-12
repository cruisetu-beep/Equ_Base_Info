// ── utils/judgeEngine.js ───────────────────────────────────────────
// 判定引擎：原 judgeDevice / parseDeviceParam 原样迁入
// 输入：device 对象, rules 列表
// 输出：{ device, hits: [{rule, checks, modelHit}], status }
//   status 枚举：
//     "phaseout-mandatory"  强制淘汰（命中至少一条强制规则）
//     "phaseout-deadline"   限期淘汰（命中至少一条限期规则）
//     "low_eff"             低效（命中鼓励类规则）
//     "normal"              未命中任何规则

import { RULES_LIB_INIT } from '@/data/rules'

export function judgeDevice(device, rules) {
  const hits = []
  const enabledRules = rules.filter(r => r.enabled !== false)

  for (const rule of enabledRules) {
    const checks = []
    let pass = true

    // 1. 一级类型匹配
    const c1 = device.typeK === rule.typeK
    checks.push({ step: '一级类型', expect: rule.typeK, actual: device.typeK, ok: c1 })
    if (!c1) { pass = false; continue }

    // 2. 二级类型 / 产品名关键字匹配（容差：含子串即可）
    let c2 = true
    if (rule.subType) {
      const t2 = (device.type2 || '').trim()
      const sub = rule.subType
      c2 = !!(t2 && (sub.includes(t2.slice(0, 3)) || t2.includes(sub.slice(0, 3)) || t2 === sub))
    }
    checks.push({ step: '二级类型', expect: rule.subType, actual: device.type2, ok: c2 })
    if (!c2) { pass = false; continue }

    // 3. 型号系列匹配
    let c3 = false
    let modelHit = null
    if (rule.modelPattern && rule.modelPattern.length) {
      const m = (device.model || '').toUpperCase()
      for (const pat of rule.modelPattern) {
        if (m.startsWith(pat.toUpperCase())) {
          c3 = true; modelHit = pat; break
        }
      }
    } else {
      c3 = true
    }
    checks.push({ step: '型号系列', expect: rule.modelPattern?.join(' / ') || '(任意)', actual: device.model, ok: c3, hit: modelHit })
    if (!c3) { pass = false; continue }

    // 4. 规格区间校验
    let c4 = true
    const condResults = []
    if (rule.conditions && rule.conditions.length) {
      for (const cond of rule.conditions) {
        const v = parseDeviceParam(device, cond.key)
        if (v === null) {
          c4 = false
          condResults.push({ ...cond, actual: '未知', ok: false })
          break
        }
        const ok = v >= cond.min && v <= cond.max
        condResults.push({ ...cond, actual: v, ok })
        if (!ok) c4 = false
      }
    }
    checks.push({ step: '规格区间', conditions: condResults, ok: c4 })
    if (!c4) { pass = false; continue }

    // 5. 年份约束
    let c5 = true
    if (rule.yearOp) {
      const y = parseInt(device.year)
      const match = rule.yearOp.match(/^(<=|>=|<|>)(\d{4})$/)
      if (match) {
        const [, op, ystr] = match
        const yr = parseInt(ystr)
        if (op === '<=') c5 = y <= yr
        if (op === '<')  c5 = y <  yr
        if (op === '>=') c5 = y >= yr
        if (op === '>')  c5 = y >  yr
      }
    }
    checks.push({ step: '投运年份', expect: rule.yearOp || '(无约束)', actual: device.year, ok: c5 })
    if (!c5) { pass = false; continue }

    if (pass) {
      hits.push({ rule, checks, modelHit })
    }
  }

  // 判定汇总
  let status = 'normal'
  if (hits.some(h => h.rule.actionType === '强制'))      status = 'phaseout-mandatory'
  else if (hits.some(h => h.rule.actionType === '限期')) status = 'phaseout-deadline'
  else if (hits.some(h => h.rule.actionType === '鼓励')) status = 'low_eff'

  return { device, hits, status }
}

// 解析设备参数，提取数值（容差匹配 key）
export function parseDeviceParam(device, key) {
  const params = device.params || {}
  let raw = null
  for (const [k, v] of Object.entries(params)) {
    if (k.includes(key) || key.includes(k)) { raw = v; break }
  }
  if (raw === null) return null
  const m = String(raw).match(/(\d+\.?\d*)/)
  return m ? parseFloat(m[1]) : null
}

// 统计某类型下启用规则数
export function countRulesByType(typeK) {
  return RULES_LIB_INIT.filter(r => r.typeK === typeK && r.enabled !== false).length
}

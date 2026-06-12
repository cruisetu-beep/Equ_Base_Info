// ── data/rules.js ──────────────────────────────────────────────────
// 原 Info_base_2.html 中规则库相关静态数据，原样提取

export const BATCH_COLORS = {
  "第一批": { bg: "#4dc9ff", year: "2009" },
  "第二批": { bg: "#a799ff", year: "2012" },
  "第三批": { bg: "#ff8a47", year: "2014" },
  "第四批": { bg: "#e0394f", year: "2016" },
}

export const ACTION_COLORS = {
  "强制": { color: "var(--eol-red)",      bg: "rgba(224,57,79,0.10)",   border: "rgba(224,57,79,0.30)" },
  "限期": { color: "var(--eol-deadline)", bg: "rgba(240,78,105,0.10)",  border: "rgba(240,78,105,0.30)" },
  "鼓励": { color: "var(--eol-encourage)", bg: "rgba(199,154,28,0.12)", border: "rgba(199,154,28,0.30)" },
}

export const JUDGE_STATUS_MAP = {
  "normal":             { label: "正常运行", icon: "check",    cls: "normal",   color: "var(--ok)",           desc: "未命中任何淘汰规则" },
  "low_eff":            { label: "低效",     icon: "warn",     cls: "low_eff",  color: "var(--eol-low)",      desc: "建议改造或更换" },
  "phaseout-deadline":  { label: "限期淘汰", icon: "calendar", cls: "phaseout", color: "var(--eol-deadline)", desc: "必须在截止日期前淘汰" },
  "phaseout-mandatory": { label: "强制淘汰", icon: "ban",      cls: "phaseout", color: "var(--eol-red)",      desc: "立即停用并替换" },
}

// 30 条核心规则，覆盖 v1.3 全四批
export const RULES_LIB_INIT = [
  // ─── 第一批（2009）电动机·风机·锅炉 ─────
  {
    ruleId: "B1-1-1", batch: "第一批", typeK: "motor", subType: "中小型三相异步电动机",
    product: "小型异步电动机 J03/J02 系列", modelPattern: ["J02", "J03"],
    conditions: [], yearOp: null,
    actionType: "强制", deadline: "2009-12-31",
    reason: "效率低，温升高，过载能力小。",
    standard: "GB 18613-2002", confidence: 0.98,
    advice: "建议更换为 IE3 及以上能效等级电动机（YE3 系列）", enabled: true,
  },
  {
    ruleId: "B1-2-1", batch: "第一批", typeK: "fan", subType: "通风机",
    product: "4-72-No.16D / 4-72-No.20D 离心通风机", modelPattern: ["4-72"],
    conditions: [
      { key: "流量", unit: "m³/h", min: 5000, max: 80000 },
    ], yearOp: null,
    actionType: "限期", deadline: "2010-12-31",
    reason: "老型号离心通风机比转速低、效率低。",
    standard: "GB 19761-2009", confidence: 0.92,
    advice: "建议更换为高效轴流或离心通风机（如 4-79、9-19 系列）", enabled: true,
  },
  {
    ruleId: "B1-4-X", batch: "第一批", typeK: "boiler", subType: "立式水管锅炉",
    product: "立式水管燃油燃气锅炉", modelPattern: ["LSS", "LSG"],
    conditions: [
      { key: "蒸发量", unit: "t/h", min: 0.5, max: 4 },
    ], yearOp: null,
    actionType: "强制", deadline: "2009-12-31",
    reason: "立式水管锅炉热效率低、占地大、运行经济性差。",
    standard: "GB 24500-2009", confidence: 0.88,
    advice: "建议更换为卧式三回程冷凝燃气锅炉（热效率 ≥95%）", enabled: true,
  },

  // ─── 第二批（2012）变压器·泵·焊机·压缩机 ─────
  {
    ruleId: "B2-1-1", batch: "第二批", typeK: "transformer", subType: "油浸式配电变压器",
    product: "S7 系列 油浸式配电变压器", modelPattern: ["S7"],
    conditions: [
      { key: "容量", unit: "kVA", min: 30, max: 1600 },
    ], yearOp: null,
    actionType: "强制", deadline: "2012-12-31",
    reason: "S7 系列变压器空载损耗、负载损耗均超过现行标准限值。",
    standard: "GB 20052-2013", confidence: 0.99,
    advice: "建议更换为 SCB13 干式变压器或 S13 / S15 油浸变压器", enabled: true,
  },
  {
    ruleId: "B2-2-1", batch: "第二批", typeK: "pump", subType: "单级单吸离心泵",
    product: "IS 系列（旧型号）单级单吸离心泵", modelPattern: ["IS"],
    conditions: [
      { key: "流量", unit: "m³/h", min: 6.3, max: 400 },
      { key: "扬程", unit: "m",    min: 5,   max: 125 },
    ], yearOp: "<=2008",
    actionType: "限期", deadline: "2014-12-31",
    reason: "水泵效率低于 GB 19762-2007 一级能效限值。",
    standard: "GB 19762-2007", confidence: 0.91,
    advice: "建议更换为 ISG / IRG 系列高效离心泵或选配变频控制", enabled: true,
  },
  {
    ruleId: "B2-3-1", batch: "第二批", typeK: "compressor", subType: "螺杆压缩机",
    product: "早期 LG 系列 螺杆式空气压缩机", modelPattern: ["LG"],
    conditions: [
      { key: "功率", unit: "kW", min: 30, max: 250 },
    ], yearOp: "<=2010",
    actionType: "限期", deadline: "2014-12-31",
    reason: "机组效率（COP）低于 GB 19577 一级能效限值。",
    standard: "GB 19577-2015", confidence: 0.86,
    advice: "建议更换为永磁变频螺杆压缩机（COP ≥ 5.0）", enabled: true,
  },

  // ─── 第三批（2014）核心规则 ─────
  {
    ruleId: "B3-1-1", batch: "第三批", typeK: "motor", subType: "中小型三相异步电动机",
    product: "Y 系列 普通中小型三相异步电动机", modelPattern: ["Y"],
    conditions: [
      { key: "功率", unit: "kW", min: 0.55, max: 315 },
    ], yearOp: null,
    actionType: "强制", deadline: "2014-03-31",
    reason: "不符合 GB 18613-2012《中小型三相异步电动机能效限定值及能效等级》能效限定值要求。",
    standard: "GB 18613-2012", confidence: 0.99,
    advice: "建议更换为 YE3 / YE4 高效电动机（IE3 / IE4 能效等级）", enabled: true,
  },
  {
    ruleId: "B3-1-2", batch: "第三批", typeK: "motor", subType: "中小型三相异步电动机",
    product: "Y2 系列 中小型三相异步电动机", modelPattern: ["Y2"],
    conditions: [
      { key: "功率", unit: "kW", min: 0.55, max: 315 },
    ], yearOp: "<=2003",
    actionType: "限期", deadline: "2015-12-31",
    reason: "不符合 GB 18613-2012 能效限定值要求，2003 年（含）前生产，限期至 2015-12-31。",
    standard: "GB 18613-2012", confidence: 0.97,
    advice: "建议更换为 YE3 / YE4 高效电动机", enabled: true,
  },
  {
    ruleId: "B3-1-3", batch: "第三批", typeK: "motor", subType: "中小型三相异步电动机",
    product: "Y3 系列 中小型三相异步电动机", modelPattern: ["Y3"],
    conditions: [
      { key: "功率", unit: "kW", min: 0.55, max: 315 },
    ], yearOp: "<=2003",
    actionType: "限期", deadline: "2015-12-31",
    reason: "不符合 GB 18613-2012 能效限定值要求。",
    standard: "GB 18613-2012", confidence: 0.96,
    advice: "建议更换为 YE3 / YE4 高效电动机", enabled: true,
  },
  {
    ruleId: "B3-1-4", batch: "第三批", typeK: "motor", subType: "中小型三相异步电动机",
    product: "YB 系列 隔爆型中小型三相异步电动机", modelPattern: ["YB"],
    conditions: [
      { key: "功率", unit: "kW", min: 0.55, max: 315 },
    ], yearOp: null,
    actionType: "强制", deadline: "2014-03-31",
    reason: "不符合 GB 18613-2012 能效限定值要求。",
    standard: "GB 18613-2012", confidence: 0.97,
    advice: "建议更换为 YBX3 / YBX4 高效隔爆电动机", enabled: true,
  },
  {
    ruleId: "B3-2-5-A", batch: "第三批", typeK: "fan", subType: "锅炉通风机",
    product: "9-35 系列 锅炉通风机（≤2005 年生产）", modelPattern: ["9-35"],
    conditions: [
      { key: "流量", unit: "m³/h", min: 3710,  max: 190300 },
      { key: "全压", unit: "kPa",  min: 0.833, max: 5.599 },
    ], yearOp: "<=2005",
    actionType: "强制", deadline: "2014-03-31",
    reason: "不符合 GB 19761-2009《通风机能效限定值及能效等级》要求；技术水平落后、结构老化。",
    standard: "GB 19761-2009", confidence: 0.95,
    advice: "建议更换为 G4-73、Y4-73 等新型高效锅炉通风机", enabled: true,
  },
  {
    ruleId: "B3-2-6-A", batch: "第三批", typeK: "fan", subType: "锅炉引风机",
    product: "Y9-35 系列 锅炉引风机（≤2005 年生产）", modelPattern: ["Y9-35"],
    conditions: [
      { key: "流量", unit: "m³/h", min: 5810,  max: 473000 },
      { key: "全压", unit: "kPa",  min: 0.539, max: 4.12 },
    ], yearOp: "<=2005",
    actionType: "强制", deadline: "2014-03-31",
    reason: "不符合 GB 19761-2009 能效限定值要求；2005 年（含）前生产，立即淘汰。",
    standard: "GB 19761-2009", confidence: 0.97,
    advice: "建议更换为 Y4-73、Y4-2x73 高效锅炉引风机", enabled: true,
  },
  {
    ruleId: "B3-2-6-B", batch: "第三批", typeK: "fan", subType: "锅炉引风机",
    product: "Y9-35 系列 锅炉引风机（>2005 年生产）", modelPattern: ["Y9-35"],
    conditions: [
      { key: "流量", unit: "m³/h", min: 5810,  max: 473000 },
      { key: "全压", unit: "kPa",  min: 0.539, max: 4.12 },
    ], yearOp: ">2005",
    actionType: "限期", deadline: "2015-12-31",
    reason: "不符合 GB 19761-2009 能效限定值要求；2005 年以后生产，最迟 2015-12-31 淘汰。",
    standard: "GB 19761-2009", confidence: 0.95,
    advice: "建议更换为高效锅炉引风机", enabled: true,
  },
  {
    ruleId: "B3-3-1", batch: "第三批", typeK: "pump", subType: "清水离心泵",
    product: "低能效等级清水离心泵", modelPattern: ["IS", "ISR", "IRG"],
    conditions: [
      { key: "流量", unit: "m³/h", min: 6.3, max: 400 },
      { key: "扬程", unit: "m",    min: 5,   max: 125 },
    ], yearOp: "<=2010",
    actionType: "限期", deadline: "2015-12-31",
    reason: "实测效率低于 GB 19762-2007 一级能效限值（74%）。",
    standard: "GB 19762-2007", confidence: 0.88,
    advice: "建议改造为变频泵或更换为 ISG / IRG 高效离心泵", enabled: true,
  },

  // ─── 第四批（2016）─────
  {
    ruleId: "B4-1-2-A", batch: "第四批", typeK: "transformer", subType: "油浸式无励磁调压变压器",
    product: "S9 系列 油浸式无励磁调压配电变压器", modelPattern: ["S9"],
    conditions: [
      { key: "容量", unit: "kVA", min: 30, max: 2500 },
    ], yearOp: null,
    actionType: "限期", deadline: "2017-12-31",
    reason: "不符合 GB 20052-2013 节能评价值要求；空载损耗超标。",
    standard: "GB 20052-2013", confidence: 0.95,
    advice: "建议更换为 S13 / S15 系列低损耗油浸变压器或 SCB13 干式变压器", enabled: true,
  },
  {
    ruleId: "B4-1-2-B", batch: "第四批", typeK: "transformer", subType: "油浸式无励磁调压变压器",
    product: "S10 系列 油浸式无励磁调压配电变压器", modelPattern: ["S10"],
    conditions: [
      { key: "容量", unit: "kVA", min: 30, max: 2500 },
    ], yearOp: null,
    actionType: "鼓励", deadline: "2020-12-31",
    reason: "建议替换为更高能效等级（S13 及以上）变压器。",
    standard: "GB 20052-2013", confidence: 0.85,
    advice: "鼓励更换为 S13 / S15 高效配电变压器", enabled: true,
  },
  {
    ruleId: "B4-2-1", batch: "第四批", typeK: "compressor", subType: "螺杆式制冷压缩机",
    product: "低能效螺杆式冷水机组", modelPattern: ["LG", "LSBLG"],
    conditions: [
      { key: "功率", unit: "kW", min: 50, max: 1500 },
    ], yearOp: "<=2010",
    actionType: "限期", deadline: "2018-12-31",
    reason: "COP 实测值低于 GB 19577-2015 一级能效限值。",
    standard: "GB 19577-2015", confidence: 0.86,
    advice: "建议更换为磁悬浮离心机组或永磁变频螺杆机组（COP ≥ 6.0）", enabled: true,
  },
  {
    ruleId: "B4-3-3", batch: "第四批", typeK: "welder", subType: "抽头式整流弧焊机",
    product: "ZX5 系列 抽头式整流弧焊机", modelPattern: ["ZX5"],
    conditions: [
      { key: "额定电流", unit: "A", min: 200, max: 630 },
    ], yearOp: null,
    actionType: "限期", deadline: "2017-12-31",
    reason: "功率因数低、空载损耗大；不符合 GB 15579 焊接电源能效要求。",
    standard: "GB 15579-2013", confidence: 0.93,
    advice: "建议更换为 IGBT 逆变焊机（如 ZX7 系列）", enabled: true,
  },
  {
    ruleId: "B4-3-1", batch: "第四批", typeK: "welder", subType: "硅整流弧焊机",
    product: "ZXG 系列 硅整流弧焊机", modelPattern: ["ZXG"],
    conditions: [
      { key: "额定电流", unit: "A", min: 200, max: 1000 },
    ], yearOp: null,
    actionType: "强制", deadline: "2016-12-31",
    reason: "硅整流焊机效率低、噪声大；现行行业明确淘汰。",
    standard: "GB 15579-2013", confidence: 0.95,
    advice: "建议更换为逆变焊机（如 ZX7 系列）", enabled: true,
  },
  {
    ruleId: "B4-1-3", batch: "第四批", typeK: "motor", subType: "中小型三相异步电动机",
    product: "YX3 系列（IE2）中小型三相异步电动机", modelPattern: ["YX3"],
    conditions: [
      { key: "功率", unit: "kW", min: 0.55, max: 375 },
    ], yearOp: null,
    actionType: "鼓励", deadline: "2025-12-31",
    reason: "YX3 (IE2) 仅满足现行 GB 18613-2020 二级能效，鼓励替换为 IE3+。",
    standard: "GB 18613-2020", confidence: 0.78,
    advice: "建议更换为 YE3 / YE4 高效电动机（IE3+）", enabled: true,
  },
  {
    ruleId: "B4-2-2", batch: "第四批", typeK: "chiller", subType: "制冷空调产品",
    product: "低能效螺杆式冷水机组（COP < 5.0）", modelPattern: ["LSBLG", "LG"],
    conditions: [
      { key: "制冷量", unit: "kW", min: 1000, max: 5000 },
    ], yearOp: "<=2014",
    actionType: "鼓励", deadline: "2025-12-31",
    reason: "COP 低于现行 GB 19577-2015 二级能效。",
    standard: "GB 19577-2015", confidence: 0.74,
    advice: "建议更换为高效磁悬浮 / 永磁变频机组", enabled: true,
  },
  {
    ruleId: "B4-4-1", batch: "第四批", typeK: "boiler", subType: "工业锅炉",
    product: "早期燃煤工业锅炉", modelPattern: ["DZL", "SZL", "SHL"],
    conditions: [
      { key: "蒸发量", unit: "t/h", min: 1, max: 30 },
    ], yearOp: "<=2005",
    actionType: "强制", deadline: "2017-12-31",
    reason: "燃煤工业锅炉热效率低于 GB 24500-2009 限值要求。",
    standard: "GB 24500-2009", confidence: 0.92,
    advice: "建议更换为冷凝式燃气锅炉或电锅炉", enabled: true,
  },
  {
    ruleId: "B4-3-2", batch: "第四批", typeK: "welder", subType: "硅整流多用焊机",
    product: "ZX5 系列 多用电焊机", modelPattern: ["ZX5"],
    conditions: [
      { key: "额定电流", unit: "A", min: 100, max: 200 },
    ], yearOp: null,
    actionType: "鼓励", deadline: "2020-12-31",
    reason: "小容量硅整流焊机能效偏低，鼓励替换为逆变焊机。",
    standard: "GB 15579-2013", confidence: 0.78,
    advice: "建议更换为 IGBT 逆变焊机", enabled: true,
  },
]

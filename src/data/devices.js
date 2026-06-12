// ── data/devices.js ────────────────────────────────────────────────
// 原 Info_base_2.html 中设备相关的静态数据层，原样提取

// 16 类一级设备类型（与 v1.3 规则库对齐）
export const DEV_TYPES = [
  { k: "motor",       label: "电动机",     icon: "motor",       color: "#4dc9ff" },
  { k: "fan",         label: "风机",       icon: "fan",         color: "#7ad6ff" },
  { k: "pump",        label: "泵",         icon: "pump",        color: "#2bd9a8" },
  { k: "transformer", label: "变压器",     icon: "transformer", color: "#a799ff" },
  { k: "boiler",      label: "工业锅炉",   icon: "boiler",      color: "#ff8a47" },
  { k: "compressor",  label: "压缩机",     icon: "compressor",  color: "#ffb547" },
  { k: "chiller",     label: "制冷设备",   icon: "sun",         color: "#7be9d4" },
  { k: "welder",      label: "电弧焊机",   icon: "bolt",        color: "#ff6b8a" },
  { k: "resistor",    label: "电阻炉",     icon: "factory",     color: "#ff8a47" },
  { k: "appliance",   label: "电器",       icon: "plug",        color: "#5bb8ff" },
  { k: "machine",     label: "机床",       icon: "cpu",         color: "#a799ff" },
  { k: "forge",       label: "锻压设备",   icon: "factory",     color: "#9c8bff" },
  { k: "heat",        label: "热处理设备", icon: "factory",     color: "#ff7d6a" },
  { k: "valve",       label: "阀",         icon: "chip",        color: "#7ad6ff" },
  { k: "diesel",      label: "柴油机",     icon: "factory",     color: "#9c8bff" },
  { k: "other",       label: "其他",       icon: "cube",        color: "#97a4c0" },
]

export const DEV_TYPE_MAP = Object.fromEntries(DEV_TYPES.map(d => [d.k, d]))

// 状态映射
export const STATUS_MAP = {
  normal:   { label: "正常",   cls: "ok",      color: "var(--ok)" },
  pending:  { label: "待判定", cls: "warn",     color: "var(--warn)" },
  low_eff:  { label: "低效",   cls: "eol-low",  color: "var(--eol-low)" },
  phaseout: { label: "淘汰",   cls: "eol-red",  color: "var(--eol-red)" },
}

// 12 台示例设备 — 覆盖 4 种判定状态（normal / pending / low_eff / phaseout）
export const SAMPLE_DEVICES = [
  {
    id: "D001", code: "DEV-MTR-2018-0042", name: "地下泵房 1# 给水泵电机",
    typeK: "motor", type2: "中小型三相异步电动机", model: "Y2-200L-4",
    params: { 功率: "30 kW", 电压: "380 V", 频率: "50 Hz", 防护: "IP54" },
    year: 2008, building: "浦东国际金融中心 T1",
    status: "phaseout", level: "限期淘汰", ruleHit: "B3-1-2",
    reason: "Y2 系列电动机能效不达 GB18613-2012，截止 2015-12-31 限期淘汰",
    updated: "2026-04-22 10:32",
  },
  {
    id: "D002", code: "DEV-FAN-2014-0118", name: "冷却塔 2# 锅炉引风机",
    typeK: "fan", type2: "锅炉引风机", model: "Y9-35-12",
    params: { 流量: "42500 m³/h", 全压: "2.8 kPa", 电机: "45 kW", 转速: "960 rpm" },
    year: 2011, building: "环球港购物中心",
    status: "phaseout", level: "强制淘汰", ruleHit: "B3-2-6-A",
    reason: "Y9-35 系列引风机能耗高，2014-03-31 强制淘汰",
    updated: "2026-04-18 15:10",
  },
  {
    id: "D003", code: "DEV-TRF-2009-0007", name: "变电站 1# 主变",
    typeK: "transformer", type2: "油浸式无励磁调压变压器", model: "S9-630/10",
    params: { 容量: "630 kVA", 电压: "10/0.4 kV", 接线: "Dyn11", 阻抗: "4.5%" },
    year: 2009, building: "东方医院新院区",
    status: "phaseout", level: "限期淘汰", ruleHit: "B4-1-2-A",
    reason: "S9 系列变压器空载损耗超 GB20052-2020 限值，限期至 2017-12-31",
    updated: "2026-04-25 09:20",
  },
  {
    id: "D004", code: "DEV-MTR-2020-0301", name: "屋面冷却塔风机电机",
    typeK: "motor", type2: "中小型三相异步电动机", model: "YE3-160M-4",
    params: { 功率: "11 kW", 电压: "380 V", 能效等级: "IE3", 频率: "50 Hz" },
    year: 2020, building: "漕河泾智慧园区 B 座",
    status: "normal", level: "正常运行", ruleHit: null,
    reason: "YE3 系列高效电动机，符合现行 GB18613 IE3 能效标准",
    updated: "2026-04-26 11:42",
  },
  {
    id: "D005", code: "DEV-PMP-2013-0055", name: "消防水泵房 3# 离心泵",
    typeK: "pump", type2: "单级单吸离心泵", model: "IS100-65-200",
    params: { 流量: "100 m³/h", 扬程: "50 m", 电机: "22 kW", 效率: "72%" },
    year: 2013, building: "静安希尔顿酒店",
    status: "low_eff", level: "低效（建议改造）", ruleHit: null,
    reason: "实测效率低于 GB19762 一级能效限值（74%），建议改造或更换",
    updated: "2026-04-15 14:08",
  },
  {
    id: "D006", code: "DEV-CMP-2010-0020", name: "制冷机房螺杆压缩机",
    typeK: "compressor", type2: "螺杆压缩机", model: "LG-30/8",
    params: { 排气量: "30 m³/min", 排气压力: "0.8 MPa", 功率: "160 kW" },
    year: 2010, building: "环球港购物中心",
    status: "low_eff", level: "低效（建议改造）", ruleHit: null,
    reason: "COP 实测 4.1，低于 GB19577 一级能效限值 4.6",
    updated: "2026-04-20 16:55",
  },
  {
    id: "D007", code: "DEV-TRF-2019-0103", name: "配电室 1# 干变",
    typeK: "transformer", type2: "干式变压器", model: "SCB10-1000/10",
    params: { 容量: "1000 kVA", 电压: "10/0.4 kV", 损耗等级: "二级", 噪声: "55 dB" },
    year: 2019, building: "漕河泾智慧园区 B 座",
    status: "normal", level: "正常运行", ruleHit: null,
    reason: "SCB10 干变损耗符合 GB20052-2020 二级能效",
    updated: "2026-04-26 09:30",
  },
  {
    id: "D008", code: "DEV-WLD-2012-0008", name: "机修间 2# 弧焊机",
    typeK: "welder", type2: "抽头式整流弧焊机", model: "ZX5-400",
    params: { 额定电流: "400 A", 输入电压: "380 V", 占空比: "60%" },
    year: 2012, building: "环球港购物中心",
    status: "phaseout", level: "限期淘汰", ruleHit: "B4-3-3",
    reason: "抽头式整流弧焊机 400A 档，2017-12-31 限期淘汰",
    updated: "2026-04-12 13:25",
  },
  {
    id: "D009", code: "DEV-FAN-2021-0244", name: "新风机房 5# 离心风机",
    typeK: "fan", type2: "通风机/鼓风机", model: "4-72-6A",
    params: { 流量: "18000 m³/h", 全压: "1.8 kPa", 电机: "15 kW" },
    year: 2021, building: "虹桥商务区南楼",
    status: "normal", level: "正常运行", ruleHit: null,
    reason: "在用通风机能效达标，未在淘汰目录范围内",
    updated: "2026-04-24 18:00",
  },
  {
    id: "D010", code: "DEV-CHL-2015-0017", name: "中央空调螺杆冷水机组",
    typeK: "chiller", type2: "制冷空调产品", model: "LSBLG800",
    params: { 制冷量: "2812 kW", 输入功率: "515 kW", COP: "5.46", 工质: "R134a" },
    year: 2015, building: "浦东国际金融中心 T1",
    status: "pending", level: "待判定", ruleHit: null,
    reason: "待运行能效检测数据采集后判定",
    updated: "2026-04-26 14:15",
  },
  {
    id: "D011", code: "DEV-MTR-2007-0012", name: "地下车库排烟风机电机",
    typeK: "motor", type2: "中小型三相异步电动机", model: "Y160L-4",
    params: { 功率: "15 kW", 电压: "380 V", 能效等级: "低于 IE1", 频率: "50 Hz" },
    year: 2007, building: "东方医院新院区",
    status: "phaseout", level: "强制淘汰", ruleHit: "B3-1-1",
    reason: "Y 系列普通电动机，2014-03-31 已强制淘汰",
    updated: "2026-03-30 10:18",
  },
  {
    id: "D012", code: "DEV-BLR-2008-0003", name: "蒸汽锅炉房 1# 燃气锅炉",
    typeK: "boiler", type2: "立式水管燃油燃气锅炉", model: "LSS2-1.0-Y/Q",
    params: { 蒸发量: "2 t/h", 工作压力: "1.0 MPa", 热效率: "88%", 燃料: "天然气" },
    year: 2008, building: "静安希尔顿酒店",
    status: "phaseout", level: "强制淘汰", ruleHit: "B1-4-X",
    reason: "立式水管锅炉热效率低，2009 年第一批已列入强制淘汰",
    updated: "2026-04-08 11:20",
  },
]

// 铭牌 OCR 演示预设结果
export const OCR_PRESET = {
  type1: "motor",
  type1Label: "电动机",
  type2: "中小型三相异步电动机",
  model: "Y2-180M-4",
  manufacturer: "上海电机厂",
  serial_no: "SH-2008-04572",
  year: "2008",
  params: [
    { k: "额定功率", v: "22 kW",      conf: 0.98 },
    { k: "额定电压", v: "380 V",      conf: 0.97 },
    { k: "额定频率", v: "50 Hz",      conf: 0.99 },
    { k: "额定转速", v: "1470 r/min", conf: 0.94 },
    { k: "防护等级", v: "IP54",       conf: 0.96 },
    { k: "绝缘等级", v: "F",          conf: 0.95 },
  ],
  fields: [
    { label: "型号", value: "Y2-180M-4",     x: 14, y: 18, w: 38, h: 11, key: "model" },
    { label: "编号", value: "SH-2008-04572", x: 55, y: 18, w: 34, h: 11, key: "serial" },
    { label: "功率", value: "22 kW",         x: 14, y: 36, w: 30, h: 11, key: "power" },
    { label: "电压", value: "380 V",         x: 46, y: 36, w: 22, h: 11, key: "volt" },
    { label: "频率", value: "50 Hz",         x: 70, y: 36, w: 18, h: 11, key: "freq" },
    { label: "转速", value: "1470 r/min",    x: 14, y: 52, w: 34, h: 11, key: "rpm" },
    { label: "防护", value: "IP54",          x: 50, y: 52, w: 18, h: 11, key: "ip" },
    { label: "绝缘", value: "F",             x: 70, y: 52, w: 14, h: 11, key: "ins" },
    { label: "年份", value: "2008",          x: 14, y: 68, w: 24, h: 11, key: "year" },
  ],
}

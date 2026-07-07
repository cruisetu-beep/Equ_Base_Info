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
  { k: "chiller",     label: "制冷设备",   icon: "snowflake",   color: "#2cb9cb" },
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

export function parseTypeK(type2) {
  if (!type2) return "other"
  const name = type2.toLowerCase()
  
  if (name.includes("电机") || name.includes("电动机") || name.includes("马达")) {
    return "motor"
  }
  if (name.includes("风机") || name.includes("鼓风机") || name.includes("引风机") || name.includes("通风机") || name.includes("风幕") || name.includes("送风") || name.includes("排风")) {
    return "fan"
  }
  if (name.includes("泵") || name.includes("水泵") || name.includes("油泵") || name.includes("潜水") || name.includes("排污") || name.includes("循环") || name.includes("给水") || name.includes("冷冻泵") || name.includes("采暖泵")) {
    return "pump"
  }
  if (name.includes("变压器") || name.includes("主变") || name.includes("配变") || name.includes("整流") || name.includes("互感")) {
    return "transformer"
  }
  if (name.includes("锅炉") || name.includes("蒸汽炉") || name.includes("热水炉") || name.includes("熔炉")) {
    return "boiler"
  }
  if (name.includes("压缩机") || name.includes("气泵") || name.includes("压风")) {
    return "compressor"
  }
  if (name.includes("冷") || name.includes("热泵") || name.includes("制冷") || name.includes("空调") || name.includes("冰柜") || name.includes("vrv") || name.includes("多联机") || name.includes("暖通") || name.includes("冷柜")) {
    return "chiller"
  }
  if (name.includes("焊") || name.includes("切割机") || name.includes("熔接")) {
    return "welder"
  }
  if (name.includes("电阻炉") || name.includes("电炉") || name.includes("加热炉") || name.includes("盐浴") || name.includes("烘箱") || name.includes("烘干")) {
    return "resistor"
  }
  if (name.includes("电器") || name.includes("开关") || name.includes("照明") || name.includes("插座") || name.includes("配电") || name.includes("充电桩")) {
    return "appliance"
  }
  if (name.includes("机床") || name.includes("车床") || name.includes("铣床") || name.includes("磨床") || name.includes("钻床") || name.includes("数控") || name.includes("切削") || name.includes("加工中心")) {
    return "machine"
  }
  if (name.includes("锻压") || name.includes("冲床") || name.includes("压力机") || name.includes("液压机") || name.includes("剪板") || name.includes("折弯")) {
    return "forge"
  }
  if (name.includes("热处理") || name.includes("淬火") || name.includes("退火") || name.includes("回火") || name.includes("渗碳")) {
    return "heat"
  }
  if (name.includes("阀") || name.includes("阀门")) {
    return "valve"
  }
  if (name.includes("柴油") || name.includes("发电机") || name.includes("内燃机") || name.includes("引擎") || name.includes("发动机")) {
    return "diesel"
  }
  
  return "other"
}

// 状态映射
export const STATUS_MAP = {
  normal:   { label: "正常",   cls: "ok",      color: "var(--ok)" },
  pending:  { label: "待判定", cls: "warn",     color: "var(--warn)" },
  low_eff:  { label: "低效",   cls: "eol-low",  color: "var(--eol-low)" },
  phaseout: { label: "淘汰",   cls: "eol-red",  color: "var(--eol-red)" },
}

// 12 台示例设备 — 覆盖 4 种判定状态（normal / pending / low_eff / phaseout）
// ── 生成今日15分钟粒度能耗数据（确定性，基于设备code） ──────────────
function genEnergyData(device) {
  const seed = device.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  // 根据设备类型设定基准功率（kW）
  const basePower = {
    motor: 22, fan: 37, pump: 18, transformer: 40, boiler: 120,
    compressor: 150, chiller: 500, welder: 25, resistor: 60,
    appliance: 8, machine: 15, forge: 80, heat: 45, valve: 3,
    diesel: 90, other: 20,
  }[device.typeK] || 20

  const slots = []
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const totalSlots = 96 // 24h × 4

  for (let i = 0; i < totalSlots; i++) {
    const t = new Date(todayStart.getTime() + i * 15 * 60 * 1000)
    const hh = t.getHours()
    // 负荷曲线：夜间低谷，白天高峰，用seed扰动
    const loadFactor =
      hh < 6 ? 0.2 + ((seed + i) % 10) * 0.01
      : hh < 9 ? 0.5 + ((seed + i) % 15) * 0.02
      : hh < 18 ? 0.7 + ((seed + i) % 20) * 0.015
      : hh < 22 ? 0.45 + ((seed + i) % 12) * 0.01
      : 0.25 + ((seed + i) % 8) * 0.01
    // kWh = kW × (15/60)h
    const kwh = parseFloat((basePower * loadFactor * 0.25).toFixed(3))
    slots.push({
      time: `${String(hh).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`,
      kwh,
    })
  }
  return slots
}

export const SAMPLE_DEVICES = [
  {
    id: "D001", code: "DEV-MTR-2018-0042", name: "地下泵房 1# 给水泵电机",
    typeK: "motor", type2: "中小型三相异步电动机", model: "Y2-200L-4",
    building: "浦东国际金融中心 T1",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "西门子" },
          { name: "设备数量", value: "1" },
          { name: "额定功率", value: "30 kW" },
          { name: "额定电压", value: "380 V" },
          { name: "额定频率", value: "50 Hz" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "防护等级", value: "IP54" },
          { name: "绝缘等级", value: "F" },
          { name: "额定转速", value: "1470 r/min" },
          { name: "能效等级", value: "IE1（未达标）" },
        ],
      },
    ],
    year: 2008,
    status: "phaseout", level: "限期淘汰", ruleHit: "B3-1-2",
    reason: "Y2 系列电动机能效不达 GB18613-2012，截止 2015-12-31 限期淘汰",
    updated: "2026-04-22 10:32",
  },
  {
    id: "D002", code: "DEV-FAN-2014-0118", name: "冷却塔 2# 锅炉引风机",
    typeK: "fan", type2: "锅炉引风机", model: "Y9-35-12",
    building: "环球港购物中心",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "上海鼓风机厂" },
          { name: "设备数量", value: "1" },
          { name: "额定流量", value: "42500 m³/h" },
          { name: "全压", value: "2.8 kPa" },
          { name: "配套电机功率", value: "45 kW" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "转速", value: "960 rpm" },
          { name: "风机效率", value: "71%" },
          { name: "噪声", value: "85 dB(A)" },
        ],
      },
    ],
    year: 2011,
    status: "phaseout", level: "强制淘汰", ruleHit: "B3-2-6-A",
    reason: "Y9-35 系列引风机能耗高，2014-03-31 强制淘汰",
    updated: "2026-04-18 15:10",
  },
  {
    id: "D003", code: "DEV-TRF-2009-0007", name: "变电站 1# 主变",
    typeK: "transformer", type2: "油浸式无励磁调压变压器", model: "S9-630/10",
    building: "东方医院新院区",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "特变电工" },
          { name: "额定容量", value: "630 kVA" },
          { name: "额定电压", value: "10/0.4 kV" },
          { name: "接线组别", value: "Dyn11" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "阻抗电压", value: "4.5%" },
          { name: "空载损耗", value: "1.3 kW" },
          { name: "负载损耗", value: "6.2 kW" },
          { name: "空载电流", value: "1.1%" },
          { name: "能效等级", value: "二级（超限）" },
        ],
      },
    ],
    year: 2009,
    status: "phaseout", level: "限期淘汰", ruleHit: "B4-1-2-A",
    reason: "S9 系列变压器空载损耗超 GB20052-2020 限值，限期至 2017-12-31",
    updated: "2026-04-25 09:20",
  },
  {
    id: "D004", code: "DEV-MTR-2020-0301", name: "屋面冷却塔风机电机",
    typeK: "motor", type2: "中小型三相异步电动机", model: "YE3-160M-4",
    building: "漕河泾智慧园区 B 座",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "卧龙电气" },
          { name: "设备数量", value: "2" },
          { name: "额定功率", value: "11 kW" },
          { name: "额定电压", value: "380 V" },
          { name: "额定频率", value: "50 Hz" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "能效等级", value: "IE3" },
          { name: "额定转速", value: "1460 r/min" },
          { name: "防护等级", value: "IP55" },
          { name: "绝缘等级", value: "F" },
        ],
      },
    ],
    year: 2020,
    status: "normal", level: "正常运行", ruleHit: null,
    reason: "YE3 系列高效电动机，符合现行 GB18613 IE3 能效标准",
    updated: "2026-04-26 11:42",
  },
  {
    id: "D005", code: "DEV-PMP-2013-0055", name: "消防水泵房 3# 离心泵",
    typeK: "pump", type2: "单级单吸离心泵", model: "IS100-65-200",
    building: "静安希尔顿酒店",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "凯泉泵业" },
          { name: "额定流量", value: "100 m³/h" },
          { name: "额定扬程", value: "50 m" },
          { name: "配套电机", value: "22 kW" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "额定效率", value: "72%" },
          { name: "能效限定值", value: "74%（GB19762）" },
          { name: "转速", value: "2900 rpm" },
          { name: "汽蚀余量", value: "3.0 m" },
        ],
      },
    ],
    year: 2013,
    status: "low_eff", level: "低效（建议改造）", ruleHit: null,
    reason: "实测效率低于 GB19762 一级能效限值（74%），建议改造或更换",
    updated: "2026-04-15 14:08",
  },
  {
    id: "D006", code: "DEV-CMP-2010-0020", name: "制冷机房螺杆压缩机",
    typeK: "compressor", type2: "螺杆压缩机", model: "LG-30/8",
    building: "环球港购物中心",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "复盛" },
          { name: "额定排气量", value: "30 m³/min" },
          { name: "额定排气压力", value: "0.8 MPa" },
          { name: "配套功率", value: "160 kW" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "实测 COP", value: "4.1" },
          { name: "标准限值", value: "4.6（GB19577 一级）" },
          { name: "比功率", value: "6.8 kW/(m³/min)" },
        ],
      },
    ],
    year: 2010,
    status: "low_eff", level: "低效（建议改造）", ruleHit: null,
    reason: "COP 实测 4.1，低于 GB19577 一级能效限值 4.6",
    updated: "2026-04-20 16:55",
  },
  {
    id: "D007", code: "DEV-TRF-2019-0103", name: "配电室 1# 干变",
    typeK: "transformer", type2: "干式变压器", model: "SCB10-1000/10",
    building: "漕河泾智慧园区 B 座",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "ABB" },
          { name: "额定容量", value: "1000 kVA" },
          { name: "额定电压", value: "10/0.4 kV" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "损耗等级", value: "二级" },
          { name: "空载损耗", value: "1.7 kW" },
          { name: "负载损耗", value: "9.0 kW" },
          { name: "噪声", value: "55 dB" },
        ],
      },
    ],
    year: 2019,
    status: "normal", level: "正常运行", ruleHit: null,
    reason: "SCB10 干变损耗符合 GB20052-2020 二级能效",
    updated: "2026-04-26 09:30",
  },
  {
    id: "D008", code: "DEV-WLD-2012-0008", name: "机修间 2# 弧焊机",
    typeK: "welder", type2: "抽头式整流弧焊机", model: "ZX5-400",
    building: "环球港购物中心",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "瑞凌" },
          { name: "额定电流", value: "400 A" },
          { name: "输入电压", value: "380 V" },
          { name: "空载电压", value: "70 V" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "暂载率", value: "60%" },
          { name: "功率因数", value: "0.65" },
          { name: "效率", value: "62%" },
        ],
      },
    ],
    year: 2012,
    status: "phaseout", level: "限期淘汰", ruleHit: "B4-3-3",
    reason: "抽头式整流弧焊机 400A 档，2017-12-31 限期淘汰",
    updated: "2026-04-12 13:25",
  },
  {
    id: "D009", code: "DEV-FAN-2021-0244", name: "新风机房 5# 离心风机",
    typeK: "fan", type2: "通风机/鼓风机", model: "4-72-6A",
    building: "虹桥商务区南楼",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "上海风机厂" },
          { name: "额定流量", value: "18000 m³/h" },
          { name: "全压", value: "1.8 kPa" },
          { name: "配套电机功率", value: "15 kW" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "风机效率", value: "83%" },
          { name: "转速", value: "1450 rpm" },
        ],
      },
    ],
    year: 2021,
    status: "normal", level: "正常运行", ruleHit: null,
    reason: "在用通风机能效达标，未在淘汰目录范围内",
    updated: "2026-04-24 18:00",
  },
  {
    id: "D010", code: "DEV-CHL-2015-0017", name: "中央空调螺杆冷水机组",
    typeK: "chiller", type2: "制冷空调产品", model: "LSBLG800",
    building: "浦东国际金融中心 T1",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "麦克维尔" },
          { name: "名义制冷量", value: "2812 kW" },
          { name: "额定制冷功率", value: "515 kW" },
          { name: "工质", value: "R134a" },
          { name: "设备数量", value: "1" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "名义 COP", value: "5.46" },
          { name: "实测 COP", value: "待检测" },
          { name: "IPLV", value: "待检测" },
          { name: "能效等级", value: "待判定" },
        ],
      },
    ],
    year: 2015,
    status: "pending", level: "待判定", ruleHit: null,
    reason: "待运行能效检测数据采集后判定",
    updated: "2026-04-26 14:15",
  },
  {
    id: "D011", code: "DEV-MTR-2007-0012", name: "地下车库排烟风机电机",
    typeK: "motor", type2: "中小型三相异步电动机", model: "Y160L-4",
    building: "东方医院新院区",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "上海电机厂" },
          { name: "额定功率", value: "15 kW" },
          { name: "额定电压", value: "380 V" },
          { name: "额定频率", value: "50 Hz" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "能效等级", value: "低于 IE1" },
          { name: "额定转速", value: "1460 r/min" },
          { name: "防护等级", value: "IP44" },
        ],
      },
    ],
    year: 2007,
    status: "phaseout", level: "强制淘汰", ruleHit: "B3-1-1",
    reason: "Y 系列普通电动机，2014-03-31 已强制淘汰",
    updated: "2026-03-30 10:18",
  },
  {
    id: "D012", code: "DEV-BLR-2008-0003", name: "蒸汽锅炉房 1# 燃气锅炉",
    typeK: "boiler", type2: "立式水管燃油燃气锅炉", model: "LSS2-1.0-Y/Q",
    building: "静安希尔顿酒店",
    paramGroups: [
      {
        group: "基本参数",
        items: [
          { name: "品牌", value: "无锡锅炉厂" },
          { name: "额定蒸发量", value: "2 t/h" },
          { name: "工作压力", value: "1.0 MPa" },
          { name: "燃料种类", value: "天然气" },
        ],
      },
      {
        group: "能效参数",
        items: [
          { name: "热效率", value: "88%" },
          { name: "排烟温度", value: "210 ℃" },
          { name: "过量空气系数", value: "1.25" },
        ],
      },
    ],
    year: 2008,
    status: "phaseout", level: "强制淘汰", ruleHit: "B1-4-X",
    reason: "立式水管锅炉热效率低，2009 年第一批已列入强制淘汰",
    updated: "2026-04-08 11:20",
  },
].map(d => ({ ...d, energyData: genEnergyData(d), buildingCode: `BLD-${d.code.split('-')[2] || '0000'}` }))

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

// ── 设备详情扩展字段（对应数据库设计 Attr37~48 新增属性）────────────
// 真实后端就绪后，这部分将由 T_ST_EquipmentAttributeValue 动态查询返回；
// 现阶段用确定性派生算法为每台 SAMPLE_DEVICES 生成一致的演示数据。

const MANUFACTURERS = {
  motor: "上海电机厂", fan: "上海鼓风机厂", pump: "南方泵业",
  transformer: "特变电工", boiler: "哈尔滨锅炉厂", compressor: "复盛实业",
  chiller: "约克空调", welder: "上海电焊机厂",
}

const SYSTEMS = {
  motor: "动力系统", fan: "通风系统", pump: "给排水系统",
  transformer: "配电系统", boiler: "热力系统", compressor: "制冷系统",
  chiller: "暖通空调系统", welder: "动力系统",
}

const DESIGN_LIFE_YEARS = {
  motor: 15, fan: 12, pump: 12, transformer: 25,
  boiler: 15, compressor: 15, chiller: 20, welder: 10,
}

/**
 * 根据设备基础信息派生出详情页所需的扩展属性。
 * @param {Object} device - SAMPLE_DEVICES 中的一条记录
 * @returns {Object} 扩展字段集合
 */
export function getDeviceDetailExt(device) {
  const designLife = DESIGN_LIFE_YEARS[device.typeK] || 15
  const serviceYears = Math.max(0, new Date().getFullYear() - device.year)
  const remainingLife = Math.max(0, designLife - serviceYears)

  // 用 code 的 hash 派生确定性的"随机"采购金额/日期，保证同一设备每次展示一致
  const seed = device.code.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const purchaseAmount = 3 + (seed % 40) * 0.8 // 万元

  return {
    manufacturer: MANUFACTURERS[device.typeK] || "未知厂商",
    serialNo: `${device.code}-SN${String(seed % 9000 + 1000)}`,
    manufactureDate: `${device.year}-${String((seed % 12) + 1).padStart(2, "0")}-15`,
    designLife,
    serviceYears,
    remainingLife,
    purchaseDate: `${device.year}-${String((seed % 12) + 1).padStart(2, "0")}-20`,
    purchaseAmount: purchaseAmount.toFixed(1),
    energyEfficiencyLevel: device.status === "normal" ? "一级" : device.status === "low_eff" ? "三级" : "未达标",
    meteringPointId: `MP-${device.code.slice(-8)}`,
    system: SYSTEMS[device.typeK] || "其他系统",
    location: device.building ? `${device.building} · 设备机房` : "—",
    priorityScore: device.status === "phaseout" ? 80 + (seed % 20) : device.status === "low_eff" ? 50 + (seed % 20) : 10 + (seed % 20),
    annualExcessEnergy: device.status === "phaseout" || device.status === "low_eff" ? (5 + (seed % 30)).toFixed(1) : "0.0",
    energyEfficiencyGap: device.status === "phaseout" || device.status === "low_eff" ? (8 + (seed % 25)).toFixed(1) : "0.0",
  }
}

// ── 建筑列表（含编号，用于录入下拉）────────────────────────────────
export const BUILDING_LIST = [
  { code: 'BLD-2018', name: '浦东国际金融中心 T1' },
  { code: 'BLD-2014', name: '环球港购物中心' },
  { code: 'BLD-2009', name: '东方医院新院区' },
  { code: 'BLD-2020', name: '漕河泾智慧园区 B 座' },
  { code: 'BLD-2013', name: '静安希尔顿酒店' },
  { code: 'BLD-2021', name: '虹桥商务区南楼' },
]

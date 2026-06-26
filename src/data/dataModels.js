// ── 数据模型 Mock 数据（按楼宇分组）────────────────────────────────
// 真实系统中由接口按楼宇ID返回，这里用楼宇名称作为 key 演示

export const DATA_MODELS_BY_BUILDING = {
  '浦东国际金融中心 T1': [
    {
      id: 'M-PDT1-01', name: '供配电系统',
      nodes: [
        { id: 'N01', label: '高压配电', children: [
          { id: 'N01-1', label: '1# 主变压器' },
          { id: 'N01-2', label: '2# 主变压器' },
        ]},
        { id: 'N02', label: '低压配电', children: [
          { id: 'N02-1', label: 'B1 层总配电柜' },
          { id: 'N02-2', label: '裙楼商业配电' },
        ]},
      ],
    },
    {
      id: 'M-PDT1-02', name: '暖通空调系统',
      nodes: [
        { id: 'N03', label: '冷冻机房', children: [
          { id: 'N03-1', label: '1# 螺杆冷水机组' },
          { id: 'N03-2', label: '2# 螺杆冷水机组' },
          { id: 'N03-3', label: '冷却水泵组' },
        ]},
        { id: 'N04', label: '新风系统', children: [
          { id: 'N04-1', label: '标准层新风机 AHU-01' },
          { id: 'N04-2', label: '标准层新风机 AHU-02' },
        ]},
      ],
    },
    {
      id: 'M-PDT1-03', name: '给排水系统',
      nodes: [
        { id: 'N05', label: '泵房', children: [
          { id: 'N05-1', label: '1# 给水泵电机' },
          { id: 'N05-2', label: '2# 给水泵电机' },
          { id: 'N05-3', label: '消防泵' },
        ]},
      ],
    },
    {
      id: 'M-PDT1-04', name: '照明系统',
      nodes: [
        { id: 'N06', label: '公共区域', children: [
          { id: 'N06-1', label: '大厅照明回路' },
          { id: 'N06-2', label: '地下车库照明' },
        ]},
      ],
    },
  ],
  '环球港购物中心': [
    {
      id: 'M-HGG-01', name: '商业用电系统',
      nodes: [
        { id: 'N10', label: '主力店', children: [
          { id: 'N10-1', label: 'B1 超市总表' },
          { id: 'N10-2', label: '餐饮区总表' },
        ]},
        { id: 'N11', label: '中庭区域', children: [
          { id: 'N11-1', label: '中庭扶梯用电' },
          { id: 'N11-2', label: '中庭照明' },
        ]},
      ],
    },
    {
      id: 'M-HGG-02', name: '暖通空调系统',
      nodes: [
        { id: 'N12', label: '制冷机房', children: [
          { id: 'N12-1', label: '1# 离心式冷水机' },
          { id: 'N12-2', label: '2# 螺杆压缩机' },
        ]},
        { id: 'N13', label: '冷却塔', children: [
          { id: 'N13-1', label: '1# 冷却塔风机' },
          { id: 'N13-2', label: '2# 冷却塔风机' },
        ]},
      ],
    },
    {
      id: 'M-HGG-03', name: '锅炉与热力系统',
      nodes: [
        { id: 'N14', label: '锅炉房', children: [
          { id: 'N14-1', label: '1# 燃气热水锅炉' },
          { id: 'N14-2', label: '2# 蒸汽锅炉' },
        ]},
      ],
    },
  ],
  '东方医院新院区': [
    {
      id: 'M-DFY-01', name: '医疗用电系统',
      nodes: [
        { id: 'N20', label: '手术楼', children: [
          { id: 'N20-1', label: '手术室 UPS 电源' },
          { id: 'N20-2', label: '净化空调机组' },
        ]},
        { id: 'N21', label: '门诊楼', children: [
          { id: 'N21-1', label: '门诊大厅照明' },
          { id: 'N21-2', label: '电梯群控系统' },
        ]},
      ],
    },
    {
      id: 'M-DFY-02', name: '变配电系统',
      nodes: [
        { id: 'N22', label: '10kV 开关站', children: [
          { id: 'N22-1', label: '1# 变压器（S9-630）' },
          { id: 'N22-2', label: '2# 变压器（S9-630）' },
        ]},
      ],
    },
    {
      id: 'M-DFY-03', name: '暖通系统',
      nodes: [
        { id: 'N23', label: '空调机房', children: [
          { id: 'N23-1', label: '排烟风机电机 B1' },
          { id: 'N23-2', label: '新风机组 F-01' },
        ]},
      ],
    },
  ],
  '漕河泾智慧园区 B 座': [
    {
      id: 'M-CHJ-01', name: '智慧能源系统',
      nodes: [
        { id: 'N30', label: '光伏系统', children: [
          { id: 'N30-1', label: '屋面光伏阵列 A' },
          { id: 'N30-2', label: '屋面光伏阵列 B' },
        ]},
        { id: 'N31', label: '储能系统', children: [
          { id: 'N31-1', label: '锂电池储能柜' },
        ]},
      ],
    },
    {
      id: 'M-CHJ-02', name: '暖通空调系统',
      nodes: [
        { id: 'N32', label: '屋面机房', children: [
          { id: 'N32-1', label: '冷却塔 1# 风机电机' },
          { id: 'N32-2', label: '冷却塔 2# 风机电机' },
        ]},
      ],
    },
    {
      id: 'M-CHJ-03', name: '变配电系统',
      nodes: [
        { id: 'N33', label: '地下配电室', children: [
          { id: 'N33-1', label: '1# 干式变压器（SCB10）' },
          { id: 'N33-2', label: '2# 干式变压器（SCB10）' },
        ]},
      ],
    },
  ],
  '静安希尔顿酒店': [
    {
      id: 'M-JAH-01', name: '酒店用电系统',
      nodes: [
        { id: 'N40', label: '客房楼层', children: [
          { id: 'N40-1', label: '标准层客房回路（3-15F）' },
          { id: 'N40-2', label: '行政楼层（16-20F）' },
        ]},
        { id: 'N41', label: '餐饮厨房', children: [
          { id: 'N41-1', label: '中餐厅厨房用电' },
          { id: 'N41-2', label: '全日制餐厅' },
        ]},
      ],
    },
    {
      id: 'M-JAH-02', name: '锅炉热力系统',
      nodes: [
        { id: 'N42', label: '锅炉房', children: [
          { id: 'N42-1', label: '1# 燃气锅炉（LSS2-1.0）' },
          { id: 'N42-2', label: '热水循环泵组' },
        ]},
      ],
    },
    {
      id: 'M-JAH-03', name: '给排水系统',
      nodes: [
        { id: 'N43', label: '消防水泵房', children: [
          { id: 'N43-1', label: '1# 消防离心泵' },
          { id: 'N43-2', label: '2# 消防离心泵' },
          { id: 'N43-3', label: '3# 消防离心泵（IS100）' },
        ]},
      ],
    },
  ],
  '虹桥商务区南楼': [
    {
      id: 'M-HQS-01', name: '办公用电系统',
      nodes: [
        { id: 'N50', label: '标准办公层', children: [
          { id: 'N50-1', label: '3-8F 办公用电' },
          { id: 'N50-2', label: '9-15F 办公用电' },
        ]},
      ],
    },
    {
      id: 'M-HQS-02', name: '暖通系统',
      nodes: [
        { id: 'N51', label: '新风机房', children: [
          { id: 'N51-1', label: '1# 离心风机（4-72-6A）' },
          { id: 'N51-2', label: '2# 离心风机' },
          { id: 'N51-3', label: '5# 新风机组' },
        ]},
      ],
    },
  ],
}

// 生成今日 15 分钟能耗数据（确定性，seed 基于节点ID）
export function genNodeEnergyData(nodeId) {
  const seed = nodeId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const basePower = 10 + (seed % 80)
  const slots = []
  for (let i = 0; i < 96; i++) {
    const h = Math.floor(i / 4)
    const loadFactor =
      h < 6  ? 0.2 + (seed + i) % 10 * 0.01
      : h < 9  ? 0.5 + (seed + i) % 15 * 0.02
      : h < 18 ? 0.7 + (seed + i) % 20 * 0.015
      : h < 22 ? 0.45 + (seed + i) % 12 * 0.01
      : 0.25 + (seed + i) % 8 * 0.01
    const m = (i % 4) * 15
    slots.push({
      time: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
      kwh: parseFloat((basePower * loadFactor * 0.25).toFixed(3)),
    })
  }
  return slots
}

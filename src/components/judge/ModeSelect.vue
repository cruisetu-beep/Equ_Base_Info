<script setup>
// ── components/judge/ModeSelect.vue ───────────────────────────────
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { SAMPLE_DEVICES } from '@/data/devices'
import { RULES_LIB_INIT } from '@/data/rules'
import { getEquipmentCount } from '@/api/devices'

defineEmits(['pick'])

const modes = ref([
  { k: 'existing', n: '从已录入设备选择', icon: 'list',   color: '#4dc9ff',
    d: '从设备总览中勾选若干台已录入设备发起判定，判定结果将刷新该设备的状态记录',
    stat: `已录入 ${SAMPLE_DEVICES.length} 台` },
  { k: 'quick',    n: '快速录入判定',     icon: 'edit',   color: '#a799ff',
    d: '无需正式入库，仅填写关键参数即可对单台设备进行临时判定',
    stat: '3 步即可完成' },
  { k: 'batch',    n: '批量导入判定',     icon: 'import', color: '#ff8a47',
    d: '上传 CSV / Excel 设备清单，对一批设备并行判定，导出结果报告',
    stat: '支持 CSV / Excel' },
])

const enabledCount = RULES_LIB_INIT.filter(r => r.enabled !== false).length

onMounted(async () => {
  try {
    const count = await getEquipmentCount()
    modes.value[0].stat = `已录入 ${count} 台`
  } catch (err) {
    console.error('获取设备总数失败:', err)
  }
})
</script>

<template>
  <div class="mode-select float-in">
    <div class="page-head">
      <div>
        <h1 class="page-title">
          <AppIcon name="zap" :size="24" stroke="var(--brand-2)" />
          低效淘汰判定
        </h1>
        <div class="page-subtitle">
          基于《高耗能落后机电设备（产品）淘汰目录》四批合并规则库（v1.3 · {{ enabledCount }} 条），AI
          引擎对设备进行多维度判定，给出淘汰类型、命中规则与改造建议。
        </div>
      </div>
    </div>

    <div class="judge-tip">
      <AppIcon name="info" :size="16" class="ic" />
      <div>
        <strong>判定依据</strong>：工信部《高耗能落后机电设备（产品）淘汰目录》第一至第四批 ·
        <strong> 判定模式</strong>：型号系列匹配 + 规格区间校验 + 投运年份判定 ·
        <strong> 判定结果</strong>：正常 / 低效 / 限期淘汰 / 强制淘汰 四级
      </div>
    </div>

    <div class="mode-grid">
      <div
        v-for="(m, i) in modes" :key="m.k"
        class="mode-card"
        :style="{ '--cl': m.color }"
        @click="$emit('pick', m.k)"
      >
        <div class="num">0{{ i + 1 }}</div>
        <div class="ic"><AppIcon :name="m.icon" :size="26" /></div>
        <div class="h">{{ m.n }}</div>
        <div class="d">{{ m.d }}</div>
        <div class="stat-pill">
          <AppIcon name="sparkles" :size="11" /> {{ m.stat }}
        </div>
        <div class="arrow"><AppIcon name="chevron-right" :size="16" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mode-select { display: flex; flex-direction: column; gap: 18px; }
.mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.mode-card {
  padding: 28px 24px; border-radius: 12px;
  background: white; border: 1px solid var(--line);
  cursor: pointer; transition: all 0.2s;
  position: relative; overflow: hidden;
  box-shadow: 0 1px 2px rgba(60,110,200,0.04);
}
.mode-card:hover {
  border-color: var(--cl);
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(77,201,255,0.12);
}
.mode-card::before {
  content: ""; position: absolute; right: -30px; top: -30px;
  width: 120px; height: 120px; border-radius: 50%;
  background: var(--cl); opacity: 0.08;
}
.mode-card .ic {
  width: 56px; height: 56px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(77,201,255,0.18), rgba(77,201,255,0.06));
  border: 1px solid rgba(77,201,255,0.30);
  display: grid; place-items: center; color: var(--cl);
  margin-bottom: 18px;
  box-shadow: 0 4px 12px rgba(77,201,255,0.15);
}
.mode-card .num {
  position: absolute; top: 18px; right: 22px;
  font-family: "Orbitron", sans-serif; font-size: 32px;
  font-weight: 700; color: var(--cl); opacity: 0.15;
  line-height: 1;
}
.mode-card .h { font-size: 17px; font-weight: 600; color: var(--text-0); margin-bottom: 8px; }
.mode-card .d { font-size: 12.5px; color: var(--text-2); line-height: 1.6; min-height: 60px; }
.mode-card .stat-pill {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 16px; padding: 6px 12px; font-size: 11px;
  background: rgba(77,201,255,0.08);
  border: 1px solid rgba(77,201,255,0.22);
  color: var(--cl); border-radius: 999px;
  font-family: "JetBrains Mono", monospace;
}
.mode-card .arrow {
  position: absolute; bottom: 22px; right: 22px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(77,201,255,0.10);
  color: var(--cl);
  display: grid; place-items: center;
  opacity: 0; transform: translateX(-6px);
  transition: all 0.2s;
}
.mode-card:hover .arrow { opacity: 1; transform: translateX(0); }

.judge-tip {
  padding: 14px 18px; border-radius: 10px;
  background: linear-gradient(90deg, rgba(47,127,255,0.06), rgba(122,92,255,0.04));
  border: 1px solid rgba(47,127,255,0.18);
  display: flex; align-items: center; gap: 12px;
  font-size: 12.5px; color: var(--text-1);
}
.judge-tip .ic { color: var(--brand); flex-shrink: 0; }
.judge-tip strong { color: var(--text-0); }
</style>

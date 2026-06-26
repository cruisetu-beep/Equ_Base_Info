<script setup>
// ── components/judge/JudgeView.vue ────────────────────────────────
// 状态机：select → from-existing/quick/batch → running → result
import { ref } from 'vue'
import ModeSelect   from './ModeSelect.vue'
import FromExisting from './FromExisting.vue'
import QuickEntry   from './QuickEntry.vue'
import BatchImport  from './BatchImport.vue'
import JudgeRunner  from './JudgeRunner.vue'
import JudgeResult  from './JudgeResult.vue'
import { RULES_LIB_INIT } from '@/data/rules'

// 使用启用状态的规则库副本
const rules = RULES_LIB_INIT.filter(r => r.enabled !== false)

// phase: select | from-existing | quick | batch | running | result
const phase          = ref('select')
const entryMode      = ref('from-existing')
const devicesToJudge = ref([])
const results        = ref([])

// 开始判定：获取待判定的设备列表，并切换到判定运行状态
function startJudge(devs) {
  devicesToJudge.value = devs
  phase.value = 'running'
}

function onJudgeDone(rs) {
  results.value = rs
  phase.value = 'result'
}
</script>

<template>
  <ModeSelect
    v-if="phase === 'select'"
    @pick="k => {
      if (k === 'existing') { phase = 'from-existing'; entryMode = 'from-existing'; }
      if (k === 'quick')    { phase = 'quick'; entryMode = 'quick'; }
      if (k === 'batch')    { phase = 'batch'; entryMode = 'batch'; }
    }"
  />

  <FromExisting
    v-else-if="phase === 'from-existing'"
    :rules="rules"
    :initial-devices="devicesToJudge"
    @start="startJudge"
    @back="phase = 'select'"
  />

  <QuickEntry
    v-else-if="phase === 'quick'"
    :rules="rules"
    @start="startJudge"
    @back="phase = 'select'"
  />

  <BatchImport
    v-else-if="phase === 'batch'"
    :rules="rules"
    @start="startJudge"
    @back="phase = 'select'"
  />

  <JudgeRunner
    v-else-if="phase === 'running'"
    :devices="devicesToJudge"
    :rules="rules"
    @done="onJudgeDone"
    @cancel="phase = entryMode"
  />

  <JudgeResult
    v-else-if="phase === 'result'"
    :results="results"
    @restart="startJudge"
    @back="phase = entryMode"
  />
</template>

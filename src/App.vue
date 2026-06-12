<script setup>
import { ref, computed } from 'vue'
import TopBar        from '@/components/common/TopBar.vue'
import Breadcrumb    from '@/components/common/Breadcrumb.vue'
import OverviewView  from '@/components/overview/OverviewView.vue'
import ArchiveWizard from '@/components/archive/ArchiveWizard.vue'
import JudgeView     from '@/components/judge/JudgeView.vue'
import RulesView     from '@/components/rules/RulesView.vue'

const tab = ref('overview')

const SUBTITLE_MAP = {
  overview: ['首页', '低效淘汰设备库', '设备总览'],
  archive:  ['首页', '低效淘汰设备库', '设备档案录入'],
  judge:    ['首页', '低效淘汰设备库', '低效淘汰判定'],
  rules:    ['首页', '低效淘汰设备库', '规则库管理'],
}
const breadcrumb = computed(() => SUBTITLE_MAP[tab.value] || [])
</script>

<template>
  <TopBar v-model:tab="tab" />
  <Breadcrumb :items="breadcrumb" />

  <div class="app">
    <OverviewView
      v-if="tab === 'overview'"
      @create="tab = 'archive'"
      @judge="tab = 'judge'"
    />
    <ArchiveWizard
      v-else-if="tab === 'archive'"
      @exit="tab = 'overview'"
    />
    <JudgeView
      v-else-if="tab === 'judge'"
    />
    <RulesView
      v-else-if="tab === 'rules'"
    />
  </div>
</template>

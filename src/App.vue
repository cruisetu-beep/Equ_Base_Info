<script setup>
import { ref, computed } from 'vue'
import TopBar          from '@/components/common/TopBar.vue'
import Breadcrumb      from '@/components/common/Breadcrumb.vue'
import OverviewView    from '@/components/overview/OverviewView.vue'
import ArchiveWizard   from '@/components/archive/ArchiveWizard.vue'
import JudgeView       from '@/components/judge/JudgeView.vue'
import RulesView       from '@/components/rules/RulesView.vue'
import DeviceDetailView from '@/components/detail/DeviceDetailView.vue'

const tab = ref('overview')
// 设备详情是 overview 之上的子页面，不属于顶部导航 tab
const selectedDeviceId = ref(null)

const SUBTITLE_MAP = {
  overview: ['首页', '低效淘汰设备库', '设备总览'],
  archive:  ['首页', '低效淘汰设备库', '设备档案录入'],
  judge:    ['首页', '低效淘汰设备库', '低效淘汰判定'],
  rules:    ['首页', '低效淘汰设备库', '规则库管理'],
}
const breadcrumb = computed(() => {
  if (tab.value === 'overview' && selectedDeviceId.value) {
    return ['首页', '低效淘汰设备库', '设备总览', '设备详情']
  }
  return SUBTITLE_MAP[tab.value] || []
})

function switchTab(newTab) {
  tab.value = newTab
  selectedDeviceId.value = null // 切换主导航时清空详情页状态
}

function openDeviceDetail(id) {
  selectedDeviceId.value = id
}
</script>

<template>
  <TopBar :tab="tab" @update:tab="switchTab" />
  <Breadcrumb :items="breadcrumb" />

  <div class="app">
    <DeviceDetailView
      v-if="tab === 'overview' && selectedDeviceId"
      :device-id="selectedDeviceId"
      @back="selectedDeviceId = null"
      @edit="selectedDeviceId = null /* TODO: 接入编辑流程 */"
      @rejudge="selectedDeviceId = null /* TODO: 接入判定流程 */"
    />
    <OverviewView
      v-else-if="tab === 'overview'"
      @create="tab = 'archive'"
      @judge="tab = 'judge'"
      @view-detail="openDeviceDetail"
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

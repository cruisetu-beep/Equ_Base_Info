// ── stores/useDeviceStore.js ───────────────────────────────────────
// 设备数据 Pinia store
// 组件只与 store 交互，store 调用 api 层，后端就绪时只改 api/config.js

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDevices, addDevice, updateDevice, deleteDevice } from '@/api/devices'

export const useDeviceStore = defineStore('device', () => {
  // ── 状态 ──────────────────────────────────────────────────────
  const devices = ref([])
  const loading = ref(false)
  const error   = ref(null)

  // ── 计算属性 ──────────────────────────────────────────────────
  const total     = computed(() => devices.value.length)
  const normalCnt = computed(() => devices.value.filter(d => d.status === 'normal').length)
  const pendingCnt= computed(() => devices.value.filter(d => d.status === 'pending').length)
  const lowCnt    = computed(() => devices.value.filter(d => d.status === 'low_eff').length)
  const phaseCnt  = computed(() => devices.value.filter(d => d.status === 'phaseout').length)

  // ── Actions ───────────────────────────────────────────────────

  async function fetchDevices() {
    loading.value = true
    error.value = null
    try {
      devices.value = await getDevices()
    } catch (e) {
      error.value = e.message || '加载设备列表失败'
    } finally {
      loading.value = false
    }
  }

  async function createDevice(deviceData) {
    loading.value = true
    error.value = null
    try {
      const created = await addDevice(deviceData)
      devices.value = [created, ...devices.value]
      return created
    } catch (e) {
      error.value = e.message || '新增设备失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function patchDevice(id, patch) {
    error.value = null
    try {
      const updated = await updateDevice(id, patch)
      const idx = devices.value.findIndex(d => d.id === id)
      if (idx !== -1) devices.value[idx] = updated
      return updated
    } catch (e) {
      error.value = e.message || '更新设备失败'
      throw e
    }
  }

  async function removeDevice(id) {
    error.value = null
    try {
      await deleteDevice(id)
      devices.value = devices.value.filter(d => d.id !== id)
    } catch (e) {
      error.value = e.message || '删除设备失败'
      throw e
    }
  }

  return {
    devices, loading, error,
    total, normalCnt, pendingCnt, lowCnt, phaseCnt,
    fetchDevices, createDevice, patchDevice, removeDevice,
  }
})

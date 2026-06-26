// ── api/devices.js ─────────────────────────────────────────────────
// 设备相关 API，USE_MOCK=true 时用静态数据兜底

import axios from 'axios'
import { USE_MOCK, BASE_URL } from './config'
import { SAMPLE_DEVICES } from '@/data/devices'

// 模拟延迟（让 MOCK 更真实）
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 获取设备列表
 * @returns {Promise<Array>}
 */
export async function getDevices() {
  if (USE_MOCK) {
    await delay()
    return [...SAMPLE_DEVICES]
  }
  return axios.get(`${BASE_URL}/Equipment/getOverviewList`).then(r => r.data.data || r.data)
}

/**
 * 获取单台设备详情
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getDevice(id) {
  if (USE_MOCK) {
    await delay(150)
    return SAMPLE_DEVICES.find(d => d.id === id) || null
  }
  return axios.get(`${BASE_URL}/Equipment/getDetail`, { params: { id } }).then(r => r.data.data || r.data)
}

/**
 * 新增设备
 * @param {Object} device
 * @returns {Promise<Object>}
 */
export async function addDevice(device) {
  if (USE_MOCK) {
    await delay()
    const newDev = {
      ...device,
      id: `D${String(Date.now()).slice(-6)}`,
      updated: new Date().toLocaleString('zh-CN'),
    }
    return newDev
  }
  return axios.post(`${BASE_URL}/devices`, device).then(r => r.data)
}

/**
 * 更新设备
 * @param {string} id
 * @param {Object} patch
 * @returns {Promise<Object>}
 */
export async function updateDevice(id, patch) {
  if (USE_MOCK) {
    await delay()
    const base = SAMPLE_DEVICES.find(d => d.id === id) || {}
    return { ...base, ...patch, id, updated: new Date().toLocaleString('zh-CN') }
  }
  return axios.patch(`${BASE_URL}/devices/${id}`, patch).then(r => r.data)
}

/**
 * 删除设备
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteDevice(id) {
  if (USE_MOCK) {
    await delay()
    return
  }
  return axios.delete(`${BASE_URL}/devices/${id}`)
}

/**
 * 获取设备类型字典
 * @returns {Promise<Array>}
 */
export async function getEquipmentTypeDict() {
  if (USE_MOCK) {
    await delay(100)
    return [
      { equipmentTypeId: "0100000000", equipmentTypeName: "变压器", parentId: "" },
      { equipmentTypeId: "0200000000", equipmentTypeName: "制冷设备", parentId: "" },
      { equipmentTypeId: "0300000000", equipmentTypeName: "工业锅炉", parentId: "" },
      { equipmentTypeId: "0400000000", equipmentTypeName: "泵", parentId: "" },
      { equipmentTypeId: "0500000000", equipmentTypeName: "风机", parentId: "" },
      { equipmentTypeId: "0600000000", equipmentTypeName: "压缩机", parentId: "" },
    ]
  }
  return axios.get(`${BASE_URL}/Equipment/getTypeDict`).then(r => r.data.data || r.data)
}

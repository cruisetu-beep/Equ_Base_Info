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
  return axios.get(`${BASE_URL}/devices`).then(r => r.data)
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
  return axios.get(`${BASE_URL}/devices/${id}`).then(r => r.data)
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

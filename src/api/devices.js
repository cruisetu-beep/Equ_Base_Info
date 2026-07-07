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
 * 获取设备总数量
 * @returns {Promise<number>}
 */
export async function getEquipmentCount() {
  if (USE_MOCK) {
    await delay(100)
    return SAMPLE_DEVICES.length
  }
  return axios.get(`${BASE_URL}/Equipment/getEquipmentCount`).then(r => r.data.data || r.data)
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
  return axios.post(`${BASE_URL}/Equipment/createEquipment`, device).then(r => r.data.data || r.data)
}

/**
 * 批量上传设备附件文件并进行关联持久化
 * @param {Array<File>} files 文件列表
 * @param {string} equId 设备编码
 * @param {string} buildId 建筑编码
 * @param {Array<string>} descs 描述列表
 */
export async function uploadEquipmentFiles(files, equId, buildId, descs = []) {
  if (USE_MOCK) {
    await delay(100)
    return { successItems: files.map(f => ({ fileName: f.name })), failItems: [] }
  }
  const formData = new FormData()
  files.forEach(f => {
    formData.append('files', f)
  })
  formData.append('equId', equId)
  formData.append('buildId', buildId)
  descs.forEach(d => {
    formData.append('descs', d || '')
  })

  return axios.post(`${BASE_URL}/Equipment/uploadFile`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data.data || r.data)
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

/**
 * 获取建筑列表
 * @returns {Promise<Array>}
 */
export async function getBuildingList() {
  if (USE_MOCK) {
    await delay(100)
    return [
      { code: "310101A001", name: "瑞金大厦" },
      { code: "310101A002", name: "浦东国际金融中心 T1" }
    ]
  }
  return axios.get(`${BASE_URL}/Equipment/getBuildingList`).then(r => r.data.data || r.data)
}

/**
 * 获取指定建筑的能耗模型树列表
 * @param {string} buildId 
 * @returns {Promise<Array>}
 */
export async function getBuildingModels(buildId) {
  if (USE_MOCK) {
    await delay(100)
    return []
  }
  return axios.get(`${BASE_URL}/Equipment/getBuildingModels`, {
    params: { buildId }
  }).then(r => r.data.data || r.data)
}

/**
 * 获取指定节点的时序能耗数据
 * @param {string} buildId 
 * @param {string} nodeId 
 * @returns {Promise<Array>}
 */
export async function getNodeEnergyData(buildId, nodeId) {
  if (USE_MOCK) {
    await delay(100)
    return []
  }
  return axios.get(`${BASE_URL}/Equipment/getNodeEnergyData`, {
    params: { buildId, nodeId }
  }).then(r => r.data.data || r.data)
}

/**
 * 获取不重复的参数指标属性词典（包含 ID 和名称）
 * @returns {Promise<Array>}
 */
export async function getAttributeNames() {
  if (USE_MOCK) {
    await delay(100)
    return [
      { id: 22, name: "型号" },
      { id: 28, name: "电源电压(V)" },
      { id: 10, name: "额定功率(kW)" },
      { id: 38, name: "出厂编号" },
      { id: 39, name: "出厂日期" },
      { id: 37, name: "生产厂家" },
      { id: 18, name: "控制电压" },
      { id: 32, name: "控制类型" },
      { id: 15, name: "设备名称" },
      { id: 40, name: "频率" },
      { id: 41, name: "额定电流" },
      { id: 42, name: "能效等级" }
    ]
  }
  return axios.get(`${BASE_URL}/Equipment/getAttributeDict`).then(r => r.data.data || r.data)
}

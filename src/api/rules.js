// ── api/rules.js ───────────────────────────────────────────────────
// 规则库相关 API，USE_MOCK=true 时用静态数据兜底

import axios from 'axios'
import { USE_MOCK, BASE_URL } from './config'
import { RULES_LIB_INIT } from '@/data/rules'

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 获取规则列表
 * @returns {Promise<Array>}
 */
export async function getRules() {
  if (USE_MOCK) {
    await delay()
    return RULES_LIB_INIT.map(r => ({ ...r }))
  }
  return axios.get(`${BASE_URL}/rules`).then(r => r.data)
}

/**
 * 更新单条规则
 * @param {string} ruleId
 * @param {Object} patch
 * @returns {Promise<Object>}
 */
export async function updateRule(ruleId, patch) {
  if (USE_MOCK) {
    await delay()
    const base = RULES_LIB_INIT.find(r => r.ruleId === ruleId) || {}
    return { ...base, ...patch, ruleId }
  }
  return axios.patch(`${BASE_URL}/rules/${ruleId}`, patch).then(r => r.data)
}

/**
 * 新增规则
 * @param {Object} rule
 * @returns {Promise<Object>}
 */
export async function addRule(rule) {
  if (USE_MOCK) {
    await delay()
    return { ...rule, ruleId: rule.ruleId || `CUSTOM-${Date.now()}` }
  }
  return axios.post(`${BASE_URL}/rules`, rule).then(r => r.data)
}

/**
 * 删除规则
 * @param {string} ruleId
 * @returns {Promise<void>}
 */
export async function deleteRule(ruleId) {
  if (USE_MOCK) {
    await delay()
    return
  }
  return axios.delete(`${BASE_URL}/rules/${ruleId}`)
}

/**
 * 批量切换规则启用状态
 * @param {string[]} ruleIds
 * @param {boolean} enabled
 * @returns {Promise<void>}
 */
export async function batchToggleRules(ruleIds, enabled) {
  if (USE_MOCK) {
    await delay()
    return
  }
  return axios.post(`${BASE_URL}/rules/batch-toggle`, { ruleIds, enabled }).then(r => r.data)
}

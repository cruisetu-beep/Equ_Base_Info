// ── stores/useRulesStore.js ────────────────────────────────────────
// 规则库 Pinia store

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getRules, updateRule, addRule, deleteRule } from '@/api/rules'

export const useRulesStore = defineStore('rules', () => {
  // ── 状态 ──────────────────────────────────────────────────────
  const rules   = ref([])
  const loading = ref(false)
  const error   = ref(null)

  // ── 计算属性 ──────────────────────────────────────────────────
  const enabledCount  = computed(() => rules.value.filter(r => r.enabled !== false).length)
  const disabledCount = computed(() => rules.value.filter(r => r.enabled === false).length)

  // ── Actions ───────────────────────────────────────────────────

  async function fetchRules() {
    loading.value = true
    error.value = null
    try {
      rules.value = await getRules()
    } catch (e) {
      error.value = e.message || '加载规则库失败'
    } finally {
      loading.value = false
    }
  }

  async function patchRule(ruleId, patch) {
    error.value = null
    try {
      const updated = await updateRule(ruleId, patch)
      const idx = rules.value.findIndex(r => r.ruleId === ruleId)
      if (idx !== -1) rules.value[idx] = updated
      return updated
    } catch (e) {
      error.value = e.message || '更新规则失败'
      throw e
    }
  }

  async function createRule(ruleData) {
    error.value = null
    try {
      const created = await addRule(ruleData)
      rules.value = [created, ...rules.value]
      return created
    } catch (e) {
      error.value = e.message || '新增规则失败'
      throw e
    }
  }

  async function removeRule(ruleId) {
    error.value = null
    try {
      await deleteRule(ruleId)
      rules.value = rules.value.filter(r => r.ruleId !== ruleId)
    } catch (e) {
      error.value = e.message || '删除规则失败'
      throw e
    }
  }

  function toggleEnabled(ruleId) {
    const rule = rules.value.find(r => r.ruleId === ruleId)
    if (rule) {
      rule.enabled = !rule.enabled
      // 有后端时改为 patchRule(ruleId, { enabled: rule.enabled })
    }
  }

  return {
    rules, loading, error,
    enabledCount, disabledCount,
    fetchRules, patchRule, createRule, removeRule, toggleEnabled,
  }
})

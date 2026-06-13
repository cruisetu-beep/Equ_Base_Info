<script setup>
// ── components/rules/RulesTable.vue ───────────────────────────────
import AppIcon from '@/components/common/AppIcon.vue'
import { DEV_TYPE_MAP } from '@/data/devices'
import { BATCH_COLORS, ACTION_COLORS } from '@/data/rules'

defineProps({
  pageRules:       { type: Array,   required: true },
  totalCount:      { type: Number,  required: true },
  page:            { type: Number,  required: true },
  totalPages:      { type: Number,  required: true },
  q:               { type: String,  required: true },
  selId:           { type: String,  default: null },
  deleteConfirmId: { type: String,  default: null },
})

defineEmits([
  'update:q', 'update:page', 'update:selId',
  'toggle-enabled', 'update:deleteConfirmId', 'delete-rule',
])
</script>

<template>
  <div class="rules-table-wrap">
    <!-- 空状态 -->
    <div v-if="pageRules.length === 0" class="empty-state-table">
      <div class="ic"><AppIcon name="search" :size="28" stroke="var(--text-3)" /></div>
      <div>未找到匹配的规则</div>
      <div style="font-size:11px;margin-top:6px">调整筛选条件或清空搜索关键词</div>
    </div>

    <!-- 数据表 -->
    <table v-else class="r-table">
      <thead>
        <tr>
          <th>规则 ID</th>
          <th>批次</th>
          <th>类型</th>
          <th>产品 / 型号系列</th>
          <th>淘汰类型</th>
          <th>截止日期</th>
          <th>启用</th>
          <th style="text-align:right">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in pageRules" :key="r.ruleId"
          :class="selId === r.ruleId && 'sel'"
          @click="$emit('update:selId', r.ruleId)"
        >
          <td class="rid">{{ r.ruleId }}</td>

          <!-- 批次标签 -->
          <td>
            <span class="batch-tag" :style="{ '--cl': BATCH_COLORS[r.batch]?.bg }">
              <span :style="{ width:'6px', height:'6px', borderRadius:'50%', background: BATCH_COLORS[r.batch]?.bg }" />
              {{ r.batch }}
            </span>
          </td>

          <!-- 类型 -->
          <td>
            <span style="display:inline-flex;align-items:center;gap:6px;color:var(--text-1)">
              <AppIcon :name="(DEV_TYPE_MAP[r.typeK] || DEV_TYPE_MAP.other).icon" :size="12"
                       :stroke="(DEV_TYPE_MAP[r.typeK] || DEV_TYPE_MAP.other).color" />
              {{ (DEV_TYPE_MAP[r.typeK] || DEV_TYPE_MAP.other).label }}
            </span>
          </td>

          <!-- 产品/型号 -->
          <td class="product">
            <div>{{ r.product }}</div>
            <div v-if="r.modelPattern && r.modelPattern.length > 0" class="sub mono">
              型号 {{ r.modelPattern.join(' / ') }}
            </div>
          </td>

          <!-- 淘汰类型 -->
          <td>
            <span
              class="action-tag"
              :style="{
                color:       ACTION_COLORS[r.actionType]?.color,
                background:  ACTION_COLORS[r.actionType]?.bg,
                borderColor: ACTION_COLORS[r.actionType]?.border,
              }"
            >{{ r.actionType }}淘汰</span>
          </td>

          <td class="deadline">{{ r.deadline }}</td>

          <!-- 启用开关 -->
          <td>
            <div
              :class="['toggle-switch', r.enabled !== false && 'on']"
              @click.stop="$emit('toggle-enabled', r.ruleId)"
            />
          </td>

          <!-- 操作列 -->
          <td style="position:relative;text-align:right" @click.stop>
            <div class="row-actions" style="justify-content:flex-end">
              <div class="row-action-btn" title="查看" @click="$emit('update:selId', r.ruleId)">
                <AppIcon name="eye" :size="12" />
              </div>
              <div class="row-action-btn del" title="删除"
                   @click="$emit('update:deleteConfirmId', r.ruleId)">
                <AppIcon name="trash" :size="12" />
              </div>
            </div>

            <!-- 删除确认弹出 -->
            <div
              v-if="deleteConfirmId === r.ruleId"
              class="delete-pop"
              @click.stop
            >
              <div class="h">删除规则 {{ r.ruleId }}？</div>
              <div class="s">此操作不可撤销，判定引擎将立即生效。</div>
              <div class="acts">
                <button class="btn ghost" @click="$emit('update:deleteConfirmId', null)">取消</button>
                <button class="btn danger-fill" @click="$emit('delete-rule', r.ruleId)">确认删除</button>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <span class="info">第 {{ page }} / {{ totalPages }} 页 · 每页 8 条</span>
      <button class="pg-btn" :disabled="page <= 1" @click="$emit('update:page', page - 1)">
        <AppIcon name="chevron-left" :size="11" />
      </button>
      <button
        v-for="p in totalPages" :key="p"
        :class="['pg-btn', page === p && 'active']"
        @click="$emit('update:page', p)"
      >{{ p }}</button>
      <button class="pg-btn" :disabled="page >= totalPages" @click="$emit('update:page', page + 1)">
        <AppIcon name="chevron-right" :size="11" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.rules-table-wrap { background: white; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(60,110,200,0.04); }


.r-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.r-table th { padding: 10px 12px; text-align: left; font-weight: 500; background: #f5f9ff; color: var(--text-2); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.r-table td { padding: 12px; border-bottom: 1px solid var(--line); color: var(--text-1); vertical-align: middle; }
.r-table tr { cursor: pointer; transition: background 0.12s; }
.r-table tr:hover td { background: #f8faff; }
.r-table tr.sel td { background: #eaf2ff; }
.r-table tr.sel td:first-child { box-shadow: inset 3px 0 0 var(--brand); }
.r-table .rid { font-family: "JetBrains Mono", monospace; font-weight: 600; color: var(--text-0); font-size: 12px; }
.r-table .product { color: var(--text-0); max-width: 420px; line-height: 1.4; }
.r-table .product .sub { font-size: 10.5px; color: var(--text-2); margin-top: 2px; }
.r-table .deadline { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-2); }

.batch-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: color-mix(in srgb, var(--cl) 12%, white); color: color-mix(in srgb, var(--cl) 80%, black); border: 1px solid color-mix(in srgb, var(--cl) 30%, transparent); }
.action-tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; border: 1px solid; }

.toggle-switch { width: 36px; height: 20px; border-radius: 10px; background: #d3dcec; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
.toggle-switch.on { background: var(--ok); }
.toggle-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: left 0.2s; }
.toggle-switch.on::after { left: 18px; }

.row-actions { display: flex; gap: 4px; }
.row-action-btn { width: 26px; height: 26px; border-radius: 5px; background: #f5f9ff; border: 1px solid var(--line); display: grid; place-items: center; color: var(--text-2); cursor: pointer; transition: all 0.15s; }
.row-action-btn:hover { background: white; border-color: var(--brand); color: var(--brand); }
.row-action-btn.del:hover { border-color: var(--danger); color: var(--danger); background: rgba(229,78,110,0.04); }

.delete-pop { position: absolute; right: 10px; top: 100%; margin-top: 4px; z-index: 20; background: white; border: 1px solid var(--danger); border-radius: 8px; padding: 12px; box-shadow: 0 6px 20px rgba(229,78,110,0.18); min-width: 220px; }
.delete-pop .h { font-size: 12px; color: var(--text-0); font-weight: 500; margin-bottom: 4px; }
.delete-pop .s { font-size: 11px; color: var(--text-2); margin-bottom: 10px; }
.delete-pop .acts { display: flex; gap: 6px; justify-content: flex-end; }
.delete-pop .acts .btn { padding: 4px 10px; font-size: 11px; }

.pagination { padding: 12px 18px; border-top: 1px solid var(--line); display: flex; align-items: center; gap: 8px; justify-content: flex-end; background: #fbfcfe; }
.pagination .info { margin-right: auto; font-size: 12px; color: var(--text-2); }
.pg-btn { width: 30px; height: 30px; border-radius: 6px; background: white; border: 1px solid var(--line); display: grid; place-items: center; font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-1); cursor: pointer; transition: all 0.12s; }
.pg-btn:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.pg-btn.active { background: var(--brand); border-color: var(--brand); color: white; font-weight: 600; }
.pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.empty-state-table { padding: 60px 24px; text-align: center; color: var(--text-3); }
.empty-state-table .ic { display: flex; justify-content: center; margin-bottom: 8px; }
</style>

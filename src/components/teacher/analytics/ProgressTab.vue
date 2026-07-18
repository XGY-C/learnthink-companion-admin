<script setup lang="ts">
import { computed } from 'vue'
import type { PlanData, KpAnchor } from '@/mock/teacherAnalytics'

const props = defineProps<{
  plan: PlanData
  kpAnchors: KpAnchor[]
}>()

const weakAnchors = computed(() => props.kpAnchors.filter(a => a.relationType === 'weak'))

function statusIcon(status: string): string {
  switch (status) {
    case 'done': return '✅'; case 'in_progress': return '🟦'
    case 'lagging': return '🟧'; case 'locked': return '🔒'
    default: return '⬜'
  }
}
function statusLabel(status: string): string {
  switch (status) {
    case 'done': return '已完成'; case 'in_progress': return '进行中'
    case 'lagging': return '落后'; case 'locked': return '未解锁'
    default: return status
  }
}
function masteryColor(mastery: number): string {
  if (mastery >= 80) return 'var(--lt-success)'
  if (mastery >= 50) return 'var(--lt-warning)'
  return 'var(--lt-danger)'
}
</script>

<template>
  <div class="space-y-5">
    <!-- Path DAG -->
    <div>
      <h4 class="text-sm font-medium mb-3" style="color: var(--lt-text-primary);">学习路径</h4>
      <div class="rounded-lg p-4" style="background: var(--lt-bg-page);">
        <div class="flex flex-wrap gap-3">
          <div v-for="mod in plan.modules" :key="mod.moduleId" class="flex items-center">
            <div
              class="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 cursor-default"
              :style="{
                background: mod.status === 'done' ? 'rgba(52,199,89,0.12)' : mod.status === 'in_progress' ? 'rgba(43,111,255,0.1)' : mod.status === 'lagging' ? 'rgba(255,59,48,0.1)' : 'rgba(142,142,160,0.08)',
                color: mod.status === 'done' ? 'var(--lt-success)' : mod.status === 'in_progress' ? 'var(--lt-brand)' : mod.status === 'lagging' ? 'var(--lt-danger)' : 'var(--lt-text-disabled)',
                border: `1px solid ${mod.status === 'done' ? 'rgba(52,199,89,0.2)' : mod.status === 'in_progress' ? 'rgba(43,111,255,0.2)' : mod.status === 'lagging' ? 'rgba(255,59,48,0.2)' : 'rgba(142,142,160,0.12)'}`,
              }"
            >
              <div class="flex items-center gap-1.5">
                <span>{{ statusIcon(mod.status) }}</span>
                <span>{{ mod.title }}</span>
              </div>
              <div class="text-[10px] mt-0.5 opacity-70">{{ statusLabel(mod.status) }}<template v-if="mod.status !== 'locked'"> · {{ mod.mastery }}%</template></div>
            </div>
            <span v-if="plan.edges.some(e => e.from === mod.moduleId)" class="mx-1.5" style="color: var(--lt-text-disabled);">→</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Module mastery table -->
    <div>
      <h4 class="text-sm font-medium mb-3" style="color: var(--lt-text-primary);">模块掌握详情</h4>
      <el-table :data="plan.modules" style="width: 100%" size="small">
        <el-table-column label="模块" min-width="120">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span>{{ statusIcon(row.status) }}</span>
              <span class="text-sm font-medium" style="color: var(--lt-text-primary);">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="范畴" width="60" align="center">
          <template #default="{ row }">
            <span class="text-xs px-1.5 py-0.5 rounded" :style="{ background: row.scope === 'core' ? 'rgba(43,111,255,0.08)' : 'rgba(124,92,252,0.08)', color: row.scope === 'core' ? 'var(--lt-brand)' : 'var(--lt-ai)' }">{{ row.scope === 'core' ? '核心' : '拓展' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="掌握度" width="100" align="center">
          <template #default="{ row }">
            <div class="flex items-center gap-2 justify-center">
              <el-progress :percentage="row.mastery" :stroke-width="6" :color="masteryColor(row.mastery)" style="width: 50px" />
              <span class="text-xs font-medium" :style="{ color: masteryColor(row.mastery) }">{{ row.mastery }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <span class="text-xs" :style="{ color: row.status === 'done' ? 'var(--lt-success)' : row.status === 'in_progress' ? 'var(--lt-brand)' : row.status === 'lagging' ? 'var(--lt-danger)' : 'var(--lt-text-disabled)' }">{{ statusLabel(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="预估/实际" width="110" align="center">
          <template #default="{ row }">
            <span class="text-xs" style="color: var(--lt-text-auxiliary);">{{ row.estimatedHours }}h / {{ row.actualHours > 0 ? row.actualHours + 'h' : '--' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Weak anchors -->
    <div v-if="weakAnchors.length > 0">
      <h4 class="text-sm font-medium mb-3" style="color: var(--lt-text-primary);">薄弱知识点锚点</h4>
      <div class="space-y-2">
        <div v-for="kp in weakAnchors" :key="kp.kpId"
          class="flex items-center justify-between rounded-lg px-3 py-2.5"
          :style="{ background: kp.confidence >= 0.7 ? 'rgba(255,59,48,0.06)' : kp.confidence >= 0.5 ? 'rgba(255,159,10,0.06)' : 'rgba(142,142,160,0.06)' }"
        >
          <div class="flex items-center gap-2.5">
            <span :style="{ color: kp.confidence >= 0.7 ? 'var(--lt-danger)' : kp.confidence >= 0.5 ? 'var(--lt-warning)' : 'var(--lt-text-auxiliary)' }">{{ kp.confidence >= 0.7 ? '🔴' : kp.confidence >= 0.5 ? '🟡' : '🟢' }}</span>
            <div>
              <span class="text-sm font-medium" style="color: var(--lt-text-primary);">{{ kp.kpName }}</span>
              <span class="text-xs ml-2" style="color: var(--lt-text-auxiliary);">置信度 {{ Math.round(kp.confidence * 100) }}%</span>
            </div>
          </div>
          <span class="text-xs px-1.5 py-0.5 rounded" :style="{ background: 'rgba(43,111,255,0.08)', color: 'var(--lt-brand)' }">{{ kp.source === 'quiz_result' ? '测验' : 'LLM推断' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-table__header th) { background-color: var(--lt-bg-page) !important; color: var(--lt-text-auxiliary); font-weight: 500; font-size: 12px; }
:deep(.el-table__row:hover) { background-color: var(--lt-brand-lightest) !important; }
</style>

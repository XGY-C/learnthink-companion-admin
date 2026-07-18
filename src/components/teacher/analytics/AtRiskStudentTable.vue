<script setup lang="ts">
import { computed, ref } from 'vue'
import type { StudentOverview } from '@/mock/teacherAnalytics'

const props = defineProps<{
  students: StudentOverview[]
  totalCount: number
}>()

const emit = defineEmits<{
  viewDetail: [studentId: string]
  expandAll: []
}>()

const riskFilter = ref('全部')
const sortBy = ref('完成度 ↑')
const filterOptions = ['全部', '低投入', '低完成', '薄弱多', '低分', '未开始']
const sortOptions = ['完成度 ↑', '完成度 ↓', '近7天 ↑', '近7天 ↓', '薄弱项 ↑', '薄弱项 ↓']

const filteredStudents = computed(() => {
  let list = [...props.students]
  if (riskFilter.value !== '全部') list = list.filter(s => s.riskTags.includes(riskFilter.value))
  list.sort((a, b) => {
    switch (sortBy.value) {
      case '完成度 ↑': return a.pathProgressPercent - b.pathProgressPercent
      case '完成度 ↓': return b.pathProgressPercent - a.pathProgressPercent
      case '近7天 ↑': return a.weekLearningMinutes - b.weekLearningMinutes
      case '近7天 ↓': return b.weekLearningMinutes - a.weekLearningMinutes
      case '薄弱项 ↑': return a.weakCount - b.weakCount
      case '薄弱项 ↓': return b.weakCount - a.weakCount
      default: return 0
    }
  })
  return list
})

const tagColors: Record<string, string> = {
  '低投入': 'var(--lt-orange)', '低完成': 'var(--lt-danger)',
  '薄弱多': 'var(--lt-ai)', '低分': 'var(--lt-warning)',
  '未开始': 'var(--lt-text-disabled)',
}

function formatLastActive(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}
</script>

<template>
  <div class="rounded-xl bg-white card-elevated overflow-hidden">
    <div class="px-5 py-4 flex items-center justify-between border-b" style="border-color: var(--lt-border);">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" style="background: var(--lt-danger);"></span>
        <span class="text-sm font-semibold" style="color: var(--lt-text-primary);">需关注学生</span>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background: rgba(255,59,48,0.1); color: var(--lt-danger);">共 {{ students.length }} 人</span>
      </div>
      <div class="flex items-center gap-3">
        <el-select v-model="riskFilter" size="small" style="width: 110px">
          <el-option v-for="opt in filterOptions" :key="opt" :label="opt" :value="opt" />
        </el-select>
        <el-select v-model="sortBy" size="small" style="width: 130px">
          <el-option v-for="opt in sortOptions" :key="opt" :label="opt" :value="opt" />
        </el-select>
      </div>
    </div>

    <el-table :data="filteredStudents" style="width: 100%" size="small" stripe>
      <el-table-column label="学生" min-width="120">
        <template #default="{ row }: { row: StudentOverview }">
          <div class="flex items-center gap-2.5">
            <el-avatar :size="28" style="background: linear-gradient(135deg, var(--lt-brand), var(--lt-brand-dark)); font-size: 12px;">
              {{ row.displayName.charAt(0) }}
            </el-avatar>
            <div>
              <div class="text-sm font-medium" style="color: var(--lt-text-primary);">{{ row.displayName }}</div>
              <div class="text-xs" style="color: var(--lt-text-auxiliary);">{{ row.major }} · {{ row.grade }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="近7天" width="100" align="center">
        <template #default="{ row }: { row: StudentOverview }">
          <div :style="{ color: row.weekLearningMinutes < 60 ? 'var(--lt-danger)' : 'var(--lt-text-primary)', fontWeight: row.weekLearningMinutes < 60 ? 600 : 400 }">
            {{ (row.weekLearningMinutes / 60).toFixed(1) }}h
          </div>
        </template>
      </el-table-column>
      <el-table-column label="完成度" width="110" align="center">
        <template #default="{ row }: { row: StudentOverview }">
          <div class="flex items-center gap-2 justify-center">
            <el-progress :percentage="Math.min(row.pathProgressPercent, 100)" :stroke-width="6"
              :color="row.pathProgressPercent < 30 ? 'var(--lt-danger)' : row.pathProgressPercent < 60 ? 'var(--lt-warning)' : 'var(--lt-success)'" style="width: 60px" />
            <span class="text-xs" style="color: var(--lt-text-secondary);">{{ row.pathProgressPercent }}%</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="薄弱项" width="80" align="center">
        <template #default="{ row }: { row: StudentOverview }">
          <span :style="{ color: row.weakCount > 5 ? 'var(--lt-ai)' : 'var(--lt-text-primary)', fontWeight: row.weakCount > 5 ? 600 : 400 }">{{ row.weakCount }} 项</span>
        </template>
      </el-table-column>
      <el-table-column label="测验均分" width="100" align="center">
        <template #default="{ row }: { row: StudentOverview }">
          <span v-if="row.avgQuizScore > 0" :style="{ color: row.avgQuizScore < 60 ? 'var(--lt-danger)' : 'var(--lt-text-primary)', fontWeight: row.avgQuizScore < 60 ? 600 : 400 }">{{ row.avgQuizScore }}分</span>
          <span v-else style="color: var(--lt-text-disabled);">—</span>
        </template>
      </el-table-column>
      <el-table-column label="最后活跃" width="90" align="center">
        <template #default="{ row }: { row: StudentOverview }">
          <span class="text-xs" style="color: var(--lt-text-auxiliary);">{{ formatLastActive(row.lastActiveAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="风险标签" min-width="150">
        <template #default="{ row }: { row: StudentOverview }">
          <div class="flex gap-1 flex-wrap">
            <el-tag v-for="tag in row.riskTags" :key="tag" size="small"
              :style="{ backgroundColor: tagColors[tag] + '18', color: tagColors[tag], borderColor: tagColors[tag] + '30', borderRadius: '4px', fontWeight: 500 }">{{ tag }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }: { row: StudentOverview }">
          <el-button link size="small" style="color: var(--lt-brand);" @click="emit('viewDetail', row.id)">查看详情 →</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="totalCount > students.length" class="flex justify-center py-3 border-t" style="border-color: var(--lt-border);">
      <el-button link size="small" style="color: var(--lt-text-auxiliary);" @click="emit('expandAll')">展开全部 {{ totalCount }} 名同学 →</el-button>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-table__header th) {
  background-color: var(--lt-bg-page) !important;
  color: var(--lt-text-auxiliary); font-weight: 500; font-size: 12px;
  border-bottom: 1px solid var(--lt-border);
}
:deep(.el-table__row:hover) { background-color: var(--lt-brand-lightest) !important; }
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) { background-color: var(--lt-bg-page); }
</style>

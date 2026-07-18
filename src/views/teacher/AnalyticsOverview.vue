<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import * as echarts from 'echarts'
import { generateClassOverview, type ClassOverviewData } from '@/mock/teacherAnalytics'
import OverviewMetricCards from '@/components/teacher/analytics/OverviewMetricCards.vue'
import CompletionChart from '@/components/teacher/analytics/CompletionChart.vue'
import WeaknessChart from '@/components/teacher/analytics/WeaknessChart.vue'
import WeeklyTrendChart from '@/components/teacher/analytics/WeeklyTrendChart.vue'
import AtRiskStudentTable from '@/components/teacher/analytics/AtRiskStudentTable.vue'
import StudentDetailDrawer from '@/components/teacher/analytics/StudentDetailDrawer.vue'

const overviewData = ref<ClassOverviewData | null>(null)
const drawerVisible = ref(false)
const selectedStudentId = ref<string | null>(null)
const showAllStudents = ref(false)

onMounted(() => { overviewData.value = generateClassOverview() })

const displayStudents = computed(() => {
  if (!overviewData.value) return []
  if (showAllStudents.value) return overviewData.value.students
  return overviewData.value.students.slice(0, 5)
})

function viewDetail(id: string) { selectedStudentId.value = id; drawerVisible.value = true }
function closeDrawer() { drawerVisible.value = false; selectedStudentId.value = null }
function expandAll() { showAllStudents.value = true }

// Scatter chart: completion vs score
const scatterOption = computed(() => {
  if (!overviewData.value) return {}
  const validStudents = overviewData.value.students.filter(s => s.avgQuizScore > 0)
  const data = validStudents.map(s => [s.pathProgressPercent, s.avgQuizScore, s.weekLearningMinutes / 60])
  return {
    tooltip: {
      trigger: 'item', formatter: (p: any) => {
        const stu = validStudents[p.dataIndex]
        return `<div style="font-weight:600;font-size:14px;margin-bottom:4px">${stu.displayName}</div>`
          + `完成度: ${stu.pathProgressPercent}%<br>测验均分: ${stu.avgQuizScore}分<br>近7天: ${(stu.weekLearningMinutes / 60).toFixed(1)}h`
      },
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8, padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);',
    },
    grid: { left: '8%', right: '8%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'value', name: '完成度 (%)', min: 0, max: 100, axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#8E8EA0', fontSize: 10 }, splitLine: { show: false } },
    yAxis: { type: 'value', name: '测验均分', min: 0, max: 100, axisLine: { show: false }, axisLabel: { color: '#8E8EA0', fontSize: 10 }, splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } } },
    series: [{
      type: 'scatter', symbolSize: (d: number[]) => Math.max(8, d[2] * 3),
      data: data.map((d: number[]) => ({ value: d, itemStyle: { color: d[0] < 30 || d[1] < 60 ? '#FF3B30' : d[0] < 60 ? '#FF9F0A' : '#2B6FFF' } })),
      markLine: {
        silent: true, data: [{ yAxis: 60, label: { formatter: '及格线 60分', color: '#FF9F0A', fontSize: 10 }, lineStyle: { color: '#FF9F0A', type: 'dashed' } }],
      },
      animationDuration: 800,
    }],
  }
})
</script>

<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold" style="color: var(--lt-text-primary);">📊 班级总览</h1>
        <p class="text-sm mt-1" style="color: var(--lt-text-auxiliary);">全班学习健康度总览 — 先看整体，再查个体</p>
      </div>
      <span class="text-xs flex items-center gap-1" style="color: var(--lt-text-auxiliary);">
        <span class="w-2 h-2 rounded-full" style="background: var(--lt-success);"></span> 数据更新于 {{ new Date().toLocaleDateString('zh-CN') }}
      </span>
    </div>

    <template v-if="overviewData">
      <OverviewMetricCards :data="overviewData.classStats" />

      <div class="grid grid-cols-3 gap-4">
        <CompletionChart :data="overviewData.distributions.completionBrackets" />
        <WeaknessChart :data="overviewData.distributions.weakCountBrackets" />
        <WeeklyTrendChart :data="overviewData.distributions.weeklyTrend" />
      </div>

      <!-- New: scatter plot -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">完成度 vs 测验均分</h3>
            <p class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">每个点代表一名学生，大小反映近7天学习时长</p>
          </div>
          <div class="flex items-center gap-3 text-xs" style="color: var(--lt-text-auxiliary);">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full" style="background: #2B6FFF;"></span>正常</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full" style="background: #FF9F0A;"></span>偏低</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full" style="background: #FF3B30;"></span>需关注</span>
          </div>
        </div>
        <div class="h-64"><v-chart :option="scatterOption" autoresize /></div>
      </div>

      <AtRiskStudentTable :students="displayStudents" :total-count="overviewData.students.length" @view-detail="viewDetail" @expand-all="expandAll" />
    </template>

    <StudentDetailDrawer :visible="drawerVisible" :student-id="selectedStudentId" @close="closeDrawer" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAdminStore } from '@/stores/admin'
import StatsCard from '@/components/admin/StatsCard.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import { apiFetch } from '@/utils/api'
import type { DashboardStats, SystemHealth } from '@/types'

const store = useAdminStore()
const loading = ref(true)

const stats = ref<DashboardStats>({
  totalUsers: 0, newUsersThisWeek: 0, activeCourses: 0,
  totalTasks: 0, tasksThisWeek: 0, taskSuccessRate: 0,
  activeStudentsThisWeek: 0, totalDocuments: 0, totalChunks: 0
})

const health = ref<SystemHealth>({
  rag: { status: 'up', latency: 0 },
  milvus: { status: 'up' },
  llm: { status: 'up', successRate: 100 }
})

async function loadData() {
  loading.value = true
  try {
    const [statsRes, healthRes] = await Promise.all([
      apiFetch<DashboardStats>('/admin/stats').catch(() => null),
      apiFetch<SystemHealth>('/admin/health').catch(() => null)
    ])
    if (statsRes) stats.value = statsRes.data
    if (healthRes) health.value = healthRes.data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const resourceTypeOption = ref({})
const chartLineOption = ref({})

onMounted(() => {
  const root = getComputedStyle(document.documentElement)
  const brand = (root.getPropertyValue('--lt-brand') || '#2B6FFF').trim()
  const success = (root.getPropertyValue('--lt-success') || '#16A34A').trim()
  const ai = (root.getPropertyValue('--lt-ai') || '#7C3AED').trim()
  const orange = (root.getPropertyValue('--lt-orange') || '#F97316').trim()
  const axisLine = (root.getPropertyValue('--lt-chart-axis-line') || '#E6EEF9').trim()
  const axisLabel = (root.getPropertyValue('--lt-chart-axis-label') || '#9AA6C1').trim()
  const gridLine = (root.getPropertyValue('--lt-chart-grid') || '#F1F5F9').trim()

  chartLineOption.value = {
    grid: { top: 10, right: 20, bottom: 30, left: 40 },
    xAxis: { type: 'category', data: Array.from({length:30}, (_,i) => `${i+1}`), axisLine: { lineStyle: { color: axisLine } }, axisLabel: { color: axisLabel, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: gridLine } }, axisLabel: { color: axisLabel, fontSize: 10 } },
    series: [{ data: Array.from({length:30}, () => Math.floor(Math.random()*80+20)), type: 'line', smooth: true, symbol: 'none', lineStyle: { color: brand, width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(43,111,255,0.15)' }, { offset: 1, color: 'rgba(43,111,255,0.01)' }] } } }],
    tooltip: { trigger: 'axis' }
  }

  resourceTypeOption.value = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: axisLabel, fontSize: 11 } },
    color: [brand, success, ai, orange, '#0EA5E9'],
    series: [{
      type: 'pie', radius: ['55%', '78%'], center: ['50%', '45%'], avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { scale: false },
      data: [
        { value: 42, name: '文档' },
        { value: 20, name: '习题' },
        { value: 15, name: '思维导图' },
        { value: 12, name: '阅读材料' },
        { value: 11, name: '代码' }
      ]
    }]
  }
})
</script>

<template>
  <div class="p-6">
    <PageHeader title="数据看板" description="全局运营数据与系统健康概览" />

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div v-for="i in 5" :key="i" class="rounded-lg p-5" style="background: var(--lt-bg-card);">
        <el-skeleton :rows="2" animated />
      </div>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard icon="user" label="累计用户"
          :value="stats.totalUsers"
          trend="up" trend-value="12%" trend-label="本周"
          color="var(--lt-brand)" />
        <StatsCard icon="reading" label="活跃课程"
          :value="stats.activeCourses"
          color="var(--lt-success)" />
        <StatsCard icon="magicStick" label="生成任务"
          :value="stats.totalTasks"
          trend="down" trend-value="3%" trend-label="本周"
          color="var(--lt-ai)" />
        <StatsCard icon="circleCheck" label="任务成功率"
          :value="stats.taskSuccessRate + '%'"
          trend="up" trend-value="2%"
          color="var(--lt-orange)" />
        <StatsCard icon="document" label="RAG 文档"
          :value="stats.totalDocuments"
          trend="up" trend-value="+56" trend-label="本周"
          color="#0EA5E9" />
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div class="rounded-lg p-6" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">每日任务量 (近30天)</h3>
          <div style="height: 240px;">
            <v-chart :option="chartLineOption" autoresize />
          </div>
        </div>
        <div class="rounded-lg p-6" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">资源类型分布</h3>
          <div style="height: 240px; display: flex; align-items: center; justify-content: center;">
            <v-chart :option="resourceTypeOption" autoresize />
          </div>
        </div>
      </div>

      <!-- System Health -->
      <div
        class="rounded-lg p-4 flex flex-wrap items-center gap-6 text-sm"
        style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);"
      >
        <span style="color: var(--lt-text-secondary); font-weight: 600;">系统健康</span>
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :style="{ background: health.rag.status === 'up' ? 'var(--lt-success)' : 'var(--lt-danger)' }" />
          RAG {{ health.rag.status === 'up' ? `● 正常 ${health.rag.latency}ms` : '● 异常' }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :style="{ background: health.milvus.status === 'up' ? 'var(--lt-success)' : 'var(--lt-danger)' }" />
          Milvus {{ health.milvus.status === 'up' ? '● 正常' : '● 异常' }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :style="{ background: health.llm.status === 'up' ? 'var(--lt-success)' : 'var(--lt-danger)' }" />
          LLM API {{ health.llm.status === 'up' ? `● 正常 ${health.llm.successRate}%` : '● 异常' }}
        </span>
      </div>
    </template>
  </div>
</template>

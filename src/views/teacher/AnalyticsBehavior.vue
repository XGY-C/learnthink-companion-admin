<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { generateBehaviorAnalytics, type BehaviorAnalytics } from '@/mock/teacherAnalytics'
import * as echarts from 'echarts'

const data = ref<BehaviorAnalytics | null>(null)
onMounted(() => { data.value = generateBehaviorAnalytics() })

const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const heatmapOpt = computed(() => {
  if (!data.value) return {}
  const values = data.value.hourlyHeatmap.flatMap(h => dayKeys.map((dk, di) => [h.hour, di, h[dk]]))
  return {
    tooltip: {
      position: 'top',
      formatter: (p: any) => `${days[p.data[1]]} ${String(p.data[0]).padStart(2, '0')}:00<br>活跃人次: <strong>${p.data[2]}</strong>`,
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8, padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);',
    },
    grid: { left: '6%', right: '6%', bottom: '10%', top: '3%' },
    xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#8E8EA0', fontSize: 10 } },
    yAxis: { type: 'category', data: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`), axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#8E8EA0', fontSize: 9 } },
    visualMap: { min: 0, max: 20, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#E8F0FE', '#A3C4FF', '#6B9BFF', '#2B6FFF', '#1A4FCC'] }, textStyle: { color: '#8E8EA0', fontSize: 10 } },
    series: [{ type: 'heatmap', data: values, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' } }, animationDuration: 600 }],
  }
})

const resourceOpt = computed(() => {
  if (!data.value) return {}
  const r = data.value.resourceTypePreference
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '5%', right: '15%', bottom: '5%', top: '5%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#8E8EA0', fontSize: 10 }, splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } } },
    yAxis: { type: 'category', data: r.map(x => x.type), axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#5A5A72', fontSize: 11 } },
    series: [
      {
        name: '使用次数', type: 'bar', data: r.map(x => ({
          value: x.count, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#2B6FFF' }, { offset: 1, color: '#2B6FFF55' }]), borderRadius: [0, 4, 4, 0] },
        })), barWidth: 16, label: { show: true, position: 'right', formatter: (p: any) => `${p.value}次`, color: '#8E8EA0', fontSize: 10 }, animationDuration: 600,
      },
      {
        name: '平均得分', type: 'scatter', data: r.map(x => x.avgScore),
        symbolSize: (d: number) => 8 + (d - 60) / 2, itemStyle: { color: '#FF9F0A' },
        label: { show: true, position: 'right', formatter: (p: any) => `${p.value}分`, color: '#8E8EA0', fontSize: 9 }, animationDuration: 600,
        xAxisIndex: 0, yAxisIndex: 0,
      },
    ],
    legend: { data: ['使用次数', '平均得分'], bottom: 0, textStyle: { color: '#8E8EA0', fontSize: 10 } },
  }
})

const consistencyOpt = computed(() => {
  if (!data.value) return {}
  const c = data.value.weeklyConsistency
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8, padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);' },
    grid: { left: '5%', right: '5%', bottom: '8%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: c.map(x => x.week), axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#8E8EA0', fontSize: 9, interval: 0 } },
    yAxis: [
      { type: 'value', name: '活跃天数', min: 0, max: 7, axisLine: { show: false }, splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } }, axisLabel: { color: '#8E8EA0', fontSize: 10 } },
      { type: 'value', name: '学习次数', axisLine: { show: false }, splitLine: { show: false }, axisLabel: { color: '#8E8EA0', fontSize: 10 } },
    ],
    series: [
      { name: '活跃天数', type: 'bar', data: c.map(x => x.activeDays), barWidth: 16, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#2B6FFF' }, { offset: 1, color: '#2B6FFF44' }]), borderRadius: [3, 3, 0, 0] }, animationDuration: 600 },
      { name: '学习次数', type: 'line', data: c.map(x => x.sessions), smooth: true, yAxisIndex: 1, lineStyle: { color: '#FF9F0A', width: 2 }, symbol: 'circle', symbolSize: 6, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#FF9F0A20' }, { offset: 1, color: '#FF9F0A02' }]) }, animationDuration: 800 },
    ],
    legend: { data: ['活跃天数', '学习次数'], bottom: 0, textStyle: { color: '#8E8EA0', fontSize: 10 } },
  }
})
</script>

<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold" style="color: var(--lt-text-primary);">👆 学习行为分析</h1>
        <p class="text-sm mt-1" style="color: var(--lt-text-auxiliary);">活跃时段、资源偏好、学习规律 — 学生怎么学？</p>
      </div>
    </div>

    <template v-if="data">
      <!-- Hourly heatmap -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">周活跃时段热力图</h3>
          <div class="flex items-center gap-2 text-xs" style="color: var(--lt-text-auxiliary);">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded" style="background: #E8F0FE;"></span>低</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded" style="background: #2B6FFF;"></span>中</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded" style="background: #1A4FCC;"></span>高</span>
          </div>
        </div>
        <div class="h-64"><v-chart :option="heatmapOpt" autoresize /></div>
        <div class="mt-2 flex justify-center gap-4 text-xs" style="color: var(--lt-text-placeholder);">
          <span>🌅 上午 8-12点：课堂学习高峰</span>
          <span>🌤 下午 14-17点：练习密集时段</span>
          <span>🌙 晚上 19-22点：自主复习黄金期</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Resource preference -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">资源类型偏好</h3>
          <div class="h-64"><v-chart :option="resourceOpt" autoresize /></div>
        </div>
        <!-- Device breakdown -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">设备使用分布</h3>
          <div class="flex items-center justify-center h-52">
            <div class="relative w-40 h-40">
              <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                <circle v-for="(d, i) in data.deviceBreakdown" :key="d.device" cx="50" cy="50" r="40"
                  :stroke="d.color" :stroke-width="18"
                  :stroke-dasharray="`${d.pct * 2.51327} ${(100 - d.pct) * 2.51327}`"
                  :stroke-dashoffset="-(data.deviceBreakdown.slice(0, i).reduce((s, x) => s + x.pct, 0) * 2.51327)"
                  fill="none" class="transition-all duration-700"
                  style="stroke-linecap: round;"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center flex-col">
                <span class="text-2xl font-bold" style="color: var(--lt-text-primary);">100%</span>
                <span class="text-xs" style="color: var(--lt-text-auxiliary);">总使用</span>
              </div>
            </div>
          </div>
          <div class="flex justify-center gap-4 mt-2">
            <div v-for="d in data.deviceBreakdown" :key="d.device" class="flex items-center gap-1.5 text-xs">
              <span class="w-3 h-3 rounded-full" :style="{ background: d.color }"></span>
              <span style="color: var(--lt-text-secondary);">{{ d.device }} {{ d.pct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Weekly consistency -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">周学习规律</h3>
        <div class="h-56"><v-chart :option="consistencyOpt" autoresize /></div>
      </div>

      <!-- Resource type stats table -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">各类资源效果对比</h3>
        <el-table :data="data.resourceTypePreference" style="width: 100%" size="small">
          <el-table-column label="资源类型" min-width="100">
            <template #default="{ row }"><span style="color: var(--lt-text-primary);">{{ row.type }}</span></template>
          </el-table-column>
          <el-table-column label="使用次数" width="120" align="center">
            <template #default="{ row }"><span style="color: var(--lt-text-secondary); font-weight: 600;">{{ row.count }}</span></template>
          </el-table-column>
          <el-table-column label="使用占比" width="200">
            <template #default="{ row }">
              <el-progress :percentage="Math.round(row.count / data!.resourceTypePreference.reduce((s, r) => s + r.count, 0) * 100)" :stroke-width="8" color="var(--lt-brand)" />
            </template>
          </el-table-column>
          <el-table-column label="关联均分" width="120" align="center">
            <template #default="{ row }">
              <span class="font-semibold" :style="{ color: row.avgScore >= 70 ? 'var(--lt-success)' : row.avgScore >= 60 ? 'var(--lt-warning)' : 'var(--lt-danger)' }">{{ row.avgScore }}分</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>

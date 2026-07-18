<script setup lang="ts">
import { computed } from 'vue'
import * as echarts from 'echarts'
import type { QuizAttempt } from '@/mock/teacherAnalytics'

const props = defineProps<{
  attempts: QuizAttempt[]
  classAvgScore: number
}>()

const sortedAttempts = computed(() => [...props.attempts].reverse())

const trendOption = computed(() => {
  const list = sortedAttempts.value
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8,
      padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);',
    },
    grid: { left: '5%', right: '5%', bottom: '8%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category', data: list.map(a => a.createdAt.slice(5, 10)),
      axisLine: { lineStyle: { color: '#E8ECF0' } },
      axisLabel: { color: '#8E8EA0', fontSize: 10 }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } },
      axisLabel: { color: '#8E8EA0', fontSize: 10 },
    },
    series: [
      {
        name: '得分', type: 'line',
        data: list.map(a => a.score), smooth: true,
        lineStyle: { color: '#2B6FFF', width: 2.5 },
        itemStyle: { color: '#2B6FFF' },
        symbol: 'circle', symbolSize: 8,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#2B6FFF22' }, { offset: 1, color: '#2B6FFF05' }]) },
        label: { show: true, position: 'top', color: '#8E8EA0', fontSize: 10, fontWeight: 600 },
        animationDuration: 800,
      },
      {
        name: '班级均分', type: 'line',
        data: list.map(() => props.classAvgScore),
        lineStyle: { color: '#FF9F0A', width: 1.5, type: 'dashed' },
        symbol: 'none', z: 1,
        label: { show: true, formatter: `班级均分 ${props.classAvgScore}`, position: 'end', color: '#FF9F0A', fontSize: 10 },
      },
    ],
  }
})

const allWeakTags = computed(() => {
  const tagCount: Record<string, number> = {}
  props.attempts.forEach(a => a.weakTags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1 }))
  const maxCount = Math.max(...Object.values(tagCount), 1)
  return Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count, ratio: count / maxCount }))
    .sort((a, b) => b.count - a.count)
})
</script>

<template>
  <div class="space-y-5">
    <div>
      <h4 class="text-sm font-medium mb-3" style="color: var(--lt-text-primary);">得分趋势</h4>
      <div class="h-52"><v-chart :option="trendOption" autoresize /></div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <h4 class="text-sm font-medium mb-3" style="color: var(--lt-text-primary);">薄弱标签</h4>
        <div class="rounded-lg p-4 flex flex-wrap items-center gap-2.5 min-h-[120px]" style="background: var(--lt-bg-page);">
          <span v-for="item in allWeakTags" :key="item.tag"
            class="inline-block rounded-full font-medium transition-all duration-200 hover:scale-110 cursor-default"
            :style="{
              fontSize: `${12 + item.ratio * 14}px`,
              color: item.ratio > 0.6 ? 'var(--lt-danger)' : item.ratio > 0.3 ? 'var(--lt-warning)' : 'var(--lt-text-auxiliary)',
              background: item.ratio > 0.6 ? 'rgba(255,59,48,0.08)' : item.ratio > 0.3 ? 'rgba(255,159,10,0.08)' : 'transparent',
              padding: `${2 + item.ratio * 4}px ${6 + item.ratio * 8}px`,
            }"
          >{{ item.tag }}</span>
        </div>
      </div>
      <div>
        <h4 class="text-sm font-medium mb-3" style="color: var(--lt-text-primary);">最近测验记录</h4>
        <div class="space-y-2">
          <div v-for="a in [...sortedAttempts].reverse()" :key="a.id"
            class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all hover:-translate-x-0.5 cursor-default"
            :style="{ background: a.score < 60 ? 'rgba(255,59,48,0.04)' : 'transparent' }"
          >
            <div class="flex items-center gap-3">
              <span class="text-xs" style="color: var(--lt-text-placeholder);">{{ a.createdAt.slice(5, 10) }}</span>
              <span style="color: var(--lt-text-primary);">{{ a.topic }}</span>
            </div>
            <span class="font-semibold" :style="{ color: a.score >= 80 ? 'var(--lt-success)' : a.score >= 60 ? 'var(--lt-text-primary)' : 'var(--lt-danger)' }">{{ a.score }}分</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

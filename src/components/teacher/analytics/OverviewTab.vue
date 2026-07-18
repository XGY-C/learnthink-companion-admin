<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileData, StudentStats } from '@/mock/teacherAnalytics'

const props = defineProps<{
  stats: StudentStats
  profile: ProfileData
}>()

const radarOption = computed(() => ({
  radar: {
    indicator: props.profile.radarData.map(d => ({ name: d.name, max: 100 })),
    radius: '65%', center: ['50%', '50%'],
    axisName: { color: '#8E8EA0', fontSize: 11 },
    splitArea: { areaStyle: { color: ['#F5F7FA', '#EEF1F5', '#E8ECF0', '#DEE3E8'] } },
    axisLine: { lineStyle: { color: '#E8ECF0' } },
    splitLine: { lineStyle: { color: '#E8ECF0' } },
  },
  series: [{
    type: 'radar',
    data: [{
      value: props.profile.radarData.map(d => d.value),
      name: '当前', itemStyle: { color: '#2B6FFF' },
      areaStyle: { color: '#2B6FFF1a' },
      lineStyle: { color: '#2B6FFF', width: 2 },
    }],
    animationDuration: 800,
  }],
}))

const metricCards = computed(() => [
  { label: '累计学习', value: Math.round(props.stats.totalLearningMinutes / 60), unit: 'h', color: 'var(--lt-brand)', bg: 'rgba(43,111,255,0.08)' },
  { label: '完成资源', value: props.stats.resourceCompleted, unit: '个', color: 'var(--lt-success)', bg: 'rgba(52,199,89,0.08)' },
  { label: '路径完成', value: props.stats.pathProgressPercent, unit: '%', color: 'var(--lt-ai)', bg: 'rgba(124,92,252,0.08)' },
  { label: '测验均分', value: props.stats.avgQuizScore, unit: '分', color: 'var(--lt-orange)', bg: 'rgba(255,140,66,0.08)' },
])
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <div class="h-56"><v-chart :option="radarOption" autoresize /></div>
    </div>
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium" style="color: var(--lt-text-primary);">画像摘要</div>
      <div class="rounded-lg p-3 text-sm leading-relaxed" style="background: var(--lt-bg-page); color: var(--lt-text-secondary);">
        <div v-for="(line, i) in profile.summary" :key="i" class="mb-1.5 flex items-start gap-2">
          <span class="text-xs mt-0.5" style="color: var(--lt-brand);">•</span>
          <span>{{ line }}</span>
        </div>
      </div>
      <div class="mt-auto">
        <div class="text-sm font-medium mb-2" style="color: var(--lt-text-primary);">学情指标</div>
        <div class="grid grid-cols-2 gap-2">
          <div v-for="m in metricCards" :key="m.label" class="rounded-lg p-2.5 text-center" :style="{ background: m.bg }">
            <div class="text-lg font-bold" :style="{ color: m.color }">{{ m.value }}<span class="text-xs font-normal ml-0.5" style="color: var(--lt-text-auxiliary);">{{ m.unit }}</span></div>
            <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">{{ m.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  data: { week: string; avgHours: number }[]
}>()

const semesterStages = [
  { label: '开学适应', start: 0, end: 4 },
  { label: '稳步提升', start: 4, end: 8 },
  { label: '期中备考', start: 8, end: 12 },
  { label: '期末冲刺', start: 12, end: 16 },
]

const option = computed(() => {
  const weeks = props.data.map(d => d.week)
  const hours = props.data.map(d => d.avgHours)
  const movingAvg = hours.map((_, i) => {
    const slice = hours.slice(Math.max(0, i - 2), i + 1)
    return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2)
  })

  return {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8,
      padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);',
      formatter: (params: any) => {
        const bar = params.find((p: any) => p.seriesName === '人均时长')
        const line = params.find((p: any) => p.seriesName === '趋势')
        let html = `<div style="font-size:13px;font-weight:600;margin-bottom:4px">${bar?.axisValue || ''}</div>`
        if (bar) html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><span style="width:10px;height:10px;border-radius:2px;background:#2B6FFF"></span>人均 <strong style="font-size:18px">${bar.value}</strong> h</div>`
        if (line) html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><span style="width:10px;height:3px;border-radius:2px;background:#7C5CFC"></span>趋势 <strong style="font-size:18px;color:#7C5CFC">${line.value}</strong> h</div>`
        return html
      },
    },
    grid: { left: '5%', right: '5%', bottom: '16%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category', data: weeks,
      axisLine: { lineStyle: { color: '#E8ECF0' } },
      axisLabel: { color: '#8E8EA0', fontSize: 10, interval: 1 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', name: '小时', min: 0,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } },
      axisLabel: { color: '#8E8EA0', fontSize: 11 },
    },
    series: [
      {
        name: '人均时长', type: 'bar',
        data: hours, barWidth: 14,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#2B6FFF' },
            { offset: 1, color: '#2B6FFF33' },
          ]),
          borderRadius: [3, 3, 0, 0],
        },
        animationDuration: 800, animationEasing: 'cubicOut',
        markArea: {
          silent: true,
          data: semesterStages.map(s => [
            { xAxis: weeks[s.start], itemStyle: { color: s.start === 0 ? 'rgba(43,111,255,0.03)' : s.start === 4 ? 'rgba(255,159,10,0.04)' : 'rgba(255,59,48,0.04)' } },
            { xAxis: weeks[Math.min(s.end - 1, weeks.length - 1)] },
          ]),
        },
      },
      {
        name: '趋势', type: 'line',
        data: movingAvg, smooth: true,
        lineStyle: { color: '#7C5CFC', width: 2.5 },
        itemStyle: { color: '#7C5CFC' },
        symbol: 'circle', symbolSize: 6, showSymbol: false, z: 2,
        animationDuration: 1000,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#7C5CFC22' },
            { offset: 1, color: '#7C5CFC05' },
          ]),
        },
      },
    ],
  }
})
</script>

<template>
  <div class="rounded-xl bg-white p-5 card-elevated">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">周学习时长趋势</h3>
        <p class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">最近12周全班人均学习投入变化</p>
      </div>
      <div class="flex items-center gap-3 text-xs" style="color: var(--lt-text-auxiliary);">
        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm" style="background: var(--lt-brand);"></span>人均时长</span>
        <span class="flex items-center gap-1"><span class="w-3 h-0.5 rounded-full" style="background: var(--lt-ai);"></span>3周移动平均</span>
      </div>
    </div>
    <div class="h-56">
      <v-chart :option="option" autoresize />
    </div>
    <div class="flex justify-between mt-3 text-xs" style="color: var(--lt-text-placeholder);">
      <span v-for="s in semesterStages" :key="s.label">{{ s.label }}</span>
    </div>
  </div>
</template>

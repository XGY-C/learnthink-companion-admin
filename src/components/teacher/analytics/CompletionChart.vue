<script setup lang="ts">
import { computed } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  data: { range: string; count: number }[]
}>()

const rangeConfig: Record<string, { hex: string; label: string }> = {
  '0-20%': { hex: '#FF3B30', label: '掉队' },
  '20-40%': { hex: '#FF9F0A', label: '滞后' },
  '40-60%': { hex: '#2B6FFF', label: '正常' },
  '60-80%': { hex: '#6B9BFF', label: '良好' },
  '80-100%': { hex: '#34C759', label: '领先' },
}

const option = computed(() => {
  const cats = props.data.map(d => `${d.range}\n${rangeConfig[d.range]?.label || ''}`)
  const vals = props.data.map(d => d.count)
  const barColors = props.data.map(d => rangeConfig[d.range]?.hex || '#2B6FFF')

  return {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const raw = props.data[p.dataIndex].range
        const cfg = rangeConfig[raw]
        return `<div style="font-size:13px;font-weight:600;margin-bottom:4px">${raw} <span style="color:${cfg?.hex}">${cfg?.label}</span></div>`
          + `<div style="font-size:21px;font-weight:700;color:${barColors[p.dataIndex]}">${p.value} <small style="font-size:13px;font-weight:400;color:#8E8EA0">人</small></div>`
      },
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8,
      padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);',
    },
    grid: { left: '6%', right: '6%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category', data: cats,
      axisLine: { lineStyle: { color: '#E8ECF0' } },
      axisLabel: { color: '#8E8EA0', fontSize: 10, interval: 0, lineHeight: 18 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', name: '人数',
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } },
      axisLabel: { color: '#8E8EA0', fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: vals.map((v, i) => ({
        value: v,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: barColors[i] },
            { offset: 1, color: barColors[i] + '55' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
      })),
      barWidth: '50%',
      label: { show: true, position: 'top', color: '#8E8EA0', fontSize: 12, fontWeight: 600, formatter: (p: any) => `${p.value}人` },
      animationDuration: 600, animationEasing: 'cubicOut',
    }],
  }
})
</script>

<template>
  <div class="rounded-xl bg-white p-5 card-elevated">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">完成度分布</h3>
        <p class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">全班学生路径完成度分档统计</p>
      </div>
      <div class="flex items-center gap-2 text-xs" style="color: var(--lt-text-auxiliary);">
        <span v-for="(cfg, r) in rangeConfig" :key="r" class="flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-sm" :style="{ backgroundColor: cfg.hex }"></span>{{ cfg.label }}
        </span>
      </div>
    </div>
    <div class="h-56">
      <v-chart :option="option" autoresize />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { generateScoreDeepDive, type ScoreDeepDive } from '@/mock/teacherAnalytics'
import * as echarts from 'echarts'

const data = ref<ScoreDeepDive | null>(null)
onMounted(() => { data.value = generateScoreDeepDive() })

const diffColors = { easy: '#34C759', medium: '#FF9F0A', hard: '#FF3B30' }
const diffLabels = { easy: '简单', medium: '中等', hard: '困难' }

const correctRateOpt = computed(() => {
  if (!data.value) return {}
  const qs = data.value.questionStats
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => {
      const q = qs[p[0].dataIndex]
      return `<div style="font-weight:600;font-size:13px;margin-bottom:4px">${q.topic}</div><div style="font-size:11px;color:#666;margin-bottom:4px">${q.question}</div>正确率: <strong>${(q.correctRate * 100).toFixed(0)}%</strong><br>区分度: ${q.discrimination.toFixed(2)}<br>常见错误: ${q.topErrors.join('、')}`
    }, backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8, padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);' },
    grid: { left: '5%', right: '12%', bottom: '8%', top: '5%', containLabel: true },
    xAxis: { type: 'value', max: 1, axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%`, color: '#8E8EA0', fontSize: 10 }, splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } } },
    yAxis: { type: 'category', data: qs.map(q => q.topic), axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#5A5A72', fontSize: 11 } },
    series: [{
      type: 'bar', data: qs.map(q => ({
        value: q.correctRate,
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: q.correctRate > 0.7 ? '#34C759' : q.correctRate > 0.5 ? '#FF9F0A' : '#FF3B30' },
          { offset: 1, color: q.correctRate > 0.7 ? '#34C75966' : q.correctRate > 0.5 ? '#FF9F0A66' : '#FF3B3066' },
        ]), borderRadius: [0, 4, 4, 0] },
      })),
      barWidth: 18,
      label: { show: true, position: 'right', formatter: (p: any) => `${(p.value * 100).toFixed(0)}%`, color: '#8E8EA0', fontSize: 10, fontWeight: 600 },
      markLine: { silent: true, data: [{ xAxis: 0.6, label: { formatter: '60%', color: '#FF9F0A', fontSize: 10, position: 'end' }, lineStyle: { color: '#FF9F0A', type: 'dashed', width: 1.5 } }] },
      animationDuration: 600,
    }],
  }
})

const trendOpt = computed(() => {
  if (!data.value) return {}
  const t = data.value.recentTrend
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8, padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);' },
    grid: { left: '5%', right: '5%', bottom: '8%', top: '10%', containLabel: true },
    xAxis: { type: 'category', data: t.map(d => d.date), axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#8E8EA0', fontSize: 10 } },
    yAxis: { type: 'value', min: 0, max: 100, axisLine: { show: false }, splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } }, axisLabel: { color: '#8E8EA0', fontSize: 10 } },
    series: [
      { name: '优等生', type: 'line', data: t.map(d => d.topAvg), smooth: true, lineStyle: { color: '#34C759', width: 2 }, symbol: 'circle', symbolSize: 6, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#34C75915' }, { offset: 1, color: '#34C75902' }]) } },
      { name: '班级平均', type: 'line', data: t.map(d => d.classAvg), smooth: true, lineStyle: { color: '#2B6FFF', width: 2.5 }, symbol: 'circle', symbolSize: 6, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#2B6FFF22' }, { offset: 1, color: '#2B6FFF05' }]) } },
      { name: '后进生', type: 'line', data: t.map(d => d.bottomAvg), smooth: true, lineStyle: { color: '#FF3B30', width: 2, type: 'dashed' }, symbol: 'diamond', symbolSize: 6 },
    ],
    legend: { data: ['优等生', '班级平均', '后进生'], bottom: 0, textStyle: { color: '#8E8EA0', fontSize: 10 } },
  }
})
</script>

<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold" style="color: var(--lt-text-primary);">📝 成绩深度分析</h1>
        <p class="text-sm mt-1" style="color: var(--lt-text-auxiliary);">逐题正确率、得分趋势、进退步榜 — 挖掘成绩背后的真相</p>
      </div>
    </div>

    <template v-if="data">
      <!-- Overview stats bar -->
      <div class="grid grid-cols-6 gap-3">
        <div v-for="s in [
          { label: '平均分', value: data.overallStats.avgScore, color: 'var(--lt-brand)' },
          { label: '中位数', value: data.overallStats.median, color: 'var(--lt-ai)' },
          { label: '最高分', value: data.overallStats.highest, color: 'var(--lt-success)' },
          { label: '最低分', value: data.overallStats.lowest, color: 'var(--lt-danger)' },
          { label: '标准差', value: data.overallStats.stdDev, color: 'var(--lt-orange)' },
          { label: '及格率', value: (data.overallStats.passRate * 100).toFixed(0) + '%', color: data.overallStats.passRate > 0.7 ? 'var(--lt-success)' : 'var(--lt-warning)' },
        ]" :key="s.label" class="rounded-xl p-3 text-center card-elevated" :style="{ borderTop: `3px solid ${s.color}` }">
          <div class="text-xl font-bold" :style="{ color: s.color }">{{ s.value }}</div>
          <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">{{ s.label }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Correct rate bar chart -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">逐题正确率</h3>
          <div class="h-72"><v-chart :option="correctRateOpt" autoresize /></div>
        </div>
        <!-- Trend chart -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">得分趋势</h3>
          <div class="h-72"><v-chart :option="trendOpt" autoresize /></div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Top gainers -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-2 h-2 rounded-full" style="background: var(--lt-success);"></span>
            <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">进步最快</h3>
          </div>
          <div class="space-y-2">
            <div v-for="g in data.topGainers" :key="g.name" class="flex items-center justify-between py-2 px-3 rounded-lg" style="background: var(--lt-bg-page);">
              <span class="text-sm" style="color: var(--lt-text-primary);">{{ g.name }}</span>
              <div class="flex items-center gap-3">
                <span class="text-xs" style="color: var(--lt-text-auxiliary);">{{ g.previous }} → {{ g.current }}分</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style="background: rgba(52,199,89,0.12); color: var(--lt-success);">+{{ g.delta }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Top decliners -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-2 h-2 rounded-full" style="background: var(--lt-danger);"></span>
            <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">退步明显</h3>
          </div>
          <div class="space-y-2">
            <div v-for="d in data.topDecliners" :key="d.name" class="flex items-center justify-between py-2 px-3 rounded-lg" style="background: var(--lt-bg-page);">
              <span class="text-sm" style="color: var(--lt-text-primary);">{{ d.name }}</span>
              <div class="flex items-center gap-3">
                <span class="text-xs" style="color: var(--lt-text-auxiliary);">{{ d.previous }} → {{ d.current }}分</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style="background: rgba(255,59,48,0.1); color: var(--lt-danger);">{{ d.delta }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Question difficulty breakdown -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">题目难度分布</h3>
        <div class="grid grid-cols-3 gap-4">
          <div v-for="diff in ['easy', 'medium', 'hard'] as const" :key="diff" class="rounded-lg p-4" :style="{ background: diffColors[diff] + '08', border: `1px solid ${diffColors[diff]}20` }">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-3 h-3 rounded-full" :style="{ background: diffColors[diff] }"></span>
              <span class="text-sm font-medium" :style="{ color: diffColors[diff] }">{{ diffLabels[diff] }}</span>
            </div>
            <div class="text-2xl font-bold" :style="{ color: diffColors[diff] }">{{ data.questionStats.filter(q => q.difficulty === diff).length }}<span class="text-sm font-normal" style="color: var(--lt-text-auxiliary);"> 题</span></div>
            <div class="text-xs mt-1" style="color: var(--lt-text-auxiliary);">
              平均正确率 {{ (data.questionStats.filter(q => q.difficulty === diff).reduce((s, q) => s + q.correctRate, 0) / Math.max(data.questionStats.filter(q => q.difficulty === diff).length, 1) * 100).toFixed(0) }}%
            </div>
          </div>
        </div>
      </div>

      <!-- Common errors -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">常见错误答案</h3>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="q in data.questionStats.filter(q => q.topErrors.length > 0)" :key="q.questionId" class="flex items-center justify-between py-2 px-3 rounded-lg" style="background: var(--lt-bg-page);">
            <div>
              <span class="text-sm" style="color: var(--lt-text-primary);">{{ q.topic }}</span>
              <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">{{ q.question }}</div>
            </div>
            <div class="flex gap-1 flex-shrink-0 ml-2">
              <el-tag v-for="err in q.topErrors" :key="err" size="small" type="warning" effect="plain" style="border-radius: 4px;">{{ err }}</el-tag>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { generateRiskAnalytics, type RiskAnalytics } from '@/mock/teacherAnalytics'
import * as echarts from 'echarts'

const data = ref<RiskAnalytics | null>(null)
onMounted(() => { data.value = generateRiskAnalytics() })

const riskTrendOpt = computed(() => {
  if (!data.value) return {}
  const students = data.value.atRiskStudents
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8, padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);' },
    grid: { left: '5%', right: '5%', bottom: '8%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: students[0]?.predictedTrend.map(t => t.date) || [], axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#8E8EA0', fontSize: 10 } },
    yAxis: { type: 'value', name: '风险分', min: 0, max: 100, axisLine: { show: false }, splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } }, axisLabel: { color: '#8E8EA0', fontSize: 10 } },
    series: students.map((s, i) => ({
      name: s.name, type: 'line', data: s.predictedTrend.map(t => t.score), smooth: true,
      lineStyle: { width: 2 + (i === 0 ? 1 : 0), type: i === 0 ? 'solid' : 'dashed' },
      symbol: 'circle', symbolSize: i === 0 ? 8 : 5,
      itemStyle: { color: ['#FF3B30', '#FF9F0A', '#7C5CFC', '#FF8C42', '#2B6FFF'][i] },
      areaStyle: i === 0 ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#FF3B3022' }, { offset: 1, color: '#FF3B3005' }]) } : undefined,
    })),
    legend: { data: students.map(s => s.name), bottom: 0, textStyle: { color: '#8E8EA0', fontSize: 10 }, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    animationDuration: 800,
  }
})

const factorBreakdownOpt = computed(() => {
  if (!data.value) return {}
  const students = data.value.atRiskStudents
  const factors = students[0]?.factors.map(f => f.name) || []
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '15%', right: '5%', bottom: '5%', top: '5%' },
    xAxis: { type: 'value', name: '贡献占比 (%)', axisLabel: { formatter: '{value}%', color: '#8E8EA0', fontSize: 10 }, splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } } },
    yAxis: { type: 'category', data: students.map(s => s.name), axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#5A5A72', fontSize: 11 } },
    series: factors.map((f, fi) => ({
      name: f, type: 'bar', stack: 'total', barWidth: 20,
      data: students.map(s => {
        const factor = s.factors.find(fa => fa.name === f)
        return factor ? factor.contribution : 0
      }),
      itemStyle: { color: ['#FF3B30', '#FF9F0A', '#7C5CFC', '#FF8C42', '#FF6B6B'][fi], borderRadius: fi === factors.length - 1 ? [4, 4, 0, 0] : undefined },
      label: { show: fi === 0, position: 'inside', formatter: (p: any) => `${p.value}%`, color: '#fff', fontSize: 9 },
    })),
    legend: { data: factors, bottom: 0, textStyle: { color: '#8E8EA0', fontSize: 10 } },
  }
})
</script>

<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold" style="color: var(--lt-text-primary);">🚨 风险预警</h1>
        <p class="text-sm mt-1" style="color: var(--lt-text-auxiliary);">风险趋势预测、因素拆解、干预建议 — 提前一步，防止掉队</p>
      </div>
    </div>

    <template v-if="data">
      <!-- Risk threshold cards -->
      <div class="grid grid-cols-4 gap-4">
        <div v-for="t in data.riskThresholds" :key="t.level" class="rounded-xl p-4 text-center card-elevated" :style="{ borderTop: `3px solid ${t.color}` }">
          <div class="text-2xl font-bold" :style="{ color: t.color }">{{ t.count }}</div>
          <div class="text-sm font-medium mt-1" :style="{ color: t.color }">{{ t.level }}</div>
          <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">{{ t.min }}-{{ t.max }}分</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Risk trend -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">风险趋势预测</h3>
            <span class="text-xs flex items-center gap-1" style="color: var(--lt-text-auxiliary);"><span class="w-2 h-2 rounded-full" style="background: var(--lt-danger);"></span>高亮为首要关注</span>
          </div>
          <div class="h-64"><v-chart :option="riskTrendOpt" autoresize /></div>
        </div>
        <!-- Risk factor breakdown -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">风险因素拆解</h3>
          <div class="h-64"><v-chart :option="factorBreakdownOpt" autoresize /></div>
        </div>
      </div>

      <!-- At risk detail cards -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">需干预学生详情</h3>
        <div v-for="stu in data.atRiskStudents" :key="stu.id" class="rounded-xl bg-white p-5 card-elevated" :style="{ borderLeft: `4px solid ${stu.riskScore >= 80 ? '#FF3B30' : stu.riskScore >= 60 ? '#FF9F0A' : '#FF8C42'}` }">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <el-avatar :size="32" :style="{ background: stu.riskScore >= 80 ? 'var(--lt-danger)' : stu.riskScore >= 60 ? 'var(--lt-warning)' : 'var(--lt-orange)' }">{{ stu.name.charAt(0) }}</el-avatar>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold" style="color: var(--lt-text-primary);">{{ stu.name }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium text-white" :style="{ background: stu.riskScore >= 80 ? 'var(--lt-danger)' : stu.riskScore >= 60 ? 'var(--lt-warning)' : 'var(--lt-orange)' }">风险 {{ stu.riskScore }}</span>
                  <span v-if="stu.riskScore > stu.prevRiskScore" class="text-xs" style="color: var(--lt-danger);">↑ {{ stu.riskScore - stu.prevRiskScore }}</span>
                  <span v-else class="text-xs" style="color: var(--lt-success);">↓ {{ stu.prevRiskScore - stu.riskScore }}</span>
                </div>
                <div class="flex gap-2 mt-1.5">
                  <span v-for="f in stu.factors.filter(f => f.contribution > 10)" :key="f.name" class="text-xs px-1.5 py-0.5 rounded" :style="{ background: f.color + '15', color: f.color }">{{ f.name }} {{ f.contribution }}%</span>
                </div>
              </div>
            </div>
          </div>
          <div class="rounded-lg p-3 text-sm" style="background: var(--lt-bg-page);">
            <span class="text-xs font-medium" style="color: var(--lt-brand);">建议干预：</span>
            <span style="color: var(--lt-text-secondary);">{{ stu.suggestedIntervention }}</span>
          </div>
        </div>
      </div>

      <!-- Intervention library -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">干预措施库</h3>
        <div class="grid grid-cols-3 gap-3">
          <div v-for="iv in data.interventionLibrary" :key="iv.title" class="rounded-lg p-4 transition-all duration-200 hover:-translate-y-1 cursor-default" style="background: var(--lt-bg-page);">
            <div class="text-sm font-medium mb-1" style="color: var(--lt-text-primary);">{{ iv.title }}</div>
            <div class="text-xs mb-3" style="color: var(--lt-text-auxiliary);">{{ iv.desc }}</div>
            <div class="flex items-center justify-between text-xs">
              <div class="flex gap-1">
                <span v-for="tag in iv.targetTags" :key="tag" class="px-1.5 py-0.5 rounded" style="background: rgba(255,59,48,0.08); color: var(--lt-danger);">{{ tag }}</span>
              </div>
              <span style="color: var(--lt-text-auxiliary);">缓解 {{ iv.effectPct }}%</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

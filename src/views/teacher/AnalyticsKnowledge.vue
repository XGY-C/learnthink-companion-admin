<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { generateKnowledgeAnalytics, type KnowledgeAnalytics } from '@/mock/teacherAnalytics'
import * as echarts from 'echarts'

const data = ref<KnowledgeAnalytics | null>(null)
onMounted(() => { data.value = generateKnowledgeAnalytics() })

const heatmapOption = computed(() => {
  if (!data.value) return {}
  const students = [...new Set(data.value.kpMastery.map(m => m.studentName))]
  const kps = [...new Set(data.value.kpMastery.map(m => m.kpName))]
  const matrix = kps.map(kp => students.map(sn => {
    const entry = data.value!.kpMastery.find(m => m.studentName === sn && m.kpName === kp)
    return entry ? entry.mastery : 0
  }))
  return {
    tooltip: {
      position: 'top',
      formatter: (p: any) => {
        const stu = students[p.data[1]]
        const kp = kps[p.data[0]]
        const val = matrix[p.data[0]]?.[p.data[1]] ?? 0
        return `${stu}<br>${kp}: <strong>${val}%</strong>`
      },
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E8ECF0', borderWidth: 1, borderRadius: 8, padding: [10, 14], extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);',
    },
    grid: { left: '12%', right: '6%', bottom: '18%', top: '3%' },
    xAxis: { type: 'category', data: students, axisLabel: { color: '#8E8EA0', fontSize: 9, interval: 0, rotate: 30 }, axisLine: { lineStyle: { color: '#E8ECF0' } } },
    yAxis: { type: 'category', data: kps, axisLabel: { color: '#5A5A72', fontSize: 10 }, axisLine: { lineStyle: { color: '#E8ECF0' } } },
    visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#FFE0E0', '#FFB3B3', '#FF8A80', '#69F0AE', '#00C853'] }, textStyle: { color: '#8E8EA0', fontSize: 10 } },
    series: [{
      type: 'heatmap', data: kps.flatMap((kp, i) => students.map((_, j) => [i, j, matrix[i]?.[j] ?? 0])),
      label: { show: true, color: '#1A1A2E', fontSize: 9, formatter: (p: any) => `${matrix[p.data[0]]?.[p.data[1]] ?? ''}` },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' } },
      animationDuration: 600,
    }],
  }
})

const corrOption = computed(() => {
  if (!data.value) return {}
  const c = data.value.correlations
  const kps = [...new Set(c.flatMap(x => [x.source, x.target]))]
  const nodes = kps.map(kp => ({ name: kp, itemStyle: { color: '#2B6FFF' }, symbolSize: 40, label: { color: '#5A5A72', fontSize: 10 } }))
  const links = c.map(corr => ({
    source: corr.source, target: corr.target,
    lineStyle: { color: corr.strength > 0.7 ? '#7C5CFC' : '#A3C4FF', width: corr.strength * 5, curveness: 0.2, opacity: 0.7 },
    label: { show: true, formatter: (corr.strength * 100).toFixed(0) + '%', color: '#8E8EA0', fontSize: 9 },
  }))
  return {
    tooltip: { trigger: 'item', formatter: (p: any) => p.data.name ? `${p.data.name}` : `${p.data.source} ↔ ${p.data.target}<br>关联强度: ${(p.data.lineStyle.width / 5 * 100).toFixed(0)}%` },
    series: [{
      type: 'graph', layout: 'force', data: nodes, links,
      force: { repulsion: 400, edgeLength: 150, gravity: 0.1 },
      roam: true, draggable: true,
      lineStyle: { color: 'source', curveness: 0.3 },
      label: { show: true, fontSize: 10, color: '#5A5A72' },
      animationDuration: 500,
    }],
  }
})

const kpRankingOpt = computed(() => {
  if (!data.value) return {}
  const sorted = [...data.value.kpAvgMastery].sort((a, b) => a.avgMastery - b.avgMastery)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '20%', right: '5%', bottom: '5%', top: '5%' },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#8E8EA0', fontSize: 10 }, splitLine: { lineStyle: { color: '#EEF1F5', type: 'dashed' } } },
    yAxis: { type: 'category', data: sorted.map(s => s.kpName), axisLine: { lineStyle: { color: '#E8ECF0' } }, axisLabel: { color: '#5A5A72', fontSize: 11 } },
    series: [{
      type: 'bar', data: sorted.map(s => ({
        value: s.avgMastery,
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: s.avgMastery < 50 ? '#FF3B30' : s.avgMastery < 65 ? '#FF9F0A' : '#2B6FFF' },
          { offset: 1, color: s.avgMastery < 50 ? '#FF3B3066' : s.avgMastery < 65 ? '#FF9F0A66' : '#2B6FFF66' },
        ]), borderRadius: [0, 4, 4, 0] },
      })),
      barWidth: 20,
      label: { show: true, position: 'right', formatter: (p: any) => `${p.value}%`, color: '#8E8EA0', fontSize: 10 },
      markLine: { silent: true, data: [{ xAxis: 60, lineStyle: { color: '#FF9F0A', type: 'dashed' } }] },
      animationDuration: 600,
    }],
  }
})
</script>

<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold" style="color: var(--lt-text-primary);">🧠 知识点全景</h1>
        <p class="text-sm mt-1" style="color: var(--lt-text-auxiliary);">全班 × 知识点掌握热力图、关联分析、薄弱排名</p>
      </div>
    </div>

    <template v-if="data">
      <!-- Big heatmap -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">学生 × 知识点掌握矩阵</h3>
          <div class="flex items-center gap-2 text-xs" style="color: var(--lt-text-auxiliary);">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded" style="background: #FFE0E0;"></span>薄弱</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded" style="background: #69F0AE;"></span>中等</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded" style="background: #00C853;"></span>掌握</span>
          </div>
        </div>
        <div class="h-[420px]"><v-chart :option="heatmapOption" autoresize /></div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- KP ranking -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">知识点掌握排名</h3>
          <div class="h-72"><v-chart :option="kpRankingOpt" autoresize /></div>
        </div>
        <!-- Weak students per KP -->
        <div class="rounded-xl bg-white p-5 card-elevated">
          <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">各知识点薄弱学生数</h3>
          <div class="space-y-3">
            <div v-for="kp in [...data.kpAvgMastery].sort((a, b) => b.studentCount - a.studentCount)" :key="kp.kpName" class="flex items-center gap-3">
              <span class="text-xs w-20" style="color: var(--lt-text-secondary);">{{ kp.kpName }}</span>
              <div class="flex-1 h-4 rounded-full overflow-hidden" style="background: var(--lt-bg-page);">
                <div class="h-full rounded-full transition-all duration-700" :style="{ width: (kp.studentCount / 16 * 100) + '%', background: kp.studentCount > 10 ? 'var(--lt-danger)' : kp.studentCount > 6 ? 'var(--lt-warning)' : 'var(--lt-success)' }"></div>
              </div>
              <span class="text-xs w-12 text-right font-medium" :style="{ color: kp.studentCount > 10 ? 'var(--lt-danger)' : kp.studentCount > 6 ? 'var(--lt-warning)' : 'var(--lt-success)' }">{{ kp.studentCount }}/16</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Correlation graph -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">知识点关联强度</h3>
        <p class="text-xs mb-3" style="color: var(--lt-text-auxiliary);">连线越粗表示掌握度关联越强 — 一个知识点弱，关联知识点往往也弱</p>
        <div class="h-72"><v-chart :option="corrOption" autoresize /></div>
      </div>

      <!-- Common error pairs -->
      <div class="rounded-xl bg-white p-5 card-elevated">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">高频错误组合</h3>
        <p class="text-xs mb-3" style="color: var(--lt-text-auxiliary);">同时答错的题目对，反映知识点间的薄弱传导</p>
        <div class="grid grid-cols-3 gap-3">
          <div v-for="pair in data.commonErrorPairs" :key="pair.pair.join('-')" class="rounded-lg p-3 flex items-center justify-between" style="background: var(--lt-bg-page);">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded" style="background: rgba(255,59,48,0.1); color: var(--lt-danger);">{{ pair.pair[0] }}</span>
              <span style="color: var(--lt-text-placeholder);">+</span>
              <span class="text-xs px-2 py-0.5 rounded" style="background: rgba(255,59,48,0.08); color: var(--lt-danger);">{{ pair.pair[1] }}</span>
            </div>
            <span class="text-xs font-semibold" style="color: var(--lt-text-auxiliary);">{{ pair.frequency }}人</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

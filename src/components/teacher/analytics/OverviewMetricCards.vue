<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: {
    totalStudents: number
    avgLearningHours: number
    avgPathProgress: number
    avgQuizScore: number
    atRiskCount: number
  }
}>()

const cards = computed(() => [
  {
    id: 'students', icon: '👥', label: '班级人数',
    value: props.data.totalStudents, unit: '人', sub: '已选课人数',
    color: 'var(--lt-brand)', bg: 'rgba(43, 111, 255, 0.08)',
  },
  {
    id: 'hours', icon: '⏱', label: '平均学习时长',
    value: props.data.avgLearningHours, unit: 'h', sub: '累计时/人',
    color: 'var(--lt-ai)', bg: 'rgba(124, 92, 252, 0.08)',
  },
  {
    id: 'progress', icon: '📈', label: '平均完成度',
    value: `${props.data.avgPathProgress}%`, unit: '', sub: '路径完成度',
    color: 'var(--lt-success)', bg: 'rgba(52, 199, 89, 0.08)',
  },
  {
    id: 'score', icon: '📝', label: '平均测验分',
    value: props.data.avgQuizScore, unit: '分', sub: '测验均分',
    color: 'var(--lt-orange)', bg: 'rgba(255, 140, 66, 0.08)',
  },
  {
    id: 'risk', icon: '⚠️', label: '需关注人数',
    value: props.data.atRiskCount, unit: '人', sub: '命中风险条件',
    color: 'var(--lt-danger)', bg: 'rgba(255, 59, 48, 0.08)',
  },
])
</script>

<template>
  <div class="grid grid-cols-5 gap-4">
    <div
      v-for="(card, idx) in cards" :key="card.id"
      class="rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 cursor-default"
      :style="{ backgroundColor: card.bg, border: `1px solid ${card.color}15`, animationDelay: `${idx * 0.06}s` }"
    >
      <div class="flex items-center justify-between mb-3">
        <span class="text-lg">{{ card.icon }}</span>
        <span v-if="card.id === 'risk' && data.atRiskCount > 0" class="px-2 py-0.5 rounded-full text-xs font-semibold text-white" :style="{ backgroundColor: card.color }">需干预</span>
      </div>
      <div class="text-2xl font-bold mb-0.5" :style="{ color: card.color }">
        <span>{{ card.value }}</span>
        <span v-if="card.unit" class="text-sm font-normal ml-0.5" style="color: var(--lt-text-auxiliary);">{{ card.unit }}</span>
      </div>
      <div class="text-xs" style="color: var(--lt-text-auxiliary);">{{ card.label }}</div>
      <div class="text-xs mt-0.5 opacity-60" style="color: var(--lt-text-auxiliary);">{{ card.sub }}</div>
    </div>
  </div>
</template>

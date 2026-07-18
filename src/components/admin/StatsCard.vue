<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { User, Reading, MagicStick, CircleCheck, Document, Clock, Bell, WarningFilled, TrendCharts } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  icon: string
  label: string
  value: number | string
  trend?: 'up' | 'down' | null
  trendValue?: string
  trendLabel?: string
  color?: string
}>(), {
  trend: null,
  color: 'var(--lt-brand)'
})

const iconMap: Record<string, Component> = {
  user: User, reading: Reading, magicstick: MagicStick,
  circlecheck: CircleCheck, document: Document,
  clock: Clock, bell: Bell, warning: WarningFilled, trendcharts: TrendCharts,
}

const iconComp = computed(() => {
  const name = props.icon.toLowerCase()
  return iconMap[name] || Document
})
</script>

<template>
  <div
    class="rounded-lg p-5 card-elevated relative overflow-hidden"
    style="background: var(--lt-bg-card);"
  >
    <!-- 装饰水印图标 -->
    <div class="absolute right-0 top-0 opacity-[0.13] pointer-events-none translate-x-1 -translate-y-1">
      <el-icon :size="88" :style="{ color }">
        <component :is="iconComp" />
      </el-icon>
    </div>

    <div class="relative z-10">
      <div v-if="trend" class="flex items-center justify-end gap-1 text-xs font-medium mb-2" :style="{ color: trend === 'up' ? 'var(--lt-success)' : 'var(--lt-danger)' }">
        <span>{{ trend === 'up' ? '↑' : '↓' }}</span>
        <span>{{ trendValue }}</span>
        <span v-if="trendLabel" class="opacity-60">{{ trendLabel }}</span>
      </div>
      <div class="text-2xl font-bold animate-count-up tabular-nums" style="color: var(--lt-text-primary);">
        {{ typeof value === 'number' ? value.toLocaleString() : value }}
      </div>
      <div class="text-xs mt-1" style="color: var(--lt-text-auxiliary);">{{ label }}</div>
    </div>
  </div>
</template>

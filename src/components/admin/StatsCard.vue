<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { User, Reading, MagicStick, CircleCheck, Document } from '@element-plus/icons-vue'

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
  user: User, reading: Reading, magicStick: MagicStick,
  circleCheck: CircleCheck, document: Document
}

const iconComp = computed(() => {
  const name = props.icon.toLowerCase()
  return iconMap[name] || Document
})
</script>

<template>
  <div
    class="rounded-lg p-5 card-elevated"
    style="background: var(--lt-bg-card);"
  >
    <div class="flex items-start justify-between mb-3">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center"
        :style="{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }"
      >
        <el-icon :size="20" color="white">
          <component :is="iconComp" />
        </el-icon>
      </div>
      <div v-if="trend" class="flex items-center gap-1 text-xs font-medium" :style="{ color: trend === 'up' ? 'var(--lt-success)' : 'var(--lt-danger)' }">
        <span>{{ trend === 'up' ? '↑' : '↓' }}</span>
        <span>{{ trendValue }}</span>
        <span v-if="trendLabel" class="opacity-60">{{ trendLabel }}</span>
      </div>
    </div>
    <div class="text-2xl font-bold animate-count-up" style="color: var(--lt-text-primary);">
      {{ typeof value === 'number' ? value.toLocaleString() : value }}
    </div>
    <div class="text-xs mt-1" style="color: var(--lt-text-auxiliary);">{{ label }}</div>
  </div>
</template>

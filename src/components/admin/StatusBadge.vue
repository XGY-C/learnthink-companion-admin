<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
  label?: string
}>()

const config = computed(() => {
  const map: Record<string, { color: string; bg: string; border: string; text: string }> = {
    pending:     { color: 'var(--lt-text-placeholder)', bg: '#F5F5F8', border: '#E5E5EA', text: '待处理' },
    processing:  { color: 'var(--lt-brand)', bg: 'var(--lt-brand-lightest)', border: 'var(--lt-brand-lighter)', text: '处理中' },
    completed:   { color: 'var(--lt-success)', bg: 'rgba(52,199,89,0.08)', border: 'rgba(52,199,89,0.2)', text: '已完成' },
    failed:      { color: 'var(--lt-danger)', bg: 'rgba(255,59,48,0.08)', border: 'rgba(255,59,48,0.2)', text: '失败' },
    approved:    { color: 'var(--lt-success)', bg: 'rgba(52,199,89,0.08)', border: 'rgba(52,199,89,0.2)', text: '已通过' },
    rejected:    { color: 'var(--lt-danger)', bg: 'rgba(255,59,48,0.08)', border: 'rgba(255,59,48,0.2)', text: '已驳回' },
    medium:      { color: 'var(--lt-warning)', bg: 'rgba(255,159,10,0.08)', border: 'rgba(255,159,10,0.2)', text: '存疑' },
    enabled:     { color: 'var(--lt-success)', bg: 'rgba(52,199,89,0.08)', border: 'rgba(52,199,89,0.2)', text: '启用' },
    disabled:    { color: 'var(--lt-danger)', bg: 'rgba(255,59,48,0.08)', border: 'rgba(255,59,48,0.2)', text: '禁用' },
  }
  return map[props.status] || map.pending
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
    :style="{
      color: config.color,
      background: config.bg,
      border: `1px solid ${config.border}`
    }"
  >
    <span
      v-if="status === 'processing'"
      class="w-1.5 h-1.5 rounded-full animate-pulse-subtle"
      :style="{ backgroundColor: config.color }"
    />
    <span
      v-else
      class="w-1.5 h-1.5 rounded-full"
      :style="{ backgroundColor: config.color }"
    />
    {{ label || config.text }}
  </span>
</template>

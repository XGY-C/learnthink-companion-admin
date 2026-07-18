<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProfileData } from '@/mock/teacherAnalytics'

const props = defineProps<{
  profiles: ProfileData[]
}>()

const compareMode = ref(false)
const selectedV1 = ref<string | null>(null)
const selectedV2 = ref<string | null>(null)

const triggerIcons: Record<string, string> = { chat: '💬', quiz: '📝', path_update: '🔄' }

const compareOption = computed(() => {
  if (!compareMode.value || !selectedV1.value || !selectedV2.value) return null
  const v1 = props.profiles.find(p => p.version === Number(selectedV1.value))
  const v2 = props.profiles.find(p => p.version === Number(selectedV2.value))
  if (!v1 || !v2) return null

  return {
    radar: {
      indicator: v1.radarData.map(d => ({ name: d.name, max: 100 })),
      radius: '60%', center: ['50%', '50%'],
      axisName: { color: '#8E8EA0', fontSize: 11 },
      splitArea: { areaStyle: { color: ['#F5F7FA', '#EEF1F5', '#E8ECF0', '#DEE3E8'] } },
      axisLine: { lineStyle: { color: '#E8ECF0' } },
      splitLine: { lineStyle: { color: '#E8ECF0' } },
    },
    series: [{
      type: 'radar',
      data: [
        { value: v1.radarData.map(d => d.value), name: `v${v1.version}`, itemStyle: { color: '#FF9F0A' }, areaStyle: { color: 'rgba(255,159,10,0.08)' }, lineStyle: { color: '#FF9F0A', width: 2, type: 'dashed' } },
        { value: v2.radarData.map(d => d.value), name: `v${v2.version}`, itemStyle: { color: '#2B6FFF' }, areaStyle: { color: 'rgba(43,111,255,0.12)' }, lineStyle: { color: '#2B6FFF', width: 2 } },
      ],
      animationDuration: 800,
    }],
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Timeline -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium" style="color: var(--lt-text-primary);">版本时间线</h4>
        <el-switch v-model="compareMode" active-text="版本对比" size="small" inline-prompt style="--el-switch-on-color: var(--lt-brand);" />
      </div>
      <div class="rounded-lg p-4" style="background: var(--lt-bg-page);">
        <div v-for="(p, idx) in [...props.profiles].reverse()" :key="p.version" class="flex gap-4 pb-4 relative" :class="{ 'border-b': idx < props.profiles.length - 1 }" :style="{ borderColor: 'var(--lt-border)' }">
          <div class="flex flex-col items-center">
            <div class="w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1.5" :style="{ borderColor: idx === 0 ? 'var(--lt-brand)' : 'var(--lt-text-placeholder)', backgroundColor: idx === 0 ? 'var(--lt-brand)' : 'white' }"></div>
            <div v-if="idx < props.profiles.length - 1" class="w-0.5 flex-1 mt-1" style="background: var(--lt-border);"></div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs px-1.5 py-0.5 rounded font-medium" :style="{ background: 'rgba(43,111,255,0.08)', color: 'var(--lt-brand)' }">v{{ p.version }}</span>
                <span class="text-xs" style="color: var(--lt-text-auxiliary);">{{ p.createdAt.slice(0, 10) }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded" :style="{ background: 'rgba(142,142,160,0.08)', color: 'var(--lt-text-auxiliary)' }">{{ triggerIcons[p.trigger] || '📌' }} {{ p.label }}</span>
              </div>
              <div v-if="compareMode" class="flex items-center gap-1">
                <el-checkbox v-if="selectedV1 === String(p.version) || selectedV2 === String(p.version) || (!selectedV1 && !selectedV2) || (selectedV1 && selectedV2)"
                  :model-value="selectedV1 === String(p.version)" :value="String(p.version)" size="small"
                  @change="(v: boolean) => { if (v) { if (!selectedV1) selectedV1 = String(p.version); else if (String(p.version) !== selectedV2) selectedV1 = String(p.version); } else selectedV1 = null }">基准</el-checkbox>
                <el-checkbox
                  :model-value="selectedV2 === String(p.version)" :value="String(p.version)" size="small"
                  @change="(v: boolean) => { if (v) { if (!selectedV2) selectedV2 = String(p.version); else if (String(p.version) !== selectedV1) selectedV2 = String(p.version); } else selectedV2 = null }">对比</el-checkbox>
              </div>
            </div>
            <div class="mt-1.5 space-y-0.5">
              <div v-for="(s, si) in p.summary" :key="si" class="text-xs flex items-start gap-1.5" style="color: var(--lt-text-secondary);">
                <span style="color: var(--lt-text-placeholder);">•</span><span>{{ s }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Compare radar -->
    <div v-if="compareMode && selectedV1 && selectedV2 && compareOption">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium" style="color: var(--lt-text-primary);">版本对比 — v{{ selectedV1 }} vs v{{ selectedV2 }}</h4>
      </div>
      <div class="rounded-lg p-4" style="background: var(--lt-bg-page);">
        <div class="h-56"><v-chart :option="compareOption" autoresize /></div>
        <div class="flex justify-center gap-6 mt-2 text-xs">
          <span class="flex items-center gap-1.5"><span class="w-4 h-0.5 rounded" style="background: #FF9F0A;"></span> v{{ selectedV1 }}</span>
          <span class="flex items-center gap-1.5"><span class="w-4 h-0.5 rounded" style="background: #2B6FFF;"></span> v{{ selectedV2 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

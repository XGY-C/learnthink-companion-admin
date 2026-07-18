<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getStudentDetail, type StudentDetailData } from '@/mock/teacherAnalytics'
import OverviewTab from './OverviewTab.vue'
import ProgressTab from './ProgressTab.vue'
import ScoreTab from './ScoreTab.vue'
import ProfileHistoryTab from './ProfileHistoryTab.vue'

const props = defineProps<{
  visible: boolean
  studentId: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref('overview')
const detailData = ref<StudentDetailData | null>(null)

watch(() => props.studentId, (id) => {
  if (id) { detailData.value = getStudentDetail(id); activeTab.value = 'overview' }
})

const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'progress', label: '进度' },
  { key: 'score', label: '成绩' },
  { key: 'history', label: '画像历史' },
]

const riskSummary = computed(() => {
  if (!detailData.value) return ''
  const s = detailData.value.stats
  const parts: string[] = []
  if (s.totalLearningMinutes < 2400) parts.push('低投入')
  if (s.pathProgressPercent < 30) parts.push('低完成')
  if (s.avgQuizScore < 60) parts.push('低分')
  return parts.join(' · ')
})
</script>

<template>
  <el-drawer :model-value="visible" @update:model-value="(v: boolean) => !v && emit('close')"
    :size="520" :with-header="false" :destroy-on-close="true" class="analytics-drawer">
    <div v-if="detailData" class="flex flex-col h-full">
      <div class="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style="border-color: var(--lt-border);">
        <div class="flex items-center gap-3">
          <el-avatar :size="36" style="background: linear-gradient(135deg, var(--lt-brand), var(--lt-brand-dark)); font-size: 14px;">
            {{ studentId ? studentId.charAt(studentId.length - 1) : '?' }}
          </el-avatar>
          <div>
            <div class="text-sm font-semibold" style="color: var(--lt-text-primary);">学生详情</div>
            <div class="text-xs" style="color: var(--lt-text-auxiliary);">ID: {{ studentId }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <el-tag v-if="riskSummary" size="small" type="danger" effect="plain" style="border-radius: 4px;">{{ riskSummary }}</el-tag>
          <el-button circle size="small" class="!border-0" style="color: var(--lt-text-auxiliary);" @click="emit('close')">✕</el-button>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-3 px-5 py-4 flex-shrink-0">
        <div class="rounded-lg p-3 text-center" style="background: rgba(43,111,255,0.08);">
          <div class="text-lg font-bold" style="color: var(--lt-brand);">{{ Math.round(detailData.stats.totalLearningMinutes / 60) }}<span class="text-xs font-normal" style="color: var(--lt-text-auxiliary);">h</span></div>
          <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">累计学习</div>
        </div>
        <div class="rounded-lg p-3 text-center" style="background: rgba(124,92,252,0.08);">
          <div class="text-lg font-bold" style="color: var(--lt-ai);">{{ detailData.stats.resourceCompleted }}<span class="text-xs font-normal" style="color: var(--lt-text-auxiliary);">个</span></div>
          <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">完成资源</div>
        </div>
        <div class="rounded-lg p-3 text-center" style="background: rgba(52,199,89,0.08);">
          <div class="text-lg font-bold" style="color: var(--lt-success);">{{ detailData.stats.pathProgressPercent }}<span class="text-xs font-normal" style="color: var(--lt-text-auxiliary);">%</span></div>
          <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">路径完成</div>
        </div>
        <div class="rounded-lg p-3 text-center" style="background: rgba(255,140,66,0.08);">
          <div class="text-lg font-bold" style="color: var(--lt-orange);">{{ detailData.stats.avgQuizScore }}<span class="text-xs font-normal" style="color: var(--lt-text-auxiliary);">分</span></div>
          <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">测验均分</div>
        </div>
      </div>

      <div class="px-5 flex-shrink-0">
        <div class="flex border-b" style="border-color: var(--lt-border);">
          <button v-for="tab in tabs" :key="tab.key"
            class="px-4 py-2.5 text-sm font-medium transition-all duration-200 relative outline-none"
            :style="{ color: activeTab === tab.key ? 'var(--lt-brand)' : 'var(--lt-text-auxiliary)' }"
            @click="activeTab = tab.key">
            {{ tab.label }}
            <span v-if="activeTab === tab.key" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style="background: var(--lt-brand);"></span>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4">
        <OverviewTab v-if="activeTab === 'overview'" :stats="detailData.stats" :profile="detailData.profile" />
        <ProgressTab v-else-if="activeTab === 'progress'" :plan="detailData.plan" :kp-anchors="detailData.kpAnchors" />
        <ScoreTab v-else-if="activeTab === 'score'" :attempts="detailData.quizAttempts.attempts" :class-avg-score="detailData.quizAttempts.classAvgScore" />
        <ProfileHistoryTab v-else-if="activeTab === 'history'" :profiles="detailData.profiles" />
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
:deep(.el-drawer) { border-radius: 12px 0 0 12px; }
:deep(.el-drawer__body) { padding: 0; }
</style>

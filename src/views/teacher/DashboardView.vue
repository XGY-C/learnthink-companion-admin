<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { apiFetch } from '@/utils/api'
import StatsCard from '@/components/admin/StatsCard.vue'
import { useRouter } from 'vue-router'
import { Sunny, Moon, Cloudy, Sunset, Refresh } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')
const lastUpdated = ref<Date | null>(null)

interface CourseSummary {
  id: string
  name: string
  emoji: string
  studentCount?: number
  resourceCount?: number
}

const data = ref({
  courseCount: 0,
  totalStudents: 0,
  totalResourceItems: 0,
  pendingReview: 0,
  courses: [] as CourseSummary[]
})

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await apiFetch<any>('/teacher/dashboard')
    data.value = res.data
    lastUpdated.value = new Date()
  } catch (err: any) {
    errorMessage.value = err?.message || '数据加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const userInfo = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
})

const displayName = computed(() => userInfo.value.displayName || userInfo.value.username || '教师')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const todayStr = computed(() => new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
}))

const greetingIconComp = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return Moon
  if (h < 12) return Sunny
  if (h < 18) return Cloudy
  return Sunset
})

const lastUpdatedStr = computed(() => {
  if (!lastUpdated.value) return ''
  return lastUpdated.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
})

const accentColors = ['var(--lt-brand)', 'var(--lt-success)', 'var(--lt-ai)', 'var(--lt-orange)']

function getAccent(index: number) {
  return accentColors[index % accentColors.length]
}

const statCards = computed(() => [
  { icon: 'reading' as const, label: '授课课程', value: data.value.courseCount, color: 'var(--lt-brand)' },
  { icon: 'user' as const, label: '累计学生', value: data.value.totalStudents, color: 'var(--lt-success)' },
  { icon: 'document' as const, label: '生成资源', value: data.value.totalResourceItems, color: 'var(--lt-ai)' },
  { icon: 'clock' as const, label: '待审核', value: data.value.pendingReview, color: 'var(--lt-orange)' },
])

function goToCourse(courseId: string) {
  router.push(`/teacher/courses/${courseId}/knowledge`)
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <h1 class="sr-only">我的工作台</h1>

    <!-- Welcome banner -->
    <div class="rounded-xl p-6 mb-6 relative overflow-hidden bg-brand-gradient">
      <div class="relative z-10">
        <div class="flex items-center gap-2 text-white/80 text-xs mb-2">
          <span>{{ todayStr }}</span>
          <span class="w-1 h-1 rounded-full bg-white/30" />
          <span class="px-2 py-0.5 rounded-full text-xs bg-white/15 text-white/75">教师</span>
        </div>
        <h2 class="text-lg font-bold text-white mb-0.5 flex items-center gap-2">
          <el-icon :size="22"><component :is="greetingIconComp" /></el-icon>
          {{ greeting }}，{{ displayName }}
        </h2>
        <p class="text-sm text-white/65">您所授课程的学情与资源概览</p>
      </div>
      <div class="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
    </div>

    <!-- 操作条：刷新 + 最后更新时间 -->
    <div class="flex items-center justify-end gap-3 mb-4">
      <span v-if="lastUpdatedStr" class="text-xs" style="color: var(--lt-text-auxiliary);">
        最后更新 {{ lastUpdatedStr }}
      </span>
      <el-button
        size="small"
        :icon="Refresh"
        :loading="loading"
        @click="loadData"
      >刷新</el-button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="i in 4" :key="i" class="rounded-lg p-5" style="background: var(--lt-bg-card);">
        <el-skeleton :rows="2" animated />
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="errorMessage" class="rounded-xl p-10 text-center" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
      <p class="text-sm mb-4" style="color: var(--lt-text-secondary);">{{ errorMessage }}</p>
      <el-button type="primary" :icon="Refresh" @click="loadData">重试</el-button>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          v-for="(card, idx) in statCards" :key="idx"
          class="opacity-0 animate-fade-in-up"
          :style="{ animationDelay: `${idx * 80}ms`, animationFillMode: 'forwards' }"
        >
          <StatsCard v-bind="card" />
        </div>
      </div>

      <!-- My Courses -->
      <div class="rounded-xl p-6" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-sm font-semibold" style="color: var(--lt-text-primary);">
            我的课程
            <span class="ml-1.5 text-xs font-normal" style="color: var(--lt-text-auxiliary);">({{ data.courses.length }})</span>
          </h3>
        </div>

        <div v-if="data.courses.length === 0" class="text-sm py-8 text-center" style="color: var(--lt-text-placeholder);">
          暂无授课课程，请联系管理员指派
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(c, idx) in data.courses"
            :key="c.id"
            role="button"
            tabindex="0"
            :aria-label="`进入课程 ${c.name}`"
            class="course-card group relative rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-4"
            style="background: var(--lt-bg-page); border: 1px solid var(--lt-border);"
            @click="goToCourse(c.id)"
            @keyup.enter="goToCourse(c.id)"
            @keyup.space.prevent="goToCourse(c.id)"
          >
            <div class="w-1 self-stretch rounded-full flex-shrink-0" :style="{ background: getAccent(idx) }" />
            <span
              class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xl leading-none"
              :style="{ background: `${getAccent(idx)}1A` }"
            >
              {{ c.emoji || '📚' }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium leading-tight mb-1 truncate" style="color: var(--lt-text-primary);">{{ c.name }}</div>
              <div class="flex items-center gap-3 text-xs mb-1.5" style="color: var(--lt-text-auxiliary);">
                <span v-if="c.studentCount !== undefined">{{ c.studentCount }} 学生</span>
                <span v-if="c.resourceCount !== undefined">{{ c.resourceCount }} 资源</span>
              </div>
              <div class="flex items-center gap-1 text-xs transition-all duration-200 group-hover:translate-x-1" style="color: var(--lt-text-auxiliary);">
                <span>进入课程</span>
                <span class="inline-block transition-transform duration-200 group-hover:translate-x-0.5">-></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.45s ease-out both;
}

/* 课程卡：键盘焦点态 */
.course-card:focus-visible {
  outline: 2px solid var(--lt-brand);
  outline-offset: 2px;
}

/* 课程卡：按压反馈 */
.course-card:active {
  transform: scale(0.98);
}

/* 屏幕阅读器专用 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 尊重减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up {
    animation: none;
    opacity: 1;
  }
  .course-card {
    transition: none;
  }
  .course-card:active {
    transform: none;
  }
}
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from '@/utils/api'
import StatsCard from '@/components/admin/StatsCard.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)

const data = ref({
  courseCount: 0,
  totalStudents: 0,
  totalResourceItems: 0,
  pendingReview: 0,
  courses: [] as { id: string; name: string; emoji: string }[]
})

async function loadData() {
  loading.value = true
  try {
    const res = await apiFetch<any>('/teacher/dashboard')
    data.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="p-6">
    <PageHeader title="我的工作台" description="您所授课程的学情与资源概览" />

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="i in 4" :key="i" class="rounded-lg p-5" style="background: var(--lt-bg-card);">
        <el-skeleton :rows="2" animated />
      </div>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard icon="reading" label="授课课程" :value="data.courseCount" color="var(--lt-brand)" />
        <StatsCard icon="user" label="累计学生" :value="data.totalStudents" color="var(--lt-success)" />
        <StatsCard icon="document" label="生成资源" :value="data.totalResourceItems" color="var(--lt-ai)" />
        <StatsCard icon="checked" label="待审核" :value="data.pendingReview" color="var(--lt-orange)" />
      </div>

      <div class="rounded-lg p-6" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
        <h3 class="text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">我的课程</h3>
        <div v-if="data.courses.length === 0" class="text-sm py-8 text-center" style="color: var(--lt-text-placeholder);">
          暂无授课课程，请联系管理员指派
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="c in data.courses"
            :key="c.id"
            class="rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md"
            style="background: var(--lt-bg-page); border: 1px solid var(--lt-border);"
            @click="router.push(`/teacher/courses/${c.id}/knowledge`)"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ c.emoji || '📚' }}</span>
              <span class="text-sm font-medium" style="color: var(--lt-text-primary);">{{ c.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

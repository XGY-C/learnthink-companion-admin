<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from '@/utils/api'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'

const router = useRouter()
const loading = ref(false)
const students = ref<any[]>([])

async function fetchStudents() {
  loading.value = true
  try {
    const res = await apiFetch<any[]>('/teacher/students')
    students.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(fetchStudents)

function viewStats(studentId: string) {
  router.push(`/teacher/students/${studentId}`)
}
</script>

<template>
  <div class="p-6">
    <PageHeader title="我的学生" description="选课学生的学情概览" />

    <div class="rounded-lg overflow-hidden" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
      <el-table v-loading="loading" :data="students" style="width: 100%">
        <el-table-column label="学生" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-avatar :size="28" :src="row.avatarUrl" style="background: var(--lt-brand);">
                {{ row.displayName?.charAt(0) || row.username?.charAt(0) || '?' }}
              </el-avatar>
              <div>
                <div class="text-sm font-medium" style="color: var(--lt-text-primary);">{{ row.displayName || row.username }}</div>
                <div class="text-xs" style="color: var(--lt-text-auxiliary);">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="major" label="专业" width="120" />
        <el-table-column prop="grade" label="年级" width="80" />
        <el-table-column label="选课数" width="80">
          <template #default="{ row }">{{ row.courseCount }}</template>
        </el-table-column>
        <el-table-column label="学习时长" width="120">
          <template #default="{ row }">{{ row.totalLearningMinutes }} 分钟</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <StatusBadge :status="row.status === 'disabled' ? 'disabled' : 'enabled'" />
          </template>
        </el-table-column>
        <el-table-column label="所属课程" min-width="200">
          <template #default="{ row }">
            <span class="text-xs" style="color: var(--lt-text-secondary);">{{ row.courseNames?.join(', ') || '-' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

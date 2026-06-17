<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '@/utils/api'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'

const router = useRouter()
const loading = ref(false)
const courses = ref<any[]>([])

async function fetchCourses() {
  loading.value = true
  try {
    const res = await apiFetch<any[]>('/teacher/courses')
    courses.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(fetchCourses)

function goToCourseKnowledge(id: string) {
  router.push(`/teacher/courses/${id}/knowledge`)
}
</script>

<template>
  <div class="p-6">
    <PageHeader title="我的课程" description="您被指派的课程列表">
      <template #actions>
        <el-button type="primary" :disabled>新建课程（请联系管理员）</el-button>
      </template>
    </PageHeader>

    <div class="rounded-lg overflow-hidden" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
      <el-table v-loading="loading" :data="courses" style="width: 100%" @row-click="(r: any) => goToCourseKnowledge(r.id)">
        <el-table-column label="课程" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ row.emoji || '📚' }}</span>
              <span class="text-sm font-medium" style="color: var(--lt-text-primary);">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="subject" label="学科" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusBadge :status="row.enabled ? 'enabled' : 'disabled'" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button size="small" @click.stop="router.push(`/teacher/courses/${row.id}/knowledge`)">知识点</el-button>
            <el-button size="small" @click.stop="router.push(`/teacher/courses/${row.id}/knowledge-graph`)">知识图谱</el-button>
            <el-button size="small" @click.stop="router.push(`/teacher/courses/${row.id}/documents`)">资料</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

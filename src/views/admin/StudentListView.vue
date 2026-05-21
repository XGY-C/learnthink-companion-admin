<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { apiFetch } from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, View, SwitchButton, Lock, Delete } from '@element-plus/icons-vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import FilterBar from '@/components/admin/FilterBar.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import type { StudentInfo, StudentStats, ProfileVersion, Course } from '@/types'

const loading = ref(true)
const students = ref<StudentInfo[]>([])
const courses = ref<Course[]>([])
const filters = reactive({ grade: '', major: '', status: '', courseId: '' })
const searchQuery = ref('')
const showDetailDrawer = ref(false)
const selectedStudent = ref<StudentInfo | null>(null)
const studentStats = ref<StudentStats | null>(null)
const profileVersions = ref<ProfileVersion[]>([])

async function loadStudents() {
  loading.value = true
  try {
    const [sRes, cRes] = await Promise.all([
      apiFetch<StudentInfo[]>('/admin/students'),
      apiFetch<Course[]>('/admin/courses'),
    ])
    students.value = sRes.data || []
    courses.value = cRes.data || []
  } catch { /* API not ready */ } finally {
    loading.value = false
  }
}

async function openDetail(student: StudentInfo) {
  selectedStudent.value = student
  showDetailDrawer.value = true
  try {
    const [statsRes, profileRes] = await Promise.all([
      apiFetch<StudentStats>(`/admin/students/${student.id}/stats`),
      apiFetch<ProfileVersion[]>(`/admin/students/${student.id}/profiles`),
    ])
    studentStats.value = statsRes.data
    profileVersions.value = profileRes.data || []
  } catch { /* ignore */ }
}

async function handleDisable(student: StudentInfo) {
  const action = student.status === 'enabled' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定${action}账号「${student.displayName || student.username}」吗？`, `确认${action}`, {
      confirmButtonText: action, cancelButtonText: '取消', type: 'warning'
    })
    await apiFetch(`/admin/students/${student.id}/status`, {
      method: 'PUT',
      body: { status: student.status === 'enabled' ? 'disabled' : 'enabled' }
    })
    ElMessage.success(`已${action}`)
    student.status = student.status === 'enabled' ? 'disabled' : 'enabled'
  } catch { /* cancelled */ }
}

async function handleResetPassword(student: StudentInfo) {
  try {
    await ElMessageBox.confirm(`确定重置「${student.displayName || student.username}」的密码吗？新密码将发送到注册邮箱。`, '重置密码', {
      confirmButtonText: '确认重置', cancelButtonText: '取消', type: 'warning'
    })
    await apiFetch(`/admin/students/${student.id}/reset-password`, { method: 'POST' })
    ElMessage.success('密码已重置，新密码已发送至用户邮箱')
  } catch { /* cancelled */ }
}

const filteredStudents = computed(() => {
  let list = students.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s => s.username.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.displayName?.toLowerCase().includes(q))
  }
  if (filters.grade) list = list.filter(s => s.grade === filters.grade)
  if (filters.major) list = list.filter(s => s.major === filters.major)
  if (filters.status) list = list.filter(s => s.status === filters.status)
  return list
})

const gradeOptions = [
  { label: '大一', value: '大一' }, { label: '大二', value: '大二' },
  { label: '大三', value: '大三' }, { label: '大四', value: '大四' },
]

onMounted(loadStudents)
</script>

<template>
  <div class="p-6">
    <PageHeader title="学生管理" description="管理学生账号与查看学习状态">
      <el-button :icon="Download">导出 CSV</el-button>
    </PageHeader>

    <FilterBar
      :filters="[
        { key: 'grade', label: '年级', options: gradeOptions },
        { key: 'status', label: '状态', options: [{ label: '启用', value: 'enabled' }, { label: '禁用', value: 'disabled' }] },
        { key: 'courseId', label: '课程', options: courses.map(c => ({ label: c.name, value: c.id })), width: 160 },
      ]"
      v-model="filters"
      search-placeholder="搜索用户名 / 邮箱 / 姓名..."
      @search="(v: string) => searchQuery = v"
    />

    <div class="rounded-lg overflow-hidden card-elevated" style="background: var(--lt-bg-card);">
      <el-table :data="filteredStudents" v-loading="loading" class="admin-table" style="width: 100%" empty-text="暂无学生数据">
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <el-avatar :size="32" :src="row.avatarUrl" style="background: linear-gradient(135deg, var(--lt-brand), var(--lt-brand-dark));">
                {{ row.displayName?.charAt(0) || row.username?.charAt(0) || 'U' }}
              </el-avatar>
              <div>
                <div class="text-sm font-medium" style="color: var(--lt-text-primary);">{{ row.displayName || row.username }}</div>
                <div class="text-xs" style="color: var(--lt-text-auxiliary);">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="grade" label="年级" width="70" />
        <el-table-column prop="major" label="专业" width="100" />
        <el-table-column prop="courseCount" label="课程" width="60" align="center" />
        <el-table-column prop="totalLearningMinutes" label="学习时长" width="90" align="center">
          <template #default="{ row }">{{ row.totalLearningMinutes ? `${Math.round(row.totalLearningMinutes / 60)}h` : '-' }}</template>
        </el-table-column>
        <el-table-column prop="lastActiveAt" label="最近活跃" width="120" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }"><StatusBadge :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" size="small" @click="openDetail(row)">详情</el-button>
            <el-button link type="warning" :icon="SwitchButton" size="small" @click="handleDisable(row)">
              {{ row.status === 'enabled' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="px-4 py-3 text-xs" style="color: var(--lt-text-auxiliary); border-top: 1px solid var(--lt-border);">
        共 {{ filteredStudents.length }} 名学生
      </div>
    </div>

    <!-- Student Detail Drawer -->
    <el-drawer v-model="showDetailDrawer" :title="selectedStudent?.displayName || '学生详情'" size="480px">
      <template v-if="selectedStudent">
        <!-- Basic Info -->
        <div class="flex items-center gap-3 mb-4">
          <el-avatar :size="48" :src="selectedStudent.avatarUrl" style="background: linear-gradient(135deg, var(--lt-brand), var(--lt-brand-dark));">
            {{ selectedStudent.displayName?.charAt(0) || selectedStudent.username?.charAt(0) || 'U' }}
          </el-avatar>
          <div>
            <div class="font-semibold" style="color: var(--lt-text-primary);">{{ selectedStudent.displayName || selectedStudent.username }}</div>
            <div class="text-sm" style="color: var(--lt-text-auxiliary);">@{{ selectedStudent.username }} · {{ selectedStudent.email }}</div>
            <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">
              {{ selectedStudent.grade }} · {{ selectedStudent.major }} · 注册 {{ selectedStudent.createdAt }}
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div v-if="studentStats" class="grid grid-cols-3 gap-3 mb-4">
          <div class="rounded-lg p-3 text-center" style="background: var(--lt-bg-page);">
            <div class="text-lg font-bold" style="color: var(--lt-brand);">{{ Math.round((studentStats.totalLearningMinutes || 0) / 60) }}h</div>
            <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">总学习时长</div>
          </div>
          <div class="rounded-lg p-3 text-center" style="background: var(--lt-bg-page);">
            <div class="text-lg font-bold" style="color: var(--lt-success);">{{ studentStats.totalResourcePacks || 0 }}</div>
            <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">资源包</div>
          </div>
          <div class="rounded-lg p-3 text-center" style="background: var(--lt-bg-page);">
            <div class="text-lg font-bold" style="color: var(--lt-ai);">{{ studentStats.totalQuizAttempts || 0 }}</div>
            <div class="text-xs mt-0.5" style="color: var(--lt-text-auxiliary);">测验</div>
          </div>
        </div>

        <!-- Progress -->
        <div v-if="studentStats" class="mb-4">
          <h4 class="text-sm font-semibold mb-2" style="color: var(--lt-text-primary);">知识点掌握进度</h4>
          <div class="text-sm" style="color: var(--lt-text-secondary);">
            {{ studentStats.pathMasteredNodes || 0 }} / {{ studentStats.pathTotalNodes || 0 }}
          </div>
          <div class="h-2 rounded-full mt-1" style="background: #E8ECF0;">
            <div
              class="h-full rounded-full transition-all"
              :style="{
                width: studentStats.pathTotalNodes ? `${Math.round((studentStats.pathMasteredNodes || 0) / studentStats.pathTotalNodes * 100)}%` : '0%',
                background: 'var(--lt-brand)'
              }"
            />
          </div>
          <div class="text-xs mt-1" style="color: var(--lt-text-auxiliary);">
            薄弱项: {{ studentStats.currentWeakCount || 0 }} 个
          </div>
        </div>

        <!-- Profile Versions -->
        <div v-if="profileVersions.length > 0" class="mb-4">
          <h4 class="text-sm font-semibold mb-2" style="color: var(--lt-text-primary);">画像版本历史</h4>
          <el-timeline>
            <el-timeline-item
              v-for="pv in profileVersions" :key="pv.id"
              :timestamp="pv.createdAt"
              placement="top"
              size="small"
            >
              v{{ pv.version }}
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- Account Actions -->
        <div class="pt-3 border-t space-y-2" style="border-color: var(--lt-border);">
          <h4 class="text-sm font-semibold mb-2" style="color: var(--lt-text-primary);">账号操作</h4>
          <el-button size="small" :type="selectedStudent.status === 'enabled' ? 'warning' : 'success'" :icon="SwitchButton" @click="handleDisable(selectedStudent)">
            {{ selectedStudent.status === 'enabled' ? '禁用账号' : '启用账号' }}
          </el-button>
          <el-button size="small" :icon="Lock" @click="handleResetPassword(selectedStudent)">重置密码</el-button>
          <el-button size="small" type="danger" :icon="Delete">删除账号</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '@/utils/api'
import PageHeader from '@/components/admin/PageHeader.vue'
import FilterBar from '@/components/admin/FilterBar.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { Course } from '@/types'

const router = useRouter()

const loading = ref(true)
const courses = ref<Course[]>([])
const teachers = ref<{ id: string; displayName: string }[]>([])
const filters = reactive({ grade: '', subject: '', status: '' })
const searchQuery = ref('')
const showCreateDialog = ref(false)
const editingCourse = ref<Course | null>(null)
const formRef = ref()

const courseForm = reactive({
  name: '', description: '', emoji: '📘', grade: '', subject: '', enabled: true, teacherId: ''
})

const gradeOptions = [
  { label: '大一', value: '大一' }, { label: '大二', value: '大二' },
  { label: '大三', value: '大三' }, { label: '大四', value: '大四' },
]
const subjectOptions = [
  { label: '数学', value: '数学' }, { label: '计算机', value: '计算机' },
  { label: '物理', value: '物理' }, { label: '英语', value: '英语' },
]

async function loadCourses() {
  loading.value = true
  try {
    const [coursesRes, teachersRes] = await Promise.all([
      apiFetch<Course[]>('/admin/courses'),
      apiFetch<{ id: string; displayName: string; username: string }[]>('/admin/teachers').catch(() => null)
    ])
    courses.value = coursesRes.data
    if (teachersRes) {
      teachers.value = teachersRes.data.map((t: any) => ({
        id: t.id,
        displayName: t.displayName || t.username || t.id
      }))
    }
  } catch { /* API not ready */ } finally {
    loading.value = false
  }
}

function openCreate() {
  editingCourse.value = null
  Object.assign(courseForm, { name: '', description: '', emoji: '📘', grade: '', subject: '', enabled: true, teacherId: '' })
  showCreateDialog.value = true
}

function openEdit(course: Course) {
  editingCourse.value = course
  Object.assign(courseForm, {
    name: course.name, description: course.description,
    emoji: course.emoji, grade: course.grade, subject: course.subject,
    enabled: course.enabled, teacherId: (course as any).teacherId || ''
  })
  showCreateDialog.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    if (editingCourse.value) {
      await apiFetch(`/admin/courses/${editingCourse.value.id}`, { method: 'PUT', body: courseForm })
      ElMessage.success('课程已更新')
    } else {
      await apiFetch('/admin/courses', { method: 'POST', body: courseForm })
      ElMessage.success('课程已创建')
    }
    showCreateDialog.value = false
    await loadCourses()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function handleDelete(course: Course) {
  try {
    await ElMessageBox.confirm(`确定删除课程「${course.name}」吗？此操作不可撤销。`, '确认删除', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    await apiFetch(`/admin/courses/${course.id}`, { method: 'DELETE' })
    ElMessage.success('课程已删除')
    await loadCourses()
  } catch { /* cancelled */ }
}

onMounted(loadCourses)

const filteredCourses = computed(() => {
  let list = courses.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.name.toLowerCase().includes(q))
  }
  if (filters.grade) list = list.filter(c => c.grade === filters.grade)
  if (filters.subject) list = list.filter(c => c.subject === filters.subject)
  return list
})

function teacherName(teacherId: string) {
  const t = teachers.value.find(t => t.id === teacherId)
  return t ? t.displayName : teacherId ? teacherId.substring(0, 8) + '...' : '-'
}
</script>

<template>
  <div class="p-6">
    <PageHeader title="课程管理" description="创建课程框架、指派授课教师">
      <el-button type="primary" :icon="Plus" @click="openCreate">新建课程</el-button>
    </PageHeader>

    <FilterBar
      :filters="[
        { key: 'grade', label: '年级', options: gradeOptions },
        { key: 'subject', label: '学科', options: subjectOptions },
      ]"
      v-model="filters"
      :search-placeholder="'搜索课程名称...'"
      @search="(v: string) => searchQuery = v"
    />

    <div class="rounded-lg overflow-hidden card-elevated" style="background: var(--lt-bg-card);">
      <el-table
        :data="filteredCourses"
        v-loading="loading"
        class="admin-table"
        style="width: 100%"
        empty-text="暂无课程数据，点击上方按钮创建"
      >
        <el-table-column prop="name" label="课程" min-width="180">
          <template #default="{ row }">
            <span class="text-base mr-2">{{ row.emoji || '📘' }}</span>
            <span style="color: var(--lt-text-primary); font-weight: 500;">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="grade" label="年级" width="80" />
        <el-table-column prop="subject" label="学科" width="80" />
        <el-table-column label="授课教师" width="150">
          <template #default="{ row }">{{ teacherName(row.teacherId) }}</template>
        </el-table-column>
        <el-table-column prop="studentCount" label="学生" width="70" align="center">
          <template #default="{ row }">{{ row.studentCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column prop="enabled" label="状态" width="80" align="center">
          <template #default="{ row }">
            <StatusBadge :status="row.enabled !== false ? 'enabled' : 'disabled'" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="px-4 py-3 text-xs" style="color: var(--lt-text-auxiliary); border-top: 1px solid var(--lt-border);">
        共 {{ filteredCourses.length }} 门课程
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingCourse ? '编辑课程' : '新建课程'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="courseForm" label-position="top"
        :rules="{
          name: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
          grade: [{ required: true, message: '请选择年级', trigger: 'change' }],
          subject: [{ required: true, message: '请选择学科', trigger: 'change' }],
        }"
      >
        <el-form-item label="课程名称" prop="name">
          <el-input v-model="courseForm.name" placeholder="如：高等数学(上)" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Emoji" prop="emoji">
              <el-input v-model="courseForm.emoji" placeholder="📘" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="年级" prop="grade">
              <el-select v-model="courseForm.grade" placeholder="选择年级" style="width:100%">
                <el-option v-for="g in gradeOptions" :key="g.value" :label="g.label" :value="g.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="学科" prop="subject">
              <el-select v-model="courseForm.subject" placeholder="选择学科" style="width:100%">
                <el-option v-for="s in subjectOptions" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="指派授课教师">
          <el-select v-model="courseForm.teacherId" placeholder="选择教师（可为空）" style="width:100%" clearable>
            <el-option v-for="t in teachers" :key="t.id" :label="t.displayName" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程简介">
          <el-input v-model="courseForm.description" type="textarea" :rows="3" placeholder="简要描述课程内容..." />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="courseForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">{{ editingCourse ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

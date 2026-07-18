<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, SwitchButton, Lock, Delete } from '@element-plus/icons-vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import FilterBar from '@/components/admin/FilterBar.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import type { TeacherInfo } from '@/types'

const store = useAdminStore()

const searchQuery = ref('')
const statusFilter = ref('')
const dialogVisible = ref(false)
const editingTeacher = ref<TeacherInfo | null>(null)
const formRef = ref()

const form = reactive({
  username: '', email: '', password: '123456', displayName: '', phone: ''
})

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function load() {
  await store.fetchTeachers(searchQuery.value || undefined, statusFilter.value || undefined)
}

function openCreate() {
  editingTeacher.value = null
  Object.assign(form, { username: '', email: '', password: '123456', displayName: '', phone: '' })
  dialogVisible.value = true
}

function openEdit(teacher: TeacherInfo) {
  editingTeacher.value = teacher
  Object.assign(form, {
    username: teacher.username,
    email: teacher.email,
    password: '',
    displayName: teacher.displayName || '',
    phone: teacher.phone || ''
  })
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    if (editingTeacher.value) {
      await store.updateTeacher(editingTeacher.value.id, {
        displayName: form.displayName, email: form.email, phone: form.phone
      })
      ElMessage.success('教师信息已更新')
    } else {
      await store.createTeacher({
        username: form.username, email: form.email,
        password: form.password || '123456',
        displayName: form.displayName, phone: form.phone
      })
      ElMessage.success('教师账号已创建')
    }
    dialogVisible.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function handleToggleStatus(teacher: TeacherInfo) {
  const action = teacher.status === 'enabled' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定${action}账号「${teacher.displayName || teacher.username}」吗？`, `确认${action}`, {
      confirmButtonText: action, cancelButtonText: '取消', type: 'warning'
    })
    await store.updateTeacherStatus(teacher.id, teacher.status === 'enabled' ? 'disabled' : 'enabled')
    ElMessage.success(`已${action}`)
  } catch { /* cancelled */ }
}

async function handleResetPassword(teacher: TeacherInfo) {
  try {
    await ElMessageBox.confirm(`确定重置「${teacher.displayName || teacher.username}」的密码为 123456 吗？`, '重置密码', {
      confirmButtonText: '确认重置', cancelButtonText: '取消', type: 'warning'
    })
    await store.resetTeacherPassword(teacher.id)
    ElMessage.success('密码已重置为 123456')
  } catch { /* cancelled */ }
}

async function handleDelete(teacher: TeacherInfo) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${teacher.displayName || teacher.username}」的账号吗？此操作不可恢复。`,
      '删除账号',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'error' }
    )
    await store.deleteTeacher(teacher.id)
    ElMessage.success('教师账号已删除')
  } catch { /* cancelled */ }
}

const filteredTeachers = computed(() => {
  let list = store.teachers
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      t.username.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.displayName?.toLowerCase().includes(q)
    )
  }
  if (statusFilter.value) {
    list = list.filter(t => t.status === statusFilter.value)
  }
  return list
})

onMounted(load)
</script>

<template>
  <div class="p-6">
    <PageHeader title="教师管理" description="管理教师账号，支持创建、编辑、启用/禁用等操作">
      <el-button type="primary" :icon="Plus" @click="openCreate">添加教师</el-button>
    </PageHeader>

    <FilterBar
      :filters="[
        { key: 'status', label: '状态', options: [{ label: '启用', value: 'enabled' }, { label: '禁用', value: 'disabled' }] },
      ]"
      :model-value="{ status: statusFilter }"
      @update:model-value="(v: any) => { statusFilter = v.status; load() }"
      search-placeholder="搜索用户名 / 姓名 / 邮箱..."
      @search="(v: string) => { searchQuery = v; load() }"
    />

    <div class="rounded-lg overflow-hidden card-elevated" style="background: var(--lt-bg-card);">
      <el-table :data="filteredTeachers" v-loading="store.teacherLoading" class="admin-table" style="width: 100%" empty-text="暂无教师数据，点击上方按钮创建">
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <el-avatar :size="32" :src="row.avatarUrl" style="background: linear-gradient(135deg, var(--lt-brand), var(--lt-brand-dark));">
                {{ row.displayName?.charAt(0) || row.username?.charAt(0) || 'T' }}
              </el-avatar>
              <div>
                <div class="text-sm font-medium" style="color: var(--lt-text-primary);">{{ row.displayName || row.username }}</div>
                <div class="text-xs" style="color: var(--lt-text-auxiliary);">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="courseCount" label="负责课程" width="100" align="center">
          <template #default="{ row }">
            <el-popover placement="bottom" :width="220" trigger="hover">
              <template #reference>
                <el-tag>{{ row.courseCount }}</el-tag>
              </template>
              <div class="text-sm" style="color: var(--lt-text-primary);">
                <div v-if="row.courseNames?.length">{{ row.courseNames.join('、') }}</div>
                <div v-else style="color: var(--lt-text-auxiliary);">暂无负责课程</div>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }"><StatusBadge :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="warning" :icon="SwitchButton" size="small" @click="handleToggleStatus(row)">
              {{ row.status === 'enabled' ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="warning" :icon="Lock" size="small" @click="handleResetPassword(row)">重置密码</el-button>
            <el-button link type="danger" :icon="Delete" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="px-4 py-3 text-xs" style="color: var(--lt-text-auxiliary); border-top: 1px solid var(--lt-border);">
        共 {{ filteredTeachers.length }} 名教师
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingTeacher ? '编辑教师' : '添加教师'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="!!editingTeacher" placeholder="登录用用户名" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="姓名">
              <el-input v-model="form.displayName" placeholder="教师姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号">
              <el-input v-model="form.phone" placeholder="手机号（可选）" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="电子邮箱" />
        </el-form-item>
        <el-form-item v-if="!editingTeacher" label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="默认 123456" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">{{ editingTeacher ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

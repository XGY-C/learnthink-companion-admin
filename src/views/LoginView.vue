<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Loading } from '@element-plus/icons-vue'
import { apiFetch } from '@/utils/api'

const router = useRouter()
const route = useRoute()

const formRef = ref()
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  email: '',
  password: '',
})

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: { id: string; username: string; displayName: string; avatarUrl: string; role: string }
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMsg.value = ''

  try {
    const res = await apiFetch<LoginResult>('/auth/login', {
      method: 'POST',
      body: { email: form.email, password: form.password },
      skipAuth: true
    })

    const { accessToken, refreshToken, user: userInfo } = res.data

    if (userInfo.role !== 'admin') {
      errorMsg.value = '此账号无管理权限，请使用管理员账号登录'
      loading.value = false
      return
    }

    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))

    const redirect = (route.query.redirect as string) || '/admin'
    router.push(redirect)
  } catch (e: any) {
    errorMsg.value = e.message || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center" style="background: linear-gradient(135deg, #F5F7FA 0%, #E8F0FE 100%);">
    <div class="w-full max-w-md mx-4">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-brand-gradient shadow-lg">
          <span class="text-white text-2xl font-bold">学</span>
        </div>
        <h1 class="text-2xl font-bold" style="color: var(--lt-text-primary);">学思伴行 · 管理后台</h1>
        <p class="text-sm mt-2" style="color: var(--lt-text-auxiliary);">管理员专属入口</p>
      </div>

      <!-- Form -->
      <div class="bg-white rounded-xl shadow-lg p-8">
        <el-form
          ref="formRef"
          :model="form"
          :rules="{
            email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
            password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
          }"
          label-position="top"
          @submit.prevent="handleLogin"
        >
          <el-form-item label="邮箱" prop="email">
            <el-input
              v-model="form.email"
              placeholder="请输入管理员邮箱"
              :prefix-icon="User"
              size="large"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div v-if="errorMsg" class="mb-4 p-3 rounded-lg text-sm" style="background: rgba(255, 59, 48, 0.08); color: var(--lt-danger);">
            {{ errorMsg }}
          </div>

          <el-button
            type="primary"
            size="large"
            class="w-full"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录管理后台' }}
          </el-button>
        </el-form>
      </div>

      <p class="text-center text-xs mt-6" style="color: var(--lt-text-placeholder);">
        学思伴行 · 管理后台 v1.0
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Management, Reading } from '@element-plus/icons-vue'
import { apiFetch } from '@/utils/api'

const router = useRouter()
const route = useRoute()

const formRef = ref()
const loading = ref(false)
const errorMsg = ref('')

// ── Identity switch ──
type Role = 'admin' | 'teacher'
const activeRole = ref<Role>('admin')

const roleConfig = computed(() => ({
  admin: {
    label: '管理员',
    icon: Management,
    placeholder: '请输入管理员邮箱',
    btnText: '登录管理后台',
  },
  teacher: {
    label: '教师',
    icon: Reading,
    placeholder: '请输入教师邮箱',
    btnText: '登录教师工作台',
  },
}))

const currentConfig = computed(() => roleConfig.value[activeRole.value])

// ── Form ──
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
      skipAuth: true,
    })

    const { accessToken, refreshToken, user: userInfo } = res.data

    if (activeRole.value === 'admin' && userInfo.role !== 'admin') {
      errorMsg.value = '此账号不是管理员，请切换到教师身份登录'
      loading.value = false
      return
    }
    if (activeRole.value === 'teacher' && userInfo.role !== 'teacher') {
      errorMsg.value = '此账号不是教师，请切换到管理员身份登录'
      loading.value = false
      return
    }

    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))

    const defaultPath = userInfo.role === 'teacher' ? '/teacher' : '/admin'
    const redirect = (route.query.redirect as string) || defaultPath
    router.push(redirect)
  } catch (e: any) {
    errorMsg.value = e.message || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

// ── Mouse parallax ──
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const cardRef = ref<HTMLElement | null>(null)

// ── Animated stats ──
const stats = [
  { value: 5, suffix: '+', label: '智能体协同' },
  { value: 98, suffix: '%', label: '内容可信度' },
  { value: 10, suffix: 'x', label: '效率提升' },
]

const animatedValues = ref(stats.map(() => 0))

onMounted(() => {
  stats.forEach((stat, idx) => {
    const duration = 1200
    const steps = 30
    const increment = stat.value / steps
    let current = 0
    const interval = duration / steps
    const timer = setInterval(() => {
      current += increment
      if (current >= stat.value) {
        current = stat.value
        clearInterval(timer)
      }
      animatedValues.value[idx] = Math.round(current)
    }, interval)
  })
})
</script>

<template>
  <div class="login-root">
    <!-- Background -->
    <div class="login-bg">
      <div class="login-bg__orb login-bg__orb--1"></div>
      <div class="login-bg__orb login-bg__orb--2"></div>
      <div class="login-bg__orb login-bg__orb--3"></div>
      <div class="login-bg__grid"></div>
    </div>

    <!-- Main card -->
    <div
      ref="cardRef"
      class="login-card"
    >
      <!-- Left: Brand -->
      <div class="login-card__left">
        <div class="login-card__left-bg"></div>
        <div class="login-card__left-content">
          <div class="brand-badge">
            <div class="brand-badge__dot"></div>
            <span>管理平台已就绪</span>
          </div>

          <div class="brand-hero">
            <h1 class="brand-hero__title">
              学思伴行
              <span class="brand-hero__tag">Pro</span>
            </h1>
            <p class="brand-hero__subtitle">
              多智能体协同引擎<br />驱动下一代个性化学习
            </p>
          </div>

          <div class="brand-stats">
            <div v-for="(stat, idx) in stats" :key="idx" class="brand-stats__item">
              <div class="brand-stats__value">
                {{ animatedValues[idx] }}<span class="brand-stats__suffix">{{ stat.suffix }}</span>
              </div>
              <div class="brand-stats__label">{{ stat.label }}</div>
            </div>
          </div>

          <div class="brand-features">
            <div class="brand-features__item">
              <div class="brand-features__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span>课程知识图谱自动构建</span>
            </div>
            <div class="brand-features__item">
              <div class="brand-features__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <span>实时学情监控与预警</span>
            </div>
            <div class="brand-features__item">
              <div class="brand-features__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <span>AI 生成内容质量审核</span>
            </div>
          </div>

          <div class="brand-version">LearnThink Companion v1.0</div>
        </div>

        <div class="login-card__left-deco login-card__left-deco--ring"></div>
        <div class="login-card__left-deco login-card__left-deco--hex"></div>
        <div class="login-card__left-deco login-card__left-deco--dots"></div>
      </div>

      <!-- Right: Form -->
      <div class="login-card__right">
        <div class="login-card__right-inner">
          <!-- Mobile logo -->
          <div class="login-logo-mobile">
            <div class="login-logo-mobile__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <span class="login-logo-mobile__text">学思伴行 <em>Pro</em></span>
          </div>

          <!-- Role switcher -->
          <div class="role-switcher">
            <div
              class="role-switcher__indicator"
              :style="{ transform: activeRole === 'admin' ? 'translateX(0)' : 'translateX(100%)' }"
            ></div>
            <button
              class="role-switcher__btn"
              :class="{ 'role-switcher__btn--active': activeRole === 'admin' }"
              @click="activeRole = 'admin'"
            >
              <Management class="role-switcher__icon" />
              <span>管理员</span>
            </button>
            <button
              class="role-switcher__btn"
              :class="{ 'role-switcher__btn--active': activeRole === 'teacher' }"
              @click="activeRole = 'teacher'"
            >
              <Reading class="role-switcher__icon" />
              <span>教师</span>
            </button>
          </div>

          <!-- Title -->
          <div class="form-header">
            <h2 class="form-header__title">欢迎回来</h2>
            <p class="form-header__desc">
              以<strong>{{ currentConfig.label }}</strong>身份登录工作台
            </p>
          </div>

          <!-- Error -->
          <Transition name="shake-fade">
            <div v-if="errorMsg" class="form-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorMsg }}</span>
            </div>
          </Transition>

          <!-- Form -->
          <el-form
            ref="formRef"
            :model="form"
            :rules="{
              email: [
                { required: true, message: '请输入邮箱', trigger: 'blur' },
                { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
              ],
              password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
            }"
            label-position="top"
            @submit.prevent="handleLogin"
          >
            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model="form.email"
                :placeholder="currentConfig.placeholder"
                :prefix-icon="User"
                size="large"
                class="form-input"
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
                class="form-input"
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              class="form-submit"
              :loading="loading"
              @click="handleLogin"
            >
              <template #loading>
                <svg class="form-submit__spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </template>
              {{ loading ? '正在验证...' : currentConfig.btnText }}
            </el-button>
          </el-form>

          <!-- Footer -->
          <div class="form-footer">
            <span class="form-footer__hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              此入口仅供管理员与教师使用
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Root ── */
.login-root {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  font-family: var(--lt-font-body);
}

/* ── Background ── */
.login-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.login-bg__orb {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}

.login-bg__orb--1 {
  top: -12%;
  left: -8%;
  width: 520px;
  height: 520px;
  background: var(--lt-ai-light-7);
  opacity: 0.4;
  animation: orb-drift-1 16s ease-in-out infinite alternate;
}

.login-bg__orb--2 {
  bottom: -10%;
  right: -6%;
  width: 440px;
  height: 440px;
  background: var(--lt-brand-lighter);
  opacity: 0.35;
  animation: orb-drift-2 20s ease-in-out infinite alternate;
}

.login-bg__orb--3 {
  top: 45%;
  left: 35%;
  width: 300px;
  height: 300px;
  background: var(--lt-brand-lightest);
  opacity: 0.5;
  animation: orb-drift-3 14s ease-in-out infinite alternate;
}

.login-bg__grid {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image:
    linear-gradient(var(--lt-brand) 1px, transparent 1px),
    linear-gradient(90deg, var(--lt-brand) 1px, transparent 1px);
  background-size: 72px 72px;
}

/* ── Card ── */
.login-card {
  position: relative;
  z-index: 10;
  display: flex;
  width: 100%;
  max-width: 980px;
  min-height: 600px;
  border-radius: 20px;
  overflow: hidden;
  background: var(--lt-bg-card);
  border: 1px solid var(--lt-border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

/* ── Left Panel ── */
.login-card__left {
  position: relative;
  width: 44%;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
}

.login-card__left-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, var(--lt-ai-dark-2) 0%, var(--lt-brand-dark) 45%, var(--lt-brand) 100%);
  z-index: 0;
}

.login-card__left-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: 48px 44px;
  gap: 32px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 10px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  width: fit-content;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
  color: rgba(255, 255, 255, 0.9);
}

.brand-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34C759;
  box-shadow: 0 0 8px rgba(52, 199, 89, 0.6);
  animation: dot-pulse 2s ease-in-out infinite;
}

.brand-hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-hero__title {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-hero__tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.brand-hero__subtitle {
  font-size: 15px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.3px;
}

.brand-stats {
  display: flex;
  gap: 28px;
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.brand-stats__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-stats__value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.brand-stats__suffix {
  font-size: 16px;
  font-weight: 600;
  opacity: 0.7;
  margin-left: 1px;
}

.brand-stats__label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-features__item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 400;
}

.brand-features__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}

.brand-version {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 400;
  letter-spacing: 0.5px;
}

.login-card__left-deco {
  position: absolute;
  z-index: 1;
  pointer-events: none;
}

.login-card__left-deco--ring {
  top: 12%;
  right: -30px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.08);
  animation: float-ring 18s ease-in-out infinite;
}

.login-card__left-deco--hex {
  bottom: 15%;
  right: 20px;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.04);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  animation: float-hex 14s ease-in-out infinite;
}

.login-card__left-deco--dots {
  bottom: 30%;
  left: 20px;
  width: 80px;
  height: 80px;
  background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1.5px, transparent 1.5px);
  background-size: 16px 16px;
  opacity: 0.5;
  animation: float-dots 20s ease-in-out infinite;
}

/* ── Right Panel ── */
.login-card__right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background: var(--lt-bg-card);
}

.login-card__right-inner {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-logo-mobile {
  display: none;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 8px;
}

.login-logo-mobile__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--lt-brand), var(--lt-ai));
  color: #fff;
}

.login-logo-mobile__text {
  font-size: 20px;
  font-weight: 700;
  color: var(--lt-text-primary);
}

.login-logo-mobile__text em {
  font-style: normal;
  color: var(--lt-brand);
}

/* ── Role Switcher ── */
.role-switcher {
  position: relative;
  display: flex;
  background: var(--lt-bg-page);
  border-radius: 14px;
  padding: 5px;
  gap: 4px;
  border: 1px solid var(--lt-border);
}

.role-switcher__indicator {
  position: absolute;
  top: 5px;
  left: 5px;
  width: calc(50% - 7px);
  height: calc(100% - 10px);
  border-radius: 10px;
  background: var(--lt-bg-card);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 0;
}

.role-switcher__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 0;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--lt-text-auxiliary);
  transition: color 0.25s ease;
  position: relative;
  z-index: 1;
  font-family: inherit;
}

.role-switcher__btn--active {
  color: var(--lt-brand);
}

.role-switcher__icon {
  width: 17px;
  height: 17px;
}

/* ── Form Header ── */
.form-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-header__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--lt-text-primary);
  letter-spacing: -0.3px;
  margin: 0;
}

.form-header__desc {
  font-size: 14px;
  color: var(--lt-text-secondary);
  margin: 0;
}

.form-header__desc strong {
  color: var(--lt-brand);
  font-weight: 600;
}

/* ── Error ── */
.form-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 59, 48, 0.06);
  border: 1px solid rgba(255, 59, 48, 0.15);
  color: var(--lt-danger);
  font-size: 13px;
  line-height: 1.5;
}

.form-error svg {
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Form inputs ── */
:deep(.form-input .el-input__wrapper) {
  background: var(--lt-bg-page);
  border-radius: 12px;
  padding: 0 16px;
  border: 1px solid transparent;
  box-shadow: none !important;
  transition: all 0.25s ease;
  height: 48px;
}

:deep(.form-input .el-input__wrapper:hover) {
  border-color: var(--lt-brand-lighter);
  background: var(--lt-bg-page);
}

:deep(.form-input .el-input__wrapper.is-focus) {
  border-color: var(--lt-brand);
  background: var(--lt-bg-card);
  box-shadow: 0 0 0 3px var(--lt-shadow-blue) !important;
}

:deep(.form-input .el-input__inner) {
  color: var(--lt-text-primary);
  font-weight: 500;
  font-size: 14px;
}

:deep(.form-input .el-input__inner::placeholder) {
  color: var(--lt-text-placeholder);
  font-weight: 400;
}

:deep(.form-input .el-input__prefix .el-icon) {
  color: var(--lt-text-auxiliary);
  font-size: 17px;
}

:deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 600;
  color: var(--lt-text-secondary);
  padding-bottom: 6px;
}

/* ── Submit button ── */
.form-submit {
  width: 100%;
  height: 50px !important;
  border-radius: 13px !important;
  font-size: 15px !important;
  font-weight: 650 !important;
  letter-spacing: 0.3px;
  border: none !important;
  background: linear-gradient(135deg, var(--lt-brand) 0%, var(--lt-brand-dark) 100%) !important;
  box-shadow:
    0 4px 12px var(--lt-shadow-blue),
    0 1px 2px rgba(0, 0, 0, 0.06) !important;
  transition: all 0.25s ease !important;
  margin-top: 4px;
}

.form-submit:hover {
  transform: translateY(-1px);
  box-shadow:
    0 8px 20px var(--lt-shadow-blue),
    0 2px 4px rgba(0, 0, 0, 0.08) !important;
}

.form-submit:active {
  transform: translateY(0);
}

.form-submit__spinner {
  animation: spin 1s linear infinite;
}

/* ── Footer ── */
.form-footer {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.form-footer__hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--lt-text-placeholder);
}

.form-footer__hint svg {
  opacity: 0.5;
}

/* ===================================================================
   Animations
   =================================================================== */

@keyframes orb-drift-1 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(3%, 4%) scale(1.06); }
  100% { transform: translate(-2%, -1%) scale(0.97); }
}

@keyframes orb-drift-2 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-4%, -3%) scale(1.05); }
  100% { transform: translate(2%, 2%) scale(0.98); }
}

@keyframes orb-drift-3 {
  0% { transform: translate(0, 0) scale(1); opacity: 0.18; }
  50% { transform: translate(-3%, 3%) scale(1.08); opacity: 0.25; }
  100% { transform: translate(2%, -2%) scale(0.96); opacity: 0.15; }
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(52, 199, 89, 0.6); }
  50% { opacity: 0.6; box-shadow: 0 0 4px rgba(52, 199, 89, 0.3); }
}

@keyframes float-ring {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-14px) rotate(180deg); }
}

@keyframes float-hex {
  0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
  50% { transform: translateY(-10px) rotate(-120deg) scale(1.08); }
}

@keyframes float-dots {
  0%, 100% { transform: translate(0, 0); opacity: 0.5; }
  50% { transform: translate(6px, -8px); opacity: 0.7; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(3px); }
}

.shake-fade-enter-active {
  animation: shake 0.4s ease;
}

.shake-fade-leave-active {
  transition: opacity 0.2s ease;
}

.shake-fade-leave-to {
  opacity: 0;
}

/* ===================================================================
   Responsive
   =================================================================== */

@media (max-width: 900px) {
  .login-card__left {
    display: none;
  }

  .login-card {
    max-width: 440px;
    min-height: auto;
    border-radius: 18px;
  }

  .login-card__right {
    padding: 36px 28px;
  }

  .login-logo-mobile {
    display: flex;
  }

  .form-header {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .login-root {
    padding: 0;
    align-items: flex-start;
  }

  .login-card {
    border-radius: 0;
    min-height: 100vh;
    min-height: 100dvh;
    border: none;
    box-shadow: none;
  }

  .login-card__right {
    padding: 32px 24px;
  }

  .brand-stats {
    gap: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-bg__orb,
  .login-card__left-deco--ring,
  .login-card__left-deco--hex,
  .login-card__left-deco--dots,
  .brand-badge__dot {
    animation: none !important;
  }

  .role-switcher__indicator {
    transition: none !important;
  }
}
</style>

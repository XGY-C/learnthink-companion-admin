<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DataBoard, Reading, UploadFilled, Search, Checked,
  User, Setting, Fold, Expand, ArrowLeft, Bell, School, Collection, DataAnalysis,
  PieChart, Histogram, Connection, Clock, WarningFilled
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const isCollapsed = ref(false)

const activeMenu = computed(() => route.path)
const defaultOpeneds = computed(() => {
  if (route.path.startsWith('/teacher/analytics')) return ['analytics']
  return []
})

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

function handleUserMenuCommand(command: string) {
  if (command === 'logout') {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')
    router.push('/login')
  }
}

const userInfo = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
})

const isAdmin = computed(() => userInfo.value.role === 'admin')
const isTeacher = computed(() => userInfo.value.role === 'teacher')

const roleLabel = computed(() => {
  if (isAdmin.value) return '管理员'
  if (isTeacher.value) return '教师'
  return ''
})

const adminMenuItems = [
  { index: '/admin', icon: DataBoard, title: '数据看板' },
  { index: '/admin/courses', icon: Reading, title: '课程管理' },
  { index: '/admin/teachers', icon: User, title: '教师管理' },
  { index: '/admin/students', icon: User, title: '学生管理' },
  { index: '/admin/settings', icon: Setting, title: '系统配置' },
]

const teacherMenuItems = [
  { index: '/teacher/dashboard', icon: DataBoard, title: '我的工作台' },
  { index: '/teacher/courses', icon: Reading, title: '我的课程' },
  { index: 'analytics', icon: DataAnalysis, title: '学情分析', children: [
    { index: '/teacher/analytics/overview', icon: PieChart, title: '班级总览' },
    { index: '/teacher/analytics/scores', icon: Histogram, title: '成绩深度分析' },
    { index: '/teacher/analytics/knowledge', icon: Connection, title: '知识点全景' },
    { index: '/teacher/analytics/behavior', icon: Clock, title: '学习行为分析' },
    { index: '/teacher/analytics/risk', icon: WarningFilled, title: '风险预警' },
  ]},
  { index: '/teacher/students', icon: User, title: '我的学生' },
]

const menuItems = computed(() => isAdmin.value ? adminMenuItems : teacherMenuItems)

const sidebarTitle = computed(() => {
  if (isCollapsed.value) return '学'
  return isAdmin.value ? '学思伴行 · 管理' : '学思伴行 · 教师'
})
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden" style="background-color: var(--lt-bg-page);">
    <!-- Sidebar -->
    <div
      class="flex flex-col flex-shrink-0 z-20 transition-all duration-300"
      :class="isCollapsed ? 'w-16' : 'w-65'"
      style="background-color: var(--nav-bg); box-shadow: var(--nav-shadow);"
    >
      <!-- Logo -->
      <div
        class="h-14 flex items-center overflow-hidden transition-all duration-300 relative"
        :class="isCollapsed ? 'px-0' : 'px-4'"
        style="border-bottom: 1px solid var(--nav-divider);"
      >
        <img v-if="isCollapsed" src="/logo.svg" alt="学思伴行" class="w-7 h-7 object-contain mx-auto" />
        <span v-else class="text-sm font-bold whitespace-nowrap flex-1 flex items-center gap-2" style="color: var(--lt-text-primary);">
          <img src="/logo.svg" alt="学思伴行" class="w-6 h-6 object-contain flex-shrink-0" />
          <span style="color: var(--lt-brand);">学思伴行</span>
          <span style="color: var(--lt-text-auxiliary);"> · {{ isAdmin ? '管理' : '教师' }}</span>
        </span>
        <button
          class="sidebar-toggle flex items-center justify-center rounded-md transition-all duration-200 cursor-pointer border-none flex-shrink-0"
          :class="isCollapsed ? 'absolute right-1 top-1/2 -translate-y-1/2' : ''"
          style="width:28px; height:28px;"
          :aria-label="isCollapsed ? '展开侧边栏' : '折叠侧边栏'"
          @click="toggleSidebar"
        >
          <el-icon :size="16">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </button>
      </div>

      <!-- Menu -->
      <div class="flex-1 overflow-y-auto py-3">
        <el-menu
          :default-active="activeMenu"
          :default-openeds="defaultOpeneds"
          class="border-none w-full"
          router
          :collapse="isCollapsed"
          style="background-color: transparent;"
        >
          <template v-for="item in menuItems" :key="item.index">
            <el-sub-menu v-if="item.children" :index="item.index">
              <template #title>
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.index" :index="child.index">
                <el-icon><component :is="child.icon" /></el-icon>
                <template #title>{{ child.title }}</template>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.index">
              <el-icon><component :is="item.icon" /></el-icon>
              <template #title>{{ item.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </div>

    </div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Bar -->
      <header
        class="h-14 flex items-center justify-between px-5 z-10 flex-shrink-0"
        style="background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--lt-border);"
      >
        <div class="flex items-center gap-3 ml-auto">
          <el-dropdown trigger="click" @command="handleUserMenuCommand">
            <div class="flex items-center gap-2 cursor-pointer">
              <el-avatar
                :size="28"
                :src="userInfo.avatarUrl"
                style="background: linear-gradient(135deg, var(--lt-brand), var(--lt-brand-dark));"
              >
                {{ userInfo.displayName?.charAt(0) || userInfo.username?.charAt(0) || 'A' }}
              </el-avatar>
              <span class="text-sm hidden sm:inline" style="color: var(--lt-text-secondary);">
                {{ userInfo.displayName || userInfo.username || '用户' }}
              </span>
              <span
                class="text-xs px-1.5 py-0.5 rounded-full hidden sm:inline"
                :style="{ background: isAdmin ? 'rgba(124, 92, 252, 0.1)' : 'rgba(255, 140, 66, 0.1)', color: isAdmin ? 'var(--lt-ai)' : 'var(--lt-orange)' }"
              >{{ roleLabel }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Menu styles — shared with student side */
:deep(.el-menu) { border: none !important; }
:deep(.el-menu-item) {
  border-radius: 8px;
  margin: 1px 6px;
  padding: 0 12px !important;
  height: 40px;
  line-height: 40px;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  color: var(--nav-item-default) !important;
}
:deep(.el-menu-item:hover) {
  background-color: var(--nav-item-hover-bg) !important;
  color: var(--lt-brand) !important;
}
:deep(.el-menu-item.is-active) {
  background-color: var(--nav-item-active-bg) !important;
  color: var(--nav-item-active) !important;
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--nav-indicator);
}
:deep(.el-menu--collapse .el-menu-item) {
  margin: 1px 6px;
  padding: 0 8px !important;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.el-menu--collapse .el-menu-item .el-menu-tooltip__trigger) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
:deep(.el-menu--collapse .el-menu-item .el-icon) {
  margin: 0;
}
:deep(.el-menu--collapse .el-menu-item.is-active) {
  box-shadow: none;
  background-color: var(--nav-item-active-bg) !important;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 侧边栏折叠按钮 */
.sidebar-toggle {
  color: var(--lt-text-auxiliary);
  background: transparent;
}
.sidebar-toggle:hover,
.sidebar-toggle:focus-visible {
  background: var(--nav-item-hover-bg);
  color: var(--lt-brand);
}
.sidebar-toggle:focus-visible {
  outline: 2px solid var(--lt-brand);
  outline-offset: 2px;
}
</style>

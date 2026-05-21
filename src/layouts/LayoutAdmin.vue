<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DataBoard, Reading, UploadFilled, Search, Checked,
  User, Setting, Fold, Expand, ArrowLeft, Bell
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const isCollapsed = ref(false)

const activeMenu = computed(() => route.path)

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

const menuItems = [
  { index: '/admin', icon: DataBoard, title: '数据看板' },
  { index: '/admin/courses', icon: Reading, title: '课程管理' },
  { index: '/admin/documents', icon: UploadFilled, title: '资料管理' },
  { index: '/admin/retrieval-test', icon: Search, title: '检索测试' },
  { index: '/admin/review', icon: Checked, title: '内容审核' },
  { index: '/admin/students', icon: User, title: '学生管理' },
  { index: '/admin/settings', icon: Setting, title: '系统配置' },
]
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
        class="h-14 flex items-center overflow-hidden transition-all duration-300"
        :class="isCollapsed ? 'justify-center px-0' : 'px-5'"
        style="border-bottom: 1px solid var(--nav-divider);"
      >
        <template v-if="isCollapsed">
          <span class="text-lg font-bold" style="color: var(--lt-brand);">学</span>
        </template>
        <template v-else>
          <span class="text-sm font-bold whitespace-nowrap" style="color: var(--lt-text-primary);">
            <span style="color: var(--lt-brand);">学思伴行</span>
            <span style="color: var(--lt-text-auxiliary);"> · 管理</span>
          </span>
        </template>
      </div>

      <!-- Menu -->
      <div class="flex-1 overflow-y-auto py-3">
        <el-menu
          :default-active="activeMenu"
          class="border-none"
          router
          :collapse="isCollapsed"
          style="background-color: transparent;"
        >
          <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- Collapse toggle -->
      <div style="border-top: 1px solid var(--nav-divider);">
        <button
          class="w-full py-2 flex items-center justify-center transition-all duration-200 outline-none cursor-pointer"
          style="color: var(--lt-text-auxiliary);"
          @click="toggleSidebar"
        >
          <el-icon :size="16"><Fold v-if="!isCollapsed" /><Expand v-else /></el-icon>
        </button>
      </div>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Bar -->
      <header
        class="h-14 flex items-center justify-between px-5 z-10 flex-shrink-0"
        style="background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--lt-border);"
      >
        <div class="flex items-center gap-3">
          <a
            href="/"
            class="flex items-center gap-1 text-sm no-underline transition-colors duration-200"
            style="color: var(--lt-text-auxiliary);"
            @mouseenter="(e: any) => e.target.style.color = 'var(--lt-brand)'"
            @mouseleave="(e: any) => e.target.style.color = 'var(--lt-text-auxiliary)'"
          >
            <el-icon :size="14"><ArrowLeft /></el-icon>
            返回学生端
          </a>
        </div>

        <div class="flex items-center gap-3">
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
                {{ userInfo.displayName || userInfo.username || '管理员' }}
              </span>
              <span
                class="text-xs px-1.5 py-0.5 rounded-full hidden sm:inline"
                style="background: rgba(124, 92, 252, 0.1); color: var(--lt-ai);"
              >管理员</span>
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
</style>

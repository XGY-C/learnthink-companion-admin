import { createRouter, createWebHistory } from 'vue-router'
import { getUserRole } from '@/utils/api'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/admin'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue')
    },
    {
      path: '/admin',
      component: () => import('@/layouts/LayoutAdmin.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/DashboardView.vue'),
          meta: { title: '数据看板' }
        },
        {
          path: 'courses',
          name: 'admin-courses',
          component: () => import('@/views/admin/CourseListView.vue'),
          meta: { title: '课程管理' }
        },
        {
          path: 'courses/:id',
          name: 'admin-course-detail',
          component: () => import('@/views/admin/CourseDetailView.vue'),
          meta: { title: '知识点管理' }
        },
        {
          path: 'documents',
          name: 'admin-documents',
          component: () => import('@/views/admin/DocumentListView.vue'),
          meta: { title: '资料管理' }
        },
        {
          path: 'retrieval-test',
          name: 'admin-retrieval-test',
          component: () => import('@/views/admin/RetrievalTestView.vue'),
          meta: { title: '检索测试' }
        },
        {
          path: 'review',
          name: 'admin-review',
          component: () => import('@/views/admin/ReviewView.vue'),
          meta: { title: '内容审核' }
        },
        {
          path: 'students',
          name: 'admin-students',
          component: () => import('@/views/admin/StudentListView.vue'),
          meta: { title: '学生管理' }
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/views/admin/SettingsView.vue'),
          meta: { title: '系统配置' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/admin'
    }
  ]
})

router.beforeEach(async (to) => {
  const token = localStorage.getItem('token')

  if (to.path === '/login') {
    if (token) return { path: '/admin' }
    return true
  }

  if (!token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin) {
    const role = getUserRole()
    if (role !== 'admin') {
      // Non-admin trying to access admin → redirect
      return { path: '/' }
    }
  }

  return true
})

export default router

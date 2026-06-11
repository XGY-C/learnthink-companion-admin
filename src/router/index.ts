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
    // ===== Admin routes =====
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
    // ===== Teacher routes =====
    {
      path: '/teacher',
      component: () => import('@/layouts/LayoutAdmin.vue'),
      meta: { requiresAuth: true, requiresTeacher: true },
      children: [
        {
          path: '',
          name: 'teacher-dashboard',
          component: () => import('@/views/teacher/DashboardView.vue'),
          meta: { title: '我的工作台' }
        },
        {
          path: 'courses',
          name: 'teacher-courses',
          component: () => import('@/views/teacher/CourseListView.vue'),
          meta: { title: '我的课程' }
        },
        {
          path: 'courses/:id/knowledge',
          name: 'teacher-knowledge',
          component: () => import('@/views/teacher/KnowledgePointView.vue'),
          meta: { title: '知识点管理' }
        },
        {
          path: 'courses/:id/knowledge-graph',
          name: 'teacher-knowledge-graph',
          component: () => import('@/views/teacher/KnowledgeGraphView.vue'),
          meta: { title: '知识图谱' }
        },
        {
          path: 'courses/:id/documents',
          name: 'teacher-documents',
          component: () => import('@/views/teacher/DocumentListView.vue'),
          meta: { title: '资料管理' }
        },
        {
          path: 'courses/:id/retrieval',
          name: 'teacher-retrieval',
          component: () => import('@/views/teacher/RetrievalTestView.vue'),
          meta: { title: '检索测试' }
        },
        {
          path: 'courses/:id/review',
          name: 'teacher-review',
          component: () => import('@/views/teacher/ReviewView.vue'),
          meta: { title: '内容审核' }
        },
        {
          path: 'students',
          name: 'teacher-students',
          component: () => import('@/views/teacher/StudentListView.vue'),
          meta: { title: '我的学生' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: (to) => {
        const role = getUserRole()
        if (role === 'teacher') return '/teacher'
        return '/admin'
      }
    }
  ]
})

router.beforeEach(async (to) => {
  const token = localStorage.getItem('token')

  if (to.path === '/login') {
    if (token) {
      const role = getUserRole()
      if (role === 'teacher') return { path: '/teacher' }
      return { path: '/admin' }
    }
    return true
  }

  if (!token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin) {
    const role = getUserRole()
    if (role !== 'admin') return { path: '/' }
  }

  if (to.meta.requiresTeacher) {
    const role = getUserRole()
    if (role !== 'teacher') return { path: '/' }
  }

  return true
})

export default router

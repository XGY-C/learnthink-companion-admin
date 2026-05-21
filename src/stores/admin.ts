import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiFetch } from '@/utils/api'
import type { DashboardStats, SystemHealth, Course, KnowledgePoint } from '@/types'

export const useAdminStore = defineStore('admin', () => {
  // ========== Dashboard ==========
  const dashboardStats = ref<DashboardStats | null>(null)
  const systemHealth = ref<SystemHealth | null>(null)

  async function fetchDashboardStats() {
    const res = await apiFetch<DashboardStats>('/admin/stats')
    dashboardStats.value = res.data
  }

  async function fetchSystemHealth() {
    const res = await apiFetch<SystemHealth>('/admin/health')
    systemHealth.value = res.data
  }

  // ========== Courses ==========
  const courses = ref<Course[]>([])
  const courseLoading = ref(false)

  async function fetchCourses() {
    courseLoading.value = true
    try {
      const res = await apiFetch<Course[]>('/admin/courses')
      courses.value = res.data
    } finally {
      courseLoading.value = false
    }
  }

  async function createCourse(data: Partial<Course>) {
    const res = await apiFetch<Course>('/admin/courses', { method: 'POST', body: data })
    courses.value.unshift(res.data)
    return res.data
  }

  async function updateCourse(id: string, data: Partial<Course>) {
    await apiFetch(`/admin/courses/${id}`, { method: 'PUT', body: data })
    const idx = courses.value.findIndex(c => c.id === id)
    if (idx >= 0) Object.assign(courses.value[idx], data)
  }

  async function deleteCourse(id: string) {
    await apiFetch(`/admin/courses/${id}`, { method: 'DELETE' })
    courses.value = courses.value.filter(c => c.id !== id)
  }

  // ========== Knowledge Points ==========
  const kpTree = ref<KnowledgePoint[]>([])
  const selectedKp = ref<KnowledgePoint | null>(null)

  async function fetchKpTree(courseId: string) {
    const res = await apiFetch<KnowledgePoint[]>(`/admin/courses/${courseId}/knowledge-points`)
    kpTree.value = res.data
  }

  function selectKp(kp: KnowledgePoint | null) {
    selectedKp.value = kp
  }

  async function saveKp(courseId: string, kp: KnowledgePoint) {
    if (kp.id) {
      await apiFetch(`/admin/courses/${courseId}/knowledge-points/${kp.id}`, { method: 'PUT', body: kp })
    } else {
      await apiFetch(`/admin/courses/${courseId}/knowledge-points`, { method: 'POST', body: kp })
    }
    await fetchKpTree(courseId)
  }

  async function deleteKp(courseId: string, kpId: string) {
    await apiFetch(`/admin/courses/${courseId}/knowledge-points/${kpId}`, { method: 'DELETE' })
    if (selectedKp.value?.id === kpId) selectedKp.value = null
    await fetchKpTree(courseId)
  }

  // ========== Review ==========
  const reviewQueueCount = ref({ pending: 0, medium: 0 })

  async function fetchReviewCounts() {
    const res = await apiFetch<{ pending: number; medium: number }>('/admin/review/counts')
    reviewQueueCount.value = res.data
  }

  // ========== Students ==========
  const students = ref<any[]>([])
  const studentLoading = ref(false)

  async function fetchStudents(params?: Record<string, string>) {
    studentLoading.value = true
    try {
      const res = await apiFetch<any[]>('/admin/students', { method: 'GET' })
      students.value = res.data
    } finally {
      studentLoading.value = false
    }
  }

  return {
    dashboardStats, systemHealth, fetchDashboardStats, fetchSystemHealth,
    courses, courseLoading, fetchCourses, createCourse, updateCourse, deleteCourse,
    kpTree, selectedKp, fetchKpTree, selectKp, saveKp, deleteKp,
    reviewQueueCount, fetchReviewCounts,
    students, studentLoading, fetchStudents,
  }
})

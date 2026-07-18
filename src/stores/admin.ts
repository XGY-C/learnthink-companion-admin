import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiFetch } from '@/utils/api'
import type { DashboardStats, SystemHealth, Course, KnowledgePoint, TeacherInfo } from '@/types'

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

  // ========== Admin Courses ==========
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

  // ========== Teachers ==========
  const teachers = ref<TeacherInfo[]>([])
  const teacherLoading = ref(false)

  async function fetchTeachers(search?: string, status?: string) {
    teacherLoading.value = true
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const qs = params.toString()
      const res = await apiFetch<TeacherInfo[]>(`/admin/teachers${qs ? '?' + qs : ''}`)
      teachers.value = res.data || []
    } finally {
      teacherLoading.value = false
    }
  }

  async function createTeacher(data: Record<string, string>) {
    const res = await apiFetch<TeacherInfo>('/admin/teachers', { method: 'POST', body: data })
    teachers.value.unshift(res.data)
    return res.data
  }

  async function updateTeacher(id: string, data: Record<string, string>) {
    await apiFetch(`/admin/teachers/${id}`, { method: 'PUT', body: data })
    const idx = teachers.value.findIndex(t => t.id === id)
    if (idx >= 0) Object.assign(teachers.value[idx], data)
  }

  async function updateTeacherStatus(id: string, status: string) {
    await apiFetch(`/admin/teachers/${id}/status`, { method: 'PUT', body: { status } })
    const t = teachers.value.find(t => t.id === id)
    if (t) t.status = status as 'enabled' | 'disabled'
  }

  async function resetTeacherPassword(id: string) {
    await apiFetch(`/admin/teachers/${id}/reset-password`, { method: 'POST' })
  }

  async function deleteTeacher(id: string) {
    await apiFetch(`/admin/teachers/${id}`, { method: 'DELETE' })
    teachers.value = teachers.value.filter(t => t.id !== id)
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

  // ========== Teacher Dashboard ==========
  const teacherDashboard = ref<any>(null)

  async function fetchTeacherDashboard() {
    const res = await apiFetch<any>('/teacher/dashboard')
    teacherDashboard.value = res.data
  }

  // ========== Teacher Courses ==========
  const teacherCourses = ref<Course[]>([])
  const teacherCourseLoading = ref(false)

  async function fetchTeacherCourses() {
    teacherCourseLoading.value = true
    try {
      const res = await apiFetch<Course[]>('/teacher/courses')
      teacherCourses.value = res.data
    } finally {
      teacherCourseLoading.value = false
    }
  }

  // ========== Teacher Students ==========
  const teacherStudents = ref<any[]>([])
  const teacherStudentLoading = ref(false)

  async function fetchTeacherStudents() {
    teacherStudentLoading.value = true
    try {
      const res = await apiFetch<any[]>('/teacher/students')
      teacherStudents.value = res.data
    } finally {
      teacherStudentLoading.value = false
    }
  }

  return {
    dashboardStats, systemHealth, fetchDashboardStats, fetchSystemHealth,
    courses, courseLoading, fetchCourses, createCourse, updateCourse, deleteCourse,
    teachers, teacherLoading, fetchTeachers, createTeacher, updateTeacher,
    updateTeacherStatus, resetTeacherPassword, deleteTeacher,
    students, studentLoading, fetchStudents,
    teacherDashboard, fetchTeacherDashboard,
    teacherCourses, teacherCourseLoading, fetchTeacherCourses,
    teacherStudents, teacherStudentLoading, fetchTeacherStudents,
  }
})

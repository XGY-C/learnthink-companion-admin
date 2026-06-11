<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { apiFetch } from '@/utils/api'
import { ElMessage } from 'element-plus'
import { Check, Close, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import type { ResourceItem, SourceCitation, Course } from '@/types'

const route = useRoute()
const courseId = computed(() => route.params.id as string)

const loading = ref(true)
const queue = ref<ResourceItem[]>([])
const selectedItem = ref<ResourceItem | null>(null)
const courses = ref<Course[]>([])
const filters = reactive({ courseId: '', type: '', verdict: '' })
const reviewNote = ref('')
const submitting = ref(false)
const counts = ref({ pending: 0, medium: 0 })

async function loadQueue() {
  loading.value = true
  try {
    const [itemsRes, coursesRes, countsRes] = await Promise.all([
      apiFetch<ResourceItem[]>(`/teacher/courses/${courseId.value}/review/items`, { method: 'GET' }),
      apiFetch<Course[]>('/admin/courses'),
      apiFetch<{ pending: number; medium: number }>(`/teacher/courses/${courseId.value}/review/counts`),
    ])
    queue.value = itemsRes.data || []
    courses.value = coursesRes.data || []
    counts.value = countsRes.data || { pending: 0, medium: 0 }
  } catch { /* API not ready */ } finally {
    loading.value = false
  }
}

function selectItem(item: ResourceItem) {
  selectedItem.value = item
  reviewNote.value = ''
}

async function handleReview(result: 'approved' | 'rejected') {
  if (!selectedItem.value) return
  if (result === 'rejected' && !reviewNote.value.trim()) {
    ElMessage.warning('驳回时请填写审核备注')
    return
  }
  submitting.value = true
  try {
    await apiFetch(`/teacher/courses/${courseId.value}/review/${selectedItem.value.id}`, {
      method: 'POST',
      body: { result, note: reviewNote.value }
    })
    ElMessage.success(result === 'approved' ? '已通过' : '已驳回')
    queue.value = queue.value.filter(i => i.id !== selectedItem.value?.id)
    const next = queue.value[0] || null
    selectedItem.value = next
    reviewNote.value = ''
    if (result === 'approved') counts.value.pending = Math.max(0, counts.value.pending - 1)
    else counts.value.pending = Math.max(0, counts.value.pending - 1)
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleRetry() {
  if (!selectedItem.value) return
  try {
    await apiFetch(`/teacher/courses/${courseId.value}/review/${selectedItem.value.id}/retry`, { method: 'POST' })
    ElMessage.success('已退回重新生成')
    queue.value = queue.value.filter(i => i.id !== selectedItem.value?.id)
    selectedItem.value = queue.value[0] || null
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

const verdictBadge = (item: ResourceItem) => {
  if (item.reviewStatus === 'approved') return 'approved'
  if (item.reviewStatus === 'rejected') return 'rejected'
  if (item.confidenceScore >= 0.7) return 'approved'
  if (item.confidenceScore >= 0.4) return 'medium'
  return 'rejected'
}

const sources = computed<SourceCitation[]>(() => {
  return selectedItem.value?.sourcesJson || []
})

const matchedCount = computed(() => sources.value.filter(s => s.matched).length)

const typeOptions = [
  { label: '文档', value: 'doc' }, { label: '习题', value: 'quiz' },
  { label: '思维导图', value: 'mindmap' }, { label: '阅读', value: 'reading' },
  { label: '代码', value: 'code' },
]

onMounted(loadQueue)
</script>

<template>
  <div class="p-6 flex flex-col" style="height: calc(100vh - 56px);">
    <PageHeader title="内容审核">
      <template #default>
        <span class="text-sm mr-2" style="color: var(--lt-text-auxiliary);">
          待审: <strong style="color: var(--lt-brand);">{{ counts.pending }}</strong>
        </span>
        <span class="text-sm" style="color: var(--lt-text-auxiliary);">
          存疑: <strong style="color: var(--lt-warning);">{{ counts.medium }}</strong>
        </span>
      </template>
    </PageHeader>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <el-select v-model="filters.courseId" placeholder="课程" size="small" style="width:140px" clearable>
        <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-select v-model="filters.type" placeholder="资源类型" size="small" style="width:120px" clearable>
        <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
    </div>

    <!-- Master-Detail -->
    <div class="flex gap-4 flex-1 min-h-0">
      <!-- Left: Queue -->
      <div class="w-80 flex-shrink-0 rounded-lg overflow-hidden flex flex-col" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
        <div class="px-4 py-2 text-xs font-medium" style="color: var(--lt-text-auxiliary); border-bottom: 1px solid var(--lt-border);">
          审核队列
        </div>
        <div class="flex-1 overflow-y-auto">
          <div v-if="queue.length === 0 && !loading" class="p-8 text-center text-sm" style="color: var(--lt-text-placeholder);">
            暂无待审核内容
          </div>
          <div
            v-for="item in queue" :key="item.id"
            class="px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0"
            :class="{ 'bg-[var(--lt-brand-lightest)]': selectedItem?.id === item.id }"
            style="border-color: var(--lt-border);"
            @click="selectItem(item)"
          >
            <div class="flex items-center gap-2">
              <StatusBadge :status="verdictBadge(item)" />
              <span class="text-xs px-1.5 py-px rounded" style="background: var(--lt-ai-light-9); color: var(--lt-ai);">{{ item.type }}</span>
            </div>
            <p class="text-sm mt-1.5 font-medium truncate" style="color: var(--lt-text-primary);">{{ item.title }}</p>
            <div class="flex items-center gap-2 mt-1 text-xs" style="color: var(--lt-text-auxiliary);">
              <span>{{ item.courseName }}</span>
              <span>|</span>
              <span :class="{
                'confidence-high': item.confidenceScore >= 0.7,
                'confidence-medium': item.confidenceScore >= 0.4 && item.confidenceScore < 0.7,
                'confidence-low': item.confidenceScore < 0.4
              }">
                引用覆盖: {{ Math.round(item.confidenceScore * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Detail -->
      <div class="flex-1 rounded-lg overflow-hidden flex flex-col" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
        <template v-if="selectedItem">
          <!-- Metadata bar -->
          <div class="px-5 py-3 border-b flex items-center gap-3 text-sm flex-shrink-0" style="border-color: var(--lt-border);">
            <h3 class="font-semibold" style="color: var(--lt-text-primary);">{{ selectedItem.title }}</h3>
            <el-tag size="small">{{ selectedItem.type }}</el-tag>
            <span style="color: var(--lt-text-auxiliary);">课程: {{ selectedItem.courseName }}</span>
            <span class="ml-auto text-xs" style="color: var(--lt-text-auxiliary);">
              质量分: {{ selectedItem.qualityScore }} | 覆盖: {{ Math.round(selectedItem.confidenceScore * 100) }}%
            </span>
          </div>

          <div class="flex-1 overflow-y-auto p-5">
            <!-- Content Preview -->
            <h4 class="text-sm font-semibold mb-2" style="color: var(--lt-text-primary);">内容预览</h4>
            <div
              class="rounded-lg p-4 mb-5 text-sm leading-relaxed max-h-64 overflow-y-auto"
              style="background: var(--lt-bg-page); color: var(--lt-text-secondary);"
            >
              <div v-html="selectedItem.contentRef || '(内容加载中...)'" />
            </div>

            <!-- Sources -->
            <h4 class="text-sm font-semibold mb-2" style="color: var(--lt-text-primary);">
              来源引用 ({{ matchedCount }} / {{ sources.length }} 匹配)
            </h4>
            <div class="space-y-1.5 mb-5">
              <div v-for="(s, idx) in sources" :key="idx" class="flex items-start gap-2 text-sm py-1">
                <span v-if="s.matched" style="color: var(--lt-success);">✓</span>
                <span v-else style="color: var(--lt-danger);">✗</span>
                <span style="color: var(--lt-text-secondary);">{{ s.claim }}</span>
                <span v-if="s.matched" class="text-xs" style="color: var(--lt-text-auxiliary);">
                  ← {{ s.sourceDoc }}
                </span>
                <span v-else class="text-xs" style="color: var(--lt-danger);">← 未找到匹配来源</span>
              </div>
            </div>

            <!-- Agent Review -->
            <h4 class="text-sm font-semibold mb-2" style="color: var(--lt-text-primary);">Agent 审核理由</h4>
            <div
              class="rounded-lg p-3 text-sm mb-5"
              style="background: var(--lt-ai-light-9); color: var(--lt-text-secondary); border-left: 3px solid var(--lt-ai);"
            >
              {{ selectedItem.reviewSummary || '无' }}
            </div>
          </div>

          <!-- Actions -->
          <div class="px-5 py-3 border-t flex-shrink-0" style="border-color: var(--lt-border);">
            <div class="flex items-end gap-3">
              <div class="flex-1">
                <el-input
                  v-model="reviewNote"
                  type="textarea"
                  :rows="2"
                  placeholder="审核备注（驳回时必填）..."
                  size="small"
                />
              </div>
              <div class="flex gap-2">
                <el-button type="success" :icon="Check" :loading="submitting" @click="handleReview('approved')">通过</el-button>
                <el-button type="danger" :icon="Close" :loading="submitting" @click="handleReview('rejected')">驳回</el-button>
                <el-button :icon="Refresh" :loading="submitting" @click="handleRetry">退回重生成</el-button>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="flex-1 flex items-center justify-center text-center" style="color: var(--lt-text-placeholder);">
            <div>
              <el-icon :size="48"><Check /></el-icon>
              <p class="mt-3 text-sm">选择左侧审核项查看详情</p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiFetch } from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, RefreshRight, Delete, Promotion, Search, WarningFilled, Document } from '@element-plus/icons-vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import type { KnowledgeDocument, Course } from '@/types'

// ====== API types ======
interface ChapterInfo {
  title: string
  content: string
  ossUrl: string
}

interface IngestTaskProgress {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  current_step: string
  total_files: number
  processed_files: number
  total_chunks: number
  message: string
  error?: string
}

// ====== State ======
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const loading = ref(false)
const documents = ref<KnowledgeDocument[]>([])
const courses = ref<Course[]>([])
const courseMap = computed(() => {
  const m: Record<string, string> = {}
  courses.value.forEach(c => { m[c.id] = c.name })
  return m
})
const filterCourseId = ref('')
const searchKeyword = ref('')

// Upload dialog
const showUpload = ref(false)
const uploadFile = ref<File | null>(null)
const uploadCourseId = ref('')
const uploading = ref(false)

// Upload MD dialog
const showUploadMd = ref(false)
const uploadMdFile = ref<File | null>(null)
const uploadMdCourseId = ref('')
const uploadingMd = ref(false)

// Parse dialog
const showParse = ref(false)
const parseChapters = ref<ChapterInfo[]>([])
const parseLoading = ref(false)

// MD split
const splittingMdId = ref('')
const parseDocTitle = ref('')

// Preview dialog
const showPreview = ref(false)
const previewTitle = ref('')
const previewContent = ref('')
const previewLoading = ref(false)

// Ingest dialog
const showIngest = ref(false)
const ingestCourseId = ref('')
const ingestFullRebuild = ref(false)
const ingestTaskId = ref('')
const ingestProgress = ref<IngestTaskProgress | null>(null)
const ingestPollTimer = ref<ReturnType<typeof setInterval> | null>(null)
const ingesting = ref(false)

// Book info dialog
const showBookInfo = ref(false)
const bookInfoDoc = ref<KnowledgeDocument | null>(null)
const bookInfo = ref<any>(null)
const bookInfoLoading = ref(false)
const bookInfoExtracting = ref(false)
const tocTree = computed(() => {
  if (!bookInfo.value?.toc) return []
  try {
    const parsed = JSON.parse(bookInfo.value.toc)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
})

interface BookInfo {
  id: string
  documentId: string
  title: string
  author: string
  introduction: string
  toc: string  // JSON string
  extractedAt: string
}

async function handleBookInfo(doc: KnowledgeDocument) {
  bookInfoDoc.value = doc
  showBookInfo.value = true
  bookInfoLoading.value = true
  bookInfo.value = null
  try {
    const res = await apiFetch<BookInfo>(`/teacher/courses/${courseId.value}/documents/${doc.id}/book-info`)
    bookInfo.value = res.data || null
  } catch (e: any) {
    ElMessage.error('加载书籍信息失败: ' + (e.message || ''))
  } finally {
    bookInfoLoading.value = false
  }
}

async function handleExtractBookInfo() {
  const doc = bookInfoDoc.value
  if (!doc) return
  bookInfoExtracting.value = true
  try {
    const res = await apiFetch<BookInfo>(`/teacher/courses/${courseId.value}/documents/${doc.id}/extract-book-info`, { method: 'POST' })
    bookInfo.value = res.data
    ElMessage.success('书籍信息提取成功')
  } catch (e: any) {
    ElMessage.error('提取失败: ' + (e.message || ''))
  } finally {
    bookInfoExtracting.value = false
  }
}

// Book info editing
const bookInfoEditing = ref(false)
const editAuthor = ref('')
const editIntroduction = ref('')

function startEdit() {
  if (!bookInfo.value) return
  editAuthor.value = bookInfo.value.author || ''
  editIntroduction.value = bookInfo.value.introduction || ''
  bookInfoEditing.value = true
}

function cancelEdit() {
  bookInfoEditing.value = false
  editAuthor.value = ''
  editIntroduction.value = ''
}

function closeBookInfo() {
  bookInfoDoc.value = null
  bookInfoEditing.value = false
  showBookInfo.value = false
}

async function saveEdit() {
  const doc = bookInfoDoc.value
  if (!doc) return
  bookInfoExtracting.value = true  // reuse loading state
  try {
    const res = await apiFetch<BookInfo>(`/teacher/courses/${courseId.value}/documents/${doc.id}/book-info`, {
      method: 'PUT',
      body: { author: editAuthor.value, introduction: editIntroduction.value },
    })
    bookInfo.value = res.data
    bookInfoEditing.value = false
    ElMessage.success('书籍信息已更新')
  } catch (e: any) {
    ElMessage.error('更新失败: ' + (e.message || ''))
  } finally {
    bookInfoExtracting.value = false
  }
}

// Build records dialog
const showRecords = ref(false)
const recordsCourseId = ref('')
const recordsTasks = ref<any[]>([])
const recordsLoading = ref(false)
const showTaskDetail = ref(false)
const detailTask = ref<any>(null)
const detailPollTimer = ref<ReturnType<typeof setInterval> | null>(null)

// ====== Computed ======
const filteredDocs = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  return documents.value.filter(d => {
    if (filterCourseId.value && d.courseId !== filterCourseId.value) return false
    if (kw && !d.title.toLowerCase().includes(kw)) return false
    return true
  })
})

/** 树形结构：parentId 为空的作为根节点，子文档挂在其下 */
const treeData = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  // 按课程过滤
  const filtered = documents.value.filter(d => {
    if (filterCourseId.value && d.courseId !== filterCourseId.value) return false
    if (kw && !d.title.toLowerCase().includes(kw)) return false
    return true
  })

  // 分离根节点和子节点；孤儿节点（parentId 指向已删除文档）提升为根节点
  const roots: KnowledgeDocument[] = []
  const childrenByParent = new Map<string, KnowledgeDocument[]>()
  const docIds = new Set<string>(filtered.map(d => d.id))
  for (const d of filtered) {
    if (d.parentId && d.parentId.trim()) {
      if (docIds.has(d.parentId)) {
        // 正常子节点
        const arr = childrenByParent.get(d.parentId) || []
        arr.push(d)
        childrenByParent.set(d.parentId, arr)
      } else {
        // 孤儿节点，提升为根
        roots.push(d)
      }
    } else {
      roots.push(d)
    }
  }
  // 子节点按创建时间正序
  for (const [, children] of childrenByParent) {
    children.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
  }
  // 根节点按创建时间倒序
  roots.sort((a, b) => ((b.createdAt || '') as string).localeCompare((a.createdAt || '') as string))
  // 组装树
  function buildTree(nodes: KnowledgeDocument[]): (KnowledgeDocument & { children?: KnowledgeDocument[] })[] {
    return nodes.map(n => {
      const result = { ...n } as KnowledgeDocument & { children?: KnowledgeDocument[] }
      const subs = childrenByParent.get(n.id)
      if (subs && subs.length > 0) {
        result.children = subs
      }
      return result
    })
  }
  return buildTree(roots)
})

// ====== Data loading ======
async function loadData() {
  loading.value = true
  try {
    const docRes = await apiFetch<KnowledgeDocument[]>(`/teacher/courses/${courseId.value}/documents`)
    documents.value = docRes.data || []
  } catch (e: any) {
    ElMessage.error('加载文档失败: ' + (e.message || ''))
  }
  try {
    const courseRes = await apiFetch<Course[]>('/teacher/courses')
    courses.value = courseRes.data || []
  } catch (_e) {
    // 课程列表非关键数据
  } finally {
    loading.value = false
  }
}

// ====== Upload ======
function openUpload() {
  uploadFile.value = null
  uploadCourseId.value = ''
  showUpload.value = true
}

async function handleUpload() {
  if (!uploadFile.value) { ElMessage.warning('请选择文件'); return }
  if (!uploadCourseId.value) { ElMessage.warning('请选择课程'); return }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadFile.value)
    formData.append('courseId', uploadCourseId.value)
    formData.append('title', uploadFile.value.name.replace(/\.pdf$/i, ''))

    await apiFetch(`/teacher/courses/${courseId.value}/documents/upload-pdf`, {
      method: 'POST',
      body: formData,
    })
    ElMessage.success('上传成功')
    showUpload.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error('上传失败: ' + (e.message || ''))
  } finally {
    uploading.value = false
  }
}

// ====== MD Upload ======
function openUploadMd() {
  uploadMdFile.value = null
  uploadMdCourseId.value = ''
  showUploadMd.value = true
}

async function handleUploadMd() {
  if (!uploadMdFile.value) { ElMessage.warning('请选择文件'); return }
  if (!uploadMdCourseId.value) { ElMessage.warning('请选择课程'); return }

  uploadingMd.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadMdFile.value)
    formData.append('courseId', uploadMdCourseId.value)
    formData.append('title', uploadMdFile.value.name.replace(/\.md$/i, ''))

    await apiFetch(`/teacher/courses/${courseId.value}/documents/upload-md`, {
      method: 'POST',
      body: formData,
    })
    ElMessage.success('MD教材上传成功')
    showUploadMd.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error('上传失败: ' + (e.message || ''))
  } finally {
    uploadingMd.value = false
  }
}

// ====== Parse (async with progress, background polling) ======
const parseTaskId = ref('')
const parsingDocId = ref('')          // 当前正在解析的文档ID
const parseProgress = ref<{
  state: string
  progress: number
  message: string
  error?: string
  chapters?: ChapterInfo[]
  fullMdUrl?: string
} | null>(null)
const parsePollTimer = ref<ReturnType<typeof setInterval> | null>(null)
const parseTaskLoading = ref(false)

/** 点"解析"：如有活跃任务则直接打开弹窗，否则提交新任务 */
async function handleParse(doc: KnowledgeDocument) {
  // 同一文档已有任务在跑 → 直接打开弹窗
  if (parsingDocId.value === doc.id && parseTaskId.value && parseProgress.value &&
      parseProgress.value.state !== 'completed' && parseProgress.value.state !== 'failed') {
    parseDocTitle.value = doc.title
    parseChapters.value = parseProgress.value.chapters || []
    showParse.value = true
    return
  }

  parseTaskLoading.value = true
  parseTaskId.value = ''
  parseProgress.value = null
  parseChapters.value = []
  parseDocTitle.value = doc.title
  showParse.value = true
  try {
    const res = await apiFetch<{ taskId: string }>(`/teacher/courses/${courseId.value}/documents/parse-submit`, {
      method: 'POST',
      body: { fileUrl: doc.filePath, courseId: doc.courseId, title: doc.title, id: doc.id },
    })
    parsingDocId.value = doc.id
    parseTaskId.value = res.data.taskId
    parseProgress.value = { state: 'pending', progress: 0, message: '任务已提交' }
    startParsePolling()
  } catch (e: any) {
    parseProgress.value = { state: 'failed', progress: 0, message: '', error: e.message || '提交解析任务失败' }
    ElMessage.error('提交解析任务失败: ' + (e.message || ''))
  } finally {
    parseTaskLoading.value = false
  }
}

function startParsePolling() {
  parsePollTimer.value = setInterval(async () => {
    try {
      const res = await apiFetch<{
        state: string; progress: number; message: string; error?: string; chapters?: ChapterInfo[]; fullMdUrl?: string
      }>(`/teacher/courses/${courseId.value}/documents/parse-task/${parseTaskId.value}`)
      parseProgress.value = res.data
      if (res.data.state === 'completed') {
        stopParsePolling()
        parseChapters.value = res.data.chapters || []
        ElMessage.success(res.data.message || '解析完成')
      } else if (res.data.state === 'failed') {
        stopParsePolling()
        parseChapters.value = []
        ElMessage.error(res.data.error || '解析失败')
      }
    } catch {
      stopParsePolling()
      ElMessage.error('查询解析进度失败')
    }
  }, 2000)
}

function stopParsePolling() {
  if (parsePollTimer.value) {
    clearInterval(parsePollTimer.value)
    parsePollTimer.value = null
  }
}

/** 关闭弹窗不停止轮询，后台继续跑 */
function closeParse() {
  showParse.value = false
}

// ====== MD Split ======
async function handleSplitMd(doc: KnowledgeDocument) {
  splittingMdId.value = doc.id
  try {
    const res = await apiFetch<{ chapters: ChapterInfo[]; count: number }>(`/teacher/courses/${courseId.value}/documents/split-md`, {
      method: 'POST',
      body: { fileUrl: doc.filePath, courseId: doc.courseId, id: doc.id },
    })
    ElMessage.success(`拆分完成，共 ${res.data.count} 个章节`)
    await loadData()
  } catch (e: any) {
    ElMessage.error('拆分失败: ' + (e.message || ''))
  } finally {
    splittingMdId.value = ''
  }
}

// ====== Preview ======
/** 文档列表中，按文档ID从OSS加载 */
async function handlePreview(docId: string) {
  previewLoading.value = true
  showPreview.value = true
  previewTitle.value = ''
  previewContent.value = ''
  try {
    const res = await apiFetch<{ content: string; title: string }>(`/teacher/courses/${courseId.value}/documents/preview?id=${docId}`)
    previewTitle.value = res.data.title
    previewContent.value = res.data.content
  } catch (e: any) {
    previewContent.value = ''
    ElMessage.error('加载预览失败: ' + (e.message || ''))
  } finally {
    previewLoading.value = false
  }
}

/** 解析结果中，直接显示内存中的章节内容 */
function previewChapterByIndex(index: number) {
  const ch = parseChapters.value[index]
  if (!ch) return
  previewTitle.value = ch.title
  previewContent.value = ch.content || '（无内容）'
  showPreview.value = true
}

/** 解析完成后，从OSS加载完整MD并预览 */
async function previewFullMd() {
  if (!parseProgress.value?.fullMdUrl) return
  previewLoading.value = true
  showPreview.value = true
  previewTitle.value = parseDocTitle.value + '（全文）'
  previewContent.value = ''
  try {
    const res = await apiFetch<{ content: string; title: string }>(`/teacher/courses/${courseId.value}/documents/preview-by-url?url=${encodeURIComponent(parseProgress.value.fullMdUrl)}`)
    previewContent.value = res.data.content
  } catch (e: any) {
    ElMessage.error('加载完整MD失败: ' + (e.message || ''))
  } finally {
    previewLoading.value = false
  }
}

// ====== Delete ======
async function handleDelete(doc: KnowledgeDocument) {
  try {
    await ElMessageBox.confirm(`确定删除「${doc.title}」吗？`, '确认删除', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
    await apiFetch(`/teacher/courses/${courseId.value}/documents/${doc.id}`, { method: 'DELETE' })
    ElMessage.success('已删除')
    await loadData()
  } catch { /* cancelled */ }
}

// ====== Ingest (pure submission) ======
function openIngest() {
  ingestCourseId.value = ''
  ingestFullRebuild.value = false
  ingestTaskId.value = ''
  ingestProgress.value = null
  showIngest.value = true
}

async function submitIngest() {
  if (!ingestCourseId.value) { ElMessage.warning('请选择课程'); return }

  ingesting.value = true
  ingestProgress.value = null
  try {
    const res = await apiFetch<{ task_id: string }>(`/teacher/courses/${courseId.value}/documents/ingest`, {
      method: 'POST',
      body: { courseId: ingestCourseId.value, fullRebuild: ingestFullRebuild.value },
    })
    ingestTaskId.value = res.data.task_id
    ElMessage.success('已提交知识库构建任务')
    startPolling()
  } catch (e: any) {
    ElMessage.error('提交失败: ' + (e.message || ''))
    ingesting.value = false
  }
}

function startPolling() {
  ingestPollTimer.value = setInterval(async () => {
    try {
      const res = await apiFetch<IngestTaskProgress>(`/teacher/courses/${courseId.value}/documents/ingest-task/${ingestTaskId.value}`)
      ingestProgress.value = res.data
      if (res.data.status === 'completed') {
        stopPolling()
        ElMessage.success(res.data.message || '知识库构建完成')
        await loadData()
      } else if (res.data.status === 'failed') {
        stopPolling()
        ElMessage.error(res.data.error || '知识库构建失败')
        await loadData()
      }
    } catch {
      stopPolling()
    }
  }, 2000)
}

function stopPolling() {
  if (ingestPollTimer.value) {
    clearInterval(ingestPollTimer.value)
    ingestPollTimer.value = null
  }
  ingesting.value = false
}

function closeIngest() {
  stopPolling()
  showIngest.value = false
}

// ====== Build Records ======
function openRecords() {
  showRecords.value = true
  recordsCourseId.value = ''
  recordsTasks.value = []
  loadRecords()
}

async function loadRecords() {
  recordsLoading.value = true
  try {
    let url = `/teacher/courses/${courseId.value}/documents/ingest-tasks?limit=20`
    if (recordsCourseId.value) {
      url += '&courseId=' + recordsCourseId.value
    }
    const res = await apiFetch<any[]>(url)
    recordsTasks.value = res.data || []
  } catch (e: any) {
    ElMessage.error('加载构建记录失败: ' + (e.message || ''))
  } finally {
    recordsLoading.value = false
  }
}

function viewDetail(task: any) {
  detailTask.value = { ...task }
  showTaskDetail.value = true
  if (task.status === 'running' || task.status === 'pending') {
    startDetailPolling(task.task_id)
  }
}

function startDetailPolling(taskId: string) {
  detailPollTimer.value = setInterval(async () => {
    try {
      const res = await apiFetch<any>(`/teacher/courses/${courseId.value}/documents/ingest-task/${taskId}`)
      detailTask.value = res.data
      const idx = recordsTasks.value.findIndex(t => t.task_id === taskId)
      if (idx >= 0) recordsTasks.value[idx] = res.data
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        stopDetailPolling()
      }
    } catch { /* retry next cycle */ }
  }, 2000)
}

function stopDetailPolling() {
  if (detailPollTimer.value) {
    clearInterval(detailPollTimer.value)
    detailPollTimer.value = null
  }
}

function closeDetail() {
  stopDetailPolling()
  showTaskDetail.value = false
  detailTask.value = null
}

function statusTag(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'completed': return 'success'
    case 'running': case 'pending': return 'warning'
    case 'failed': return 'danger'
    default: return 'info'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return '完成'
    case 'running': return '运行中'
    case 'pending': return '等待中'
    case 'failed': return '失败'
    default: return status
  }
}

function fmtTime(ts: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

/** 判断文档是否为MD文件（直接上传的完整教材，非解析生成的章节） */
function isMdFile(doc: KnowledgeDocument) {
  return doc.filePath?.toLowerCase().endsWith('.md')
}

onMounted(loadData)

// 切换课程时重新加载
watch(() => route.params.id, () => { loadData() })
</script>

<template>
  <div class="p-6">
    <PageHeader title="资料管理" description="上传PDF（Mineru解析）或MD教材 → 批量加入RAG知识库">
      <el-button type="primary" :icon="UploadFilled" @click="openUpload">上传PDF</el-button>
      <el-button :icon="UploadFilled" @click="openUploadMd">上传MD教材</el-button>
      <el-button :icon="Promotion" @click="openIngest">加入知识库</el-button>
      <el-button :icon="RefreshRight" plain @click="openRecords">构建记录</el-button>
    </PageHeader>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-4">
      <span class="text-sm" style="color: var(--lt-text-auxiliary);">课程筛选</span>
      <el-select v-model="filterCourseId" placeholder="全部课程" clearable style="width:200px">
        <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索文档名称..."
        :prefix-icon="Search"
        clearable
        style="width:240px"
        size="default"
      />
    </div>

    <!-- Document table (tree mode) -->
    <div class="rounded-lg overflow-hidden card-elevated" style="background: var(--lt-bg-card);">
      <el-table
        :data="treeData"
        v-loading="loading"
        style="width:100%"
        empty-text="暂无文档，请上传PDF或MD教材"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        default-expand-all
      >
        <el-table-column label="名称" min-width="260">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <!-- 子文档显示层级缩进，无需额外标记；el-table tree 自动处理缩进 -->
              <template v-if="row.parentId">
                <el-tag type="success" size="small" effect="plain">
                  {{ row.sourceType === '讲义' ? '全文' : '章节' }}
                </el-tag>
              </template>
              <template v-else>
                <el-tag :type="isMdFile(row) ? 'warning' : 'primary'" size="small" effect="plain">
                  {{ isMdFile(row) ? 'MD' : 'PDF' }}
                </el-tag>
              </template>
              <span style="color: var(--lt-text-primary); font-weight:500;">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.sourceType === '教材' ? 'primary' : row.sourceType === '讲义' ? 'warning' : 'success'" size="small">
              {{ row.sourceType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="课程" width="120">
          <template #default="{ row }">{{ courseMap[row.courseId] || row.courseId }}</template>
        </el-table-column>
        <el-table-column prop="filePath" label="OSS路径" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="上传时间" width="150" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <!-- 子文档（讲义章节 / 讲义全文）：预览 / 删除 -->
            <template v-if="row.parentId">
              <el-button link type="primary" size="small" :icon="Search" @click="handlePreview(row.id)">预览</el-button>
              <el-button link type="danger" size="small" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
            <!-- 根文档：MD教材 -->
            <template v-else-if="isMdFile(row)">
              <el-button link type="primary" size="small" :icon="Search" @click="handlePreview(row.id)">预览</el-button>
              <el-button link type="warning" size="small" :icon="RefreshRight" @click="handleSplitMd(row)" :loading="splittingMdId === row.id">拆分</el-button>
              <el-button link type="primary" size="small" :icon="Document" @click="handleBookInfo(row)">书籍</el-button>
              <el-button link type="danger" size="small" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
            <!-- 根文档：PDF教材 -->
            <template v-else-if="row.sourceType === '教材'">
              <!-- 正在解析中 -->
              <template v-if="parsingDocId === row.id && parseProgress && parseProgress.state !== 'completed' && parseProgress.state !== 'failed'">
                <el-button link type="warning" size="small" :icon="RefreshRight" @click="handleParse(row)">解析中</el-button>
              </template>
              <template v-else>
                <el-button link type="primary" size="small" :icon="RefreshRight" @click="handleParse(row)">解析</el-button>
              </template>
              <el-button link type="primary" size="small" :icon="Document" @click="handleBookInfo(row)">书籍</el-button>
              <el-button link type="danger" size="small" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <div class="px-4 py-3 text-xs" style="color: var(--lt-text-auxiliary); border-top:1px solid var(--lt-border);">
        共 {{ treeData.reduce((sum, r) => sum + 1 + (r.children?.length || 0), 0) }} 个文档
      </div>
    </div>

    <!-- ===== Upload Dialog ===== -->
    <el-dialog v-model="showUpload" title="上传PDF" width="480px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="目标课程" required>
          <el-select v-model="uploadCourseId" placeholder="选择课程" style="width:100%">
            <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择PDF文件" required>
          <el-upload
            :auto-upload="false"
            :show-file-list="true"
            accept=".pdf"
            :limit="1"
            :on-change="(u: any) => { uploadFile = u.raw }"
            :on-remove="() => { uploadFile = null }"
          >
            <template #trigger>
              <el-button type="primary" plain>选择文件</el-button>
            </template>
            <template #tip>
              <p class="text-xs mt-1" style="color:var(--lt-text-placeholder);">仅支持 PDF，最大 200MB（Mineru精准解析API限制）</p>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUpload = false">取消</el-button>
        <el-button type="primary" :loading="uploading" :disabled="!uploadFile || !uploadCourseId" @click="handleUpload">上传</el-button>
      </template>
    </el-dialog>

    <!-- ===== Upload MD Dialog ===== -->
    <el-dialog v-model="showUploadMd" title="上传MD教材" width="480px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="目标课程" required>
          <el-select v-model="uploadMdCourseId" placeholder="选择课程" style="width:100%">
            <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择MD文件" required>
          <el-upload
            :auto-upload="false"
            :show-file-list="true"
            accept=".md"
            :limit="1"
            :on-change="(u: any) => { uploadMdFile = u.raw }"
            :on-remove="() => { uploadMdFile = null }"
          >
            <template #trigger>
              <el-button type="warning" plain>选择文件</el-button>
            </template>
            <template #tip>
              <p class="text-xs mt-1" style="color:var(--lt-text-placeholder);">上传完整的Markdown教材文档，将直接入库，无需Mineru解析</p>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUploadMd = false">取消</el-button>
        <el-button type="primary" :loading="uploadingMd" :disabled="!uploadMdFile || !uploadMdCourseId" @click="handleUploadMd">上传</el-button>
      </template>
    </el-dialog>

    <!-- ===== Parse Dialog with Progress ===== -->
    <el-dialog v-model="showParse" title="解析PDF" width="640px" :close-on-click-modal="false" @close="closeParse">
      <!-- Submitting -->
      <template v-if="parseTaskLoading">
        <div class="flex items-center justify-center py-12">
          <el-icon class="is-loading" :size="24"><RefreshRight /></el-icon>
          <span class="ml-3" style="color:var(--lt-text-auxiliary);">正在提交解析任务...</span>
        </div>
      </template>
      <!-- Failed state -->
      <template v-else-if="parseProgress?.state === 'failed'">
        <div class="py-8 text-center">
          <el-icon :size="32" color="var(--lt-danger)" class="mb-3"><WarningFilled /></el-icon>
          <p class="text-sm mb-2" style="color:var(--lt-text-primary);font-weight:500;">解析失败</p>
          <p class="text-xs" style="color:var(--lt-text-auxiliary);">{{ parseProgress.error }}</p>
        </div>
      </template>
      <!-- Progress state -->
      <template v-else-if="parseProgress && parseProgress.state !== 'completed'">
        <div class="py-6">
          <div class="flex items-center gap-3 mb-4">
            <el-icon class="is-loading" :size="20" color="var(--lt-brand)">
              <RefreshRight />
            </el-icon>
            <span class="font-medium">{{ parseProgress.message }}</span>
          </div>
          <el-progress
            :percentage="Math.round(parseProgress.progress)"
            :stroke-width="12"
          />
          <p class="text-xs mt-3" style="color:var(--lt-text-placeholder);">
            【{{ parseDocTitle }}】正在通过Mineru解析PDF，请耐心等待
          </p>
        </div>
      </template>
      <!-- Result: chapters -->
      <template v-else-if="parseChapters.length > 0">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm" style="color:var(--lt-text-auxiliary);">
            「{{ parseDocTitle }}」解析为以下 {{ parseChapters.length }} 个章节，已自动上传至OSS：
          </p>
          <el-button v-if="parseProgress?.fullMdUrl" link type="primary" size="small" :icon="Search" @click="previewFullMd">
            查看完整MD
          </el-button>
        </div>
        <el-table :data="parseChapters" style="width:100%" max-height="360">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="title" label="章节名称" min-width="180" />
          <el-table-column label="操作" width="80">
            <template #default="{ $index }">
              <el-button link type="primary" size="small" @click="previewChapterByIndex($index)">预览</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <!-- Error -->
      <template v-else>
        <p style="color:var(--lt-text-auxiliary);">{{ parseProgress?.error || '暂无解析结果' }}</p>
      </template>
      <template #footer>
        <el-button @click="closeParse">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ===== Preview Dialog ===== -->
    <el-dialog v-model="showPreview" :title="previewTitle || '预览'" width="800px">
      <template v-if="previewLoading">
        <div class="flex items-center justify-center py-12">
          <el-icon class="is-loading" :size="24"><RefreshRight /></el-icon>
          <span class="ml-3" style="color:var(--lt-text-auxiliary);">加载中...</span>
        </div>
      </template>
      <template v-else>
        <pre class="text-sm leading-relaxed whitespace-pre-wrap" style="color:var(--lt-text-primary); max-height:500px; overflow-y:auto;">{{ previewContent || '暂无内容' }}</pre>
      </template>
    </el-dialog>

    <!-- ===== Book Info Dialog ===== -->
    <el-dialog v-model="showBookInfo" title="书籍信息" width="600px" :close-on-click-modal="false" @close="closeBookInfo">
      <template v-if="bookInfoLoading">
        <div class="flex items-center justify-center py-12">
          <el-icon class="is-loading" :size="24"><RefreshRight /></el-icon>
          <span class="ml-3" style="color:var(--lt-text-auxiliary);">加载中...</span>
        </div>
      </template>
      <template v-else-if="!bookInfo">
        <div class="py-8 text-center">
          <el-icon :size="32" color="var(--lt-text-placeholder)" class="mb-3"><Document /></el-icon>
          <p class="text-sm mb-2" style="color:var(--lt-text-primary);">尚未提取书籍信息</p>
          <p class="text-xs mb-4" style="color:var(--lt-text-auxiliary);">点击下方按钮从教材MD中提取作者、简介和目录</p>
          <el-button type="primary" :loading="bookInfoExtracting" @click="handleExtractBookInfo">提取书籍信息</el-button>
        </div>
      </template>
      <template v-else>
        <div class="space-y-4">
          <!-- 书名 -->
          <div class="flex items-center gap-3">
            <el-tag type="primary" effect="plain" size="small">书名</el-tag>
            <span style="color:var(--lt-text-primary);font-weight:600;font-size:16px;">{{ bookInfo.title }}</span>
          </div>

          <!-- 作者 -->
          <div v-if="!bookInfoEditing" class="flex items-center gap-3">
            <el-tag type="warning" effect="plain" size="small">作者</el-tag>
            <span style="color:var(--lt-text-primary);">{{ bookInfo.author || '（空）' }}</span>
          </div>
          <div v-else class="flex items-start gap-3">
            <el-tag type="warning" effect="plain" size="small" class="mt-1">作者</el-tag>
            <el-input v-model="editAuthor" placeholder="输入作者名称" style="flex:1" />
          </div>

          <!-- 内容简介 -->
          <div v-if="!bookInfoEditing && bookInfo.introduction">
            <el-tag type="success" effect="plain" size="small" class="mb-2">内容简介</el-tag>
            <div class="text-sm leading-relaxed p-3 rounded" style="background:var(--lt-bg-secondary);color:var(--lt-text-secondary);max-height:200px;overflow-y:auto;">
              {{ bookInfo.introduction }}
            </div>
          </div>
          <div v-else-if="bookInfoEditing">
            <el-tag type="success" effect="plain" size="small" class="mb-2">内容简介</el-tag>
            <el-input
              v-model="editIntroduction"
              type="textarea"
              :rows="6"
              placeholder="输入内容简介"
              style="flex:1"
            />
          </div>

          <!-- 目录（点击切换展开/收起） -->
          <div v-if="tocTree.length > 0">
            <el-tag type="info" effect="plain" size="small" class="mb-2">目录</el-tag>
            <div class="p-2 rounded" style="background:var(--lt-bg-secondary);max-height:320px;overflow-y:auto;">
              <el-tree
                :data="tocTree"
                :props="{ label: 'title', children: 'children' }"
                node-key="title"
                default-expand-all
              />
            </div>
          </div>

          <div class="text-xs" style="color:var(--lt-text-placeholder);">
            提取时间: {{ bookInfo.extractedAt }}
          </div>
        </div>
      </template>
      <template #footer>
        <template v-if="bookInfo && !bookInfoLoading">
          <template v-if="bookInfoEditing">
            <el-button @click="cancelEdit">取消</el-button>
            <el-button type="primary" :loading="bookInfoExtracting" @click="saveEdit">保存</el-button>
          </template>
          <template v-else>
            <el-button :loading="bookInfoExtracting" @click="handleExtractBookInfo">重新提取</el-button>
            <el-button @click="startEdit">编辑</el-button>
            <el-button type="primary" @click="closeBookInfo">关闭</el-button>
          </template>
        </template>
        <template v-else>
          <el-button @click="closeBookInfo">关闭</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- ===== Ingest Dialog ===== -->
    <el-dialog v-model="showIngest" title="加入知识库" width="520px" :close-on-click-modal="false" @close="closeIngest">
      <template v-if="!ingestTaskId">
        <el-form label-position="top">
          <el-form-item label="目标课程" required>
            <el-select v-model="ingestCourseId" placeholder="选择课程" style="width:100%">
              <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="选项">
            <el-checkbox v-model="ingestFullRebuild">全量重建索引（会清除该课程旧索引）</el-checkbox>
          </el-form-item>
          <p class="text-xs" style="color:var(--lt-text-placeholder);">
            将把该课程下所有已解析的章节MD提交到RAG服务，分块后构建Milvus向量索引
          </p>
        </el-form>
      </template>
      <template v-else>
        <div class="py-4">
          <div class="flex items-center gap-3 mb-4">
            <el-icon v-if="ingestProgress?.status === 'running' || ingestProgress?.status === 'pending'" class="is-loading" :size="20" color="var(--lt-brand)">
              <RefreshRight />
            </el-icon>
            <el-icon v-else-if="ingestProgress?.status === 'completed'" :size="20" color="#67C23A"><Promotion /></el-icon>
            <el-icon v-else-if="ingestProgress?.status === 'failed'" :size="20" color="#F56C6C"><Delete /></el-icon>
            <span class="font-medium">{{ ingestProgress?.current_step || '任务已提交' }}</span>
          </div>

          <el-progress
            :percentage="Math.round(ingestProgress?.progress || 0)"
            :status="ingestProgress?.status === 'failed' ? 'exception' : ingestProgress?.status === 'completed' ? 'success' : undefined"
            :stroke-width="12"
          />

          <div class="mt-3 text-sm space-y-1" style="color:var(--lt-text-auxiliary);">
            <p v-if="ingestProgress">{{ ingestProgress.message }}</p>
            <p v-if="ingestProgress && ingestProgress.total_files > 0">
              文件: {{ ingestProgress.processed_files }} / {{ ingestProgress.total_files }}
            </p>
            <p v-if="ingestProgress && ingestProgress.total_chunks > 0">
              文本块: {{ ingestProgress.total_chunks }}
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <template v-if="!ingestTaskId">
          <el-button @click="closeIngest">取消</el-button>
          <el-button type="primary" :loading="ingesting" :disabled="!ingestCourseId" @click="submitIngest">提交构建</el-button>
        </template>
        <template v-else>
          <el-button @click="closeIngest">关闭</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- ===== Build Records Dialog ===== -->
    <el-dialog v-model="showRecords" title="构建记录" width="760px" :close-on-click-modal="false" @close="stopDetailPolling">
      <div class="flex items-center gap-3 mb-4">
        <el-select v-model="recordsCourseId" placeholder="全部课程" clearable style="width:200px" @change="loadRecords">
          <el-option v-for="c in courses" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button :icon="RefreshRight" @click="loadRecords">刷新</el-button>
      </div>

      <el-table :data="recordsTasks" v-loading="recordsLoading" style="width:100%" empty-text="暂无构建记录">
        <el-table-column label="课程" width="120">
          <template #default="{ row }">{{ courseMap[row.course_id] || row.course_id }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="150">
          <template #default="{ row }">
            <el-progress :percentage="Math.round(row.progress)" :stroke-width="8" />
          </template>
        </el-table-column>
        <el-table-column label="文件" width="80" align="center">
          <template #default="{ row }">{{ row.processed_files }}/{{ row.total_files }}</template>
        </el-table-column>
        <el-table-column label="文本块" width="80" align="center">
          <template #default="{ row }">{{ row.total_chunks || '-' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- ===== Task Detail Dialog ===== -->
    <el-dialog v-model="showTaskDetail" title="任务详情" width="520px" :close-on-click-modal="false" @close="closeDetail">
      <template v-if="detailTask">
        <div class="py-4">
          <div class="flex items-center gap-3 mb-3">
            <el-icon v-if="detailTask.status === 'running' || detailTask.status === 'pending'" class="is-loading" :size="20" color="var(--lt-brand)">
              <RefreshRight />
            </el-icon>
            <el-icon v-else-if="detailTask.status === 'completed'" :size="20" color="#67C23A"><Promotion /></el-icon>
            <el-icon v-else-if="detailTask.status === 'failed'" :size="20" color="#F56C6C"><Delete /></el-icon>
            <span class="font-medium">{{ detailTask.current_step || statusLabel(detailTask.status) }}</span>
          </div>

          <el-progress
            :percentage="Math.round(detailTask.progress || 0)"
            :status="detailTask.status === 'failed' ? 'exception' : detailTask.status === 'completed' ? 'success' : undefined"
            :stroke-width="12"
          />

          <div class="mt-4 text-sm space-y-2" style="color:var(--lt-text-auxiliary);">
            <p><span class="font-medium" style="color:var(--lt-text-primary);">任务ID：</span>{{ detailTask.task_id }}</p>
            <p><span class="font-medium" style="color:var(--lt-text-primary);">课程：</span>{{ courseMap[detailTask.course_id] || detailTask.course_id }}</p>
            <p>{{ detailTask.message }}</p>
            <p v-if="detailTask.total_files > 0">文件: {{ detailTask.processed_files }} / {{ detailTask.total_files }}</p>
            <p v-if="detailTask.total_chunks > 0">文本块: {{ detailTask.total_chunks }}</p>
            <p v-if="detailTask.error" style="color:var(--lt-danger);">错误: {{ detailTask.error }}</p>
            <p>创建时间: {{ fmtTime(detailTask.created_at) }}</p>
            <p v-if="detailTask.updated_at">更新时间: {{ fmtTime(detailTask.updated_at) }}</p>
          </div>
        </div>
      </template>
      <template #footer>
        <el-button @click="closeDetail">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

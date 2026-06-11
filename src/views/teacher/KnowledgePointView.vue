<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFetch } from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Delete, Document } from '@element-plus/icons-vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import type { KnowledgePoint, Course } from '@/types'

const route = useRoute()
const router = useRouter()
const courseId = computed(() => route.params.id as string)

const course = ref<Course | null>(null)
const treeData = ref<KnowledgePoint[]>([])
const treeLoading = ref(true)
const selectedNode = ref<KnowledgePoint | null>(null)
const treeRef = ref()
const saving = ref(false)
const generating = ref(false)

const form = reactive({
  name: '',
  kpType: 'concept' as string,
  scope: 'core_curriculum' as string,
  difficulty: 3,
  estimatedMinutes: 60,
  description: '',
  learningObjectives: [] as string[],
  prerequisiteKps: [] as string[],
  relatedKps: [] as string[],
  keywords: [] as string[],
})

const newTagInput = reactive({ objectives: '', keywords: '' })

const kpTypeOptions = [
  { label: '课程', value: 'course' }, { label: '章', value: 'chapter' },
  { label: '节', value: 'section' }, { label: '知识点', value: 'concept' },
  { label: '技能', value: 'skill' },
]
const scopeOptions = [
  { label: '核心课程', value: 'core_curriculum' },
  { label: '前置知识', value: 'prerequisite' },
  { label: '补充扩展', value: 'supplementary' },
]


async function loadCourse() {
  try {
    const res = await apiFetch<Course>(`/teacher/courses/${courseId.value}`)
    course.value = res.data
  } catch { /* API not ready */ }
}

async function loadTree() {
  treeLoading.value = true
  try {
    const res = await apiFetch<KnowledgePoint[]>(`/teacher/courses/${courseId.value}/knowledge-points`)
    treeData.value = res.data
  } catch { /* use empty */ } finally {
    treeLoading.value = false
  }
}

function handleNodeClick(data: KnowledgePoint) {
  selectedNode.value = data
  form.name = data.name
  form.kpType = data.kpType
  form.scope = data.scope
  form.difficulty = data.difficulty
  form.estimatedMinutes = data.estimatedMinutes
  form.description = data.description || ''
  form.learningObjectives = [...(data.learningObjectives || [])]
  form.prerequisiteKps = [...(data.prerequisiteKps || [])]
  form.relatedKps = [...(data.relatedKps || [])]
  form.keywords = [...(data.keywords || [])]
}

function handleAddChild(parentNode?: KnowledgePoint) {
  const newNode: KnowledgePoint = {
    id: '', courseId: courseId.value, parentId: parentNode?.id || null,
    name: '新知识点', kpType: 'concept', scope: 'core_curriculum',
    depth: (parentNode?.depth || 0) + 1, sortOrder: 0,
    description: '', learningObjectives: [], difficulty: 3,
    estimatedMinutes: 60, prerequisiteKps: [], relatedKps: [], keywords: [],
  }
  selectedNode.value = newNode
  Object.assign(form, {
    name: newNode.name, kpType: newNode.kpType, scope: newNode.scope,
    difficulty: newNode.difficulty, estimatedMinutes: newNode.estimatedMinutes,
    description: '', learningObjectives: [], prerequisiteKps: [], relatedKps: [], keywords: [],
  })
}

async function handleSave() {
  if (!selectedNode.value) return
  saving.value = true
  try {
    const payload = {
      ...selectedNode.value,
      name: form.name, kpType: form.kpType, scope: form.scope,
      difficulty: form.difficulty, estimatedMinutes: form.estimatedMinutes,
      description: form.description,
      learningObjectives: form.learningObjectives,
      prerequisiteKps: form.prerequisiteKps,
      relatedKps: form.relatedKps,
      keywords: form.keywords,
    }
    if (payload.id) {
      await apiFetch(`/teacher/courses/${courseId.value}/knowledge-points/${payload.id}`, { method: 'PUT', body: payload })
      ElMessage.success('知识点已更新')
    } else {
      const res = await apiFetch<KnowledgePoint>(`/teacher/courses/${courseId.value}/knowledge-points`, { method: 'POST', body: payload })
      ElMessage.success('知识点已创建')
      payload.id = res.data?.id || ''
    }
    selectedNode.value = { ...payload }
    await loadTree()
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!selectedNode.value?.id) { selectedNode.value = null; return }
  try {
    await ElMessageBox.confirm(`确定删除知识点「${selectedNode.value.name}」及其所有子节点吗？`, '确认删除', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    })
    await apiFetch(`/teacher/courses/${courseId.value}/knowledge-points/${selectedNode.value.id}`, { method: 'DELETE' })
    ElMessage.success('已删除')
    selectedNode.value = null
    await loadTree()
  } catch { /* cancelled */ }
}

async function handleGenerateTree() {
  try {
    await ElMessageBox.confirm(
      'AI 将基于教材内容和 RAG 知识库自动生成知识点树，会覆盖当前已有的知识点。确定继续吗？',
      '确认生成',
      { confirmButtonText: '生成', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }
  generating.value = true
  try {
    await apiFetch(`/teacher/courses/${courseId.value}/knowledge-points/generate`, { method: 'POST' })
    ElMessage.success('知识点树已生成')
    selectedNode.value = null
    await loadTree()
  } catch (e: any) {
    ElMessage.error(e.message || '生成失败')
  } finally {
    generating.value = false
  }
}

function addTag(field: 'objectives' | 'keywords') {
  const val = newTagInput[field].trim()
  if (!val) return
  if (field === 'objectives') {
    form.learningObjectives.push(val)
  } else {
    form.keywords.push(val)
  }
  newTagInput[field] = ''
}

function removeTag(field: 'objectives' | 'keywords', idx: number) {
  if (field === 'objectives') form.learningObjectives.splice(idx, 1)
  else form.keywords.splice(idx, 1)
}

const treeProps = {
  children: 'children',
  label: 'name',
}

onMounted(async () => {
  await Promise.all([loadCourse(), loadTree()])
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-5">
      <el-button link :icon="ArrowLeft" @click="router.push('/teacher/courses')">
        <span style="color: var(--lt-text-auxiliary);">返回</span>
      </el-button>
      <h1 class="text-xl font-bold" style="color: var(--lt-text-primary);">
        知识点管理
      </h1>
    </div>

    <div class="flex gap-4" style="min-height: calc(100vh - 220px);">
      <!-- Left: Tree -->
      <div class="w-80 flex-shrink-0 rounded-lg p-4 flex flex-col" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-semibold" style="color: var(--lt-text-primary);">知识点树</span>
          <div class="flex gap-1">
            <el-button size="small" type="primary" :loading="generating" @click="handleGenerateTree">AI 生成</el-button>
            <el-button size="small" :icon="Plus" @click="handleAddChild()">根节点</el-button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="treeProps"
            node-key="id"
            default-expand-all
            highlight-current
            v-loading="treeLoading"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <div class="flex items-center gap-2 py-0.5">
                <span v-if="data.kpType === 'chapter' || data.kpType === 'section'" style="color: var(--lt-brand);">📁</span>
                <span v-else style="color: var(--lt-text-auxiliary);">📄</span>
                <span class="text-sm" style="color: var(--lt-text-primary);">{{ data.name }}</span>
                <span v-if="data.kpType === 'skill'" class="text-xs px-1 py-px rounded" style="background: rgba(124, 92, 252, 0.1); color: var(--lt-ai);">技能</span>
              </div>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- Right: Detail Form -->
      <div class="flex-1 rounded-lg p-6" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
        <template v-if="selectedNode">
          <h3 class="text-sm font-semibold mb-5" style="color: var(--lt-text-primary);">
            {{ selectedNode.id ? '编辑知识点' : '新建知识点' }}
          </h3>
          <el-form label-position="top" :model="form">
            <el-row :gutter="16">
              <el-col :span="14">
                <el-form-item label="名称">
                  <el-input v-model="form.name" placeholder="知识点名称" />
                </el-form-item>
              </el-col>
              <el-col :span="5">
                <el-form-item label="类型">
                  <el-select v-model="form.kpType" style="width:100%">
                    <el-option v-for="o in kpTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="5">
                <el-form-item label="范围">
                  <el-select v-model="form.scope" style="width:100%">
                    <el-option v-for="o in scopeOptions" :key="o.value" :label="o.label" :value="o.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="难度">
                  <el-rate v-model="form.difficulty" :max="5" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="预估时长 (分钟)">
                  <el-input-number v-model="form.estimatedMinutes" :min="1" :max="999" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="描述">
              <el-input v-model="form.description" type="textarea" :rows="2" placeholder="知识点简要描述" />
            </el-form-item>

            <!-- Learning Objectives -->
            <el-form-item label="学习目标">
              <div class="flex flex-wrap gap-1.5 mb-2">
                <el-tag
                  v-for="(obj, idx) in form.learningObjectives" :key="idx"
                  closable size="small"
                  @close="removeTag('objectives', idx)"
                >{{ obj }}</el-tag>
              </div>
              <div class="flex gap-2">
                <el-input v-model="newTagInput.objectives" size="small" placeholder="输入学习目标，回车添加"
                  @keyup.enter="addTag('objectives')" style="width:300px" />
                <el-button size="small" @click="addTag('objectives')">添加</el-button>
              </div>
            </el-form-item>

            <!-- Keywords -->
            <el-form-item label="关键词">
              <div class="flex flex-wrap gap-1.5 mb-2">
                <el-tag
                  v-for="(kw, idx) in form.keywords" :key="idx"
                  closable size="small"
                  @close="removeTag('keywords', idx)"
                >{{ kw }}</el-tag>
              </div>
              <div class="flex gap-2">
                <el-input v-model="newTagInput.keywords" size="small" placeholder="输入关键词，回车添加"
                  @keyup.enter="addTag('keywords')" style="width:300px" />
                <el-button size="small" @click="addTag('keywords')">添加</el-button>
              </div>
            </el-form-item>
          </el-form>

          <div class="flex gap-2 mt-6 pt-4" style="border-top: 1px solid var(--lt-border);">
            <el-button type="primary" :loading="saving" @click="handleSave">{{ selectedNode.id ? '保存' : '创建' }}</el-button>
            <el-button @click="selectedNode = null">取消</el-button>
            <el-button v-if="selectedNode.id" type="danger" :icon="Delete" class="ml-auto" @click="handleDelete">删除此知识点</el-button>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col items-center justify-center h-full text-center" style="color: var(--lt-text-placeholder);">
            <el-icon :size="48"><Document /></el-icon>
            <p class="mt-3 text-sm">选择左侧知识点查看或编辑详情</p>
            <p class="text-xs mt-1">或点击「根节点」创建新知识点</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

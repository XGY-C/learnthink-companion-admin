<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiFetch } from '@/utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import { Graph } from '@antv/g6'
import PageHeader from '@/components/admin/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id as string

// ---- state ----
const loading = ref(true)
const generating = ref(false)
const saving = ref(false)
const hasGraph = ref(false)
const courseName = ref('')
const textbookTitle = ref('')
const dirty = ref(false)

interface GraphNode { id: string; label: string; type: string; description?: string; difficulty?: number; keywords?: string[] }
interface GraphEdge { id?: string; source: string; target: string; label: string; type: string }
interface GraphData { nodes: GraphNode[]; edges: GraphEdge[] }

const graphData = ref<GraphData>({ nodes: [], edges: [] })
const selectedItem = ref<{ type: 'node' | 'edge'; data: any } | null>(null)
const editMode = ref<'view' | 'add-edge'>('view')

// edit form
const editForm = ref<Record<string, any>>({})
const isNewNode = ref(false)
const isNewEdge = ref(false)
const edgeSourceId = ref('')
const edgeTargetId = ref('')

let g6Graph: Graph | null = null
const graphContainer = ref<HTMLElement>()

// ---- node type config ----
const nodeTypeOptions = [
  { label: '章 chapter', value: 'chapter' },
  { label: '节 section', value: 'section' },
  { label: '概念 concept', value: 'concept' },
  { label: '技能 skill', value: 'skill' },
  { label: '方法 method', value: 'method' },
]
const edgeTypeOptions = [
  { label: '包含 contains', value: 'contains' },
  { label: '前置依赖 prerequisite', value: 'prerequisite' },
  { label: '相关 related', value: 'related' },
  { label: '扩展 extends', value: 'extends' },
]

const nodeColorMap: Record<string, string> = {
  chapter: '#4F8CFF', section: '#73A6FF', concept: '#9B7CFC',
  skill: '#FF9A5C', method: '#4ADE80',
}

const nodeTypeLabel: Record<string, string> = {
  chapter: '章', section: '节', concept: '概念', skill: '技能', method: '方法',
}

// ---- data transform ----
function storedToG6(stored: GraphData) {
  return {
    nodes: stored.nodes.map(n => ({
      id: n.id,
      data: { ...n },
      style: { fill: nodeColorMap[n.type] || '#7C5CFC' },
    })),
    edges: stored.edges.map((e, i) => ({
      id: e.id || `e${i}`,
      source: e.source,
      target: e.target,
      data: { ...e },
    })),
  }
}

function g6ToStored(): GraphData {
  if (!g6Graph) return { nodes: [], edges: [] }
  const data = g6Graph.getData()
  return {
    nodes: data.nodes.map((n: any) => ({ id: n.id, ...n.data })),
    edges: data.edges.map((e: any) => ({ id: e.id, source: e.source, target: e.target, ...e.data })),
  }
}

// ---- API ----
async function loadGraph() {
  loading.value = true
  try {
    const res = await apiFetch<any>(`/teacher/courses/${courseId}/knowledge-graph`)
    if (res.data?.graph) {
      graphData.value = res.data.graph as GraphData
      courseName.value = res.data.courseName || ''
      textbookTitle.value = res.data.textbookTitle || ''
      hasGraph.value = true
      loading.value = false
      await nextTick()
      await initGraph()
    } else {
      hasGraph.value = false
      loading.value = false
    }
  } catch (e: any) {
    loading.value = false
    if (e.message?.includes('尚未生成')) {
      hasGraph.value = false
    } else {
      ElMessage.error(e.message || '加载失败')
    }
  }
}

async function generateGraph() {
  generating.value = true
  try {
    const res = await apiFetch<any>(`/teacher/courses/${courseId}/knowledge-graph/generate`, { method: 'POST' })
    if (res.data?.graph) {
      graphData.value = res.data.graph as GraphData
      textbookTitle.value = res.data.textbookTitle || ''
      hasGraph.value = true
      dirty.value = false
      selectedItem.value = null
      generating.value = false
      await nextTick()
      await initGraph()
      ElMessage.success(`图谱已生成：${res.data.graph.nodes?.length || 0} 个节点，${res.data.graph.edges?.length || 0} 条边`)
    }
  } catch (e: any) {
    ElMessage.error(e.message || '生成失败')
  } finally {
    generating.value = false
  }
}

async function saveGraph() {
  saving.value = true
  try {
    const stored = g6ToStored()
    await apiFetch(`/teacher/courses/${courseId}/knowledge-graph`, {
      method: 'PUT',
      body: stored,
    })
    graphData.value = stored
    dirty.value = false
    ElMessage.success('图谱已保存')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// ---- G6 init ----
async function initGraph() {
  if (g6Graph) { g6Graph.destroy(); g6Graph = null }
  if (!graphContainer.value || !graphData.value.nodes.length) return

  try {
    g6Graph = new Graph({
      container: graphContainer.value,
      data: storedToG6(graphData.value),
      layout: {
        type: 'd3-force',
        linkDistance: 80,
        edgeStrength: 0.8,
        nodeStrength: -400,
        collideStrength: 1.2,
        preventOverlap: true,
        nodeSize: 50,
        alphaDecay: 0.015,
        alphaMin: 0.001,
        animated: true,
        onTick: () => {},
      },
      node: {
        type: 'circle',
        style: {
          size: (d: any) => {
            const type = d.data?.type || 'concept'
            if (type === 'chapter' || type === 'section') return 48
            if (type === 'skill' || type === 'method') return 36
            return 40
          },
          fill: (d: any) => d.style?.fill || '#7C5CFC',
          stroke: (d: any) => {
            const fill = d.style?.fill || '#7C5CFC'
            return fill
          },
          strokeWidth: 3,
          labelText: (d: any) => {
            const label = d.data?.label || d.id
            return label.length > 8 ? label.slice(0, 8) + '..' : label
          },
          labelFill: '#374151',
          labelFontSize: 11,
          labelFontWeight: 500,
          labelPlacement: 'bottom',
          labelOffsetY: 8,
          shadowColor: 'rgba(0,0,0,0.15)',
          shadowBlur: 10,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
          cursor: 'pointer',
        },
        state: {
          selected: {
            stroke: '#FF8C42',
            strokeWidth: 4,
            shadowBlur: 20,
            shadowColor: 'rgba(255,140,66,0.4)',
            labelFontSize: 13,
            labelFontWeight: 700,
          },
          hover: {
            strokeWidth: 4,
            shadowBlur: 16,
            shadowColor: 'rgba(0,0,0,0.25)',
          },
        },
      },
      edge: {
        type: 'line',
        style: {
          stroke: '#D1D5DB',
          strokeWidth: 1,
          endArrow: true,
          labelText: (d: any) => d.data?.label || '',
          labelFontSize: 10,
          labelFill: '#9CA3AF',
          labelBackground: true,
          labelBackgroundFill: '#fff',
          labelBackgroundRadius: 4,
          labelBackgroundOpacity: 0.85,
          cursor: 'pointer',
        },
        state: {
          selected: { stroke: '#FF8C42', strokeWidth: 2 },
        },
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element-force', 'click-select', 'hover-activate'],
      autoFit: 'view',
      animation: true,
    })

    await g6Graph.render()
  } catch (e) {
    console.error('[KnowledgeGraph] G6 init error:', e)
    ElMessage.error('图谱渲染失败，请查看控制台')
  }

  if (!g6Graph) return

  g6Graph.on('node:click', (evt: any) => {
    const id = evt.target?.id
    const node = graphData.value.nodes.find(n => n.id === id)
    if (node) {
      if (editMode.value === 'add-edge') {
        if (!edgeSourceId.value) {
          edgeSourceId.value = id
          ElMessage.info('已选源节点，请点击目标节点')
        } else {
          edgeTargetId.value = id
          openNewEdge()
        }
      } else {
        selectNode(node)
      }
    }
  })

  g6Graph.on('edge:click', (evt: any) => {
    if (editMode.value === 'add-edge') return
    const id = evt.target?.id
    const edge = graphData.value.edges.find(e => (e.id || '') === (id || ''))
    if (edge) selectEdge(edge)
  })

  g6Graph.on('canvas:click', () => {
    if (editMode.value === 'add-edge') {
      edgeSourceId.value = ''
      ElMessage.info('已取消选源节点')
      return
    }
    selectedItem.value = null
    editMode.value = 'view'
  })

  // mark dirty on drag
  g6Graph.on('node:dragend', () => { dirty.value = true })
}

// ---- selection & edit ----
function selectNode(node: GraphNode) {
  selectedItem.value = { type: 'node', data: node }
  isNewNode.value = false
  isNewEdge.value = false
  editForm.value = {
    id: node.id,
    label: node.label || '',
    type: node.type || 'concept',
    description: node.description || '',
    difficulty: node.difficulty ?? 3,
    keywords: (node.keywords || []).join('，'),
  }
}

function selectEdge(edge: GraphEdge) {
  selectedItem.value = { type: 'edge', data: edge }
  isNewNode.value = false
  isNewEdge.value = false
  editForm.value = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
    type: edge.type || 'contains',
  }
}

function openNewNode() {
  editMode.value = 'view'
  edgeSourceId.value = ''
  selectedItem.value = { type: 'node', data: null }
  isNewNode.value = true
  isNewEdge.value = false
  editForm.value = {
    id: 'n' + Date.now(),
    label: '',
    type: 'concept',
    description: '',
    difficulty: 3,
    keywords: '',
  }
}

function openNewEdge() {
  editMode.value = 'view'
  const sid = edgeSourceId.value
  const tid = edgeTargetId.value
  edgeSourceId.value = ''
  edgeTargetId.value = ''
  selectedItem.value = { type: 'edge', data: null }
  isNewEdge.value = true
  isNewNode.value = false
  editForm.value = {
    id: 'e' + Date.now(),
    source: sid,
    target: tid,
    label: '',
    type: 'contains',
  }
}

function applyEdit() {
  if (isNewNode.value) {
    const newNode: GraphNode = {
      id: editForm.value.id,
      label: editForm.value.label || '新节点',
      type: editForm.value.type,
      description: editForm.value.description,
      difficulty: editForm.value.difficulty,
      keywords: editForm.value.keywords ? editForm.value.keywords.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [],
    }
    g6Graph?.addData({ nodes: [{ id: newNode.id, data: { ...newNode }, style: { fill: nodeColorMap[newNode.type] || '#7C5CFC' } }] })
    g6Graph?.render()
    graphData.value.nodes.push(newNode)
    selectedItem.value = { type: 'node', data: newNode }
    isNewNode.value = false
    dirty.value = true
    ElMessage.success('节点已添加')
    return
  }

  if (isNewEdge.value) {
    if (!editForm.value.source || !editForm.value.target) {
      ElMessage.warning('请选择源节点和目标节点')
      return
    }
    const newEdge: GraphEdge = {
      id: editForm.value.id,
      source: editForm.value.source,
      target: editForm.value.target,
      label: editForm.value.label || '关联',
      type: editForm.value.type,
    }
    g6Graph?.addData({ edges: [{ id: newEdge.id, source: newEdge.source, target: newEdge.target, data: { ...newEdge } }] })
    g6Graph?.render()
    graphData.value.edges.push(newEdge)
    selectedItem.value = { type: 'edge', data: newEdge }
    isNewEdge.value = false
    dirty.value = true
    ElMessage.success('边已添加')
    return
  }

  if (!selectedItem.value) return
  const item = selectedItem.value

  if (item.type === 'node') {
    const idx = graphData.value.nodes.findIndex(n => n.id === item.data.id)
    if (idx < 0) return
    const updated: GraphNode = {
      ...graphData.value.nodes[idx],
      label: editForm.value.label,
      type: editForm.value.type,
      description: editForm.value.description,
      difficulty: editForm.value.difficulty,
      keywords: editForm.value.keywords ? editForm.value.keywords.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [],
    }
    graphData.value.nodes[idx] = updated
    g6Graph?.updateData({
      nodes: [{ id: updated.id, data: { ...updated }, style: { fill: nodeColorMap[updated.type] || '#7C5CFC' } }],
    })
    g6Graph?.render()
    selectedItem.value = { type: 'node', data: updated }
  } else {
    const idx = graphData.value.edges.findIndex(e => (e.id || '') === (item.data.id || ''))
    if (idx < 0) return
    const updated: GraphEdge = { ...graphData.value.edges[idx], label: editForm.value.label, type: editForm.value.type }
    graphData.value.edges[idx] = updated
    g6Graph?.updateData({
      edges: [{ id: updated.id, source: updated.source, target: updated.target, data: { ...updated } }],
    })
    g6Graph?.render()
    selectedItem.value = { type: 'edge', data: updated }
  }
  dirty.value = true
}

async function deleteSelected() {
  if (!selectedItem.value) return
  try {
    await ElMessageBox.confirm('确定删除该元素吗？', '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
  } catch { return }

  const item = selectedItem.value
  if (item.type === 'node') {
    g6Graph?.removeData({ nodes: [item.data.id], edges: graphData.value.edges.filter(e => e.source === item.data.id || e.target === item.data.id).map(e => e.id) })
    g6Graph?.render()
    graphData.value.nodes = graphData.value.nodes.filter(n => n.id !== item.data.id)
    graphData.value.edges = graphData.value.edges.filter(e => e.source !== item.data.id && e.target !== item.data.id)
  } else {
    g6Graph?.removeData({ edges: [item.data.id] })
    g6Graph?.render()
    graphData.value.edges = graphData.value.edges.filter(e => (e.id || '') !== (item.data.id || ''))
  }
  selectedItem.value = null
  dirty.value = true
}

// ---- lifecycle ----
onMounted(() => { loadGraph() })

onUnmounted(() => {
  if (g6Graph) { g6Graph.destroy(); g6Graph = null }
})

// watch mode change for cursor
watch(editMode, (mode) => {
  if (!g6Graph) return
  const canvas = graphContainer.value?.querySelector('canvas')
  if (canvas) {
    canvas.style.cursor = mode === 'add-edge' ? 'crosshair' : ''
  }
})
</script>

<template>
  <div class="kg-page">
    <PageHeader title="知识图谱" />

    <!-- Main area -->
    <div class="kg-main">
      <!-- Canvas -->
      <div class="kg-canvas-panel">
        <div v-if="loading" class="kg-empty">
          <el-icon class="is-loading" :size="32"><Refresh /></el-icon>
          <p>加载中...</p>
        </div>
        <div v-else-if="!hasGraph" class="kg-empty">
          <p>该课程尚未生成知识图谱</p>
          <p class="text-sm mt-1 mb-3" style="color: var(--lt-text-placeholder);">请先确保课程已上传主教材并完成信息提取</p>
          <el-button type="primary" :loading="generating" @click="generateGraph">生成知识图谱</el-button>
        </div>
        <div v-else ref="graphContainer" class="kg-graph-container" />

        <!-- floating toolbar -->
        <div v-if="hasGraph" class="kg-float-toolbar">
          <div class="kg-float-toolbar-left">
            <el-button size="small" :loading="generating" :icon="Refresh" @click="generateGraph">重新生成</el-button>
            <el-button size="small" type="success" :loading="saving" :disabled="!dirty" @click="saveGraph">保存</el-button>
            <span v-if="dirty" class="kg-unsaved">未保存</span>
          </div>
          <div class="kg-float-toolbar-right">
            <el-button-group size="small">
              <el-button :icon="Plus" @click="openNewNode">节点</el-button>
              <el-button
                :icon="Plus"
                :type="editMode === 'add-edge' ? 'warning' : ''"
                @click="editMode = editMode === 'add-edge' ? 'view' : 'add-edge'; edgeSourceId = ''"
              >边</el-button>
            </el-button-group>
            <span v-if="editMode === 'add-edge'" class="kg-mode-hint">
              {{ edgeSourceId ? '点击目标节点' : '点击源节点' }}
            </span>
          </div>
        </div>

        <!-- legend -->
        <div v-if="hasGraph" class="kg-legend">
          <span v-for="(color, type) in nodeColorMap" :key="type" class="kg-legend-item">
            <span class="kg-legend-dot" :style="{ background: color }" />
            {{ nodeTypeLabel[type] || type }}
          </span>
        </div>

        <!-- shortcut hints -->
        <div v-if="hasGraph" class="kg-shortcuts">
          滚轮缩放 · 拖拽平移 · 拖节点移动 · 点击编辑
        </div>
      </div>

      <!-- Edit panel -->
      <div class="kg-edit-panel">
        <template v-if="!selectedItem && !isNewNode && !isNewEdge">
          <div class="kg-edit-empty">
            <p>点击图中的节点或边查看属性</p>
            <p class="text-xs mt-2" style="color: var(--lt-text-placeholder);">或使用左侧按钮添加节点/边</p>
          </div>
        </template>

        <!-- Node edit -->
        <template v-if="selectedItem?.type === 'node' || isNewNode">
          <div class="kg-edit-title">{{ isNewNode ? '添加节点' : '节点属性' }}</div>
          <el-form label-position="top" size="small">
            <el-form-item label="ID">
              <el-input v-model="editForm.id" :disabled="!isNewNode" />
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="editForm.label" placeholder="节点显示名称" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="editForm.type" style="width:100%">
                <el-option v-for="o in nodeTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="editForm.description" type="textarea" :rows="2" placeholder="节点描述（≤50字）" />
            </el-form-item>
            <el-form-item label="难度">
              <el-rate v-model="editForm.difficulty" :max="5" show-score />
            </el-form-item>
            <el-form-item label="关键词（逗号分隔）">
              <el-input v-model="editForm.keywords" placeholder="如：线性代数, 矩阵" />
            </el-form-item>
          </el-form>
          <div class="kg-edit-actions">
            <el-button type="primary" size="small" @click="applyEdit">{{ isNewNode ? '添加' : '应用' }}</el-button>
            <el-button v-if="!isNewNode" type="danger" size="small" :icon="Delete" @click="deleteSelected">删除节点</el-button>
          </div>
        </template>

        <!-- Edge edit -->
        <template v-if="selectedItem?.type === 'edge' || isNewEdge">
          <div class="kg-edit-title">{{ isNewEdge ? '添加边' : '边属性' }}</div>
          <el-form label-position="top" size="small">
            <el-form-item label="源节点">
              <el-input :model-value="isNewEdge ? editForm.source : selectedItem?.data.source" disabled />
            </el-form-item>
            <el-form-item label="目标节点">
              <el-input :model-value="isNewEdge ? editForm.target : selectedItem?.data.target" disabled />
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="editForm.label" placeholder="如：前置依赖" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="editForm.type" style="width:100%">
                <el-option v-for="o in edgeTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-form>
          <div class="kg-edit-actions">
            <el-button type="primary" size="small" @click="applyEdit">{{ isNewEdge ? '添加' : '应用' }}</el-button>
            <el-button v-if="!isNewEdge" type="danger" size="small" :icon="Delete" @click="deleteSelected">删除边</el-button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kg-page {
  display: flex; flex-direction: column; height: calc(100vh - 56px); padding: 12px 16px;
}
.kg-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.kg-header-left {
  display: flex; align-items: center; gap: 8px;
}
.kg-title {
  font-size: 16px; font-weight: 600; color: var(--lt-text-primary);
}
.kg-subtitle {
  font-size: 12px; color: var(--lt-text-placeholder); margin-left: 8px;
}
.kg-main { display: flex; flex: 1; gap: 10px; min-height: 0; }
.kg-canvas-panel {
  flex: 1; position: relative; border-radius: 12px; overflow: hidden;
  background: #fafbfc; border: 1px solid var(--lt-border, #E5E7EB);
}
.kg-graph-container { position: absolute; inset: 0; }
.kg-empty {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: var(--lt-text-secondary);
}
/* floating toolbar */
.kg-float-toolbar {
  position: absolute; top: 10px; left: 10px; right: 10px;
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(6px);
  border-radius: 8px; padding: 6px 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  z-index: 10; gap: 8px;
}
.kg-float-toolbar-left { display: flex; align-items: center; gap: 6px; }
.kg-float-toolbar-right { display: flex; align-items: center; gap: 6px; }
.kg-unsaved {
  font-size: 11px; color: var(--lt-warning, #E6A23C); font-weight: 500;
}
.kg-mode-hint {
  font-size: 11px; color: var(--lt-warning, #E6A23C); background: rgba(255,140,66,0.1);
  padding: 1px 6px; border-radius: 4px;
}
/* legend */
.kg-legend {
  position: absolute; bottom: 10px; left: 10px;
  display: flex; gap: 10px; font-size: 11px; color: var(--lt-text-secondary);
  background: rgba(255,255,255,0.9); border-radius: 6px; padding: 4px 10px;
}
.kg-legend-item { display: flex; align-items: center; gap: 4px; }
.kg-legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
/* shortcuts */
.kg-shortcuts {
  position: absolute; bottom: 10px; right: 10px;
  font-size: 10px; color: var(--lt-text-placeholder);
  background: rgba(255,255,255,0.85); border-radius: 4px; padding: 2px 8px;
}
/* edit panel */
.kg-edit-panel {
  width: 260px; flex-shrink: 0; border: 1px solid var(--lt-border, #E5E7EB);
  border-radius: 12px; background: #fff; padding: 14px; overflow-y: auto;
  display: flex; flex-direction: column;
}
.kg-edit-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--lt-text-secondary); font-size: 13px;
}
.kg-edit-title {
  font-size: 14px; font-weight: 600; color: var(--lt-text-primary); margin-bottom: 10px;
}
.kg-edit-actions {
  display: flex; gap: 6px; margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--lt-border, #E5E7EB);
}
</style>

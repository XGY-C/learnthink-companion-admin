<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { apiFetch } from '@/utils/api'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/admin/PageHeader.vue'
import { Setting, Search } from '@element-plus/icons-vue'

interface SettingsData {
  llm: { model: string; temperature: number; maxTokens: number; timeout: number; retries: number }
  rag: { defaultMode: string; defaultK: number; denseWeight: number; sparseWeight: number }
  review: { passThreshold: number; retryThreshold: number; safetyWords: string[] }
  features: { registrationEnabled: boolean; generationEnabled: boolean }
}

const loading = ref(true)
const saving = ref(false)
const originalSettings = ref<SettingsData | null>(null)

const settings = reactive<SettingsData>({
  llm: { model: 'deepseek-chat', temperature: 0.7, maxTokens: 4096, timeout: 30, retries: 3 },
  rag: { defaultMode: 'hybrid', defaultK: 10, denseWeight: 0.6, sparseWeight: 0.4 },
  review: { passThreshold: 70, retryThreshold: 40, safetyWords: [] },
  features: { registrationEnabled: true, generationEnabled: true }
})

const newSafetyWord = ref('')

const hasChanges = ref(false)

async function loadSettings() {
  loading.value = true
  try {
    const res = await apiFetch<SettingsData>('/admin/settings')
    if (res.data) {
      Object.assign(settings, res.data)
      originalSettings.value = JSON.parse(JSON.stringify(res.data))
    }
  } catch { /* use defaults */ } finally {
    loading.value = false
  }
}

function markChanged() { hasChanges.value = true }

async function handleSave() {
  saving.value = true
  try {
    await apiFetch('/admin/settings', { method: 'PUT', body: settings })
    originalSettings.value = JSON.parse(JSON.stringify(settings))
    hasChanges.value = false
    ElMessage.success('配置已保存')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleReset() {
  try {
    const res = await apiFetch<SettingsData>('/admin/settings/defaults')
    if (res.data) {
      Object.assign(settings, res.data)
      hasChanges.value = true
    }
    ElMessage.success('已恢复默认配置（需保存生效）')
  } catch { /* ignore */ }
}

function addSafetyWord() {
  const word = newSafetyWord.value.trim()
  if (!word) return
  settings.review.safetyWords.push(word)
  newSafetyWord.value = ''
  markChanged()
}

function removeSafetyWord(idx: number) {
  settings.review.safetyWords.splice(idx, 1)
  markChanged()
}

const modelOptions = [
  { label: 'deepseek-chat', value: 'deepseek-chat' },
  { label: 'deepseek-reasoner', value: 'deepseek-reasoner' },
]
const modeOptions = [
  { label: 'Hybrid (混合)', value: 'hybrid' },
  { label: 'Dense (余弦)', value: 'dense' },
  { label: 'Sparse (IP)', value: 'sparse' },
]

onMounted(loadSettings)
</script>

<template>
  <div class="p-6 max-w-3xl">
    <PageHeader title="系统配置" description="管理 LLM、RAG、审核等系统参数" />

    <div v-loading="loading" class="space-y-4">
      <!-- LLM Config -->
      <div class="rounded-lg p-5 card-elevated" style="background: var(--lt-bg-card);">
        <h3 class="flex items-center gap-2 text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">
          <el-icon :size="16" style="color: var(--lt-brand);"><Setting /></el-icon> LLM 配置
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">Model</label>
            <el-select v-model="settings.llm.model" style="width:100%" @change="markChanged">
              <el-option v-for="o in modelOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">Temperature (0 - 2.0)</label>
            <el-input-number v-model="settings.llm.temperature" :min="0" :max="2" :step="0.1" :precision="1" style="width:100%" @change="markChanged" />
          </div>
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">Max Tokens</label>
            <el-input-number v-model="settings.llm.maxTokens" :min="256" :max="32768" :step="256" style="width:100%" @change="markChanged" />
          </div>
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">超时 (秒)</label>
            <el-input-number v-model="settings.llm.timeout" :min="5" :max="120" style="width:100%" @change="markChanged" />
          </div>
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">重试次数</label>
            <el-input-number v-model="settings.llm.retries" :min="0" :max="5" style="width:100%" @change="markChanged" />
          </div>
        </div>
      </div>

      <!-- RAG Config -->
      <div class="rounded-lg p-5 card-elevated" style="background: var(--lt-bg-card);">
        <h3 class="flex items-center gap-2 text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">
          <el-icon :size="16" style="color: var(--lt-ai);"><Search /></el-icon> RAG 配置
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">默认检索模式</label>
            <el-select v-model="settings.rag.defaultMode" style="width:100%" @change="markChanged">
              <el-option v-for="o in modeOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">默认 K 值</label>
            <el-input-number v-model="settings.rag.defaultK" :min="1" :max="50" style="width:100%" @change="markChanged" />
          </div>
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">Dense 权重</label>
            <el-input-number v-model="settings.rag.denseWeight" :min="0" :max="1" :step="0.1" :precision="1" style="width:100%" @change="markChanged" />
          </div>
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">Sparse 权重</label>
            <el-input-number v-model="settings.rag.sparseWeight" :min="0" :max="1" :step="0.1" :precision="1" style="width:100%" @change="markChanged" />
          </div>
        </div>
      </div>

      <!-- Review Config -->
      <div class="rounded-lg p-5 card-elevated" style="background: var(--lt-bg-card);">
        <h3 class="flex items-center gap-2 text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">
          🛡️ 内容审核配置
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">自动通过阈值 (%)</label>
            <el-input-number v-model="settings.review.passThreshold" :min="50" :max="100" style="width:100%" @change="markChanged" />
          </div>
          <div>
            <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">强制重试阈值 (%)</label>
            <el-input-number v-model="settings.review.retryThreshold" :min="0" :max="50" style="width:100%" @change="markChanged" />
          </div>
        </div>
        <div>
          <label class="text-xs mb-1 block" style="color: var(--lt-text-secondary);">安全过滤词</label>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <el-tag
              v-for="(word, idx) in settings.review.safetyWords" :key="idx"
              closable size="small" type="danger"
              @close="removeSafetyWord(idx)"
            >{{ word }}</el-tag>
          </div>
          <div class="flex gap-2">
            <el-input v-model="newSafetyWord" size="small" placeholder="输入过滤词，回车添加" style="width: 240px" @keyup.enter="addSafetyWord" />
            <el-button size="small" @click="addSafetyWord">添加</el-button>
          </div>
        </div>
      </div>

      <!-- Feature Flags -->
      <div class="rounded-lg p-5 card-elevated" style="background: var(--lt-bg-card);">
        <h3 class="flex items-center gap-2 text-sm font-semibold mb-4" style="color: var(--lt-text-primary);">
          🚀 功能开关
        </h3>
        <div class="flex flex-wrap gap-6">
          <div class="flex items-center gap-2">
            <el-switch v-model="settings.features.registrationEnabled" @change="markChanged" />
            <span class="text-sm" style="color: var(--lt-text-secondary);">新用户注册</span>
          </div>
          <div class="flex items-center gap-2">
            <el-switch v-model="settings.features.generationEnabled" @change="markChanged" />
            <span class="text-sm" style="color: var(--lt-text-secondary);">资源生成</span>
          </div>
        </div>
      </div>

      <!-- Save -->
      <div class="flex gap-3 pt-2">
        <el-button type="primary" :loading="saving" @click="handleSave" :disabled="!hasChanges">
          {{ hasChanges ? '保存配置' : '已保存' }}
        </el-button>
        <el-button @click="handleReset">恢复默认</el-button>
      </div>
    </div>
  </div>
</template>

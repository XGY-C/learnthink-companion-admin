<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { apiFetch } from '@/utils/api'
import { Search } from '@element-plus/icons-vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import type { RetrieveResult } from '@/types'

const route = useRoute()
const courseId = ref(route.params.id as string || '')
const query = ref('')
const searchMode = ref('hybrid')
const kValue = ref(10)
const sparseWeight = ref(0.4)
const searching = ref(false)
const results = ref<RetrieveResult[]>([])
const searchTime = ref(0)
const hasSearched = ref(false)

async function handleSearch() {
  if (!query.value.trim()) return
  searching.value = true
  results.value = []
  try {
    const start = performance.now()
    const res = await apiFetch<RetrieveResult[]>(`/teacher/courses/${courseId.value}/retrieval/test`, {
      method: 'POST',
      body: {
        query: query.value,
        mode: searchMode.value,
        k: kValue.value,
        sparseWeight: searchMode.value === 'hybrid' ? sparseWeight.value : undefined,
      }
    })
    searchTime.value = Math.round(performance.now() - start)
    results.value = res.data || []
    hasSearched.value = true
  } catch { /* API not ready */ } finally {
    searching.value = false
  }
}

function scoreColor(score: number) {
  if (score >= 0.8) return 'var(--lt-success)'
  if (score >= 0.5) return 'var(--lt-warning)'
  return 'var(--lt-text-placeholder)'
}

const modeOptions = [
  { label: 'Hybrid (混合)', value: 'hybrid' },
  { label: 'Dense (余弦)', value: 'dense' },
  { label: 'Sparse (IP)', value: 'sparse' },
]
</script>

<template>
  <div class="p-6">
    <PageHeader title="检索测试" description="测试 RAG 知识库检索质量" />

    <!-- Search Panel -->
    <div class="rounded-lg p-5 mb-6" style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);">
      <div class="flex gap-2 mb-3">
        <el-input
          v-model="query"
          placeholder="输入测试查询，如：函数极限的ε-δ定义..."
          size="large"
          :prefix-icon="Search"
          @keyup.enter="handleSearch"
          clearable
        />
        <el-button type="primary" size="large" :loading="searching" :icon="Search" @click="handleSearch">检索</el-button>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <el-select v-model="searchMode" size="small" style="width: 160px">
          <el-option v-for="m in modeOptions" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
        <span class="text-xs" style="color: var(--lt-text-auxiliary);">K:</span>
        <el-input-number v-model="kValue" :min="1" :max="50" size="small" style="width: 90px" />
        <template v-if="searchMode === 'hybrid'">
          <span class="text-xs" style="color: var(--lt-text-auxiliary);">Dense 权重:</span>
          <el-slider v-model="sparseWeight" :min="0" :max="1" :step="0.1" style="width: 120px" :show-tooltip="true" />
        </template>
      </div>
    </div>

    <!-- Results -->
    <template v-if="hasSearched">
      <div
        v-if="results.length > 0"
        class="rounded-lg overflow-hidden"
        style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);"
      >
        <div class="px-5 py-3 text-sm border-b" style="color: var(--lt-text-secondary); border-color: var(--lt-border);">
          共 {{ results.length }} 条结果，耗时 {{ searchTime }}ms
        </div>
        <div v-for="(item, idx) in results" :key="item.chunkId || idx"
          class="px-5 py-4 border-b last:border-b-0 transition-colors"
          style="border-color: var(--lt-border);"
        >
          <div class="flex items-center gap-3 mb-2">
            <span class="text-xs font-mono" style="color: var(--lt-text-auxiliary);">#{{ idx + 1 }}</span>
            <div class="flex items-center gap-2 flex-1">
              <div class="h-1.5 rounded-full flex-1 max-w-32" style="background: #E8ECF0;">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{ width: `${Math.round(item.score * 100)}%`, background: scoreColor(item.score) }"
                />
              </div>
              <span class="text-xs font-semibold" :style="{ color: scoreColor(item.score) }">
                {{ item.score?.toFixed(2) }}
              </span>
            </div>
            <span class="text-xs" style="color: var(--lt-text-auxiliary);">
              来源: {{ item.sourceDoc || '未知' }}
            </span>
          </div>
          <p class="text-sm leading-relaxed" style="color: var(--lt-text-secondary);">
            {{ item.content?.slice(0, 300) }}{{ item.content?.length > 300 ? '...' : '' }}
          </p>
          <div v-if="item.keywords?.length" class="flex flex-wrap gap-1 mt-2">
            <span
              v-for="kw in item.keywords" :key="kw"
              class="text-xs px-1.5 py-px rounded"
              style="background: var(--lt-brand-lightest); color: var(--lt-brand);"
            >{{ kw }}</span>
          </div>
        </div>
      </div>
      <div
        v-else
        class="rounded-lg p-12 text-center"
        style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);"
      >
        <p style="color: var(--lt-text-placeholder);">未检索到相关内容</p>
        <p class="text-xs mt-1" style="color: var(--lt-text-disabled);">建议扩充知识库文档</p>
        <el-button type="primary" size="small" class="mt-3" @click="$router.push('/admin/documents')">去上传文档</el-button>
      </div>
    </template>

    <!-- Empty initial state -->
    <div
      v-else
      class="rounded-lg p-16 text-center"
      style="background: var(--lt-bg-card); box-shadow: var(--lt-shadow-card);"
    >
      <el-icon :size="48" style="color: var(--lt-border);"><Search /></el-icon>
      <p class="mt-4" style="color: var(--lt-text-auxiliary);">输入查询内容，测试 RAG 检索效果</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'

export interface FilterOption {
  key: string
  label: string
  options: { label: string; value: string }[]
  width?: number
}

defineProps<{
  filters: FilterOption[]
  modelValue: Record<string, string>
  searchPlaceholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
  search: [value: string]
}>()

function handleFilterChange(key: string, value: string) {
  // handled via v-model
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 mb-4">
    <el-input
      :placeholder="searchPlaceholder || '搜索...'"
      :prefix-icon="Search"
      style="width: 260px"
      clearable
      @input="(v: string) => emit('search', v)"
    />
    <el-select
      v-for="f in filters"
      :key="f.key"
      :model-value="modelValue[f.key]"
      :placeholder="f.label"
      :style="{ width: f.width ? `${f.width}px` : '140px' }"
      clearable
      @update:model-value="(v: string) => { modelValue[f.key] = v; emit('update:modelValue', { ...modelValue }) }"
    >
      <el-option
        v-for="opt in f.options"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>
  </div>
</template>

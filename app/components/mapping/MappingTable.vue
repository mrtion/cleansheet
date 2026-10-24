<!-- 映射表：源字段 ▾ → 目标字段 → 示例值（UI 风格指南 6.3） -->
<template>
  <div class="rounded-card border border-neutral-200 bg-white">
    <div class="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
      <h3 class="font-semibold text-neutral-900">{{ $t('mapping.title') }}</h3>
      <span class="text-xs text-neutral-500">{{ $t('mapping.hint') }}</span>
    </div>
    <div class="divide-y divide-neutral-100">
      <div
        v-for="f in TARGET_FIELDS"
        :key="f.key"
        class="grid grid-cols-[1fr_24px_1fr_1fr] items-center gap-3 px-5 py-2.5"
        :class="isMissingRequired(f.key) ? 'bg-danger/5' : ''"
      >
        <!-- 目标字段 -->
        <div class="flex items-center gap-1.5">
          <span v-if="f.required" class="text-danger" :aria-label="$t('mapping.requiredAria')">*</span>
          <span class="text-sm font-medium text-neutral-900">{{ targetLabelT(f.key) }}</span>
          <code class="text-xs text-neutral-400">{{ f.key }}</code>
        </div>
        <UIcon name="i-lucide-arrow-right" class="h-4 w-4 text-neutral-400" />
        <!-- 源字段选择 -->
        <USelect
          :model-value="sourceOf(f.key)"
          :items="sourceOptions"
          :placeholder="$t('mapping.selectSource')"
          size="sm"
          class="w-full"
          @update:model-value="(v) => setSource(f.key, v)"
        />
        <!-- 示例值 -->
        <p class="truncate text-sm text-neutral-500" :title="exampleOf(f.key)">
          {{ exampleOf(f.key) || '—' }}
        </p>
      </div>
    </div>
    <p v-if="missingRequired.length" class="border-t border-neutral-200 bg-danger/5 px-5 py-3 text-sm text-danger">
      <UIcon name="i-lucide-circle-alert" class="mr-1 inline h-4 w-4" />
      {{ $t('mapping.missing', { n: missingRequired.length, names: missingRequired.map(targetLabelT).join($t('mapping.separator')) }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { TARGET_FIELDS, type MappingTable, type Row } from '../../../shared/core/index';

const { t } = useI18n();

const props = defineProps<{
  modelValue: MappingTable;
  headers: string[];
  exampleRow: Row | null;
}>();
const emit = defineEmits<{ 'update:modelValue': [MappingTable] }>();

/** 目标字段标签（i18n 版，未知 key 回退为 key 本身） */
function targetLabelT(key: string): string {
  const path = `mapping.target.${key}`;
  const label = t(path);
  return label === path ? key : label;
}

const sourceOptions = computed(() => [
  { label: t('mapping.noMapping'), value: null },
  ...props.headers.map((h) => ({ label: h, value: h }))
]);

function sourceOf(target: string): string {
  return props.modelValue.entries.find((e) => e.target === target)?.source ?? '';
}

function setSource(target: string, source: string | null) {
  const entries = props.modelValue.entries.map((e) =>
    e.target === target ? { ...e, source: source || null } : e
  );
  emit('update:modelValue', { entries });
}

function exampleOf(target: string): string {
  const src = sourceOf(target);
  if (!src || !props.exampleRow) return '';
  return props.exampleRow[src] ?? '';
}

const missingRequired = computed(() => {
  const required = new Set(TARGET_FIELDS.filter((f) => f.required).map((f) => f.key));
  return props.modelValue.entries
    .filter((e) => required.has(e.target) && !e.source)
    .map((e) => e.target);
});

function isMissingRequired(key: string): boolean {
  return missingRequired.value.includes(key);
}
</script>

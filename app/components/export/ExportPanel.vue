<!-- 导出面板：格式选择 + Sheet 模式 + 文件名预览 + 导出按钮（UI 风格指南 6.5） -->
<template>
  <div class="rounded-card border border-neutral-200 bg-white px-6 py-6">
    <h3 class="text-lg font-semibold text-neutral-900">{{ $t('exporter.title') }}</h3>

    <div class="mt-4 space-y-4">
      <div>
        <p class="mb-2 text-sm font-medium text-neutral-900">{{ $t('exporter.format') }}</p>
        <URadioGroup v-model="format" :items="formatItems" orientation="horizontal" />
      </div>

      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-neutral-900">{{ $t('exporter.sheetMode') }}</p>
          <p class="text-xs text-neutral-400">{{ $t('exporter.sheetModeHint') }}</p>
        </div>
        <USwitch v-model="sheetMode" />
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-neutral-900">{{ $t('exporter.fileName') }}</p>
        <p class="truncate rounded-control bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-600">
          {{ fileName }}.{{ format }}
        </p>
      </div>
    </div>

    <UButton
      size="lg"
      block
      class="mt-6"
      :loading="exporting"
      :disabled="exporting"
      @click="$emit('export', { format, sheetMode })"
    >
      {{ exporting ? $t('exporter.exporting') : $t('exporter.export') }}
    </UButton>
    <p class="mt-2 text-center text-xs text-neutral-400">{{ $t('exporter.note') }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  fileName: string;
  exporting: boolean;
}>();
defineEmits<{ export: [{ format: 'xlsx' | 'csv'; sheetMode: boolean }] }>();

const { t } = useI18n();

const format = ref<'xlsx' | 'csv'>('xlsx');
const sheetMode = ref(true);

const formatItems = computed(() => [
  { label: t('exporter.xlsx'), value: 'xlsx' },
  { label: t('exporter.csv'), value: 'csv' }
]);
</script>

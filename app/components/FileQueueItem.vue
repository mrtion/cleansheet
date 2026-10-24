<!-- 队列项：状态图标 + 文件名 + 编码/分隔符/行数 + 移除（UI 风格指南 6.2） -->
<template>
  <div class="flex items-center gap-3 rounded-control border border-neutral-200 bg-white px-4 py-3">
    <!-- 状态图标 -->
    <UIcon v-if="item.status === 'ready'" name="i-lucide-circle-check" class="h-5 w-5 shrink-0 text-success" />
    <UIcon v-else-if="item.status === 'error'" name="i-lucide-circle-x" class="h-5 w-5 shrink-0 text-danger" />
    <UIcon v-else name="i-lucide-loader-circle" class="h-5 w-5 shrink-0 animate-spin text-primary-600" />

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-neutral-900">{{ item.name }}</p>
      <p v-if="item.status === 'ready' && item.summary" class="mt-0.5 text-xs text-neutral-500">
        {{ $t('upload.summary', { encoding: item.summary.encoding, delimiter: delimLabel(item.summary.delimiter), rows: fmt(item.summary.rows) }) }}
      </p>
      <div v-else-if="item.status === 'parsing'" class="mt-1.5">
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div class="h-full rounded-full bg-primary-600 transition-all duration-base" :style="{ width: item.progress + '%' }" />
        </div>
        <p class="mt-1 text-xs text-neutral-500">{{ $t('upload.parsing', { stage: stageLabel(item.progressStage), percent: Math.round(item.progress) }) }}</p>
      </div>
      <p v-else-if="item.status === 'error'" class="mt-0.5 text-xs text-danger">{{ item.error }}</p>
      <p v-else class="mt-0.5 text-xs text-neutral-400">{{ $t('upload.queued') }}</p>
    </div>

    <UButton
      v-if="item.status === 'error'"
      size="xs"
      variant="ghost"
      icon="i-lucide-rotate-ccw"
      @click="$emit('retry', item.id)"
    >
      {{ $t('upload.retry') }}
    </UButton>
    <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" :aria-label="$t('upload.removeFile')" @click="$emit('remove', item.id)" />
  </div>
</template>

<script setup lang="ts">
import type { FileItem } from '../composables/useConversion';
import { fmt } from '../utils/format';

const { t } = useI18n();

defineProps<{ item: FileItem }>();
defineEmits<{ remove: [id: string]; retry: [id: string] }>();

/** 分隔符标签（i18n 版，不改动 shared/core） */
function delimLabel(d: string): string {
  if (d === '\t') return 'Tab';
  if (d === ';') return t('upload.delimiterSemicolon');
  return t('upload.delimiterComma');
}

/** Worker 发来的进度阶段为中文运行时值，此处映射为 i18n，未知阶段原样回退 */
function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    '排队中': t('upload.stage.queued'),
    '读取文件': t('upload.stage.reading'),
    '识别编码': t('upload.stage.detectEncoding'),
    '解析工作表': t('upload.stage.parseSheet'),
    '识别分隔符': t('upload.stage.detectDelimiter'),
    '解析行': t('upload.stage.parseRows'),
    '识别表头': t('upload.stage.detectHeader'),
    '合并文件': t('upload.stage.merge'),
    '执行清洗规则': t('upload.stage.transform'),
    '完成': t('upload.stage.done')
  };
  return map[stage] ?? stage;
}
</script>

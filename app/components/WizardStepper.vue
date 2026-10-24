<!-- 步骤条：①上传 ②映射与预览 ③导出（UI 风格指南 6.2） -->
<template>
  <ol class="flex items-center gap-2" :aria-label="$t('upload.stepsAria')">
    <li v-for="(s, i) in steps" :key="s.label" class="flex items-center gap-2">
      <div
        class="flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-base"
        :class="stateClass(i + 1)"
        :aria-current="step === i + 1 ? 'step' : undefined"
      >
        <span
          v-if="i + 1 < step"
          class="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white"
        >
          <UIcon name="i-lucide-check" class="h-3.5 w-3.5" />
        </span>
        <span v-else class="tnum font-semibold">{{ i + 1 }}</span>
        <span class="font-medium">{{ s.label }}</span>
      </div>
      <UIcon
        v-if="i < steps.length - 1"
        name="i-lucide-chevron-right"
        class="h-4 w-4 text-neutral-400"
      />
    </li>
  </ol>
</template>

<script setup lang="ts">
const props = defineProps<{ step: 1 | 2 | 3 }>();

const { t } = useI18n();
const steps = computed(() => [
  { label: t('upload.step1') },
  { label: t('upload.step2') },
  { label: t('upload.step3') }
]);

function stateClass(n: number): string {
  if (n < props.step) return 'border-primary-600 bg-primary-50 text-primary-700';
  if (n === props.step) return 'border-primary-600 text-primary-700 font-semibold shadow-xs';
  return 'border-neutral-200 text-neutral-400 bg-white';
}
</script>

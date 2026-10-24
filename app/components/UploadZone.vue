<!-- 上传区：2px 虚线边框，dragover 高亮，常驻隐私徽章（UI 风格指南 6.2） -->
<template>
  <div
    ref="zone"
    role="button"
    tabindex="0"
    :aria-label="$t('upload.aria')"
    class="rounded-card border-2 border-dashed border-neutral-200 bg-white px-8 py-14 text-center transition-colors duration-fast outline-none"
    :class="dragOver ? 'border-primary-600 bg-primary-50' : 'hover:border-primary-500 hover:bg-primary-50/50'"
    @dragover.prevent="dragOver = true"
    @dragleave="dragOver = false"
    @drop.prevent="onDrop"
    @click="openPicker"
    @keydown.space.prevent="openPicker"
    @keydown.enter.prevent="openPicker"
  >
    <UIcon name="i-lucide-cloud-upload" class="mx-auto h-12 w-12 text-primary-500" />
    <p class="mt-4 text-lg font-semibold text-neutral-900">{{ $t('upload.dropTitle') }}</p>
    <p class="mt-1 text-sm text-neutral-500">{{ $t('upload.dropHint') }}</p>
    <!-- 隐私徽章：常驻（UI 风格指南原则 3） -->
    <p class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700">
      <span aria-hidden="true">🛡</span>{{ $t('upload.privacy') }}
    </p>
    <input ref="input" type="file" multiple accept=".csv,.xlsx,.xls" class="hidden" @change="onPick" />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ files: [FileList] }>();

const zone = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const dragOver = ref(false);

function openPicker() {
  input.value?.click();
}

function onPick(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length) emit('files', files);
  if (input.value) input.value.value = '';
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length) emit('files', files);
}
</script>

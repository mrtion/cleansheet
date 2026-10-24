<!-- CSV 乱码修复器主体（.client.vue：纯客户端，内部可直引 shared/core） -->
<template>
  <div class="rounded-card border border-neutral-200 bg-white p-8">
    <div v-if="!result">
      <label
        class="block cursor-pointer rounded-card border-2 border-dashed border-neutral-200 px-8 py-12 text-center transition-colors hover:border-primary-500 hover:bg-primary-50/50"
      >
        <UIcon name="i-lucide-file-up" class="mx-auto h-10 w-10 text-primary-500" />
        <p class="mt-3 font-medium text-neutral-900">{{ $t('tools.csvFix.selectFile') }}</p>
        <p class="mt-1 text-sm text-neutral-400">{{ $t('tools.csvFix.localNote') }}</p>
        <input type="file" accept=".csv" class="hidden" @change="onFile" />
      </label>
      <p v-if="error" class="mt-3 text-center text-sm text-danger">{{ error }}</p>
    </div>

    <div v-else class="text-center">
      <UIcon name="i-lucide-circle-check" class="mx-auto h-12 w-12 text-success" />
      <h2 class="mt-3 text-xl font-semibold text-neutral-900">{{ $t('tools.csvFix.done') }}</h2>
      <div class="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm">
        <div class="flex justify-between border-b border-neutral-100 py-2">
          <span class="text-neutral-500">{{ $t('tools.csvFix.detected') }}</span>
          <b class="font-mono text-neutral-900">{{ result.encoding }}</b>
        </div>
        <div class="flex justify-between border-b border-neutral-100 py-2">
          <span class="text-neutral-500">{{ $t('tools.csvFix.confidence') }}</span>
          <b class="tnum text-neutral-900">{{ Math.round(result.confidence * 100) }}%</b>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-neutral-500">{{ $t('tools.csvFix.output') }}</span>
          <b class="font-mono text-neutral-900">UTF-8 with BOM</b>
        </div>
      </div>
      <div class="mt-6 flex justify-center gap-3">
        <UButton size="lg" icon="i-lucide-download" @click="download">{{ $t('tools.csvFix.download') }}</UButton>
        <UButton size="lg" variant="outline" color="neutral" @click="reset">{{ $t('tools.csvFix.another') }}</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { detectEncoding, decodeBytes } from '../../../shared/core/encoding';

const { t } = useI18n();
const result = ref<{ encoding: string; confidence: number; text: string; name: string } | null>(null);
const error = ref('');

async function onFile(e: Event) {
  error.value = '';
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  try {
    const buf = await f.arrayBuffer();
    const { encoding, confidence } = detectEncoding(new Uint8Array(buf));
    const text = decodeBytes(new Uint8Array(buf), encoding);
    result.value = { encoding, confidence, text, name: f.name.replace(/\.csv$/i, '') };
  } catch {
    error.value = t('tools.csvFix.readFailed');
  }
}

function download() {
  if (!result.value) return;
  const blob = new Blob(['\uFEFF' + result.value.text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${result.value.name}_utf8.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function reset() {
  result.value = null;
}
</script>

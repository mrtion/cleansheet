<!-- 工作台：3 步向导（UI 风格指南 6.2） -->
<template>
  <div>
    <WizardStepper :step="step" class="mb-6" />

    <!-- 错误横幅（可操作，UI 风格指南 12.2） -->
    <div v-if="stage === 'error'" class="mb-6 rounded-card border border-danger/30 bg-danger/5 px-5 py-4">
      <p class="flex items-center gap-2 font-medium text-danger">
        <UIcon name="i-lucide-circle-alert" class="h-5 w-5" />{{ $t('app.error.title') }}
      </p>
      <p class="mt-1 text-sm text-neutral-600">{{ errorMsg }}</p>
      <UButton size="sm" variant="outline" color="neutral" class="mt-3" @click="reset">{{ $t('app.error.restart') }}</UButton>
    </div>

    <!-- ============ 步骤 1：上传 ============ -->
    <div v-if="step === 1" class="mx-auto max-w-3xl">
      <UploadZone @files="addFiles" />

      <div class="mt-4 flex items-center justify-between">
        <button class="text-sm text-primary-700 hover:underline" @click="loadSample">
          {{ $t('app.upload.sampleCta') }}
        </button>
        <button v-if="files.length" class="text-sm text-neutral-400 hover:text-danger" @click="clearAll">
          {{ $t('app.upload.clearQueue') }}
        </button>
      </div>

      <div class="mt-4 space-y-2">
        <FileQueueItem
          v-for="f in files"
          :key="f.id"
          :item="f"
          @remove="removeFile"
          @retry="retryFile"
        />
      </div>

      <p class="mt-4 text-center text-xs text-neutral-400">{{ $t('app.upload.quotaNote') }}</p>
    </div>

    <!-- ============ 步骤 2：映射与预览 ============ -->
    <div v-if="step === 2" class="space-y-6">
      <!-- 预设卡片 -->
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-neutral-200 bg-white px-5 py-4">
        <div class="flex items-center gap-3">
          <template v-if="match">
            <UIcon name="i-lucide-sparkles" class="h-5 w-5 text-primary-600" />
            <span class="font-semibold text-neutral-900">{{ match.displayName }}</span>
            <UBadge color="primary" variant="soft">{{ $t('app.preset.confidence', { pct: Math.round(match.confidence * 100) }) }}</UBadge>
          </template>
          <span v-else class="text-sm text-neutral-500">{{ $t('app.preset.noMatch') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <USelect
            :model-value="activePresetId ?? ''"
            :items="presetOptions"
            :placeholder="$t('app.preset.change')"
            size="sm"
            class="w-56"
            @update:model-value="(v) => changePreset(v || null)"
          />
          <UButton size="sm" variant="ghost" color="neutral" @click="changePreset(null)">{{ $t('app.preset.custom') }}</UButton>
        </div>
      </div>

      <!-- 映射表 -->
      <div v-if="mapping">
        <div class="mb-2 flex justify-end">
          <UButton v-if="loggedIn" size="sm" variant="outline" color="neutral" icon="i-lucide-bookmark-plus" @click="saveModal = true">
            {{ $t('app.mapping.saveTemplate') }}
          </UButton>
        </div>
        <MappingTable v-model="mapping" :headers="unionHeaders" :example-row="exampleSourceRow" />
      </div>

      <!-- 清洗规则 -->
      <MappingRulesPanel v-model="rulesConfig" :available-fields="mappedTargets" :currencies="stats?.currencies ?? []" @fx-auto="onFxAuto" />

      <!-- 转换操作 -->
      <div class="flex items-center gap-3">
        <UButton size="lg" :loading="stage === 'preview' && transforming" @click="doTransform">
          {{ stats ? $t('app.transform.retransform') : $t('app.transform.start') }}
        </UButton>
        <p v-if="isStale" class="flex items-center gap-1 text-sm text-warning">
          <UIcon name="i-lucide-triangle-alert" class="h-4 w-4" />{{ $t('app.transform.stale') }}
        </p>
      </div>

      <!-- 预览 -->
      <div v-if="stats" class="space-y-3">
        <PreviewStatsBar :stats="stats" />
        <div class="grid gap-4 xl:grid-cols-[1fr_280px]">
          <PreviewVirtualTable
            ref="virtualTable"
            :rows="tableRows"
            :columns="tableColumns"
            :anomalies="anomalies"
            :height="480"
          />
          <PreviewAnomalyPanel :anomalies="anomalies" @locate="locateAnomaly" />
        </div>
      </div>
    </div>

    <!-- ============ 步骤 3：导出 ============ -->
    <div v-if="step === 3" class="mx-auto max-w-xl">
      <ExportPanel
        :file-name="exportPreviewName"
        :exporting="stage === 'exporting'"
        @export="({ format, sheetMode }) => exportFile(format, sheetMode)"
      />
      <div v-if="stage === 'done'" class="mt-4 rounded-card border border-success/30 bg-success/5 px-5 py-4 text-center">
        <UIcon name="i-lucide-circle-check" class="mx-auto h-8 w-8 text-success" />
        <p class="mt-2 font-medium text-neutral-900">{{ $t('app.export.done') }}</p>
        <UButton variant="ghost" color="neutral" class="mt-2" @click="reset">{{ $t('app.export.next') }}</UButton>
      </div>
    </div>

    <!-- 底部操作条（吸底 72px，UI 风格指南 4 章） -->
    <div class="sticky bottom-0 z-30 -mx-6 mt-8 border-t border-neutral-200 bg-white/95 px-6 backdrop-blur">
      <div class="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between">
        <p class="tnum text-sm text-neutral-500">
          {{ $t('app.quota.used', { used, limit }) }}
        </p>
        <div class="flex gap-3">
          <UButton v-if="step > 1" size="lg" variant="outline" color="neutral" @click="goStep((step - 1) as 1 | 2)">{{ $t('app.step.prev') }}</UButton>
          <UButton
            v-if="step === 1"
            size="lg"
            :disabled="readyCount === 0"
            @click="goStep(2)"
          >
            {{ $t('app.step.next') }}
          </UButton>
          <UButton
            v-if="step === 2"
            size="lg"
            :disabled="!stats || isStale"
            @click="goStep(3)"
          >
            {{ $t('app.step.nextExport') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- 保存模板弹窗 -->
    <UModal v-model:open="saveModal" :ui="{ content: 'rounded-modal' }">
      <template #content>
        <div class="px-8 py-8">
          <h3 class="text-lg font-semibold text-neutral-900">{{ $t('app.modal.saveTemplateTitle') }}</h3>
          <p class="mt-1 text-sm text-neutral-500">{{ $t('app.modal.saveTemplateDesc') }}</p>
          <UInput v-model="newTemplateName" :placeholder="$t('app.modal.saveTemplatePlaceholder')" class="mt-4 w-full" />
          <div class="mt-6 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="saveModal = false">{{ $t('app.modal.cancel') }}</UButton>
            <UButton @click="confirmSaveTemplate">{{ $t('app.modal.save') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <PaywallCard :trigger="paywall" :used="used" :limit="limit" @update:trigger="paywall = $event" />
  </div>
</template>

<script setup lang="ts">
import type { AnomalyType } from '../../../shared/core/index';
import { listPresets } from '../../../shared/core/fingerprint';
import { useConversion } from '../../composables/useConversion';
import { useTemplates } from '../../composables/useTemplates';
import { useQuota } from '../../composables/useQuota';

definePageMeta({ layout: 'app' });

const { t } = useI18n();

const {
  stage, step, files, match, mapping, rulesConfig,
  previewRows, allRows, stats, anomalies,
  errorMsg, paywall, activePresetId, templateName,
  addFiles, removeFile, clearAll, changePreset,
  runTransform, exportFile, exportFileName, goStep, reset, buildRules,
  exampleSourceRow
} = useConversion();
const { saveTemplate } = useTemplates();
const { used, limit, exhausted } = useQuota();
const { loggedIn } = useAuth();
const toast = useToast();

const saveModal = ref(false);
const newTemplateName = ref('');
const transforming = ref(false);
const virtualTable = ref<{ scrollToRow: (i: number) => void } | null>(null);

// 映射/规则变更追踪：变更后需重新转换
const transformedRev = ref(0);
const currentRev = ref(0);
watch([mapping, rulesConfig], () => { currentRev.value++; }, { deep: true });
const isStale = computed(() => stats.value !== null && transformedRev.value !== currentRev.value);

const readyCount = computed(() => files.value.filter((f) => f.status === 'ready').length);
const unionHeaders = computed(() => [...new Set(files.value.flatMap((f) => f.summary?.headers ?? []))]);
const mappedTargets = computed(() => (mapping.value?.entries ?? []).filter((e) => e.source).map((e) => e.target));

const presetOptions = computed(() => [
  { label: t('app.preset.none'), value: '' },
  ...listPresets().map((p) => ({ label: p.displayName, value: p.id }))
]);

async function loadSample() {
  try {
    const res = await fetch('/testdata/amazon-settlement-sample.csv');
    if (!res.ok) throw new Error(t('app.toast.sampleLoadFail'));
    const buf = await res.arrayBuffer();
    await addFiles([new File([buf], 'amazon-settlement-sample.csv', { type: 'text/csv' })]);
  } catch {
    toast.add({ title: t('app.toast.sampleLoadFailTitle'), description: t('app.toast.sampleLoadFail'), color: 'error' });
  }
}

function retryFile(id: string) {
  const f = files.value.find((x) => x.id === id);
  if (f && f.buffer) {
    f.status = 'queued';
    f.error = null;
    f.progress = 0;
    // 重新触发解析：通过 addFiles 的 parseAll 间接处理
    parseQueueAgain();
  }
}

async function parseQueueAgain() {
  // 轻量：直接复用 addFiles 的解析逻辑（空列表仅触发 parseAll）
  await addFiles([]);
}

async function doTransform() {
  // 免费开放期：未登录直接转换；已登录则按配额检查
  if (loggedIn.value && exhausted.value) {
    paywall.value = 'quota';
    return;
  }
  transforming.value = true;
  try {
    await runTransform();
    transformedRev.value = currentRev.value;
  } finally {
    transforming.value = false;
  }
}

function onFxAuto() {
  // 免费开放期：仅已登录用户触发汇率升级提示
  if (loggedIn.value) paywall.value = 'fx';
}

async function confirmSaveTemplate() {
  if (!newTemplateName.value.trim()) {
    toast.add({ title: t('app.toast.templateNameRequired'), color: 'warning' });
    return;
  }
  try {
    const r = await saveTemplate({
      name: newTemplateName.value.trim(),
      presetId: activePresetId.value,
      presetName: match.value?.displayName ?? null,
      mapping: mapping.value!,
      rules: buildRules()
    });
    saveModal.value = false;
    newTemplateName.value = '';
    if (r === 'capped') {
      paywall.value = 'template';
    } else {
      toast.add({ title: t('app.toast.templateSaved'), description: t('app.toast.templateSavedDesc'), color: 'success' });
    }
  } catch {
    saveModal.value = false;
    toast.add({ title: t('app.toast.saveFail'), description: t('app.toast.networkRetry'), color: 'error' });
  }
}

function locateAnomaly(type: AnomalyType) {
  const a = anomalies.value?.items.find((i) => i.type === type);
  if (a && virtualTable.value) virtualTable.value.scrollToRow(a.rowIndex);
  else toast.add({ title: t('app.toast.anomalyNotFound'), color: 'neutral' });
}

/** 目标字段标签（i18n 版，未知 key 回退为 key 本身） */
function targetLabelT(key: string): string {
  const path = `mapping.target.${key}`;
  const label = t(path);
  return label === path ? key : label;
}

// 预览表格列配置：只显示已映射（source 非空）的目标字段 + 数据中的额外字段
const tableColumns = computed(() => {
  if (!stats.value || allRows.value.length === 0) return [];
  const ordered: string[] = [];
  for (const e of mapping.value?.entries ?? []) if (e.source && !ordered.includes(e.target)) ordered.push(e.target);
  for (const r of allRows.value.slice(0, 50)) {
    for (const k of Object.keys(r)) {
      if (!k.startsWith('__') && !ordered.includes(k)) ordered.push(k);
    }
  }
  const sample = allRows.value.slice(0, 20);
  return ordered.map((key) => {
    const vals = sample.map((r) => (r[key] ?? '').trim()).filter(Boolean);
    const numeric = vals.length > 0 && vals.every((v) => !Number.isNaN(Number(v)));
    return {
      key,
      label: targetLabelT(key),
      width: key === 'order_id' ? 200 : Math.min(280, Math.max(130, key.length * 12 + 50)),
      numeric,
      mono: key === 'order_id' || key === 'settlement_id',
      sticky: key === 'order_id'
    };
  });
});

const tableRows = computed(() => allRows.value.map((r, i) => ({ ...r, __vid: i })));

const exportPreviewName = computed(() => {
  const platform = match.value?.displayName.split('（')[0] ?? t('app.exportName.general');
  return exportFileName(platform, templateName.value || activePresetId.value || 'clean');
});
</script>

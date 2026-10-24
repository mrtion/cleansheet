<!-- 我的模板：localStorage 模板列表（查看/重命名/删除） -->
<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">{{ $t('app.templates.title') }}</h1>
        <p class="mt-1 text-sm text-neutral-500">{{ $t('app.templates.subtitle', { cap }) }}</p>
      </div>
      <UButton to="/app" icon="i-lucide-plus">{{ $t('app.templates.create') }}</UButton>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-20 rounded-card" />
      <USkeleton class="h-20 rounded-card" />
    </div>

    <!-- 空状态（UI 风格指南 6.8） -->
    <div v-else-if="list.length === 0" class="rounded-card border border-neutral-200 bg-white px-8 py-16 text-center">
      <UIcon name="i-lucide-bookmark" class="mx-auto h-12 w-12 text-neutral-300" />
      <p class="mt-4 font-medium text-neutral-900">{{ $t('app.templates.empty') }}</p>
      <p class="mt-1 text-sm text-neutral-500">{{ $t('app.templates.emptyHint') }}</p>
      <UButton to="/app" class="mt-6">{{ $t('app.templates.createFirst') }}</UButton>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="t in list"
        :key="t.id"
        class="rounded-card border border-neutral-200 bg-white px-5 py-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-semibold text-neutral-900">{{ t.name }}</p>
            <p class="mt-0.5 text-xs text-neutral-400">
              {{ t.presetName ?? $t('app.templates.customMapping') }} · {{ fmtDate(t.createdAt) }} · {{ $t('app.templates.mappedFields', { n: t.mapping.entries.filter(e => e.source).length }) }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" :aria-label="$t('app.templates.ariaRename')" @click="startRename(t)" />
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-trash-2" :aria-label="$t('app.templates.ariaDelete')" @click="askDelete(t)" />
          </div>
        </div>
        <!-- 展开查看映射明细 -->
        <button class="mt-2 text-xs text-primary-700 hover:underline" @click="expanded = expanded === t.id ? '' : t.id">
          {{ expanded === t.id ? $t('app.templates.collapse') : $t('app.templates.expand') }}
        </button>
        <div v-if="expanded === t.id" class="mt-2 grid gap-1 rounded-control bg-neutral-50 p-3 text-xs md:grid-cols-2">
          <div v-for="e in t.mapping.entries.filter(x => x.source)" :key="e.target" class="flex justify-between gap-2">
            <span class="text-neutral-500">{{ e.target }}</span>
            <span class="truncate font-mono text-neutral-700">← {{ e.source }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 重命名弹窗 -->
    <UModal v-model:open="renameModal" :ui="{ content: 'rounded-modal' }">
      <template #content>
        <div class="px-8 py-8">
          <h3 class="text-lg font-semibold text-neutral-900">{{ $t('app.templates.renameTitle') }}</h3>
          <UInput v-model="renameName" class="mt-4 w-full" />
          <div class="mt-6 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="renameModal = false">{{ $t('app.modal.cancel') }}</UButton>
            <UButton @click="confirmRename">{{ $t('app.modal.confirm') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 删除确认 -->
    <UModal v-model:open="deleteModal" :ui="{ content: 'rounded-modal' }">
      <template #content>
        <div class="px-8 py-8 text-center">
          <UIcon name="i-lucide-triangle-alert" class="mx-auto h-10 w-10 text-warning" />
          <h3 class="mt-3 text-lg font-semibold text-neutral-900">{{ $t('app.templates.deleteTitle') }}</h3>
          <p class="mt-1 text-sm text-neutral-500">{{ $t('app.templates.deleteConfirm', { name: deleting?.name }) }}</p>
          <div class="mt-6 flex justify-center gap-3">
            <UButton variant="ghost" color="neutral" @click="deleteModal = false">{{ $t('app.modal.cancel') }}</UButton>
            <UButton color="error" @click="confirmDelete">{{ $t('app.templates.delete') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useTemplates, type SavedTemplate } from '../../composables/useTemplates';

definePageMeta({ layout: 'app', middleware: 'auth' });

const { t } = useI18n();
const { list, fetchTemplates, renameTemplate, deleteTemplate, cap } = useTemplates();
const toast = useToast();

const expanded = ref('');
const renameModal = ref(false);
const renaming = ref<SavedTemplate | null>(null);
const renameName = ref('');
const deleteModal = ref(false);
const deleting = ref<SavedTemplate | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    await fetchTemplates();
  } catch {
    toast.add({ title: t('app.toast.loadFail'), description: t('app.toast.templatesLoadFail'), color: 'error' });
  } finally {
    loading.value = false;
  }
});

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startRename(t: SavedTemplate) {
  renaming.value = t;
  renameName.value = t.name;
  renameModal.value = true;
}

async function confirmRename() {
  if (renaming.value && renameName.value.trim()) {
    try {
      await renameTemplate(renaming.value.id, renameName.value.trim());
    } catch {
      toast.add({ title: t('app.toast.renameFail'), description: t('app.toast.networkRetry'), color: 'error' });
    }
  }
  renameModal.value = false;
}

function askDelete(t: SavedTemplate) {
  deleting.value = t;
  deleteModal.value = true;
}

async function confirmDelete() {
  if (deleting.value) {
    try {
      await deleteTemplate(deleting.value.id);
      toast.add({ title: t('app.toast.templateDeleted'), color: 'success' });
    } catch {
      toast.add({ title: t('app.toast.deleteFail'), description: t('app.toast.networkRetry'), color: 'error' });
    }
  }
  deleteModal.value = false;
}
</script>

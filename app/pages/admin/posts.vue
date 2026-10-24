<!-- 管理后台 · 文章管理：列表 / 新建 / 编辑 / 发布 / 删除 -->
<template>
  <div class="mx-auto max-w-6xl px-6 py-10">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-neutral-900">{{ $t('admin.posts.title') }}</h1>
      <div class="flex gap-2">
        <UButton to="/admin" variant="ghost" color="neutral" size="sm" icon="i-lucide-arrow-left">
          {{ $t('admin.common.backToOverview') }}
        </UButton>
        <UButton size="sm" icon="i-lucide-plus" @click="openCreate">{{ $t('admin.posts.write') }}</UButton>
      </div>
    </div>

    <!-- 搜索 + 状态筛选 -->
    <div class="mt-6 flex flex-wrap items-center gap-3">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        :placeholder="$t('admin.posts.searchPlaceholder')"
        class="w-72"
        @keyup.enter="reload"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        label-key="label"
        size="md"
        class="w-32"
        @update:model-value="reload"
      />
      <USelect
        v-model="localeFilter"
        :items="localeOptions"
        value-key="value"
        label-key="label"
        size="md"
        class="w-36"
        @update:model-value="reload"
      />
      <span v-if="!loading" class="text-xs text-neutral-400">{{ $t('admin.posts.total', { n: total }) }}</span>
    </div>

    <!-- 表格 -->
    <div class="mt-4 overflow-x-auto rounded-card border border-neutral-200 bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-neutral-100 text-left text-xs text-neutral-400">
            <th class="px-6 py-3 font-medium">{{ $t('admin.posts.colTitle') }}</th>
            <th class="px-6 py-3 font-medium">{{ $t('admin.posts.colSlug') }}</th>
            <th class="px-6 py-3 font-medium">{{ $t('admin.posts.colLang') }}</th>
            <th class="px-6 py-3 font-medium">{{ $t('admin.posts.colStatus') }}</th>
            <th class="px-6 py-3 font-medium">{{ $t('admin.posts.colPublished') }}</th>
            <th class="px-6 py-3 text-right font-medium">{{ $t('admin.posts.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-10 text-center text-sm text-neutral-400">{{ $t('admin.common.loading') }}</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="6" class="px-6 py-10 text-center">
              <p class="text-sm text-neutral-500">{{ $t('admin.common.loadFailed') }}</p>
              <UButton class="mt-3" size="sm" @click="reload">{{ $t('admin.common.retry') }}</UButton>
            </td>
          </tr>
          <tr v-else-if="posts.length === 0">
            <td colspan="6" class="px-6 py-10 text-center text-sm text-neutral-400">
              {{ $t('admin.posts.empty') }}
            </td>
          </tr>
          <tr
            v-for="p in posts"
            v-else
            :key="p.id"
            class="border-b border-neutral-50 last:border-0 hover:bg-neutral-50"
          >
            <td class="max-w-64 truncate px-6 py-3 font-medium text-neutral-900">{{ p.title }}</td>
            <td class="px-6 py-3 font-mono text-xs text-neutral-500">/blog/{{ p.slug }}</td>
            <td class="px-6 py-3">
              <UBadge :color="p.locale === 'en' ? 'info' : 'neutral'" variant="soft" size="sm">
                {{ p.locale === 'en' ? $t('admin.posts.langEn') : $t('admin.posts.langZh') }}
              </UBadge>
            </td>
            <td class="px-6 py-3">
              <UBadge :color="p.status === 'published' ? 'primary' : 'neutral'" variant="soft" size="sm">
                {{ p.status === 'published' ? $t('admin.posts.published') : $t('admin.posts.draft') }}
              </UBadge>
            </td>
            <td class="px-6 py-3 text-neutral-500">{{ fmtDate(p.publishedAt) }}</td>
            <td class="px-6 py-3 text-right">
              <div class="flex justify-end gap-1">
                <UButton variant="ghost" color="neutral" size="xs" @click="openEdit(p)">{{ $t('admin.posts.edit') }}</UButton>
                <UButton
                  variant="ghost"
                  :color="p.status === 'published' ? 'warning' : 'primary'"
                  size="xs"
                  :loading="actingId === p.id"
                  @click="togglePublish(p)"
                >
                  {{ p.status === 'published' ? $t('admin.posts.unpublish') : $t('admin.posts.publish') }}
                </UButton>
                <UButton variant="ghost" color="error" size="xs" @click="askDelete(p)">{{ $t('admin.posts.delete') }}</UButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="mt-4 flex items-center justify-between">
      <p class="text-xs text-neutral-400">
        {{ $t('admin.users.range', { from: total === 0 ? 0 : offset + 1, to: Math.min(offset + LIMIT, total) }) }}
      </p>
      <div class="flex gap-2">
        <UButton variant="outline" color="neutral" size="sm" :disabled="offset === 0 || loading" @click="prevPage">
          {{ $t('admin.common.prevPage') }}
        </UButton>
        <UButton
          variant="outline"
          color="neutral"
          size="sm"
          :disabled="offset + LIMIT >= total || loading"
          @click="nextPage"
        >
          {{ $t('admin.common.nextPage') }}
        </UButton>
      </div>
    </div>

    <!-- 编辑器弹窗 -->
    <UModal v-model:open="editorOpen" :ui="{ content: 'sm:max-w-4xl' }">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-bold text-neutral-900">{{ editing?.id ? $t('admin.posts.editPost') : $t('admin.posts.write') }}</h2>
          <div class="mt-5 space-y-4">
            <UFormField :label="$t('admin.posts.formTitle')" required :error="formErrors.title || undefined">
              <UInput v-model="form.title" :placeholder="$t('admin.posts.formTitlePlaceholder')" class="w-full" />
            </UFormField>
            <div class="grid gap-4 md:grid-cols-3">
              <UFormField :label="$t('admin.posts.formSlug')" :hint="$t('admin.posts.formSlugHint')" :error="formErrors.slug || undefined">
                <UInput v-model="form.slug" :placeholder="$t('admin.posts.formSlugPlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('admin.posts.formLang')" required>
                <USelect v-model="form.locale" :items="localeOptions" value-key="value" label-key="label" class="w-full" />
              </UFormField>
              <UFormField :label="$t('admin.posts.formDesc')" :hint="$t('admin.posts.seoHint', { n: form.description.length })" :error="formErrors.description || undefined">
                <UInput v-model="form.description" :placeholder="$t('admin.posts.formDescPlaceholder')" class="w-full" />
              </UFormField>
            </div>
            <UFormField :label="$t('admin.posts.formContent')" required>
              <UTextarea
                v-model="form.contentMd"
                :rows="14"
                :placeholder="$t('admin.posts.formContentPlaceholder')"
                class="w-full font-mono text-sm"
              />
            </UFormField>
            <div class="flex items-center gap-2">
              <UButton variant="outline" color="neutral" size="sm" :loading="previewing" @click="doPreview">
                {{ $t('admin.posts.preview') }}
              </UButton>
              <span class="text-xs text-neutral-400">{{ $t('admin.posts.draftNote') }}</span>
            </div>
            <div v-if="previewHtml" class="rounded-card border border-neutral-200 bg-white p-6">
              <p class="mb-4 text-xs font-medium text-neutral-400">— {{ $t('admin.posts.previewLabel') }} —</p>
              <div class="md-content" v-html="previewHtml" />
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="editorOpen = false">{{ $t('admin.common.cancel') }}</UButton>
            <UButton :loading="saving" @click="save">{{ $t('admin.common.save') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 删除二次确认 -->
    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-bold text-neutral-900">{{ $t('admin.posts.deleteTitle') }}</h2>
          <p class="mt-2 text-sm text-neutral-500">
            {{ $t('admin.posts.deleteConfirm', { title: deleting?.title }) }}
          </p>
          <div class="mt-6 flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="deleteOpen = false">{{ $t('admin.common.cancel') }}</UButton>
            <UButton color="error" :loading="deleting_" @click="doDelete">{{ $t('admin.posts.confirmDelete') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });

const { t } = useI18n();

interface AdminPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  contentMd: string;
  status: string;
  locale: string;
  translationGroup: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const LIMIT = 20;
const toast = useToast();

const q = ref('');
const statusFilter = ref('');
const localeFilter = ref('');
const statusOptions = computed(() => [
  { label: t('admin.posts.statusAll'), value: '' },
  { label: t('admin.posts.published'), value: 'published' },
  { label: t('admin.posts.draft'), value: 'draft' }
]);
const localeOptions = computed(() => [
  { label: t('admin.posts.langAll'), value: '' },
  { label: t('admin.posts.langZh'), value: 'zh' },
  { label: t('admin.posts.langEn'), value: 'en' }
]);
const offset = ref(0);
const total = ref(0);
const posts = ref<AdminPost[]>([]);
const loading = ref(false);
const error = ref(false);
const actingId = ref<string | null>(null);

// 编辑器
const editorOpen = ref(false);
const editing = ref<AdminPost | null>(null);
const form = reactive({ title: '', slug: '', description: '', contentMd: '', locale: 'zh' });
const formErrors = reactive({ title: '', slug: '', description: '' });
const saving = ref(false);
const previewing = ref(false);
const previewHtml = ref('');

// 删除确认
const deleteOpen = ref(false);
const deleting = ref<AdminPost | null>(null);
const deleting_ = ref(false);

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const res = await $fetch<{ posts: AdminPost[]; total: number }>('/api/admin/posts', {
      query: { q: q.value.trim(), status: statusFilter.value, locale: localeFilter.value, limit: LIMIT, offset: offset.value }
    });
    posts.value = res.posts ?? [];
    total.value = res.total ?? 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function reload() {
  offset.value = 0;
  void load();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(q, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    offset.value = 0;
    void load();
  }, 300);
});

function prevPage() {
  offset.value = Math.max(0, offset.value - LIMIT);
  void load();
}
function nextPage() {
  offset.value += LIMIT;
  void load();
}

function resetForm() {
  form.title = '';
  form.slug = '';
  form.description = '';
  form.contentMd = '';
  form.locale = 'zh';
  formErrors.title = '';
  formErrors.slug = '';
  formErrors.description = '';
  previewHtml.value = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  editorOpen.value = true;
}

function openEdit(p: AdminPost) {
  editing.value = p;
  form.title = p.title;
  form.slug = p.slug;
  form.description = p.description;
  form.contentMd = p.contentMd;
  form.locale = p.locale || 'zh';
  formErrors.title = '';
  formErrors.slug = '';
  formErrors.description = '';
  previewHtml.value = '';
  editorOpen.value = true;
}

function validateForm(): boolean {
  formErrors.title = form.title.trim() ? '' : t('admin.posts.titleRequired');
  formErrors.slug =
    form.slug.trim() && !/^[a-z0-9-]+$/.test(form.slug.trim().toLowerCase())
      ? t('admin.posts.slugInvalid')
      : '';
  formErrors.description = form.description.length > 150 ? t('admin.posts.descTooLong') : '';
  return !formErrors.title && !formErrors.slug;
}

async function save() {
  if (!validateForm() || saving.value) return;
  saving.value = true;
  try {
    if (editing.value) {
      await $fetch(`/api/admin/posts/${editing.value.id}`, {
        method: 'PATCH',
        body: {
          title: form.title.trim(),
          slug: form.slug.trim().toLowerCase() || undefined,
          description: form.description.trim(),
          contentMd: form.contentMd,
          locale: form.locale
        }
      });
      toast.add({ title: t('admin.posts.saved'), color: 'success' });
    } else {
      await $fetch('/api/admin/posts', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          slug: form.slug.trim().toLowerCase() || undefined,
          description: form.description.trim(),
          contentMd: form.contentMd,
          locale: form.locale
        }
      });
      toast.add({ title: t('admin.posts.draftCreated'), description: t('admin.posts.draftCreatedDesc'), color: 'success' });
    }
    editorOpen.value = false;
    await load();
  } catch (e: any) {
    toast.add({ title: t('admin.posts.saveFailed'), description: e?.data?.message ?? t('admin.common.tryLater'), color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function doPreview() {
  if (previewing.value) return;
  previewing.value = true;
  try {
    const res = await $fetch<{ html: string }>('/api/admin/posts/preview', {
      method: 'POST',
      body: { contentMd: form.contentMd }
    });
    previewHtml.value = res.html;
  } catch {
    toast.add({ title: t('admin.posts.previewFailed'), description: t('admin.common.tryLater'), color: 'error' });
  } finally {
    previewing.value = false;
  }
}

async function togglePublish(p: AdminPost) {
  if (actingId.value) return;
  const next = p.status === 'published' ? 'draft' : 'published';
  actingId.value = p.id;
  try {
    await $fetch(`/api/admin/posts/${p.id}`, { method: 'PATCH', body: { status: next } });
    p.status = next;
    toast.add({
      title: next === 'published' ? t('admin.posts.publishedToast') : t('admin.posts.unpublishedToast'),
      description: p.title,
      color: 'success'
    });
    await load();
  } catch (e: any) {
    toast.add({ title: t('admin.posts.actionFailed'), description: e?.data?.message ?? t('admin.common.tryLater'), color: 'error' });
  } finally {
    actingId.value = null;
  }
}

function askDelete(p: AdminPost) {
  deleting.value = p;
  deleteOpen.value = true;
}

async function doDelete() {
  if (!deleting.value || deleting_.value) return;
  deleting_.value = true;
  try {
    await $fetch(`/api/admin/posts/${deleting.value.id}`, { method: 'DELETE' });
    toast.add({ title: t('admin.posts.deleted'), description: deleting.value.title, color: 'success' });
    deleteOpen.value = false;
    deleting.value = null;
    await load();
  } catch (e: any) {
    toast.add({ title: t('admin.posts.deleteFailed'), description: e?.data?.message ?? t('admin.common.tryLater'), color: 'error' });
  } finally {
    deleting_.value = false;
  }
}

onMounted(load);
</script>

<!-- 管理后台 · 用户管理：搜索 / 列表 / 套餐调整 -->
<template>
  <div class="mx-auto max-w-6xl px-6 py-10">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-neutral-900">{{ $t('admin.users.title') }}</h1>
      <UButton to="/admin" variant="ghost" color="neutral" size="sm" icon="i-lucide-arrow-left">
        {{ $t('admin.common.backToOverview') }}
      </UButton>
    </div>

    <!-- 搜索 -->
    <div class="mt-6 flex items-center gap-3">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        :placeholder="$t('admin.users.searchPlaceholder')"
        class="w-72"
        @keyup.enter="reload"
      />
      <span v-if="!loading" class="text-xs text-neutral-400">{{ $t('admin.users.total', { n: total.toLocaleString('en-US') }) }}</span>
    </div>

    <!-- 表格 -->
    <div class="mt-4 overflow-x-auto rounded-card border border-neutral-200 bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-neutral-100 text-left text-xs text-neutral-400">
            <th class="px-6 py-3 font-medium">{{ $t('admin.users.colEmail') }}</th>
            <th class="px-6 py-3 font-medium">{{ $t('admin.users.colPlan') }}</th>
            <th class="px-6 py-3 font-medium">{{ $t('admin.users.colQuota') }}</th>
            <th class="px-6 py-3 font-medium">{{ $t('admin.users.colCreated') }}</th>
            <th class="px-6 py-3 text-right font-medium">{{ $t('admin.users.colAdjust') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="px-6 py-10 text-center text-sm text-neutral-400">{{ $t('admin.common.loading') }}</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="5" class="px-6 py-10 text-center">
              <p class="text-sm text-neutral-500">{{ $t('admin.common.loadFailed') }}</p>
              <UButton class="mt-3" size="sm" @click="reload">{{ $t('admin.common.retry') }}</UButton>
            </td>
          </tr>
          <tr v-else-if="users.length === 0">
            <td colspan="5" class="px-6 py-10 text-center text-sm text-neutral-400">{{ $t('admin.users.noUsers') }}</td>
          </tr>
          <tr
            v-for="u in users"
            v-else
            :key="u.id"
            class="border-b border-neutral-50 last:border-0 hover:bg-neutral-50"
          >
            <td class="tnum max-w-64 truncate px-6 py-3 font-mono text-[13px] text-neutral-900">{{ u.email }}</td>
            <td class="px-6 py-3">
              <UBadge :color="planColor(u.plan)" variant="soft" size="sm">{{ planLabel(u.plan) }}</UBadge>
            </td>
            <td class="tnum px-6 py-3 text-neutral-700">{{ u.conversions }} / 20</td>
            <td class="px-6 py-3 text-neutral-500">{{ fmtDate(u.createdAt) }}</td>
            <td class="px-6 py-3 text-right">
              <USelect
                :model-value="u.plan"
                :items="planOptions"
                value-key="value"
                label-key="label"
                size="sm"
                class="w-28"
                :loading="savingId === u.id"
                :disabled="savingId === u.id"
                @update:model-value="(v) => onPlanChange(u, String(v))"
              />
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });

const { t } = useI18n();

interface AdminUser {
  id: string;
  email: string;
  plan: string;
  createdAt: string;
  conversions: number;
  rows: number;
}

const LIMIT = 20;
const toast = useToast();

const q = ref('');
const offset = ref(0);
const total = ref(0);
const users = ref<AdminUser[]>([]);
const loading = ref(false);
const error = ref(false);
const savingId = ref<string | null>(null);

const planOptions = [
  { label: 'Free', value: 'free' },
  { label: 'Pro', value: 'pro' },
  { label: 'Team', value: 'team' }
];
const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', team: 'Team' };
const PLAN_COLOR: Record<string, 'neutral' | 'primary' | 'warning'> = {
  free: 'neutral',
  pro: 'primary',
  team: 'warning'
};
function planLabel(p: string) {
  return PLAN_LABEL[p] ?? p;
}
function planColor(p: string) {
  return PLAN_COLOR[p] ?? 'neutral';
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const res = await $fetch<{ users: AdminUser[]; total: number }>('/api/admin/users', {
      query: { q: q.value.trim(), limit: LIMIT, offset: offset.value }
    });
    users.value = res.users ?? [];
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

// 搜索防抖 300ms
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

async function onPlanChange(u: AdminUser, next: string) {
  if (next === u.plan || savingId.value) return;
  const prev = u.plan;
  savingId.value = u.id;
  try {
    const res = await $fetch<{ ok: boolean; plan: string }>(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      body: { plan: next }
    });
    u.plan = res.plan;
    toast.add({ title: t('admin.users.planUpdated'), description: t('admin.users.planUpdatedDesc', { email: u.email, plan: planLabel(res.plan) }), color: 'success' });
  } catch (e: any) {
    u.plan = prev;
    toast.add({
      title: t('admin.users.updateFailed'),
      description: e?.data?.message ?? t('admin.common.tryLater'),
      color: 'error'
    });
  } finally {
    savingId.value = null;
  }
}

onMounted(load);
</script>

<!-- 管理后台总览：用户 / 用量 / 模板统计 + 最新用户 -->
<template>
  <div class="mx-auto max-w-6xl px-6 py-10">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-neutral-900">{{ $t('admin.overview.title') }}</h1>
      <div class="flex gap-2">
        <UButton to="/admin/posts" variant="outline" color="neutral" size="sm" icon="i-lucide-file-text">
          {{ $t('admin.layout.nav.posts') }}
        </UButton>
        <UButton to="/admin/users" variant="outline" color="neutral" size="sm" icon="i-lucide-users">
          {{ $t('admin.layout.nav.users') }}
        </UButton>
        <UButton to="/admin/settings" variant="outline" color="neutral" size="sm" icon="i-lucide-settings">
          {{ $t('admin.layout.nav.settings') }}
        </UButton>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="h-28 animate-pulse rounded-card border border-neutral-200 bg-white" />
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="mt-6 rounded-card border border-neutral-200 bg-white p-10 text-center">
      <p class="text-sm text-neutral-500">{{ $t('admin.overview.loadFailed') }}</p>
      <UButton class="mt-4" size="sm" @click="load">{{ $t('admin.common.retry') }}</UButton>
    </div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          v-for="c in cards"
          :key="c.label"
          class="rounded-card border border-neutral-200 bg-white p-5"
        >
          <div class="flex items-center gap-2 text-xs text-neutral-400">
            <UIcon :name="c.icon" class="h-4 w-4 text-primary-600" />
            {{ c.label }}
          </div>
          <p class="tnum mt-2 text-3xl font-bold text-neutral-900">{{ c.value }}</p>
          <p v-if="c.hint" class="mt-1 text-xs text-neutral-400">{{ c.hint }}</p>
        </div>
      </div>

      <!-- 最新用户 -->
      <div class="mt-8 rounded-card border border-neutral-200 bg-white">
        <div class="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <h2 class="text-base font-semibold text-neutral-900">{{ $t('admin.overview.recentUsers') }}</h2>
          <NuxtLinkLocale to="/admin/users" class="text-sm text-primary-600 hover:text-primary-700">
            {{ $t('admin.overview.viewAll') }}
          </NuxtLinkLocale>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-100 text-left text-xs text-neutral-400">
                <th class="px-6 py-3 font-medium">{{ $t('admin.overview.colEmail') }}</th>
                <th class="px-6 py-3 font-medium">{{ $t('admin.overview.colPlan') }}</th>
                <th class="px-6 py-3 font-medium">{{ $t('admin.overview.colQuota') }}</th>
                <th class="px-6 py-3 font-medium">{{ $t('admin.overview.colCreated') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in recentUsers"
                :key="u.id"
                class="border-b border-neutral-50 last:border-0 hover:bg-neutral-50"
              >
                <td class="tnum px-6 py-3 font-mono text-[13px] text-neutral-900">{{ u.email }}</td>
                <td class="px-6 py-3">
                  <UBadge :color="planColor(u.plan)" variant="soft" size="sm">{{ planLabel(u.plan) }}</UBadge>
                </td>
                <td class="tnum px-6 py-3 text-neutral-700">{{ u.conversions }} / 20</td>
                <td class="px-6 py-3 text-neutral-500">{{ fmtDate(u.createdAt) }}</td>
              </tr>
              <tr v-if="recentUsers.length === 0">
                <td colspan="4" class="px-6 py-8 text-center text-sm text-neutral-400">{{ $t('admin.overview.noUsers') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });

const { t } = useI18n();

interface Stats {
  users: { total: number; new7d: number };
  usage: { month: string; conversions: number; rows: number };
  templates: { total: number };
}

interface AdminUser {
  id: string;
  email: string;
  plan: string;
  createdAt: string;
  conversions: number;
  rows: number;
}

const loading = ref(true);
const error = ref(false);
const stats = ref<Stats | null>(null);
const recentUsers = ref<AdminUser[]>([]);

const cards = computed(() => [
  { label: t('admin.overview.cardUsers'), icon: 'i-lucide-users', value: (stats.value?.users.total ?? 0).toLocaleString('en-US') },
  { label: t('admin.overview.cardNew7d'), icon: 'i-lucide-user-plus', value: (stats.value?.users.new7d ?? 0).toLocaleString('en-US') },
  {
    label: t('admin.overview.cardConversions'),
    icon: 'i-lucide-arrow-left-right',
    value: (stats.value?.usage.conversions ?? 0).toLocaleString('en-US'),
    hint: stats.value ? t('admin.overview.monthHint', { month: stats.value.usage.month }) : ''
  },
  { label: t('admin.overview.cardTemplates'), icon: 'i-lucide-layout-template', value: (stats.value?.templates.total ?? 0).toLocaleString('en-US') }
]);

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
    const [s, u] = await Promise.all([
      $fetch<Stats>('/api/admin/stats'),
      $fetch<{ users: AdminUser[] }>('/api/admin/users', { query: { limit: 5 } })
    ]);
    stats.value = s;
    recentUsers.value = u.users ?? [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<!-- 账户中心：用户信息 / 套餐 / 配额 / 退出登录 -->
<template>
  <div class="mx-auto max-w-2xl px-6 py-10">
    <h1 class="text-2xl font-bold text-neutral-900">{{ $t('account.title') }}</h1>

    <!-- 用户与套餐 -->
    <div class="mt-6 rounded-card border border-neutral-200 bg-white p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-control bg-primary-50 text-primary-700">
            <UIcon name="i-lucide-user" class="h-5 w-5" />
          </span>
          <div>
            <p class="font-semibold text-neutral-900">{{ user?.email ?? '—' }}</p>
            <p class="text-xs text-neutral-400">
              {{ $t('account.registeredAt', { date: user ? fmtDate(user.createdAt) : '—' }) }}
            </p>
          </div>
        </div>
        <UBadge color="primary" variant="soft" size="lg">Free</UBadge>
      </div>

      <UDivider class="my-5" />

      <div class="flex items-center justify-between text-sm">
        <span class="text-neutral-500">{{ $t('account.monthlyConversions') }}</span>
        <b class="tnum text-neutral-900">{{ used }} / {{ limit }}</b>
      </div>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          class="h-full rounded-full transition-all duration-base"
          :class="exhausted ? 'bg-danger' : 'bg-primary-600'"
          :style="{ width: Math.min(100, (used / limit) * 100) + '%' }"
        />
      </div>
      <p class="mt-2 text-xs text-neutral-400">
        {{ $t('account.quotaNote', { month: month || '—' }) }}
      </p>

      <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div class="rounded-control bg-neutral-50 px-4 py-3">
          <p class="text-xs text-neutral-400">{{ $t('account.rowsPerFile') }}</p>
          <p class="tnum mt-1 font-semibold text-neutral-900">{{ $t('account.rowsUnit', { n: rowsLimit.toLocaleString('en-US') }) }}</p>
        </div>
        <div class="rounded-control bg-neutral-50 px-4 py-3">
          <p class="text-xs text-neutral-400">{{ $t('account.rowsProcessed') }}</p>
          <p class="tnum mt-1 font-semibold text-neutral-900">{{ $t('account.rowsUnit', { n: rowsProcessed.toLocaleString('en-US') }) }}</p>
        </div>
        <div class="rounded-control bg-neutral-50 px-4 py-3">
          <p class="text-xs text-neutral-400">{{ $t('account.customTemplates') }}</p>
          <p class="mt-1 font-semibold text-neutral-900">{{ $t('account.templatesUnit', { n: tplCount }) }}</p>
        </div>
        <div class="rounded-control bg-neutral-50 px-4 py-3">
          <p class="text-xs text-neutral-400">{{ $t('account.fxAuto') }}</p>
          <p class="mt-1 font-semibold text-neutral-900">{{ $t('account.proOnly') }}</p>
        </div>
      </div>

      <UButton to="/pricing" size="lg" block class="mt-6">{{ $t('account.upgrade') }}</UButton>
      <UButton
        variant="ghost"
        color="neutral"
        block
        class="mt-2"
        icon="i-lucide-log-out"
        :loading="loggingOut"
        @click="onLogout"
      >
        {{ $t('account.logout') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' });

const { user, logout } = useAuth();
const { used, limit, exhausted, rowsLimit, rowsProcessed, month, refresh } = useQuota();
const { list: templates, fetchTemplates } = useTemplates();

const loggingOut = ref(false);
const tplCount = computed(() => templates.value.length);

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function onLogout() {
  loggingOut.value = true;
  try {
    await logout();
  } finally {
    loggingOut.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([refresh(), fetchTemplates().catch(() => undefined)]);
  } catch {
    /* 配额刷新失败时页面仍展示缓存值 */
  }
});
</script>

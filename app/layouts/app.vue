<!-- 工作台布局：顶栏 64px + 配额徽章（UI 风格指南 6.2） -->
<template>
  <div class="min-h-screen bg-neutral-50">
    <header class="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div class="flex items-center gap-8">
          <Logo />
          <NuxtLinkLocale to="/app" class="text-sm font-medium text-neutral-900">{{ $t('app.nav.workspace') }}</NuxtLinkLocale>
          <NuxtLinkLocale v-if="loggedIn" to="/app/templates" class="text-sm text-neutral-500 transition-colors hover:text-neutral-900">{{ $t('app.nav.templates') }}</NuxtLinkLocale>
        </div>
        <div class="flex items-center gap-3">
          <UBadge v-if="loggedIn" color="primary" variant="soft" size="lg" class="tnum">
            {{ $t('app.quota.used', { used, limit }) }}
          </UBadge>
          <span v-if="loggedIn" class="hidden max-w-40 truncate text-sm text-neutral-500 md:inline">{{ emailPrefix }}</span>
          <UButton v-if="loggedIn" to="/account" variant="ghost" color="neutral" size="sm" icon="i-lucide-user">{{ $t('app.nav.account') }}</UButton>
          <UButton
            v-if="loggedIn"
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-log-out"
            :aria-label="$t('app.nav.logout')"
            :loading="loggingOut"
            @click="onLogout"
          />
        </div>
      </nav>
    </header>

    <!-- lg 以下降级提示（UI 风格指南 9 章） -->
    <div class="border-b border-warning/30 bg-warning/10 px-6 py-2 text-center text-xs text-warning lg:hidden">
      {{ $t('app.mobileHint') }}
    </div>

    <main class="mx-auto max-w-6xl px-6 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { used, limit } = useQuota();
const { loggedIn, emailPrefix, logout } = useAuth();
const loggingOut = ref(false);

async function onLogout() {
  loggingOut.value = true;
  try {
    await logout();
  } finally {
    loggingOut.value = false;
  }
}
</script>

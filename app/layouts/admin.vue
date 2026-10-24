<!-- 管理后台独立布局：侧边导航 + 顶栏，与前台营销布局完全解耦 -->
<template>
  <div class="min-h-screen bg-neutral-100">
    <!-- 顶栏 -->
    <header class="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div class="flex h-14 items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-menu"
            class="lg:hidden"
            :aria-label="$t('admin.layout.menu')"
            @click="sidebarOpen = !sidebarOpen"
          />
          <NuxtLinkLocale to="/admin" class="flex items-center gap-2">
            <span class="flex h-7 w-7 items-center justify-center rounded-control bg-neutral-900 text-white">
              <UIcon name="i-lucide-shield-check" class="h-4 w-4" />
            </span>
            <span class="font-semibold text-neutral-900">{{ $t('admin.layout.title') }}</span>
          </NuxtLinkLocale>
        </div>
        <div class="flex items-center gap-2">
          <UButton to="/" variant="ghost" color="neutral" size="sm" icon="i-lucide-globe">
            <span class="hidden sm:inline">{{ $t('admin.layout.backToSite') }}</span>
          </UButton>
          <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-log-out" :loading="loggingOut" @click="onLogout">
            <span class="hidden sm:inline">{{ $t('admin.layout.logout') }}</span>
          </UButton>
        </div>
      </div>
    </header>

    <div class="flex">
      <!-- 侧边导航（桌面） -->
      <aside class="hidden w-56 shrink-0 border-r border-neutral-200 bg-white lg:block">
        <nav class="sticky top-14 space-y-1 p-3">
          <NuxtLinkLocale
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors"
            :class="isActive(item.to) ? 'bg-neutral-900 font-medium text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'"
          >
            <UIcon :name="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </NuxtLinkLocale>
        </nav>
      </aside>

      <!-- 移动端抽屉 -->
      <div v-if="sidebarOpen" class="fixed inset-0 z-50 lg:hidden">
        <div class="absolute inset-0 bg-black/40" @click="sidebarOpen = false" />
        <aside class="absolute left-0 top-0 h-full w-64 bg-white p-3 shadow-xl">
          <nav class="space-y-1">
            <NuxtLinkLocale
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-control px-3 py-2 text-sm"
              :class="isActive(item.to) ? 'bg-neutral-900 font-medium text-white' : 'text-neutral-600 hover:bg-neutral-100'"
              @click="sidebarOpen = false"
            >
              <UIcon :name="item.icon" class="h-4 w-4" />
              {{ item.label }}
            </NuxtLinkLocale>
          </nav>
        </aside>
      </div>

      <!-- 内容区 -->
      <main class="min-w-0 flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();
const sidebarOpen = ref(false);
const loggingOut = ref(false);

const navItems = computed(() => [
  { to: '/admin', label: t('admin.layout.nav.overview'), icon: 'i-lucide-layout-dashboard' },
  { to: '/admin/users', label: t('admin.layout.nav.users'), icon: 'i-lucide-users' },
  { to: '/admin/posts', label: t('admin.layout.nav.posts'), icon: 'i-lucide-file-text' },
  { to: '/admin/settings', label: t('admin.layout.nav.settings'), icon: 'i-lucide-settings' }
]);

function isActive(to: string) {
  if (to === '/admin') return route.path === '/admin';
  return route.path.startsWith(to);
}

async function onLogout() {
  loggingOut.value = true;
  try {
    await $fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* 忽略 */
  } finally {
    loggingOut.value = false;
    await navigateTo('/login');
  }
}
</script>

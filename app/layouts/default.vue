<!-- 营销布局：毛玻璃吸顶导航 + 页脚 -->
<template>
  <div class="min-h-screen bg-neutral-50">
    <header class="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
      <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <div class="hidden items-center gap-8 md:flex">
          <NuxtLinkLocale to="/#features" class="text-sm text-neutral-500 transition-colors hover:text-neutral-900">{{ $t('nav.features') }}</NuxtLinkLocale>
          <NuxtLinkLocale to="/blog" class="text-sm text-neutral-500 transition-colors hover:text-neutral-900">{{ $t('nav.blog') }}</NuxtLinkLocale>
          <UDropdownMenu :items="toolItems" :content="{ class: 'z-50' }">
            <button class="flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-900">
              {{ $t('nav.freeTools') }}
              <UIcon name="i-lucide-chevron-down" class="h-3.5 w-3.5" />
            </button>
          </UDropdownMenu>
        </div>
        <div class="flex items-center gap-3">
          <UDropdownMenu :items="mobileItems" :content="{ class: 'z-50' }" class="md:hidden">
            <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-menu" :aria-label="$t('nav.menuOpen')" />
          </UDropdownMenu>
          <!-- 语言切换 -->
          <UDropdownMenu :items="localeItems" :content="{ class: 'z-50' }">
            <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-globe" :aria-label="$t('nav.language')">
              <span class="hidden sm:inline">{{ locale === 'zh' ? '中文' : 'EN' }}</span>
            </UButton>
          </UDropdownMenu>
          <UButton to="/app" size="sm">{{ $t('nav.startFree') }}</UButton>
        </div>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer class="border-t border-neutral-200 bg-white">
      <div class="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <Logo />
          <p class="mt-3 text-sm text-neutral-500">{{ $t('footer.tagline1') }}<br />{{ $t('footer.tagline2') }}</p>
        </div>
        <div>
          <p class="mb-3 text-sm font-semibold text-neutral-900">{{ $t('footer.product') }}</p>
          <ul class="space-y-2 text-sm text-neutral-500">
            <li><NuxtLinkLocale to="/app" class="hover:text-neutral-900">{{ $t('footer.workbench') }}</NuxtLinkLocale></li>
            <li><NuxtLinkLocale to="/blog" class="hover:text-neutral-900">{{ $t('footer.blog') }}</NuxtLinkLocale></li>
          </ul>
        </div>
        <div>
          <p class="mb-3 text-sm font-semibold text-neutral-900">{{ $t('footer.freeTools') }}</p>
          <ul class="space-y-2 text-sm text-neutral-500">
            <li><NuxtLinkLocale to="/tools/csv-encoding-fix" class="hover:text-neutral-900">{{ $t('footer.csvFix') }}</NuxtLinkLocale></li>
            <li><NuxtLinkLocale to="/tools/fx-converter" class="hover:text-neutral-900">{{ $t('footer.fxConverter') }}</NuxtLinkLocale></li>
          </ul>
        </div>
        <div>
          <p class="mb-3 text-sm font-semibold text-neutral-900">{{ $t('footer.compliance') }}</p>
          <ul class="space-y-2 text-sm text-neutral-500">
            <li><NuxtLinkLocale to="/terms" class="hover:text-neutral-900">{{ $t('footer.terms') }}</NuxtLinkLocale></li>
            <li><NuxtLinkLocale to="/privacy" class="hover:text-neutral-900">{{ $t('footer.privacy') }}</NuxtLinkLocale></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-neutral-100 py-5 text-center text-xs text-neutral-400">
        {{ $t('footer.copyright') }}
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { t, locale, setLocale } = useI18n();

const toolItems = computed(() => [
  [
    { label: t('nav.csvFix'), to: '/tools/csv-encoding-fix' },
    { label: t('nav.fxConverter'), to: '/tools/fx-converter' }
  ]
]);

/** 移动端汉堡菜单：与桌面端导航同构 */
const mobileItems = computed(() => [
  [
    { label: t('nav.features'), to: '/#features' },
    { label: t('nav.blog'), to: '/blog' }
  ],
  [
    { label: t('nav.csvFix'), to: '/tools/csv-encoding-fix' },
    { label: t('nav.fxConverter'), to: '/tools/fx-converter' }
  ]
]);

/** 语言切换菜单 */
const localeItems = computed(() => [
  [
    { label: 'English', onSelect: () => switchLocale('en') },
    { label: '中文', onSelect: () => switchLocale('zh') }
  ]
]);

function switchLocale(l: 'en' | 'zh') {
  setLocale(l);
  if (import.meta.client) {
    window.location.reload();
  }
}
</script>

<!-- 营销落地页（UI 风格指南 6.1） -->
<template>
  <div>
    <!-- Hero -->
    <section class="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center">
      <UBadge color="primary" variant="soft" size="lg" class="mb-6">
        <UIcon name="i-lucide-shield-check" class="mr-1 h-4 w-4" />
        {{ $t('home.badgeLocal') }}
      </UBadge>
      <h1 class="mx-auto max-w-3xl text-5xl font-bold leading-[56px] text-neutral-900">
        {{ $t('home.heroTitle') }}
      </h1>
      <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-500">
        {{ $t('home.heroSubtitle') }}
      </p>
      <div class="mt-8 flex items-center justify-center gap-4">
        <UButton to="/app" size="lg">{{ $t('home.startCleaning') }}</UButton>
      </div>

      <!-- 清洗前后对比 -->
      <div class="mx-auto mt-14 grid max-w-4xl gap-6 text-left md:grid-cols-2">
        <div class="rounded-card border border-neutral-200 bg-white p-5 shadow-sm">
          <p class="mb-3 flex items-center gap-2 text-sm font-semibold text-danger">
            <UIcon name="i-lucide-circle-x" class="h-4 w-4" />{{ $t('home.beforeTitle') }}
          </p>
          <div class="overflow-x-auto rounded-control bg-neutral-900 p-4 font-mono text-xs leading-6 text-neutral-300">
            <p> settlement-id,order-id,amount-type…</p>
            <p class="text-neutral-500"> {{ $t('home.beforeDemo2') }}</p>
            <p class="text-neutral-500"> {{ $t('home.beforeDemo3') }}</p>
          </div>
        </div>
        <div class="rounded-card border border-primary-200 bg-white p-5 shadow-sm">
          <p class="mb-3 flex items-center gap-2 text-sm font-semibold text-success">
            <UIcon name="i-lucide-circle-check" class="h-4 w-4" />{{ $t('home.afterTitle') }}
          </p>
          <div class="overflow-x-auto rounded-control bg-neutral-50 p-4 font-mono text-xs leading-6 text-neutral-700">
            <p>{{ $t('home.afterDemoHeader') }}</p>
            <p>701-1234567 | 2026-01-05 | USD 128.00 | USD | 916.48</p>
            <p>701-1234568 | 2026-01-05 | USD 64.50 | USD | 462.06</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 六大痛点（PRD 1.2） -->
    <section id="features" class="border-t border-neutral-200 bg-white">
      <div class="mx-auto max-w-6xl px-6 py-20">
        <h2 class="text-center text-3xl font-bold text-neutral-900">{{ $t('home.painsTitle') }}</h2>
        <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="p in pains" :key="p.title" class="rounded-card border border-neutral-200 bg-neutral-50 p-6">
            <UIcon :name="p.icon" class="h-6 w-6 text-primary-600" />
            <h3 class="mt-3 font-semibold text-neutral-900">{{ p.title }}</h3>
            <p class="mt-1 text-sm text-neutral-500">{{ p.desc }}</p>
            <p class="mt-3 text-sm font-medium text-primary-700">→ {{ p.fix }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 三步工作流 -->
    <section class="mx-auto max-w-6xl px-6 py-20">
      <h2 class="text-center text-3xl font-bold text-neutral-900">{{ $t('home.stepsTitle') }}</h2>
      <div class="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
        <div v-for="(s, i) in steps" :key="s.title" class="relative rounded-card border border-neutral-200 bg-white p-6 text-center">
          <span class="tnum mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">{{ i + 1 }}</span>
          <h3 class="mt-3 font-semibold text-neutral-900">{{ s.title }}</h3>
          <p class="mt-1 text-sm text-neutral-500">{{ s.desc }}</p>
        </div>
      </div>
      <div class="mt-8 text-center">
        <UButton to="/app" size="lg">{{ $t('home.tryNow') }}</UButton>
      </div>
    </section>

    <!-- 平台预设墙 -->
    <section class="border-t border-neutral-200 bg-white">
      <div class="mx-auto max-w-6xl px-6 py-20">
        <h2 class="text-center text-3xl font-bold text-neutral-900">{{ $t('home.presetsTitle') }}</h2>
        <p class="mt-3 text-center text-neutral-500">{{ $t('home.presetsSubtitle') }}</p>
        <div class="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
          <div v-for="p in presets" :key="p.id" class="flex items-center gap-4 rounded-card border border-neutral-200 p-5">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-primary-50 text-lg font-bold text-primary-700">{{ p.short }}</span>
            <div>
              <p class="font-semibold text-neutral-900">{{ p.name }}</p>
              <p class="text-sm text-neutral-500">{{ p.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-neutral-200 bg-white">
      <div class="mx-auto max-w-3xl px-6 py-20">
        <h2 class="text-center text-3xl font-bold text-neutral-900">{{ $t('home.faqTitle') }}</h2>
        <FaqAccordion :items="faqs" class="mt-8" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

const { t } = useI18n();
const siteUrl = getSiteUrl();

// FAQ 数据（移到 useHead 之前，SSR 时 JSON-LD 需要同步读取）
const faqs = computed(() => [
  { q: t('home.faq1q'), a: t('home.faq1a') },
  { q: t('home.faq2q'), a: t('home.faq2a') },
  { q: t('home.faq3q'), a: t('home.faq3a') },
  { q: t('home.faq4q'), a: t('home.faq4a') }
]);

useSeoMeta({
  title: () => t('home.seoTitle'),
  description: () => t('home.seoDescription'),
  ogTitle: () => t('home.seoOgTitle'),
  ogDescription: () => t('home.seoOgDescription'),
  ogImage: `${siteUrl}/og-cover.png`,
  ogType: 'website',
  twitterCard: 'summary_large_image'
});

useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/` }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'CleanSheet',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description: t('home.jsonLdDescription'),
          url: `${siteUrl}/`,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          featureList: t('home.jsonLdFeatures')
        })
      )
    },
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.value.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a }
          }))
        })
      )
    }
  ]
});

const pains = computed(() => [
  { icon: 'i-lucide-table-properties', title: t('home.pain1Title'), desc: t('home.pain1Desc'), fix: t('home.pain1Fix') },
  { icon: 'i-lucide-file-warning', title: t('home.pain2Title'), desc: t('home.pain2Desc'), fix: t('home.pain2Fix') },
  { icon: 'i-lucide-coins', title: t('home.pain3Title'), desc: t('home.pain3Desc'), fix: t('home.pain3Fix') },
  { icon: 'i-lucide-clipboard-x', title: t('home.pain4Title'), desc: t('home.pain4Desc'), fix: t('home.pain4Fix') },
  { icon: 'i-lucide-plug-zap', title: t('home.pain5Title'), desc: t('home.pain5Desc'), fix: t('home.pain5Fix') },
  { icon: 'i-lucide-wallet', title: t('home.pain6Title'), desc: t('home.pain6Desc'), fix: t('home.pain6Fix') }
]);

const steps = computed(() => [
  { title: t('home.step1Title'), desc: t('home.step1Desc') },
  { title: t('home.step2Title'), desc: t('home.step2Desc') },
  { title: t('home.step3Title'), desc: t('home.step3Desc') }
]);

const presets = computed(() => [
  { id: 'amazon', short: 'A', name: 'Amazon Settlement', desc: t('home.presetAmazonDesc') },
  { id: 'shopify', short: 'S', name: 'Shopify Orders', desc: t('home.presetShopifyDesc') },
  { id: 'tiktok', short: 'T', name: 'TikTok Shop Financials', desc: t('home.presetTiktokDesc') },
  { id: 'shopee', short: 'S', name: 'Shopee', desc: t('home.presetShopeeDesc') }
]);
</script>

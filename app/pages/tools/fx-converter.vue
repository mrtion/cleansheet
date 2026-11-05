<!-- 免费小工具：结算单汇率换算器（FR-F-02） -->
<template>
  <div class="mx-auto max-w-4xl px-6 py-16">
    <h1 class="text-center text-3xl font-bold text-neutral-900">{{ $t('tools.fx.title') }}</h1>
    <p class="mt-3 text-center text-neutral-500">{{ $t('tools.fx.subtitle') }}</p>

    <div class="mt-10">
      <ToolsFxConverterTool />
    </div>

    <!-- SEO 文案块 -->
    <div class="prose-sm mt-10 text-neutral-500">
      <h2 class="text-lg font-semibold text-neutral-900">{{ $t('tools.fx.whatTitle') }}</h2>
      <p class="mt-2 leading-7">
        {{ $t('tools.fx.whatBody') }}
      </p>
    </div>

    <CtaBar />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const { t } = useI18n();
const siteUrl = getSiteUrl();
useSeoMeta({
  title: () => t('tools.fx.seoTitle'),
  description: () => t('tools.fx.seoDesc'),
  ogTitle: () => t('tools.fx.seoOgTitle'),
  ogDescription: () => t('tools.fx.seoOgDesc'),
  ogImage: `${siteUrl}/og-cover.png`
});
useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/tools/fx-converter` }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: t('tools.fx.title'),
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description: t('tools.fx.seoDesc'),
          url: `${siteUrl}/tools/fx-converter`,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
        })
      )
    }
  ]
});
</script>

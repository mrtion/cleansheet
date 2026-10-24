<!-- 免费小工具：CSV 乱码修复器（FR-F-01） -->
<template>
  <div class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="text-center text-3xl font-bold text-neutral-900">{{ $t('tools.csvFix.title') }}</h1>
    <p class="mt-3 text-center text-neutral-500">{{ $t('tools.csvFix.subtitle') }}</p>

    <div class="mt-10">
      <ToolsCsvEncodingFixer />
    </div>

    <!-- SEO 文案块 -->
    <div class="prose-sm mt-10 text-neutral-500">
      <h2 class="text-lg font-semibold text-neutral-900">{{ $t('tools.csvFix.whatTitle') }}</h2>
      <p class="mt-2 leading-7">
        {{ $t('tools.csvFix.whatBody') }}
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
  title: () => t('tools.csvFix.seoTitle'),
  description: () => t('tools.csvFix.seoDesc'),
  ogTitle: () => t('tools.csvFix.seoOgTitle'),
  ogDescription: () => t('tools.csvFix.seoOgDesc'),
  ogImage: `${siteUrl}/og-cover.png`
});
useHead({ link: [{ rel: 'canonical', href: `${siteUrl}/tools/csv-encoding-fix` }] });
</script>

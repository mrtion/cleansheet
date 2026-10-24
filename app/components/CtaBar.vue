<!-- 免费小工具页底部 CTA 条 -->
<template>
  <div class="mt-16 rounded-card border border-primary-100 bg-primary-50 px-8 py-10 text-center">
    <h2 class="text-2xl font-semibold text-neutral-900">{{ $t('common.ctaTitle') }}</h2>
    <p class="mx-auto mt-2 max-w-xl text-neutral-500">
      {{ $t('common.ctaDesc') }}
    </p>
    <UButton to="/app" size="lg" class="mt-6">{{ $t('common.ctaButton') }}</UButton>
  </div>
</template>

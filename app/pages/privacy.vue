<!-- 隐私政策 -->
<template>
  <div class="mx-auto max-w-3xl px-6 py-14">
    <h1 class="text-3xl font-bold text-neutral-900">{{ $t('legal.privacy.title') }}</h1>
    <p class="mt-3 text-sm text-neutral-400">{{ $t('legal.privacy.updated') }}</p>

    <div class="prose-terms mt-8 space-y-8 text-sm leading-7 text-neutral-600">
      <section>
        <h2>{{ $t('legal.privacy.h1') }}</h2>
        <p>{{ $t('legal.privacy.s1_intro') }}</p>
        <ul>
          <li><strong>{{ $t('legal.privacy.li1_1_label') }}</strong>{{ $t('legal.privacy.li1_1_text') }}</li>
          <li><strong>{{ $t('legal.privacy.li1_2_label') }}</strong>{{ $t('legal.privacy.li1_2_text') }}</li>
          <li><strong>{{ $t('legal.privacy.li1_3_label') }}</strong>{{ $t('legal.privacy.li1_3_text') }}</li>
          <li><strong>{{ $t('legal.privacy.li1_4_label') }}</strong>{{ $t('legal.privacy.li1_4_text') }}</li>
        </ul>
        <p class="mt-2">{{ $t('legal.privacy.s1_note') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.privacy.h2') }}</h2>
        <p>{{ $t('legal.privacy.s2') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.privacy.h3') }}</h2>
        <p>{{ $t('legal.privacy.s3') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.privacy.h4') }}</h2>
        <p>{{ $t('legal.privacy.s4') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.privacy.h5') }}</h2>
        <p>{{ $t('legal.privacy.s5') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.privacy.h6') }}</h2>
        <ul>
          <li>{{ $t('legal.privacy.li6_1') }}</li>
          <li>{{ $t('legal.privacy.li6_2') }}</li>
          <li>{{ $t('legal.privacy.li6_3') }}</li>
        </ul>
      </section>

      <section>
        <h2>{{ $t('legal.privacy.h7') }}</h2>
        <p>{{ $t('legal.privacy.s7') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.privacy.h8') }}</h2>
        <p>{{ $t('legal.privacy.s8') }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const { t } = useI18n();
useSeoMeta({
  title: () => t('legal.privacy.seoTitle'),
  description: () => t('legal.privacy.seoDesc'),
  robots: 'noindex, follow'
});
</script>

<style scoped>
.prose-terms h2 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #171717;
  margin-bottom: 0.5rem;
}
.prose-terms ul {
  list-style: disc;
  padding-left: 1.25rem;
}
.prose-terms li {
  margin-top: 0.25rem;
}
</style>

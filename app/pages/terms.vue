<!-- 服务条款 -->
<template>
  <div class="mx-auto max-w-3xl px-6 py-14">
    <h1 class="text-3xl font-bold text-neutral-900">{{ $t('legal.terms.title') }}</h1>
    <p class="mt-3 text-sm text-neutral-400">{{ $t('legal.terms.updated') }}</p>

    <div class="prose-terms mt-8 space-y-8 text-sm leading-7 text-neutral-600">
      <section>
        <h2>{{ $t('legal.terms.h1') }}</h2>
        <p>{{ $t('legal.terms.s1') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.terms.h2') }}</h2>
        <p>{{ $t('legal.terms.s2') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.terms.h3') }}</h2>
        <ul>
          <li>{{ $t('legal.terms.li3_1') }}</li>
          <li>{{ $t('legal.terms.li3_2') }}</li>
          <li>{{ $t('legal.terms.li3_3') }}</li>
        </ul>
      </section>

      <section>
        <h2>{{ $t('legal.terms.h4') }}</h2>
        <p>{{ $t('legal.terms.s4') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.terms.h5') }}</h2>
        <ul>
          <li>{{ $t('legal.terms.li5_1') }}</li>
          <li>{{ $t('legal.terms.li5_2') }}</li>
          <li>{{ $t('legal.terms.li5_3') }}</li>
        </ul>
      </section>

      <section>
        <h2>{{ $t('legal.terms.h6') }}</h2>
        <p>{{ $t('legal.terms.s6') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.terms.h7') }}</h2>
        <p>{{ $t('legal.terms.s7') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.terms.h8') }}</h2>
        <p>{{ $t('legal.terms.s8') }}</p>
      </section>

      <section>
        <h2>{{ $t('legal.terms.h9') }}</h2>
        <p>{{ $t('legal.terms.s9') }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });
const { t } = useI18n();
useSeoMeta({
  title: () => t('legal.terms.seoTitle'),
  description: () => t('legal.terms.seoDesc'),
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

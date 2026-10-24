<!-- 博客列表页：SSR 渲染（数据来自 /api/posts） -->
<template>
  <div class="mx-auto max-w-6xl px-6 py-16">
    <div class="text-center">
      <UBadge color="primary" variant="soft" size="lg" class="mb-4">
        <UIcon name="i-lucide-book-open" class="mr-1 h-4 w-4" />
        {{ $t('blog.badge') }}
      </UBadge>
      <h1 class="text-4xl font-bold text-neutral-900">{{ $t('blog.listTitle') }}</h1>
      <p class="mx-auto mt-4 max-w-2xl text-neutral-500">
        {{ $t('blog.listSubtitle') }}
      </p>
    </div>

    <div v-if="pending" class="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-56 animate-pulse rounded-card border border-neutral-200 bg-white" />
    </div>

    <div v-else-if="posts.length === 0" class="mx-auto mt-12 max-w-2xl text-center text-neutral-400">
      {{ $t('blog.empty') }}
    </div>

    <div v-else class="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
      <NuxtLinkLocale
        v-for="post in posts"
        :key="post.slug"
        :to="`/blog/${post.slug}`"
        class="group flex flex-col rounded-card border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
      >
        <h2 class="mt-1 text-lg font-bold leading-7 text-neutral-900 group-hover:text-primary-700">
          {{ post.title }}
        </h2>
        <p class="mt-2 flex-1 text-sm leading-6 text-neutral-500">{{ post.description }}</p>
        <p class="mt-4 flex items-center gap-3 text-xs text-neutral-400">
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-calendar" class="h-3.5 w-3.5" />
            {{ fmtDate(post.publishedAt) }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-eye" class="h-3.5 w-3.5" />
            {{ fmtCount(post.viewCount) }} {{ $t('blog.views') }}
          </span>
        </p>
      </NuxtLinkLocale>
    </div>

    <div class="mx-auto mt-14 max-w-3xl rounded-card border border-primary-200 bg-primary-50 p-8 text-center">
      <h2 class="text-xl font-bold text-neutral-900">{{ $t('blog.ctaTitle') }}</h2>
      <p class="mt-2 text-sm text-neutral-500">{{ $t('blog.ctaSubtitleList') }}</p>
      <UButton to="/app" size="lg" class="mt-5">{{ $t('blog.ctaButton') }}</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: () => t('blog.seoTitle'),
  description: () => t('blog.seoDescription')
});

interface PostItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  viewCount: number;
}

const { locale } = useI18n();
const { data, pending } = await useFetch<{ posts: PostItem[] }>('/api/posts', {
  query: { locale: locale.value }
});
const posts = computed(() => data.value?.posts ?? []);

function fmtDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtCount(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('en-US');
}
</script>

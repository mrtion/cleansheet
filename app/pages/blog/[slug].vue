<!-- 博客详情页：SSR 渲染（数据来自 /api/posts/:slug），SEO 优化 -->
<template>
  <article class="mx-auto max-w-3xl px-6 py-14">
    <NuxtLinkLocale to="/blog" class="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
      <UIcon name="i-lucide-arrow-left" class="h-4 w-4" /> {{ $t('blog.backToBlog') }}
    </NuxtLinkLocale>

    <div class="mt-6">
      <h1 class="text-3xl font-bold leading-10 text-neutral-900 md:text-4xl md:leading-[44px]">
        {{ post.title }}
      </h1>
      <p class="mt-4 flex items-center gap-3 text-sm text-neutral-400">
        <span class="flex items-center gap-1"><UIcon name="i-lucide-calendar" class="h-4 w-4" /> {{ fmtDate(post.publishedAt) }}</span>
        <span class="flex items-center gap-1"><UIcon name="i-lucide-eye" class="h-4 w-4" /> {{ fmtCount(post.viewCount) }} {{ $t('blog.views') }}</span>
      </p>
      <p
        v-if="post.description"
        class="mt-5 border-l-4 border-primary-500 bg-neutral-50 py-3 pl-4 pr-4 text-neutral-600"
      >
        {{ post.description }}
      </p>
    </div>

    <div class="md-content mt-10" v-html="post.contentHtml" />

    <section class="mt-12 rounded-card border border-primary-200 bg-primary-50 p-8 text-center">
      <h2 class="text-xl font-bold text-neutral-900">{{ $t('blog.ctaTitle') }}</h2>
      <p class="mt-2 text-sm text-neutral-500">{{ $t('blog.ctaSubtitleDetail') }}</p>
      <div class="mt-5 flex items-center justify-center gap-3">
        <UButton to="/app" size="lg">{{ $t('blog.ctaButton') }}</UButton>
      </div>
    </section>

    <section v-if="related.length > 0" class="mt-10">
      <h2 class="text-xl font-bold text-neutral-900">{{ $t('blog.relatedTitle') }}</h2>
      <ul class="mt-3 space-y-2">
        <li v-for="r in related" :key="r.slug">
          <NuxtLinkLocale :to="`/blog/${r.slug}`" class="text-primary-700 hover:underline">{{ r.title }}</NuxtLinkLocale>
        </li>
      </ul>
    </section>
  </article>
</template>

<script setup lang="ts">
interface PostDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  contentHtml: string;
  publishedAt: string | null;
  viewCount: number;
}
interface PostItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
}

const route = useRoute();
const slug = String(route.params.slug || '');
const { t, locale } = useI18n();

// 文章详情（SSR）；不存在 → 404
const { data: detail } = await useFetch<{ post: PostDetail }>(`/api/posts/${slug}`, {
  key: `post-${locale.value}-${slug}`,
  query: { locale: locale.value }
});
if (!detail.value?.post) {
  throw createError({ statusCode: 404, statusMessage: t('blog.notFound') });
}
const post = detail.value.post;

// 相关阅读：同语言列表中排除自己，取 2 篇
const { data: listData } = await useFetch<{ posts: PostItem[] }>('/api/posts', {
  key: `post-list-${locale.value}`,
  query: { locale: locale.value }
});
const related = computed(() =>
  (listData.value?.posts ?? []).filter((p) => p.slug !== post.slug).slice(0, 2)
);

const siteUrl = getSiteUrl();
const pageUrl = `${siteUrl}/blog/${post.slug}`;

useSeoMeta({
  title: post.title,
  description: post.description || post.title,
  ogTitle: post.title,
  ogDescription: post.description || post.title,
  ogType: 'article',
  ogUrl: pageUrl,
  articlePublishedTime: post.publishedAt || undefined
});

useHead({
  link: [{ rel: 'canonical', href: pageUrl }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        author: { '@type': 'Organization', name: 'CleanSheet' },
        mainEntityOfPage: pageUrl
      })
    }
  ]
});

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

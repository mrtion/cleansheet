<!-- 定价页（UI 风格指南 6.6；配额见 PRD 5.10） -->
<template>
  <div class="mx-auto max-w-6xl px-6 py-20">
    <h1 class="text-center text-4xl font-bold text-neutral-900">定价</h1>
    <p class="mt-3 text-center text-neutral-500">免费体验价值，再为规模付费。仅导出成功消耗次数，失败不扣额。</p>

    <div class="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
      <div
        v-for="t in tiers"
        :key="t.name"
        class="rounded-card border bg-white p-8"
        :class="t.hot ? 'border-primary-600 shadow-lg md:scale-[1.04]' : 'border-neutral-200'"
      >
        <p v-if="t.hot"><UBadge color="primary">最受欢迎</UBadge></p>
        <p class="mt-2 text-lg font-semibold text-neutral-900">{{ t.name }}</p>
        <p class="mt-3">
          <span class="text-4xl font-bold text-neutral-900">${{ t.price }}</span>
          <span class="text-sm text-neutral-400">/月</span>
        </p>
        <ul class="mt-6 space-y-3 text-sm text-neutral-600">
          <li v-for="f in t.features" :key="f" class="flex gap-2">
            <UIcon name="i-lucide-check" class="mt-0.5 h-4 w-4 shrink-0 text-success" />{{ f }}
          </li>
        </ul>
        <UButton
          :variant="t.hot ? 'solid' : 'outline'"
          :color="t.hot ? 'primary' : 'neutral'"
          size="lg"
          block
          class="mt-8"
          @click="onCta(t)"
        >
          {{ t.cta }}
        </UButton>
      </div>
    </div>

    <div class="mx-auto mt-16 max-w-3xl">
      <h2 class="text-center text-2xl font-semibold text-neutral-900">常见问题</h2>
      <FaqAccordion :items="faqs" class="mt-6" />
    </div>

    <!-- 支付占位弹窗：支付服务商未定（PRD Q2），诚实说明 -->
    <UModal v-model:open="payModal" :ui="{ content: 'rounded-modal' }">
      <template #content>
        <div class="px-8 py-8 text-center">
          <UIcon name="i-lucide-credit-card" class="mx-auto h-10 w-10 text-primary-600" />
          <h3 class="mt-3 text-xl font-semibold text-neutral-900">订阅支付即将上线，敬请期待</h3>
          <p class="mt-2 text-sm text-neutral-500">
            我们正在接入支付服务商。当前所有功能均可免费体验（每月 20 次转换）。
          </p>
          <UButton class="mt-6" @click="payModal = false">知道了</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  // 免费开放期：定价页临时隐藏，直接回首页
  middleware: () => navigateTo('/', { redirectCode: 302 })
});
const siteUrl = getSiteUrl();
useSeoMeta({
  title: '定价 — CleanSheet 跨境电商对账工具',
  description: 'CleanSheet 免费版每月 20 次转换，Pro 版解锁更高额度与优先处理。仅导出成功消耗次数，失败不扣额。',
  ogTitle: 'CleanSheet 定价',
  ogDescription: '免费版每月 20 次转换，Pro 版解锁更高额度。仅导出成功消耗次数。',
  ogImage: `${siteUrl}/og-cover.png`
});
useHead({ link: [{ rel: 'canonical', href: `${siteUrl}/pricing` }] });

const payModal = ref(false);

const tiers = [
  {
    name: 'Free', price: '0', hot: false, cta: '免费开始',
    features: ['每月转换 20 次', '单文件上限 2,000 行', '官方平台预设', '基础清洗规则']
  },
  {
    name: 'Pro', price: '12.99', hot: true, cta: '升级 Pro',
    features: ['无限次转换', '单文件上限 100,000 行', '保存 10 个自定义映射模板', '汇率自动更新（月度均值）']
  },
  {
    name: 'Team', price: '34.99', hot: false, cta: '升级 Team',
    features: ['Pro 全部权益', '共享模板库', '5 个子账号', '大文件流式优先通道', '专属客服支持']
  }
];

const faqs = [
  { q: '我的数据安全吗？', a: '默认在浏览器本地处理，业务数据不上传、不留存。服务端仅在后续版本中处理超大文件，且处理完即删。' },
  { q: '转换次数如何计算？', a: '1 次"转换" = 1 个任务成功导出。解析或导出失败不消耗额度。按自然月统计，次月自动重置。' },
  { q: '可以退款吗？', a: '订阅支付上线后将提供明确的退款政策，取消订阅后当期权益保留至期末。' },
  { q: '汇率数据来源是？', a: 'Pro 版自动抓取月度平均汇率。当前为占位数据（见 /api/fx），正式数据源待接入（PRD Q3），请以实际入账口径核对。' }
];

function onCta(t: { name: string }) {
  if (t.name === 'Free') navigateTo('/app');
  else payModal.value = true;
}
</script>

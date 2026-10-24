// CleanSheet — Nuxt 4 配置（Cloudflare Workers 原生部署）
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: ['@nuxt/ui'],

  // 站点 URL：构建时由 NUXT_PUBLIC_APP_URL 环境变量注入（测试/正式环境各用各的域名）。
  // SEO 相关的 canonical / og:url / sitemap 全部走这个值，避免硬编码域名。
  runtimeConfig: {
    public: {
      appUrl: ''
    }
  },


  css: ['~/assets/css/main.css'],


  nitro: {
    // 单 Worker 形态：.output/server/index.mjs + .output/public（见 wrangler.jsonc）
    preset: 'cloudflare_module',
    prerender: {
      // 注意：'/' 不预渲染，走 SSR 以便服务端按请求头/Cookie 渲染正确语言，
      // 避免预渲染英文 HTML 与中文浏览器水合时中英文混杂
      routes: ['/pricing', '/tools/csv-encoding-fix', '/tools/fx-converter', '/login', '/register', '/terms', '/privacy']
    }
  },

  // 营销页/工具页/登录注册页预渲染为静态 HTML（Workers Static Assets 直接命中）；
  // 博客走 SSR（文章由管理后台发布，D1 实时读取）；
  // 工作台与账户中心为纯客户端应用（Web Worker + 服务端会话），禁用 SSR
  routeRules: {
    // '/' 走 SSR：服务端按 Cookie/Accept-Language 渲染对应语言，首屏即正确，无水合错乱
    '/': { ssr: true },
    '/pricing': { ssr: true },
    '/tools/**': { prerender: true },
    '/login': { prerender: true },
    '/register': { prerender: true },
    '/terms': { prerender: true },
    '/privacy': { prerender: true },
    '/app/**': { ssr: false },
    '/account': { ssr: false },
    '/admin/**': { ssr: false },
    // 博客列表/详情走 SSR 且禁止边缘缓存：文章每日发布，缓存会导致新文章在列表页不可见
    '/blog': { ssr: true, headers: { 'cache-control': 'no-store, must-revalidate' } },
    '/blog/**': { ssr: true, headers: { 'cache-control': 'no-store, must-revalidate' } }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'CleanSheet — 多平台账单，3 秒对齐',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'CleanSheet 是跨境电商卖家的无代码数据清洗与对账工具：拖入多平台账单，自动识别编码与字段，3 秒输出标准对账表。文件仅在浏览器本地处理。'
        }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      // Cloudflare Web Analytics（2026-10-24 用户提供）：公开的 beacon token，随页面公开输出
      script: [
        {
          type: 'module',
          src: 'https://static.cloudflareinsights.com/beacon.min.js',
          'data-cf-beacon': '{"token": "3bc643243a5545e596d689f218a8ccf0"}'
        }
      ]
    }
  }
})

<!-- Logo：扫帚 + 电子表格组合图形（UI 风格指南 2.1） -->
<template>
  <NuxtLinkLocale to="/" class="flex items-center gap-2" :aria-label="$t('common.logoAria')">
    <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#059669" />
      <g stroke="#ffffff" stroke-width="2.4" opacity="0.95">
        <rect x="14" y="18" width="24" height="30" rx="3" fill="none" />
        <line x1="14" y1="28" x2="38" y2="28" />
        <line x1="26" y1="18" x2="26" y2="48" />
      </g>
      <g stroke="#ffffff" stroke-width="3.4" stroke-linecap="round">
        <line x1="34" y1="12" x2="50" y2="34" />
      </g>
      <path d="M44 32 L54 30 L52 42 L42 44 Z" fill="#ffffff" />
    </svg>
    <span class="text-lg font-bold text-neutral-900 tracking-tight">CleanSheet</span>
  </NuxtLinkLocale>
</template>

/**
 * 获取当前站点的 base URL（如 https://tools.daintyagent.com）。
 * 来源：构建时注入的 NUXT_PUBLIC_APP_URL（经 runtimeConfig.public.appUrl）。
 * 未注入时回退到请求 host（SSR）或 location.origin（客户端）。
 */
export function getSiteUrl(): string {
  const cfg = useRuntimeConfig();
  const fromEnv = (cfg.public.appUrl as string || '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  // 回退：SSR 时从请求推导
  if (import.meta.server) {
    try {
      const u = useRequestURL();
      return `${u.protocol}//${u.host}`;
    } catch { /* ignore */ }
  }
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

/**
 * i18n 插件：注入 $t，提供 locale 状态
 */
import { localeFromPath, translate, type Locale } from '../utils/i18n-core';

export default defineNuxtPlugin(() => {
  const route = useRoute();
  const locale = useState<Locale>('locale', () => 'en');

  // 初始化：cookie > 浏览器语言（服务端读请求头，客户端读 navigator）
  const initLocale = (): Locale => {
    if (import.meta.client) {
      const m = document.cookie.match(/cleansheet_locale=([^;]+)/);
      if (m?.[1] === 'zh') return 'zh';
      if (m?.[1] === 'en') return 'en';
      if (localeFromPath(route.path) === 'zh') return 'zh';
      if (navigator.language.toLowerCase().startsWith('zh')) return 'zh';
    } else {
      const headers = useRequestHeaders(['cookie', 'accept-language']);
      const cookie = headers.cookie || '';
      if (cookie.includes('cleansheet_locale=zh')) return 'zh';
      if (cookie.includes('cleansheet_locale=en')) return 'en';
      if (localeFromPath(route.path) === 'zh') return 'zh';
      if ((headers['accept-language'] || '').toLowerCase().startsWith('zh')) return 'zh';
    }
    return 'en';
  };
  locale.value = initLocale();

  // 注意：cookie 方案下语言由 cookie + locale state 决定，不随 URL 变化。
  // 不要在这里按路径重置 locale，否则切页面时会把用户选的语言强制改回英文。

  // 同步 <html lang>
  const updateLang = (l: Locale) => {
    if (import.meta.client) {
      document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
    }
  };
  updateLang(locale.value);
  watch(locale, updateLang);

  // SSR 时设置 html lang
  useHead({
    htmlAttrs: {
      lang: computed(() => (locale.value === 'zh' ? 'zh-CN' : 'en'))
    }
  });

  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale.value, key, params);

  return {
    provide: {
      t,
      locale
    }
  };
});

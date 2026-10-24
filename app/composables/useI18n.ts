/**
 * useI18n / useLocalePath / useSwitchLocalePath
 * （API 对齐 @nuxtjs/i18n 的使用方式，便于迁移）
 */
import { prefixPath, translate, COOKIE_KEY, type Locale } from '../utils/i18n-core';

export function useI18n() {
  const locale = useState<Locale>('locale', () => 'en');
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale.value, key, params);

  function setLocale(l: Locale) {
    locale.value = l;
    // 写 cookie，下次访问记住
    if (import.meta.client) {
      document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000`;
    }
  }

  return { t, locale, setLocale };
}

export function useLocalePath() {
  // cookie 方案：路径不加前缀，语言由 cookie 决定
  return (path: string) => path;
}

export function useSwitchLocalePath() {
  const route = useRoute();
  return async (target: Locale) => {
    // 设置 cookie 并刷新页面以应用新语言
    if (import.meta.client) {
      document.cookie = `cleansheet_locale=${target}; path=/; max-age=31536000`;
      window.location.reload();
    }
    return route.fullPath;
  };
}

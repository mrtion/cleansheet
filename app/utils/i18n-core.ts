/**
 * 轻量 i18n 运行时（替代 @nuxtjs/i18n，避免构建兼容问题）
 *
 * - 语言：en（默认）/ zh
 * - URL 策略：英文在根路径，中文加 /zh 前缀（prefix_except_default）
 * - 语言检测：URL 前缀 > cookie(cleansheet_locale) > 浏览器语言 > 默认 en
 */
import en from '../../i18n/locales/en.json';
import zh from '../../i18n/locales/zh.json';

export type Locale = 'en' | 'zh';

const messages: Record<Locale, Record<string, string>> = { en, zh };

const COOKIE_KEY = 'cleansheet_locale';

/** 从路径判断 locale */
export function localeFromPath(path: string): Locale {
  return path === '/zh' || path.startsWith('/zh/') ? 'zh' : 'en';
}

/** 给路径加上 locale 前缀 */
export function prefixPath(path: string, locale: Locale): string {
  if (locale === 'en') {
    // 英文是默认，去掉 /zh 前缀
    if (path === '/zh' || path.startsWith('/zh/')) {
      return path.replace(/^\/zh/, '') || '/';
    }
    return path;
  }
  // 中文加 /zh 前缀
  if (path === '/zh' || path.startsWith('/zh/')) return path;
  // 保留 hash
  const [p, hash] = path.split('#');
  return '/zh' + (p === '/' ? '' : p) + (hash ? '#' + hash : '');
}

/** 翻译函数：支持 {name} 插值 */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const dict = messages[locale] ?? messages.en;
  let text = dict[key] ?? messages.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

/** 从请求中检测 locale（服务端用） */
export function detectLocale(path: string, cookieHeader?: string, acceptLanguage?: string): Locale {
  // 1. URL 前缀优先
  if (path === '/zh' || path.startsWith('/zh/')) return 'zh';
  // 2. cookie
  if (cookieHeader) {
    const m = cookieHeader.match(new RegExp(`${COOKIE_KEY}=([^;]+)`));
    if (m?.[1] === 'zh') return 'zh';
    if (m?.[1] === 'en') return 'en';
  }
  // 3. 浏览器语言
  if (acceptLanguage?.toLowerCase().startsWith('zh')) return 'zh';
  return 'en';
}

export { COOKIE_KEY };

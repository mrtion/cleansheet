/**
 * GET /api/posts/:slug — 文章详情（公开，无需登录；仅已发布）
 * 未发布或不存在 → 404 {error:'not_found'}
 */
import { getDB } from '../../utils/db';
import { renderMarkdown } from '../../utils/markdown';

interface PostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  content_md: string;
  published_at: string | null;
  view_count: number | null;
}

// 常见爬虫 UA：命中则不计入访问量，避免搜索引擎抓取刷高数字
const BOT_UA_RE = /bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|ahrefs|semrush|mj12bot|dotbot/i;

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '').trim().slice(0, 128);
  const locale = getQuery(event).locale === 'zh' ? 'zh' : 'en';
  const db = getDB(event);
  const row = await db
    .prepare(
      `select id, slug, title, description, content_md, published_at, translation_group, view_count
       from posts
       where slug = ? and status = 'published' and locale = ?`
    )
    .bind(slug, locale)
    .first<PostRow & { translation_group: string | null }>();
  if (!row) {
    setResponseStatus(event, 404);
    return { error: 'not_found', message: '文章不存在' };
  }
  // 访问计数：非爬虫访问时 view_count + 1
  const ua = String(getHeader(event, 'user-agent') || '');
  let viewCount = row.view_count ?? 0;
  if (!BOT_UA_RE.test(ua)) {
    await db
      .prepare(`update posts set view_count = view_count + 1 where id = ?`)
      .bind(row.id)
      .run();
    viewCount += 1;
  }
  // 查找另一语言版本（用于语言切换）
  const alt = row.translation_group
    ? await db
        .prepare(`select slug from posts where translation_group = ? and locale != ? and status = 'published' limit 1`)
        .bind(row.translation_group, locale)
        .first<{ slug: string }>()
    : null;
  return {
    post: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      contentHtml: renderMarkdown(row.content_md),
      publishedAt: row.published_at,
      viewCount,
      altSlug: alt?.slug ?? null
    }
  };
});

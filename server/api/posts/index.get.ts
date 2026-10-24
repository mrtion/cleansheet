/**
 * GET /api/posts — 已发布文章列表（公开，无需登录）
 * 返回 {posts:[{id,slug,title,description,publishedAt,viewCount}]}，按发布时间倒序
 */
import { getDB } from '../../utils/db';

interface PostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  published_at: string | null;
  view_count: number | null;
}

export default defineEventHandler(async (event) => {
  const db = getDB(event);
  const locale = getQuery(event).locale === 'zh' ? 'zh' : 'en';
  const rows = await db
    .prepare(
      `select id, slug, title, description, published_at, view_count
       from posts
       where status = 'published' and locale = ?
       order by published_at desc`
    )
    .bind(locale)
    .all<PostRow>();
  return {
    posts: (rows.results ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      publishedAt: r.published_at,
      viewCount: r.view_count ?? 0
    }))
  };
});

/**
 * GET /api/admin/posts — 文章列表（管理后台）
 * query: q（标题/slug 模糊搜索）, status（draft|published）, limit（默认 20，上限 100）, offset
 * 返回 {posts:[{id,slug,title,description,contentMd,status,publishedAt,createdAt,updatedAt}], total}
 */
import { getDB } from '../../../utils/db';
import { requireAdmin, forbidden } from '../../../utils/admin';
import { unauthorized } from '../../../utils/auth';

interface PostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  content_md: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const query = getQuery(event);
  const q = String(query.q ?? '').trim().slice(0, 64);
  const status = String(query.status ?? '').trim();
  const locale = String(query.locale ?? '').trim();
  const limit = Math.min(Math.max(parseInt(String(query.limit ?? '20'), 10) || 20, 1), 100);
  const offset = Math.max(parseInt(String(query.offset ?? '0'), 10) || 0, 0);
  const db = getDB(event);

  const conds: string[] = [];
  const params: unknown[] = [];
  if (q) {
    conds.push('(title like ? or slug like ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status === 'draft' || status === 'published') {
    conds.push('status = ?');
    params.push(status);
  }
  if (locale === 'zh' || locale === 'en') {
    conds.push('locale = ?');
    params.push(locale);
  }
  const where = conds.length ? `where ${conds.join(' and ')}` : '';

  const rows = await db
    .prepare(
      `select id, slug, title, description, content_md, status, locale, translation_group, published_at, created_at, updated_at
       from posts ${where}
       order by updated_at desc
       limit ? offset ?`
    )
    .bind(...params, limit, offset)
    .all<PostRow>();
  const totalRow = await db
    .prepare(`select count(*) as c from posts ${where}`)
    .bind(...params)
    .first<{ c: number }>();

  return {
    posts: (rows.results ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      contentMd: r.content_md,
      status: r.status,
      publishedAt: r.published_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })),
    total: totalRow?.c ?? 0
  };
});

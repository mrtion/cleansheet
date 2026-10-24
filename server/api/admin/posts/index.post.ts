/**
 * POST /api/admin/posts — 新建文章（默认草稿）
 * body: {title, slug?, description?, contentMd?}
 * slug 为空则从 title 生成；slug 冲突 → 400
 */
import { getDB } from '../../../utils/db';
import { requireAdmin, forbidden } from '../../../utils/admin';
import { unauthorized } from '../../../utils/auth';

/** 从标题生成 slug；中文标题兜底 post-<随机6位> */
export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  if (s) return s;
  const rand = Math.random().toString(36).slice(2, 8);
  return `post-${rand}`;
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const body = await readBody(event).catch(() => null);
  const title = String(body?.title ?? '').trim().slice(0, 200);
  if (!title) {
    setResponseStatus(event, 400);
    return { error: 'invalid_title', message: '标题不能为空' };
  }
  const rawSlug = String(body?.slug ?? '').trim().toLowerCase().slice(0, 128);
  const slug = rawSlug || slugify(title);
  if (!/^[a-z0-9-]+$/.test(slug)) {
    setResponseStatus(event, 400);
    return { error: 'invalid_slug', message: 'slug 只能包含小写字母、数字和连字符' };
  }
  const description = String(body?.description ?? '').trim().slice(0, 500);
  const contentMd = String(body?.contentMd ?? '');
  const locale = body?.locale === 'en' ? 'en' : 'zh';
  const translationGroup = String(body?.translationGroup ?? '').trim().slice(0, 64) || null;
  const db = getDB(event);

  const existed = await db
    .prepare('select id from posts where slug = ? and locale = ?')
    .bind(slug, locale)
    .first<{ id: string }>();
  if (existed) {
    setResponseStatus(event, 400);
    return { error: 'slug_conflict', message: '该 slug 已被使用，请换一个' };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `insert into posts (id, slug, title, description, content_md, status, locale, translation_group, published_at, created_at, updated_at)
       values (?, ?, ?, ?, ?, 'draft', ?, ?, null, ?, ?)`
    )
    .bind(id, slug, title, description, contentMd, locale, translationGroup, now, now)
    .run();

  setResponseStatus(event, 201);
  return {
    post: { id, slug, title, description, contentMd, status: 'draft', locale, translationGroup, publishedAt: null, createdAt: now, updatedAt: now }
  };
});

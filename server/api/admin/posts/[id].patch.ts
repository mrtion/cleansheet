/**
 * PATCH /api/admin/posts/:id — 更新文章
 * body 可含：title / slug / description / contentMd / status(draft|published)
 * - status 首次变为 published 时自动填 published_at；变回 draft 保留 published_at
 * - slug 冲突 → 400；文章不存在 → 404
 */
import { getDB } from '../../../utils/db';
import { requireAdmin, forbidden } from '../../../utils/admin';
import { unauthorized } from '../../../utils/auth';

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const id = String(getRouterParam(event, 'id') || '');
  const body = await readBody(event).catch(() => null);
  const db = getDB(event);

  const row = await db
    .prepare('select id, status, published_at, locale from posts where id = ?')
    .bind(id)
    .first<{ id: string; status: string; published_at: string | null; locale: string }>();
  if (!row) {
    setResponseStatus(event, 404);
    return { error: 'not_found', message: '文章不存在' };
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (body?.title !== undefined) {
    const title = String(body.title).trim().slice(0, 200);
    if (!title) {
      setResponseStatus(event, 400);
      return { error: 'invalid_title', message: '标题不能为空' };
    }
    sets.push('title = ?');
    params.push(title);
  }
  if (body?.slug !== undefined) {
    const slug = String(body.slug).trim().toLowerCase().slice(0, 128);
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setResponseStatus(event, 400);
      return { error: 'invalid_slug', message: 'slug 只能包含小写字母、数字和连字符' };
    }
    const conflict = await db
      .prepare('select id from posts where slug = ? and locale = ? and id != ?')
      .bind(slug, row.locale, id)
      .first<{ id: string }>();
    if (conflict) {
      setResponseStatus(event, 400);
      return { error: 'slug_conflict', message: '该 slug 已被使用，请换一个' };
    }
    sets.push('slug = ?');
    params.push(slug);
  }
  if (body?.description !== undefined) {
    sets.push('description = ?');
    params.push(String(body.description).trim().slice(0, 500));
  }
  if (body?.contentMd !== undefined) {
    sets.push('content_md = ?');
    params.push(String(body.contentMd));
  }
  if (body?.locale !== undefined) {
    const locale = String(body.locale);
    if (locale !== 'zh' && locale !== 'en') {
      setResponseStatus(event, 400);
      return { error: 'invalid_locale', message: 'locale 只能是 zh 或 en' };
    }
    // 切换语言时检查新语言下 slug 是否冲突
    if (locale !== row.locale) {
      const curSlug = body?.slug !== undefined ? String(body.slug).trim().toLowerCase().slice(0, 128) : null;
      const slugToCheck = curSlug ?? (await db.prepare('select slug from posts where id = ?').bind(id).first<{ slug: string }>())?.slug;
      if (slugToCheck) {
        const conflict = await db
          .prepare('select id from posts where slug = ? and locale = ? and id != ?')
          .bind(slugToCheck, locale, id)
          .first<{ id: string }>();
        if (conflict) {
          setResponseStatus(event, 400);
          return { error: 'slug_conflict', message: '该 slug 在目标语言下已被使用，请先修改 slug' };
        }
      }
    }
    sets.push('locale = ?');
    params.push(locale);
  }
  if (body?.status !== undefined) {
    const status = String(body.status);
    if (status !== 'draft' && status !== 'published') {
      setResponseStatus(event, 400);
      return { error: 'invalid_status', message: 'status 只能是 draft 或 published' };
    }
    sets.push('status = ?');
    params.push(status);
    // 首次发布自动填发布时间；撤回为草稿时保留原 published_at
    if (status === 'published' && !row.published_at) {
      sets.push('published_at = ?');
      params.push(new Date().toISOString());
    }
  }

  if (sets.length === 0) {
    setResponseStatus(event, 400);
    return { error: 'no_changes', message: '没有要更新的字段' };
  }
  sets.push("updated_at = ?");
  params.push(new Date().toISOString());

  await db
    .prepare(`update posts set ${sets.join(', ')} where id = ?`)
    .bind(...params, id)
    .run();
  return { ok: true };
});

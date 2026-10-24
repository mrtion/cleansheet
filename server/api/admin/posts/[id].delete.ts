/**
 * DELETE /api/admin/posts/:id — 删除文章
 * 成功 → 204；不存在 → 404
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
  const db = getDB(event);
  const res = await db.prepare('delete from posts where id = ?').bind(id).run();
  if (res.meta.changes === 0) {
    setResponseStatus(event, 404);
    return { error: 'not_found', message: '文章不存在' };
  }
  setResponseStatus(event, 204);
  return null;
});

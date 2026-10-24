/**
 * DELETE /api/templates/:id — 删除模板（where 自带 user_id，所有权天然隔离）
 * （Phase 2b：改删 D1 行；响应体与 KV 版一字不差）
 */
import { getDB } from '../../utils/db';
import { requireAuth, unauthorized } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event);
  if (!auth) {
    setResponseStatus(event, 401);
    return unauthorized();
  }
  const id = String(getRouterParam(event, 'id') || '');
  const db = getDB(event);
  const res = await db
    .prepare('delete from templates where id = ? and user_id = ?')
    .bind(id, auth.uid)
    .run();
  if (res.meta.changes === 0) {
    setResponseStatus(event, 404);
    return { error: 'not_found', message: '模板不存在或已被删除' };
  }
  return { ok: true };
});

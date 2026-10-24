/**
 * PATCH /api/templates/:id — 重命名模板
 * （Phase 2b：改 D1；响应体与 KV 版一字不差）
 */
import { getDB, mapTemplateRow } from '../../utils/db';
import { requireAuth, unauthorized } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event);
  if (!auth) {
    setResponseStatus(event, 401);
    return unauthorized();
  }
  const id = String(getRouterParam(event, 'id') || '');
  const body = await readBody(event).catch(() => null);
  const name = String(body?.name ?? '').trim();
  if (!name) {
    setResponseStatus(event, 400);
    return { error: 'invalid_name', message: '请输入模板名称' };
  }
  const db = getDB(event);
  const res = await db
    .prepare('update templates set name = ? where id = ? and user_id = ?')
    .bind(name.slice(0, 60), id, auth.uid)
    .run();
  if (res.meta.changes === 0) {
    setResponseStatus(event, 404);
    return { error: 'not_found', message: '模板不存在或已被删除' };
  }
  const row = await db
    .prepare(
      'select id, name, platform, platform_name, mapping_json, rules_json, created_at from templates where id = ? and user_id = ?'
    )
    .bind(id, auth.uid)
    .first<{
      id: string;
      name: string;
      platform: string | null;
      platform_name: string | null;
      mapping_json: string;
      rules_json: string;
      created_at: string;
    }>();
  return mapTemplateRow(row!);
});

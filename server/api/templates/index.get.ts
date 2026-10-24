/**
 * GET /api/templates — 当前用户的模板列表（按创建时间倒序）
 * （Phase 2b：改查 D1 templates 表；响应体与 KV 版一字不差）
 */
import { getDB, mapTemplateRow } from '../../utils/db';
import { requireAuth, unauthorized } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event);
  if (!auth) {
    setResponseStatus(event, 401);
    return unauthorized();
  }
  const db = getDB(event);
  const { results } = await db
    .prepare(
      'select id, name, platform, platform_name, mapping_json, rules_json, created_at from templates where user_id = ? order by created_at desc'
    )
    .bind(auth.uid)
    .all<{
      id: string;
      name: string;
      platform: string | null;
      platform_name: string | null;
      mapping_json: string;
      rules_json: string;
      created_at: string;
    }>();
  return results.map(mapTemplateRow);
});

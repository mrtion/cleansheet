/**
 * POST /api/templates — 新建模板
 * Free 上限 3 个（支付上线后 Pro 10 个，见 README）。超限：402 + 升级提示。
 * （Phase 2b：改写 D1 templates 表；响应体与 KV 版一字不差）
 */
import { getDB, mapTemplateRow } from '../../utils/db';
import { requireAuth, unauthorized } from '../../utils/auth';

export const TEMPLATE_CAP_FREE = 3;

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event);
  if (!auth) {
    setResponseStatus(event, 401);
    return unauthorized();
  }
  const body = await readBody(event).catch(() => null);
  const name = String(body?.name ?? '').trim();
  if (!name) {
    setResponseStatus(event, 400);
    return { error: 'invalid_name', message: '请输入模板名称，例如「Amazon 结算转金蝶」' };
  }
  if (!body?.mapping || typeof body.mapping !== 'object') {
    setResponseStatus(event, 400);
    return { error: 'invalid_mapping', message: '模板缺少字段映射，请先完成映射再保存' };
  }

  const db = getDB(event);
  const cnt = await db
    .prepare('select count(*) as n from templates where user_id = ?')
    .bind(auth.uid)
    .first<{ n: number }>();
  if ((cnt?.n ?? 0) >= TEMPLATE_CAP_FREE) {
    setResponseStatus(event, 402);
    return {
      error: 'template_cap',
      message: '免费版最多保存 3 个模板，升级 Pro 可保存 10 个'
    };
  }

  const id = `tpl_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  const row = {
    id,
    name: name.slice(0, 60),
    platform: body?.platform ? String(body.platform).slice(0, 60) : null,
    platform_name: body?.platformName ? String(body.platformName).slice(0, 80) : null,
    mapping_json: JSON.stringify(body.mapping),
    rules_json: JSON.stringify(Array.isArray(body?.rules) ? body.rules : []),
    created_at: createdAt
  };
  await db
    .prepare(
      'insert into templates (id, user_id, name, platform, platform_name, mapping_json, rules_json, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      row.id,
      auth.uid,
      row.name,
      row.platform,
      row.platform_name,
      row.mapping_json,
      row.rules_json,
      row.created_at
    )
    .run();
  setResponseStatus(event, 201);
  return mapTemplateRow(row);
});

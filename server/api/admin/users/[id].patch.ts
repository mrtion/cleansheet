/**
 * PATCH /api/admin/users/:id — 调整用户套餐（管理后台）
 * body: {plan: 'free'|'pro'|'team'}；upsert subscriptions 表
 * 返回 {ok:true, plan}
 */
import { getDB } from '../../../utils/db';
import { requireAdmin, forbidden } from '../../../utils/admin';
import { unauthorized } from '../../../utils/auth';

const PLANS = ['free', 'pro', 'team'] as const;

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const id = String(getRouterParam(event, 'id') || '');
  const body = await readBody(event).catch(() => null);
  const plan = String(body?.plan ?? '').trim().toLowerCase();
  if (!(PLANS as readonly string[]).includes(plan)) {
    setResponseStatus(event, 400);
    return { error: 'invalid_plan', message: '套餐只能是 free / pro / team' };
  }
  const db = getDB(event);
  const exists = await db.prepare('select 1 as ok from users where id = ?').bind(id).first();
  if (!exists) {
    setResponseStatus(event, 404);
    return { error: 'not_found', message: '用户不存在' };
  }
  await db
    .prepare(
      `insert into subscriptions (user_id, plan, status, updated_at)
       values (?, ?, 'active', datetime('now'))
       on conflict (user_id) do update set plan = excluded.plan, updated_at = datetime('now')`
    )
    .bind(id, plan)
    .run();
  return { ok: true, plan };
});

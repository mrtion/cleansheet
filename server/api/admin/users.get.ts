/**
 * GET /api/admin/users — 用户列表（管理后台）
 * query: q（邮箱模糊搜索）, limit（默认 20，上限 100）, offset（默认 0）
 * 返回 {users:[{id,email,plan,createdAt,conversions,rows}], total}
 * plan 取 subscriptions（缺失视为 free）；配额取本月 usage_records。
 */
import { getDB } from '../../utils/db';
import { currentQuotaMonth } from '../../utils/kv';
import { requireAdmin, forbidden } from '../../utils/admin';
import { unauthorized } from '../../utils/auth';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  plan: string;
  conversions: number;
  rows: number;
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const query = getQuery(event);
  const q = String(query.q ?? '').trim().slice(0, 64);
  const limit = Math.min(Math.max(parseInt(String(query.limit ?? '20'), 10) || 20, 1), 100);
  const offset = Math.max(parseInt(String(query.offset ?? '0'), 10) || 0, 0);
  const month = currentQuotaMonth();
  const db = getDB(event);

  const where = q ? 'where u.email like ?' : '';
  // like 通配符：后台搜索接受 % _ 通配语义
  const likeParam = q ? `%${q}%` : null;

  const listSql = `
    select u.id, u.email, u.created_at,
           coalesce(s.plan, 'free') as plan,
           coalesce(r.conversions, 0) as conversions,
           coalesce(r.rows_processed, 0) as rows
    from users u
    left join subscriptions s on s.user_id = u.id
    left join usage_records r on r.user_id = u.id and r.month = ?
    ${where}
    order by u.created_at desc
    limit ? offset ?`;
  const countSql = `select count(*) as c from users u ${where}`;

  const listParams: unknown[] = likeParam ? [month, likeParam, limit, offset] : [month, limit, offset];
  const rows = await db.prepare(listSql).bind(...listParams).all<UserRow>();

  const countParams: unknown[] = likeParam ? [likeParam] : [];
  const totalRow =
    countParams.length > 0
      ? await db.prepare(countSql).bind(...countParams).first<{ c: number }>()
      : await db.prepare(countSql).first<{ c: number }>();

  return {
    users: (rows.results ?? []).map((r) => ({
      id: r.id,
      email: r.email,
      plan: r.plan,
      createdAt: r.created_at,
      conversions: r.conversions,
      rows: r.rows
    })),
    total: totalRow?.c ?? 0
  };
});

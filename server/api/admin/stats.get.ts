/**
 * GET /api/admin/stats — 管理后台总览统计
 * users: {total, new7d}（近 7 日注册）
 * usage: {month, conversions, rows}（本月 Asia/Shanghai 自然月全站合计）
 * templates: {total}
 */
import { getDB } from '../../utils/db';
import { currentQuotaMonth } from '../../utils/kv';
import { requireAdmin, forbidden } from '../../utils/admin';
import { unauthorized } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const db = getDB(event);
  const month = currentQuotaMonth();
  const [usersTotal, usersNew7d, usage, templatesTotal] = await Promise.all([
    db.prepare('select count(*) as c from users').first<{ c: number }>(),
    db
      .prepare("select count(*) as c from users where created_at >= datetime('now', '-7 days')")
      .first<{ c: number }>(),
    db
      .prepare(
        'select coalesce(sum(conversions), 0) as conversions, coalesce(sum(rows_processed), 0) as rows from usage_records where month = ?'
      )
      .bind(month)
      .first<{ conversions: number; rows: number }>(),
    db.prepare('select count(*) as c from templates').first<{ c: number }>()
  ]);
  return {
    users: { total: usersTotal?.c ?? 0, new7d: usersNew7d?.c ?? 0 },
    usage: {
      month,
      conversions: usage?.conversions ?? 0,
      rows: usage?.rows ?? 0
    },
    templates: { total: templatesTotal?.c ?? 0 }
  };
});

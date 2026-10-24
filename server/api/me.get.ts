/**
 * GET /api/me — 当前用户 + 套餐 + 本月配额（工作台首屏一次取齐）
 * 未登录：401 {error:"unauthorized"}
 * （Phase 2b：用户/订阅/配额改查 D1；响应体与 KV 版一字不差）
 */
import { getDB } from '../utils/db';
import { currentQuotaMonth } from '../utils/kv';
import { requireAuth, unauthorized } from '../utils/auth';

export const FREE_LIMIT = 20;
export const FREE_ROWS_PER_FILE = 2000;

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event);
  if (!auth) {
    setResponseStatus(event, 401);
    return unauthorized();
  }
  const db = getDB(event);
  const user = await db
    .prepare('select id, email, created_at from users where id = ?')
    .bind(auth.uid)
    .first<{ id: string; email: string; created_at: string }>();
  if (!user) {
    setResponseStatus(event, 401);
    return unauthorized();
  }
  // 套餐以 subscriptions 表为准（支付上线后由 Webhook 更新）；缺失则视为 free
  const sub = await db
    .prepare('select plan from subscriptions where user_id = ?')
    .bind(auth.uid)
    .first<{ plan: string }>();
  const month = currentQuotaMonth();
  const usage = await db
    .prepare('select conversions, rows_processed from usage_records where user_id = ? and month = ?')
    .bind(auth.uid, month)
    .first<{ conversions: number; rows_processed: number }>();
  return {
    user: { id: user.id, email: user.email, createdAt: user.created_at },
    plan: sub?.plan ?? 'free', // 支付上线前全员 free；订阅状态届时由支付 Webhook 写入
    quota: {
      used: usage?.conversions ?? 0,
      limit: FREE_LIMIT,
      rowsPerFile: FREE_ROWS_PER_FILE,
      rows: usage?.rows_processed ?? 0,
      month
    }
  };
});

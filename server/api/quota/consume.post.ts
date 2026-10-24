/**
 * POST /api/quota/consume — 导出成功后扣减配额 {dedupKey, rows}
 *
 * 幂等：dedupKey 已存在 → 直接返回当前用量，不重复计数。
 * 超限：402 {error:"quota_exhausted", used, limit}。
 *
 * 原子性（Phase 2b：D1 条件更新）：
 *   `update ... set conversions = conversions + 1 where ... and conversions < 20`
 *   是单条 SQL 原子执行——并发下只有一个请求能拿到 meta.changes === 1，
 *   其余请求 changes === 0 即判定超限。因此不再需要 TDD D9 的 Durable Objects
 *   强一致计数器；KV read-modify-write 的超扣窗口已消除。
 *   幂等键的并发竞态（同 dedupKey 同时提交）仍为 best-effort，与之前 KV 版一致。
 */
import { getDB } from '../../utils/db';
import { currentQuotaMonth } from '../../utils/kv';
import { requireAuth, unauthorized } from '../../utils/auth';
import { FREE_LIMIT } from '../me.get';

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event);
  // 免费开放期：未登录用户直接放行，不扣减配额
  if (!auth) {
    return { ok: true, used: 0, limit: -1, anonymous: true };
  }
  const body = await readBody(event).catch(() => null);
  const dedupKey = body?.dedupKey;
  if (!dedupKey || typeof dedupKey !== 'string') {
    setResponseStatus(event, 400);
    return { error: 'invalid_request', message: '缺少去重标识，请重试导出' };
  }
  const rows = Math.max(0, Math.floor(Number(body?.rows) || 0));

  const db = getDB(event);
  const month = currentQuotaMonth();

  const readUsage = () =>
    db
      .prepare('select conversions, rows_processed from usage_records where user_id = ? and month = ?')
      .bind(auth.uid, month)
      .first<{ conversions: number; rows_processed: number }>();

  // a. 幂等：同一导出指纹重复提交不重复计数
  const dup = await db
    .prepare('select 1 as x from usage_dedup where dedup_key = ?')
    .bind(dedupKey)
    .first();
  if (dup) {
    const u = await readUsage();
    return { used: u?.conversions ?? 0, limit: FREE_LIMIT, deduped: true };
  }

  // b. 确保本月配额行存在（insert or ignore：并发下只有一个能插入）
  await db
    .prepare(
      'insert or ignore into usage_records (user_id, month, conversions, rows_processed) values (?, ?, 0, 0)'
    )
    .bind(auth.uid, month)
    .run();

  // c. 条件更新原子扣减：conversions < 20 的守卫让并发超限请求拿到 changes === 0
  const updated = await db
    .prepare(
      'update usage_records set conversions = conversions + 1, rows_processed = rows_processed + ? where user_id = ? and month = ? and conversions < ?'
    )
    .bind(rows, auth.uid, month, FREE_LIMIT)
    .run();
  if (updated.meta.changes === 0) {
    const u = await readUsage();
    setResponseStatus(event, 402);
    return {
      error: 'quota_exhausted',
      message: '本月免费额度已用完（20 次），升级 Pro 解锁无限次',
      used: u?.conversions ?? FREE_LIMIT,
      limit: FREE_LIMIT
    };
  }

  // d. 幂等键落库
  await db
    .prepare('insert or ignore into usage_dedup (dedup_key) values (?)')
    .bind(dedupKey)
    .run();

  const u = await readUsage();
  return { used: u?.conversions ?? 0, limit: FREE_LIMIT };
});

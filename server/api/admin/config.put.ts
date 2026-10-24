/**
 * PUT /api/admin/config — 更新站点配置（支付 / 邮件）
 * body: { payment?: {...}, email?: {...} }
 * 密钥字段提交空字符串或脱敏值（形如 abcd****wxyz）表示"不修改"，保留原值。
 */
import { getDB } from '../../utils/db';
import { requireAdmin, forbidden } from '../../utils/admin';
import { unauthorized } from '../../utils/auth';

const SECRET_KEYS = ['resendApiKey', 'stripeSecretKey', 'stripeWebhookSecret', 'paddleApiKey'];

function isMasked(v: string): boolean {
  return /\*{4}/.test(v);
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const body = await readBody(event).catch(() => ({}));
  const db = getDB(event);

  for (const key of ['payment', 'email'] as const) {
    const incoming = body?.[key];
    if (!incoming || typeof incoming !== 'object') continue;

    // 读出现有值，密钥字段做"不修改"合并
    const row = await db
      .prepare('select value from site_config where key = ?')
      .bind(key)
      .first<{ value: string }>();
    let current: Record<string, any> = {};
    try {
      current = row?.value ? JSON.parse(row.value) : {};
    } catch {
      /* 忽略 */
    }
    const merged: Record<string, any> = { ...current };
    for (const [k, v] of Object.entries(incoming)) {
      if (SECRET_KEYS.includes(k) && (v === '' || (typeof v === 'string' && isMasked(v)))) {
        continue; // 不修改
      }
      merged[k] = v;
    }

    // 基础校验
    if (key === 'payment' && !['none', 'stripe', 'paddle'].includes(merged.provider)) {
      setResponseStatus(event, 400);
      return { error: 'bad-request', message: '支付 provider 非法' };
    }
    if (key === 'email' && !['none', 'resend'].includes(merged.provider)) {
      setResponseStatus(event, 400);
      return { error: 'bad-request', message: '邮件 provider 非法' };
    }
    if (key === 'email' && merged.provider === 'resend' && merged.fromEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merged.fromEmail)) {
        setResponseStatus(event, 400);
        return { error: 'bad-request', message: '发件邮箱格式不正确' };
      }
    }

    await db
      .prepare("insert into site_config (key, value, updated_at) values (?, ?, datetime('now')) on conflict(key) do update set value=excluded.value, updated_at=datetime('now')")
      .bind(key, JSON.stringify(merged))
      .run();
  }

  return { ok: true };
});

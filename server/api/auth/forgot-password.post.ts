/**
 * POST /api/auth/forgot-password — 请求密码重置
 * body: { email }
 * 限频：同一 IP 5 次/10 分钟。无论邮箱是否存在都返回 ok（不泄露用户存在性）。
 * 生成 token 存 KV（pwreset:{token} → uid，1 小时 TTL），邮件发送重置链接。
 * 若邮件未配置，返回 devResetUrl（前端直接展示链接，方便管理员在未配邮件时帮用户重置）。
 */
import { getDB } from '../../utils/db';
import { getKV } from '../../utils/kv';
import { sendEmail, resetPasswordHtml, getEmailConfig } from '../../utils/email';

const RL_LIMIT = 5;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

function baseUrl(event: any): string {
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https';
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || '';
  return `${proto}://${host}`;
}

export default defineEventHandler(async (event) => {
  const kv = getKV(event);
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
  const rlKey = `rl:forgot:${ip}`;
  const tried = Number((await kv.get(rlKey)) || 0);
  if (tried >= RL_LIMIT) {
    setResponseStatus(event, 429);
    return { error: 'rate_limited', message: '请求过于频繁，请 10 分钟后再试' };
  }
  await kv.put(rlKey, String(tried + 1), { expirationTtl: 600 });

  const body = await readBody(event).catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setResponseStatus(event, 400);
    return { error: 'bad-request', message: '邮箱格式不正确' };
  }

  const db = getDB(event);
  const user = await db
    .prepare('select id from users where email = ?')
    .bind(email)
    .first<{ id: string }>();

  // 用户不存在也返回 ok，不泄露
  if (!user) return { ok: true };

  const token = randomToken();
  await kv.put(`pwreset:${token}`, user.id, { expirationTtl: 3600 });
  const resetUrl = `${baseUrl(event)}/reset-password?token=${token}`;

  const emailCfg = await getEmailConfig(event);
  if (emailCfg.provider === 'resend' && emailCfg.resendApiKey && emailCfg.fromEmail) {
    const sent = await sendEmail(event, {
      to: email,
      subject: '重置你的 CleanSheet 密码',
      html: resetPasswordHtml(resetUrl)
    });
    if (!sent.ok) {
      // 邮件失败时降级：把链接直接返回（前端提示用户联系管理员或复制链接）
      return { ok: true, devResetUrl: resetUrl, emailError: true };
    }
    return { ok: true };
  }
  // 邮件未配置：直接返回链接（管理员可在后台帮用户重置）
  return { ok: true, devResetUrl: resetUrl };
});

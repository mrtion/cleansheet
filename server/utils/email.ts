/**
 * server/utils/email.ts — 邮件发送（管理后台可配置）
 *
 * 配置存在 D1 site_config 表的 'email' 键（JSON）：
 *   { provider: 'resend' | 'none', resendApiKey, fromEmail, fromName }
 * 由 /api/admin/config 读写。
 *
 * sendEmail(event, { to, subject, html })：
 *  - 未配置 provider → 返回 { ok:false, reason:'not-configured' }（调用方自行降级）
 *  - Resend：POST https://api.resend.com/emails
 */

import { getDB } from './db';

export interface EmailConfig {
  provider: 'resend' | 'none';
  resendApiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

export async function getEmailConfig(event: any): Promise<EmailConfig> {
  try {
    const db = getDB(event);
    const row = await db
      .prepare('select value from site_config where key = ?')
      .bind('email')
      .first<{ value: string }>();
    if (row?.value) return { provider: 'none', fromName: 'CleanSheet', ...JSON.parse(row.value) };
  } catch {
    /* 忽略，返回默认 */
  }
  return { provider: 'none', fromName: 'CleanSheet' };
}

export interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(
  event: any,
  opts: SendEmailOpts
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const cfg = await getEmailConfig(event);
  if (cfg.provider !== 'resend' || !cfg.resendApiKey || !cfg.fromEmail) {
    return { ok: false, reason: 'not-configured' };
  }
  const from = cfg.fromName ? `${cfg.fromName} <${cfg.fromEmail}>` : cfg.fromEmail;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, reason: `resend-${res.status}:${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: `network:${e?.message ?? 'unknown'}` };
  }
}

/** 密码重置邮件正文 */
export function resetPasswordHtml(resetUrl: string): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1c1e">
  <h2 style="font-size:20px;margin:0 0 16px">重置 CleanSheet 密码</h2>
  <p style="font-size:14px;line-height:1.6;color:#3a3a3c">我们收到了重置你账户密码的请求。点击下方按钮设置新密码，该链接 1 小时内有效：</p>
  <p style="margin:24px 0"><a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px">设置新密码</a></p>
  <p style="font-size:13px;color:#8e8e93">如果按钮无法点击，请复制以下链接到浏览器打开：<br><a href="${resetUrl}" style="color:#16a34a;word-break:break-all">${resetUrl}</a></p>
  <p style="font-size:13px;color:#8e8e93;margin-top:24px">如果你没有发起此请求，请忽略这封邮件，密码不会被修改。</p>
</div>`;
}

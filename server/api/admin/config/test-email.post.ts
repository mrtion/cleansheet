/**
 * POST /api/admin/config/test-email — 发送测试邮件
 * body: { to }
 */
import { requireAdmin, forbidden } from '../../../utils/admin';
import { unauthorized } from '../../../utils/auth';
import { sendEmail } from '../../../utils/email';

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const body = await readBody(event).catch(() => ({}));
  const to = String(body?.to ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    setResponseStatus(event, 400);
    return { error: 'bad-request', message: '收件邮箱格式不正确' };
  }
  const result = await sendEmail(event, {
    to,
    subject: 'CleanSheet 邮件配置测试',
    html: '<p style="font-family:sans-serif">这是一封测试邮件，说明 CleanSheet 的邮件发送配置正常。</p>'
  });
  if (!result.ok) {
    setResponseStatus(event, 400);
    return { error: 'send-failed', message: `发送失败：${result.reason}` };
  }
  return { ok: true };
});

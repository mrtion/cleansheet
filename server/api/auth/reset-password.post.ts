/**
 * POST /api/auth/reset-password — 用 token 设置新密码
 * body: { token, password }
 * token 一次性有效（用后即删），1 小时过期。
 */
import { getDB } from '../../utils/db';
import { getKV } from '../../utils/kv';
import { hashPassword } from '../../utils/password';

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);
  const token = String(body?.token ?? '');
  const password = String(body?.password ?? '');

  if (!/^[0-9a-f]{64}$/.test(token)) {
    setResponseStatus(event, 400);
    return { error: 'bad-request', message: '重置链接无效或已过期' };
  }
  if (password.length < 8) {
    setResponseStatus(event, 400);
    return { error: 'bad-request', message: '密码至少 8 位' };
  }
  if (password.length > 128) {
    setResponseStatus(event, 400);
    return { error: 'bad-request', message: '密码过长' };
  }

  const kv = getKV(event);
  const uid = await kv.get(`pwreset:${token}`);
  if (!uid) {
    setResponseStatus(event, 400);
    return { error: 'invalid-token', message: '重置链接无效或已过期，请重新申请' };
  }

  const db = getDB(event);
  const passwordHash = await hashPassword(password);
  await db.prepare('update users set password_hash = ? where id = ?').bind(passwordHash, uid).run();
  await kv.delete(`pwreset:${token}`);

  return { ok: true };
});

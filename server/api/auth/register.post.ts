/**
 * POST /api/auth/register — 邮箱 + 密码注册
 * 成功：201 {user:{id,email,createdAt}} 并种下会话 Cookie
 * （Phase 2b：用户/订阅改存 D1；会话仍在 KV，见 server/utils/kv.ts）
 */
import { getDB } from '../../utils/db';
import { getKV } from '../../utils/kv';
import { hashPassword } from '../../utils/password';
import { createSession, setSessionCookie } from '../../utils/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!EMAIL_RE.test(email)) {
    setResponseStatus(event, 400);
    return { error: 'invalid_email', message: '请输入有效的邮箱地址，例如 name@example.com' };
  }
  if (password.length < 8) {
    setResponseStatus(event, 400);
    return { error: 'weak_password', message: '密码至少 8 位，请设置更安全的密码' };
  }

  const db = getDB(event);
  const existed = await db
    .prepare('select id from users where email = ?')
    .bind(email)
    .first<{ id: string }>();
  if (existed) {
    setResponseStatus(event, 409);
    return { error: 'email_exists', message: '该邮箱已注册，请直接登录' };
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    await db
      .prepare('insert into users (id, email, password_hash, created_at) values (?, ?, ?, ?)')
      .bind(id, email, await hashPassword(password), createdAt)
      .run();
    // 注册即开 free 订阅行（plan/status 取表默认值）
    await db.prepare('insert into subscriptions (user_id) values (?)').bind(id).run();
  } catch (e) {
    // 并发注册竞态：唯一约束兜底 → 409（与先查后插的 409 文案一致）
    if (String(e).includes('UNIQUE constraint failed')) {
      setResponseStatus(event, 409);
      return { error: 'email_exists', message: '该邮箱已注册，请直接登录' };
    }
    throw e;
  }

  const token = await createSession(getKV(event), id);
  setSessionCookie(event, token);
  setResponseStatus(event, 201);
  return { user: { id, email, createdAt } };
});

/**
 * POST /api/auth/login — 邮箱 + 密码登录
 * 限频：同一 IP 10 次/分钟（KV rl:login:{ip}，expirationTtl 60s 滑动窗口近似）。
 * 失败统一返回 401「邮箱或密码不正确」，不泄露邮箱是否存在。
 * （Phase 2b：用户改查 D1；会话与限频仍在 KV）
 */
import { getDB } from '../../utils/db';
import { getKV } from '../../utils/kv';
import { verifyPassword } from '../../utils/password';
import { createSession, setSessionCookie } from '../../utils/auth';

const LOGIN_LIMIT = 10;

export default defineEventHandler(async (event) => {
  const kv = getKV(event);
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
  const rlKey = `rl:login:${ip}`;
  const tried = Number((await kv.get(rlKey)) || 0);
  if (tried >= LOGIN_LIMIT) {
    setResponseStatus(event, 429);
    return { error: 'rate_limited', message: '登录尝试过于频繁，请 1 分钟后再试' };
  }
  // 每次尝试都计数（含成功）：滑动窗口近似
  await kv.put(rlKey, String(tried + 1), { expirationTtl: 60 });

  const body = await readBody(event).catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  const bad = () => {
    setResponseStatus(event, 401);
    return { error: 'invalid_credentials', message: '邮箱或密码不正确，请重试' };
  };

  const db = getDB(event);
  const user = await db
    .prepare('select id, email, password_hash, created_at from users where email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string | null; created_at: string }>();
  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return bad();
  }

  const token = await createSession(kv, user.id);
  setSessionCookie(event, token);
  return { user: { id: user.id, email: user.email, createdAt: user.created_at } };
});

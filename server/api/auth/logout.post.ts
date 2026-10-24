/**
 * POST /api/auth/logout — 销毁会话并清除 Cookie
 */
import { getKV } from '../../utils/kv';
import { clearSessionCookie, SESSION_COOKIE } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const token = getCookie(event, SESSION_COOKIE);
  if (token) {
    try {
      await getKV(event).delete(`sess:${token}`);
    } catch {
      /* KV 不可用也不阻断登出 */
    }
  }
  clearSessionCookie(event);
  return { ok: true };
});

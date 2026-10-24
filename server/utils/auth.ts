/**
 * server/utils/auth.ts — 会话管理（KV sess 令牌 + cs_sess Cookie）
 *
 * Phase 2 用不透明随机令牌会话（JWT_SECRET 未配置，jose 签名延后）。
 * Cookie: cs_sess=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=30天；
 * Secure 仅在 https 下设置（兼容 wrangler dev 本地 http 调试）。
 */
import { getKV, kvGetJson, kvPutJson, type KVLike } from './kv';

export const SESSION_COOKIE = 'cs_sess';
const SESSION_TTL = 30 * 24 * 3600; // 30 天（秒）

export interface SessionData {
  uid: string;
  exp: number;
}

/** 创建会话并写入 KV，返回令牌 */
export async function createSession(kv: KVLike, uid: string): Promise<string> {
  const token = crypto.randomUUID();
  const data: SessionData = { uid, exp: Date.now() + SESSION_TTL * 1000 };
  await kvPutJson(kv, `sess:${token}`, data, { expirationTtl: SESSION_TTL });
  return token;
}

export function setSessionCookie(event: any, token: string): void {
  let secure = true;
  try {
    secure = getRequestURL(event).protocol === 'https:';
  } catch {
    /* 兜底保持 secure */
  }
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL
  });
}

export function clearSessionCookie(event: any): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/' });
}

/** 读取会话；无会话/过期返回 null（不抛错，由调用方决定 401 文案） */
export async function getSession(event: any): Promise<SessionData | null> {
  const token = getCookie(event, SESSION_COOKIE);
  if (!token) return null;
  const kv = getKV(event);
  const s = await kvGetJson<SessionData>(kv, `sess:${token}`);
  if (!s || !s.uid) return null;
  return s;
}

/**
 * 要求登录：返回 { uid }；未登录返回 null，调用方需自行返回 401。
 * （不用 throw createError：保证响应体精确为 {error:"unauthorized"}，
 *  不依赖 h3 错误序列化细节。）
 */
export async function requireAuth(event: any): Promise<{ uid: string } | null> {
  const s = await getSession(event);
  return s ? { uid: s.uid } : null;
}

export function unauthorized() {
  return { error: 'unauthorized', message: '请先登录后再操作' };
}

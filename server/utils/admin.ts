/**
 * server/utils/admin.ts — 管理员鉴权
 *
 * 管理员名单来自服务端环境变量 ADMIN_EMAILS（逗号分隔，大小写不敏感），
 * 例如："admin@example.com,ops@example.com"。
 * - 本文件只在服务端执行（永不打包进客户端），故用无 NUXT_ 前缀的
 *   纯服务端变量名，避免意外暴露。
 * - 未配置 / 为空 → 没有任何管理员，所有 /api/admin/* 返回 403。
 *
 * 读取顺序：
 *   1) process.env.ADMIN_EMAILS（Node / 本地开发）
 *   2) event.context.cloudflare.env.ADMIN_EMAILS
 *      （Workers 上 wrangler vars / secrets；workerd 的 process.env
 *       不会自动带入 vars，故必须读 env 回退）
 */
import { getDB } from './db';
import { requireAuth } from './auth';

function readAdminEmailsSetting(event: any): string {
  try {
    const v =
      typeof process !== 'undefined' ? (process as any).env?.ADMIN_EMAILS : '';
    if (v) return String(v);
  } catch {
    /* 忽略，走 Cloudflare env */
  }
  try {
    const v = (event?.context as any)?.cloudflare?.env?.ADMIN_EMAILS;
    if (v) return String(v);
  } catch {
    /* 忽略 */
  }
  return '';
}

/** 邮箱是否在管理员名单中（大小写不敏感；名单为空 → false） */
export function isAdminEmail(email: string, event?: any): boolean {
  const raw = readAdminEmailsSetting(event);
  if (!raw || !raw.trim()) return false;
  const target = email.trim().toLowerCase();
  if (!target) return false;
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}

export type AdminCheck =
  | { ok: true; uid: string; email: string }
  | { ok: false; code: 401 | 403 };

/**
 * 要求管理员：先 requireAuth，再查 D1 users 表取邮箱比对名单。
 * 返回 ok:false 时，调用方按 code 返回 401（unauthorized）或 403（forbidden）。
 */
export async function requireAdmin(event: any): Promise<AdminCheck> {
  const auth = await requireAuth(event);
  if (!auth) return { ok: false, code: 401 };
  const db = getDB(event);
  const row = await db
    .prepare('select email from users where id = ?')
    .bind(auth.uid)
    .first<{ email: string }>();
  if (!row || !isAdminEmail(row.email, event)) {
    return { ok: false, code: 403 };
  }
  return { ok: true, uid: auth.uid, email: row.email };
}

export function forbidden() {
  return { error: 'forbidden', message: '需要管理员权限' };
}

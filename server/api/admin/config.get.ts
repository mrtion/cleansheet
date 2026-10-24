/**
 * GET /api/admin/config — 读取站点配置（支付 / 邮件）
 * 密钥类字段返回脱敏（前 4 + ****）避免前端泄露。
 */
import { getDB } from '../../utils/db';
import { requireAdmin, forbidden } from '../../utils/admin';
import { unauthorized } from '../../utils/auth';

function maskSecret(v: any): string {
  const s = String(v ?? '');
  if (!s) return '';
  if (s.length <= 8) return '****';
  return s.slice(0, 4) + '****' + s.slice(-4);
}

function maskConfig(key: string, cfg: Record<string, any>): Record<string, any> {
  const out = { ...cfg };
  // 密钥字段脱敏；前端提交空字符串表示"不修改"
  for (const k of Object.keys(out)) {
    if (/key|secret|token/i.test(k) && typeof out[k] === 'string' && out[k]) {
      out[k] = maskSecret(out[k]);
    }
  }
  return out;
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const db = getDB(event);
  const rows = await db
    .prepare("select key, value from site_config where key in ('payment','email')")
    .all<{ key: string; value: string }>();
  const result: Record<string, any> = { payment: { provider: 'none' }, email: { provider: 'none' } };
  for (const r of rows.results ?? []) {
    try {
      result[r.key] = maskConfig(r.key, JSON.parse(r.value));
    } catch {
      /* 忽略坏数据 */
    }
  }
  return result;
});

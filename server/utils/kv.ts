/**
 * server/utils/kv.ts — Cloudflare KV 访问封装
 *
 * Phase 2b（KV → D1 迁移）后的分工：
 *   KV 仅保留短暂数据：sess:{token}（会话，expirationTtl 30 天）、
 *   rl:login:{ip}（登录限频，expirationTtl 60s）。
 *   关系型数据（用户/订阅/模板/配额流水/幂等键）已迁至 D1，
 *   见 server/utils/db.ts 与 server/db/migrations/0001_init.sql。
 */

/** KVNamespace 的最小结构化类型（避免引入 @cloudflare/workers-types 依赖） */
export interface KVLike {
  get(key: string, type: 'json'): Promise<any>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export function getKV(event: any): KVLike {
  const env = (event.context as any)?.cloudflare?.env;
  const kv = env?.KV as KVLike | undefined;
  if (!kv || typeof kv.get !== 'function') {
    throw createError({
      statusCode: 500,
      statusMessage: 'KV binding 未配置',
      message: 'KV binding 未配置：请检查 wrangler.jsonc 中的 kv_namespaces'
    });
  }
  return kv;
}

export async function kvGetJson<T>(kv: KVLike, key: string): Promise<T | null> {
  try {
    return (await kv.get(key, 'json')) as T | null;
  } catch {
    return null;
  }
}

export async function kvPutJson(
  kv: KVLike,
  key: string,
  value: unknown,
  options?: { expirationTtl?: number }
): Promise<void> {
  await kv.put(key, JSON.stringify(value), options);
}

/** 配额月份口径：Asia/Shanghai 自然月（YYYY-MM），与用户感知一致 */
export function currentQuotaMonth(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit'
  }).format(new Date());
}

/**
 * server/utils/db.ts — D1 访问封装（Phase 2b：KV → D1 迁移）
 *
 * 存储分工（见 README「存储架构」）：
 *   D1（关系型账本）：users / subscriptions / templates / usage_records / usage_dedup
 *   KV（短暂数据）：会话 sess:{token}、登录限频 rl:login:{ip}（见 server/utils/kv.ts）
 *
 * D1 访问一律经 db.prepare(sql).bind(...).first()/run()/all()，
 * 不引入 ORM，保持 SQL 可审计。
 */

/** D1 binding 的最小结构化类型（避免引入 @cloudflare/workers-types 依赖） */
export interface D1Prepared {
  bind(...params: unknown[]): {
    first<T = any>(): Promise<T | null>;
    run(): Promise<{ meta: { changes: number } }>;
    all<T = any>(): Promise<{ results: T[] }>;
  };
}

export interface D1Like {
  prepare(query: string): D1Prepared;
}

export function getDB(event: any): D1Like {
  const env = (event.context as any)?.cloudflare?.env;
  const db = env?.DB as D1Like | undefined;
  if (!db || typeof db.prepare !== 'function') {
    throw createError({
      statusCode: 500,
      statusMessage: 'DB binding 未配置',
      message: 'DB binding 未配置：请检查 wrangler.jsonc 中的 d1_databases'
    });
  }
  return db;
}

/** D1 rows → 前端模板形状（与 Phase 2 KV 版响应体一字不差） */
export function mapTemplateRow(row: {
  id: string;
  name: string;
  platform: string | null;
  platform_name: string | null;
  mapping_json: string;
  rules_json: string;
  created_at: string;
}) {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    platformName: row.platform_name,
    mapping: JSON.parse(row.mapping_json),
    rules: JSON.parse(row.rules_json),
    createdAt: row.created_at
  };
}

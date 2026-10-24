/**
 * 自定义字段映射器（FR-M）
 *
 * - buildMapping：为每个目标字段做智能建议（预设默认映射 → 归一化命中 → 包含相似度）
 * - validateMapping：必填目标字段（order_id / order_date / sales_amount / currency）
 *   未映射时阻断导出（FR-M-03）
 */
import { TARGET_FIELDS, type MappingTable, type Preset } from './types';
import { normalizeHeader } from './fingerprint';

export function suggestSource(
  headers: string[],
  targetKey: string,
  preset?: Preset
): string | null {
  const normMap = new Map<string, string>();
  for (const h of headers) normMap.set(normalizeHeader(h), h);

  // 1. 预设默认映射（按归一化源列名查）
  if (preset) {
    for (const [src, tgt] of Object.entries(preset.defaultMapping)) {
      if (tgt !== targetKey) continue;
      const hit = normMap.get(normalizeHeader(src));
      if (hit) return hit;
    }
  }

  // 2. 目标 key 本身归一化命中（order_id ↔ "Order ID"/"order-id"）
  const tk = normalizeHeader(targetKey);
  if (normMap.has(tk)) return normMap.get(tk)!;

  // 3. 包含关系相似度（"Total Price" ⊃ "total"）
  for (const [n, orig] of normMap) {
    if (n && (n.includes(tk) || tk.includes(n))) return orig;
  }
  return null;
}

export function buildMapping(headers: string[], preset?: Preset): MappingTable {
  return {
    entries: TARGET_FIELDS.map((f) => ({
      target: f.key,
      source: suggestSource(headers, f.key, preset)
    }))
  };
}

export function validateMapping(mapping: MappingTable): { ok: boolean; missingRequired: string[] } {
  const required = new Set(TARGET_FIELDS.filter((f) => f.required).map((f) => f.key));
  const missingRequired = mapping.entries
    .filter((e) => required.has(e.target) && !e.source)
    .map((e) => e.target);
  return { ok: missingRequired.length === 0, missingRequired };
}

/** 目标字段中文名（错误文案用，UI 风格指南 12.2） */
export function targetLabel(key: string): string {
  return TARGET_FIELDS.find((f) => f.key === key)?.label ?? key;
}

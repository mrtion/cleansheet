/**
 * 数据去重规则（FR-C-02）
 *
 * 按 keyField 识别重复行，策略：
 * - first：保留首条；- last：保留末条；- mark：全部保留并标记 __dup_mark。
 * 空 key 永不参与去重（避免把"缺失订单号"的行误并）。
 * 剔除行返回给调用方写入异常表（FR-C-02 验收）。
 */
import type { Row } from '../types';

export type DedupeKeep = 'first' | 'last' | 'mark';

export function applyDedupe(
  rows: Row[],
  keyField: string,
  keep: DedupeKeep
): { rows: Row[]; removed: Row[] } {
  if (keep === 'mark') {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = (r[keyField] ?? '').trim();
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return {
      rows: rows.map((r) => {
        const k = (r[keyField] ?? '').trim();
        return { ...r, __dup_mark: k && (counts.get(k) ?? 0) > 1 ? '重复' : '' };
      }),
      removed: []
    };
  }

  const seen = new Set<string>();
  const kept: Row[] = [];
  const removed: Row[] = [];
  const list = keep === 'last' ? [...rows].reverse() : rows;
  for (const r of list) {
    const k = (r[keyField] ?? '').trim();
    if (k === '' || !seen.has(k)) {
      seen.add(k);
      kept.push(r);
    } else {
      removed.push(r);
    }
  }
  return { rows: keep === 'last' ? kept.reverse() : kept, removed };
}

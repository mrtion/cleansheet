/**
 * 异常检测（FR-A）
 *
 * 四类异常 → { rowIndex, columnKey, type }：
 * - missing：必填项缺失（如订单号为空）
 * - date：非法日期格式
 * - amount：异常金额（单笔绝对值 > 阈值，默认 1,000,000；销售额为负）
 * - dup：重复订单号
 *
 * 退款列（refund）允许为负，不计入"负销售额"异常。
 */
import type { Row, Anomaly, AnomalyType, AnomalySummary } from './types';
import { normalizeDate } from './rules/date-filter';

export interface AnomalyOptions {
  requiredFields: string[];
  dateFields: string[];
  amountFields: string[];
  dupKeyField?: string;
  amountThreshold?: number;
}

export function detectAnomalies(rows: Row[], opts: AnomalyOptions): AnomalySummary {
  const items: Anomaly[] = [];
  const threshold = opts.amountThreshold ?? 1000000;

  rows.forEach((r, i) => {
    for (const f of opts.requiredFields) {
      if (!(r[f] ?? '').trim()) items.push({ rowIndex: i, columnKey: f, type: 'missing' });
    }
    for (const f of opts.dateFields) {
      const v = (r[f] ?? '').trim();
      if (v && !normalizeDate(v)) items.push({ rowIndex: i, columnKey: f, type: 'date' });
    }
    for (const f of opts.amountFields) {
      const v = parseFloat(r[f] ?? '');
      if (Number.isNaN(v)) continue;
      const isRefundCol = /refund/i.test(f);
      if (Math.abs(v) > threshold || (v < 0 && !isRefundCol)) {
        items.push({ rowIndex: i, columnKey: f, type: 'amount' });
      }
    }
  });

  if (opts.dupKeyField) {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = (r[opts.dupKeyField] ?? '').trim();
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    rows.forEach((r, i) => {
      const k = (r[opts.dupKeyField!] ?? '').trim();
      if (k && (counts.get(k) ?? 0) > 1) {
        items.push({ rowIndex: i, columnKey: opts.dupKeyField!, type: 'dup' });
      }
    });
  }

  const counts: Record<AnomalyType, number> = { missing: 0, date: 0, amount: 0, dup: 0 };
  for (const a of items) counts[a.type]++;

  return { counts, items: items.slice(0, 5000) };
}

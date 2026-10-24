/**
 * 日期范围过滤规则（FR-C-03）
 *
 * 统一为 YYYY-MM-DD（覆盖 YYYY/MM/DD、MM/DD/YYYY 等常见写法）；
 * 按起止日期筛选。非法日期不直接丢弃——保留行并由异常检测标注（FR-A-02），
 * 用户可在导出时选择"排除异常行"。
 */
import type { Row } from '../types';

/** 校验年月日合法性（月 1–12，日 1–31），非法返回 null */
function validYMD(y: string, m: string, d: string): string | null {
  const mi = Number(m);
  const di = Number(d);
  if (!Number.isInteger(mi) || !Number.isInteger(di) || mi < 1 || mi > 12 || di < 1 || di > 31) {
    return null;
  }
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** 归一化为 YYYY-MM-DD；非法返回 null */
export function normalizeDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return validYMD(m[1], m[2], m[3]);
  m = s.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})/);
  if (m) return validYMD(m[1], m[2], m[3]);
  m = s.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
  if (m) return validYMD(m[3], m[1], m[2]);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export function applyDateFilter(
  rows: Row[],
  field: string,
  from?: string,
  to?: string
): { rows: Row[]; filteredOut: Row[] } {
  const kept: Row[] = [];
  const filteredOut: Row[] = [];
  for (const r of rows) {
    const raw = r[field] ?? '';
    const norm = normalizeDate(raw);
    // 非法日期：保留原值，由异常检测标注，不在此处丢弃
    const next = { ...r, [field]: norm ?? raw };
    if (norm && ((from && norm < from) || (to && norm > to))) {
      filteredOut.push(next);
    } else {
      kept.push(next);
    }
  }
  return { rows: kept, filteredOut };
}

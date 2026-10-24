/**
 * 计算列规则（FR-C-04）
 *
 * 例：净收入 = {sales_amount} - {commission} - {shipping_fee}。
 * 引用未映射字段在保存阶段阻断（validateComputed 返回错误文案）。
 */
import type { Row } from '../types';
import { parseExpression, evalExpression, referencedFields } from '../expression';

/** 保存阶段校验：返回 null 表示通过，否则返回可直接展示的错误文案 */
export function validateComputed(
  name: string,
  expression: string,
  availableFields: string[]
): string | null {
  if (!name.trim()) return '计算列名称不能为空';
  try {
    const refs = referencedFields(expression);
    const missing = refs.filter((f) => !availableFields.includes(f));
    if (missing.length > 0) return `引用了未映射的字段：${missing.join('、')}，请先完成字段映射`;
    parseExpression(expression);
    return null;
  } catch (e) {
    return `表达式有误：${(e as Error).message}`;
  }
}

export function applyComputed(rows: Row[], name: string, expression: string): Row[] {
  const node = parseExpression(expression);
  return rows.map((r) => {
    let v: number;
    try {
      v = evalExpression(node, (f) => parseFloat(r[f] ?? ''));
    } catch {
      v = NaN;
    }
    return { ...r, [name]: Number.isNaN(v) ? '' : String(Math.round(v * 100) / 100) };
  });
}

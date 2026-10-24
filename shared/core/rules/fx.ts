/**
 * 货币换算规则（FR-C-01 / FR-C-06）
 *
 * 固定汇率模式：amount_cny = round(amount × rate, 2)。
 * 输出恒定保留四列：原始金额列（不动）+ 币种列（不动）+ fx_rate + amount_cny，
 * 绝不覆盖原始列（FR-C-01 验收）。
 */
import type { Row, CleanRule } from '../types';

type FxRule = Extract<CleanRule, { type: 'fx' }>;

export function applyFx(rows: Row[], rule: FxRule): Row[] {
  const fallback = rule.mode === 'fixed' ? (rule.fixedRate ?? 1) : 1;
  return rows.map((r) => {
    const amount = parseFloat(r[rule.amountField] ?? '');
    const cur = (r[rule.currencyField] ?? '').trim().toUpperCase();
    const used = rule.rates?.[cur] ?? fallback;
    const cny = Number.isNaN(amount) ? '' : (Math.round(amount * used * 100) / 100).toFixed(2);
    return { ...r, fx_rate: String(used), amount_cny: cny };
  });
}

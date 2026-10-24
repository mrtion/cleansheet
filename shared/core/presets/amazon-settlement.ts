/**
 * Amazon Settlement 预设（PRD 14.2）
 *
 * 签名版本：3。Amazon 结算报告为 amount-type 长表
 * （Principal / Commission / Shipping / Refund 等各占一行），
 * MVP 按行直转（amount → sales_amount）；透视聚合为后续里程碑。
 */
import type { Preset } from '../types';

export const amazonSettlementPreset: Preset = {
  id: 'amazon-settlement',
  displayName: 'Amazon Settlement（结算报告）',
  signatureVersion: 3,
  signature: [
    { col: 'settlement-id', weight: 3, aliases: ['settlement id'] },
    { col: 'order-id', weight: 3, aliases: ['amazon-order-id', 'order id'] },
    { col: 'amount-type', weight: 2, aliases: ['amount type'] },
    { col: 'amount', weight: 2 },
    { col: 'currency', weight: 1 },
    { col: 'settlement-start-date', weight: 1, aliases: ['settlement start date'] },
    { col: 'settlement-end-date', weight: 1, aliases: ['settlement end date'] },
    { col: 'sku', weight: 1 },
    { col: 'quantity', weight: 1 }
  ],
  targetSchema: 'standard-ledger-v1',
  defaultMapping: {
    'settlement-id': 'settlement_id',
    'order-id': 'order_id',
    'settlement-start-date': 'order_date',
    sku: 'sku',
    quantity: 'quantity',
    amount: 'sales_amount',
    currency: 'currency'
  },
  amountThreshold: 1000000
};

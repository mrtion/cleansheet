/**
 * Shopee 预设
 *
 * 基于 Shopee 卖家中心订单 / 对账导出的常见表头。
 */
import type { Preset } from '../types';

export const shopeePreset: Preset = {
  id: 'shopee',
  displayName: 'Shopee（订单对账）',
  signatureVersion: 1,
  signature: [
    { col: 'order-id', weight: 3, aliases: ['order id', 'order id.'] },
    { col: 'order-status', weight: 1, aliases: ['order status'] },
    { col: 'currency', weight: 2 },
    { col: 'order-amount', weight: 2, aliases: ['order amount', 'escrow amount'] },
    { col: 'order-complete-time', weight: 1, aliases: ['order complete time', 'order create time'] }
  ],
  targetSchema: 'standard-ledger-v1',
  defaultMapping: {
    'order-id': 'order_id',
    'order-complete-time': 'order_date',
    'order-amount': 'sales_amount',
    currency: 'currency'
  },
  amountThreshold: 1000000
};

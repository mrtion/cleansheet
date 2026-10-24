/**
 * TikTok Shop Financials 预设
 *
 * 基于 TikTok Shop 结算中心财务对账单的常见表头。
 */
import type { Preset } from '../types';

export const tiktokShopFinancialsPreset: Preset = {
  id: 'tiktok-shop-financials',
  displayName: 'TikTok Shop Financials（财务对账）',
  signatureVersion: 1,
  signature: [
    { col: 'order-id', weight: 3, aliases: ['order id'] },
    { col: 'currency', weight: 2 },
    { col: 'settlement-amount', weight: 2, aliases: ['total settlement amount', 'settlement amount'] },
    { col: 'sku-id', weight: 1, aliases: ['sku id', 'sku'] },
    { col: 'order-create-time', weight: 1, aliases: ['order create time', 'created time'] }
  ],
  targetSchema: 'standard-ledger-v1',
  defaultMapping: {
    'order-id': 'order_id',
    'order-create-time': 'order_date',
    'sku-id': 'sku',
    'settlement-amount': 'sales_amount',
    currency: 'currency'
  },
  amountThreshold: 1000000
};

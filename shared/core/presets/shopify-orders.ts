/**
 * Shopify Orders 预设
 *
 * 基于 Shopify 后台 Orders 导出 CSV 的常见表头。
 */
import type { Preset } from '../types';

export const shopifyOrdersPreset: Preset = {
  id: 'shopify-orders',
  displayName: 'Shopify Orders（订单导出）',
  signatureVersion: 1,
  signature: [
    { col: 'name', weight: 3, aliases: ['order name', 'order-name'] },
    { col: 'email', weight: 1 },
    { col: 'currency', weight: 2 },
    { col: 'total', weight: 2, aliases: ['total price', 'total-price'] },
    { col: 'lineitem-sku', weight: 2, aliases: ['lineitem sku'] },
    { col: 'lineitem-quantity', weight: 1, aliases: ['lineitem quantity'] },
    { col: 'paid-at', weight: 1, aliases: ['paid at', 'created at'] }
  ],
  targetSchema: 'standard-ledger-v1',
  defaultMapping: {
    name: 'order_id',
    'paid-at': 'order_date',
    'lineitem-sku': 'sku',
    'lineitem-quantity': 'quantity',
    total: 'sales_amount',
    currency: 'currency'
  },
  amountThreshold: 1000000
};

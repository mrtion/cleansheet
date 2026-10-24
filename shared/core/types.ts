/**
 * CleanSheet 转换引擎 — 共享类型定义
 *
 * 纯 TS，无 DOM / Node 依赖；浏览器 Web Worker 与 Cloudflare Workers
 * 服务端同构复用同一份实现（技术设计文档 G3）。
 */

/** 数据行：key 为列名，value 为原始字符串 */
export type Row = Record<string, string>;

export interface EncodingResult {
  encoding: string; // 'utf-8' | 'utf-16le' | 'utf-16be' | 'gbk' | 'windows-1252'
  confidence: number; // 0–1
}

export interface FileSummary {
  fileName: string;
  encoding: string;
  delimiter: string;
  rows: number;
  cols: number;
  headers: string[];
}

export interface PresetSignatureCol {
  col: string;
  weight: number;
  aliases?: string[];
}

export interface Preset {
  id: string;
  displayName: string;
  signatureVersion: number;
  signature: PresetSignatureCol[];
  targetSchema: string;
  /** 归一化源列名 → 目标字段 key 的默认映射（空字符串表示不映射） */
  defaultMapping: Record<string, string>;
  /** 金额异常阈值（单笔绝对值），默认 1,000,000 */
  amountThreshold?: number;
}

export interface PresetMatch {
  presetId: string;
  displayName: string;
  /** 0–1，加权命中率 */
  confidence: number;
}

export interface TargetField {
  key: string;
  label: string;
  required: boolean;
}

export interface MappingEntry {
  target: string;
  source: string | null;
}

export interface MappingTable {
  entries: MappingEntry[];
}

export type AnomalyType = 'missing' | 'date' | 'amount' | 'dup';

export interface Anomaly {
  rowIndex: number;
  columnKey: string;
  type: AnomalyType;
}

export interface AnomalySummary {
  counts: Record<AnomalyType, number>;
  /** 明细上限 5,000 条，超出仅计数（技术设计 5.6） */
  items: Anomaly[];
}

export interface TransformStats {
  total: number;
  valid: number;
  anomaly: number;
  dedupeRemoved: number;
  currencies: string[];
}

export type CleanRule =
  | {
      type: 'fx';
      amountField: string;
      currencyField: string;
      mode: 'fixed' | 'monthly-avg';
      fixedRate?: number;
      month?: string;
      rates?: Record<string, number>;
    }
  | { type: 'dedupe'; keyField: string; keep: 'first' | 'last' | 'mark' }
  | { type: 'date-filter'; field: string; from?: string; to?: string }
  | { type: 'computed'; name: string; expression: string };

/**
 * 标准对账 Schema（PRD 14.3 standard-ledger-v1）
 * required=true 的字段未映射时阻断导出（FR-M-03）。
 */
export const TARGET_FIELDS: TargetField[] = [
  { key: 'order_id', label: '订单号', required: true },
  { key: 'order_date', label: '订单日期', required: true },
  { key: 'platform', label: '平台', required: false },
  { key: 'store', label: '店铺', required: false },
  { key: 'sku', label: 'SKU', required: false },
  { key: 'product_name', label: '商品名称', required: false },
  { key: 'quantity', label: '数量', required: false },
  { key: 'sales_amount', label: '销售额（原币种）', required: true },
  { key: 'currency', label: '币种', required: true },
  { key: 'fx_rate', label: '汇率', required: false },
  { key: 'amount_cny', label: '折算人民币', required: false },
  { key: 'commission', label: '佣金', required: false },
  { key: 'shipping_fee', label: '物流费', required: false },
  { key: 'refund', label: '退款', required: false },
  { key: 'net_amount', label: '净额', required: false },
  { key: 'settlement_id', label: '结算单号', required: false }
];

export const ANOMALY_META: Record<AnomalyType, { label: string }> = {
  missing: { label: '必填缺失' },
  date: { label: '非法日期' },
  amount: { label: '金额异常' },
  dup: { label: '重复订单' }
};

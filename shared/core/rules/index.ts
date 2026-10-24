/**
 * 规则链执行器（FR-C-05）
 *
 * 多条规则按配置顺序串行执行，每条为纯函数。
 * 流程：字段映射 → 规则链（fx / dedupe / date-filter / computed）
 *       → 异常检测 →（可选）排除异常行 → 统计。
 */
import type {
  Row,
  MappingTable,
  CleanRule,
  TransformStats,
  AnomalySummary,
  AnomalyType
} from '../types';
import { applyFx } from './fx';
import { applyDedupe } from './dedupe';
import { applyDateFilter } from './date-filter';
import { applyComputed } from './computed';
import { detectAnomalies } from '../anomaly';

export interface PipelineOptions {
  rules: CleanRule[];
  requiredFields: string[];
  dateFields: string[];
  amountFields: string[];
  dupKeyField?: string;
  amountThreshold?: number;
  /** true = 导出前排除异常行（FR-A-06） */
  excludeAnomalies?: boolean;
}

export interface PipelineResult {
  rows: Row[];
  stats: TransformStats;
  anomalies: AnomalySummary;
  dedupeRemoved: Row[];
}

/** 源列 → 目标列：未映射的目标字段填空字符串 */
export function applyMapping(rows: Row[], mapping: MappingTable): Row[] {
  return rows.map((r) => {
    const o: Row = {};
    for (const e of mapping.entries) {
      if (!e.source) continue;
      o[e.target] = r[e.source] ?? '';
    }
    return o;
  });
}

export function runPipeline(input: Row[], mapping: MappingTable, opts: PipelineOptions): PipelineResult {
  let rows = applyMapping(input, mapping);
  let dedupeRemoved: Row[] = [];

  for (const rule of opts.rules) {
    if (rule.type === 'fx') {
      rows = applyFx(rows, rule);
    } else if (rule.type === 'dedupe') {
      const r = applyDedupe(rows, rule.keyField, rule.keep);
      rows = r.rows;
      dedupeRemoved = r.removed;
    } else if (rule.type === 'date-filter') {
      rows = applyDateFilter(rows, rule.field, rule.from, rule.to).rows;
    } else if (rule.type === 'computed') {
      rows = applyComputed(rows, rule.name, rule.expression);
    }
  }

  const anomalies = detectAnomalies(rows, {
    requiredFields: opts.requiredFields,
    dateFields: opts.dateFields,
    amountFields: opts.amountFields,
    dupKeyField: opts.dupKeyField,
    amountThreshold: opts.amountThreshold
  });

  let finalRows = rows;
  if (opts.excludeAnomalies) {
    const bad = new Set(anomalies.items.map((a) => a.rowIndex));
    finalRows = rows.filter((_, i) => !bad.has(i));
  }

  const badRows = new Set(anomalies.items.map((a) => a.rowIndex));
  const currencies = [...new Set(finalRows.map((r) => (r.currency ?? '').trim().toUpperCase()).filter(Boolean))];
  const stats: TransformStats = {
    total: finalRows.length,
    valid: finalRows.length - [...badRows].filter((i) => i < finalRows.length).length,
    anomaly: badRows.size,
    dedupeRemoved: dedupeRemoved.length,
    currencies
  };

  return { rows: finalRows, stats, anomalies, dedupeRemoved };
}

export type { AnomalyType };

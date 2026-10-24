/**
 * PapaParse 薄封装（CSV 解析）。
 *
 * 运行位置：Web Worker 内（parse.worker.ts）。免费小工具页（csv-encoding-fix）
 * 在主线程直接调用亦可——PapaParse 无 DOM 依赖。
 */
import Papa from 'papaparse';

export interface CsvParseResult {
  /** 原始二维数据（含表头行候选），供 header.ts 做表头识别 */
  dataRows: string[][];
  errors: string[];
}

export function parseCsvText(text: string, delimiter?: string): CsvParseResult {
  const res = Papa.parse<string[]>(text, {
    delimiter: delimiter || undefined,
    skipEmptyLines: 'greedy'
  });
  const errors = (res.errors ?? []).slice(0, 5).map((e) => e.message);
  const dataRows = (res.data as string[][]).map((r) => r.map((c) => (c ?? '').toString()));
  return { dataRows, errors };
}

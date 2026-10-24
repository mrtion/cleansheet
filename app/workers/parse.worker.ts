/**
 * parse.worker.ts — 浏览器 Web Worker：运行 shared/core 同构引擎
 *
 * 简化协议（主线程 ↔ Worker）：
 * - in  {id, type:'parse', file:ArrayBuffer, fileName}
 *   out {id, type:'parsed', summary, preview:Row[≤200], match:PresetMatch|null}
 * - in  {id, type:'transform', mapping, rules, options}
 *   out {id, type:'transformed', stats, anomalies, preview:Row[≤200]}
 * - in  {id, type:'query', offset, limit}
 *   out {id, type:'rows', rows, total}
 * - in  {id, type:'export', format:'xlsx'|'csv', sheetMode:boolean, fileName}
 *   out {id, type:'export-ready', blob:Blob, fileName}
 * - 进度：{id, type:'progress', stage, percent}
 * - 错误：{id, type:'error', code, message}（文案可操作，UI 风格指南 12.2）
 *
 * 全量数据留在 Worker 内，主线程只拿摘要与预览切片。
 */
/// <reference lib="webworker" />

import {
  detectEncoding,
  decodeBytes,
  detectDelimiter,
  parseCsvText,
  readWorkbook,
  detectHeaderRow,
  matchPreset,
  getPreset,
  validateMapping,
  runPipeline,
  buildXlsx,
  buildCsv,
  type Row,
  type FileSummary,
  type PresetMatch,
  type MappingTable,
  type CleanRule,
  type TransformStats,
  type AnomalySummary
} from '../../shared/core/index';

interface Dataset {
  fileName: string;
  storeName: string;
  headers: string[];
  rows: Row[];
  summary: FileSummary;
}

interface Transformed {
  rows: Row[];
  columns: string[];
  stats: TransformStats;
  anomalies: AnomalySummary;
  dedupeRemoved: Row[];
}

let datasets: Dataset[] = [];
let transformed: Transformed | null = null;
let lastMatch: PresetMatch | null = null;

type InMsg =
  | { id: string; type: 'parse'; file: ArrayBuffer; fileName: string }
  | {
      id: string;
      type: 'transform';
      mapping: MappingTable;
      rules: CleanRule[];
      options: { excludeAnomalies: boolean; presetId: string | null };
    }
  | { id: string; type: 'query'; offset: number; limit: number }
  | { id: string; type: 'export'; format: 'xlsx' | 'csv'; sheetMode: boolean; fileName: string }
  | { id: string; type: 'reset' };

function post(msg: unknown) {
  (self as unknown as { postMessage(m: unknown): void }).postMessage(msg);
}

function progress(id: string, stage: string, percent: number) {
  post({ id, type: 'progress', stage, percent });
}

function fail(id: string, code: string, message: string) {
  post({ id, type: 'error', code, message });
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

async function handleParse(msg: Extract<InMsg, { type: 'parse' }>) {
  const { id, file, fileName } = msg;
  try {
    progress(id, '读取文件', 5);
    const bytes = new Uint8Array(file);

    progress(id, '识别编码', 20);
    const { encoding } = detectEncoding(bytes);
    const text = decodeBytes(bytes, encoding);

    let dataRows: string[][];
    let delimiter = ',';
    const ext = extOf(fileName);
    if (ext === 'xlsx' || ext === 'xls') {
      progress(id, '解析工作表', 45);
      dataRows = readWorkbook(file).dataRows;
      delimiter = '(工作表)';
    } else {
      progress(id, '识别分隔符', 35);
      delimiter = detectDelimiter(text).delimiter;
      progress(id, '解析行', 50);
      dataRows = parseCsvText(text, delimiter).dataRows;
    }

    progress(id, '识别表头', 70);
    const { headers, headerRowIndex } = detectHeaderRow(dataRows);
    const bodyRows = dataRows.slice(headerRowIndex + 1);
    const rows: Row[] = bodyRows
      .filter((r) => r.some((c) => c.trim() !== ''))
      .map((r) => {
        const o: Row = {};
        headers.forEach((h, i) => {
          o[h || `列${i + 1}`] = (r[i] ?? '').trim();
        });
        return o;
      });

    if (rows.length === 0) {
      fail(id, 'EMPTY_FILE', '文件中没有可解析的数据行，请确认文件内容后重试');
      return;
    }

    const summary: FileSummary = {
      fileName,
      encoding,
      delimiter,
      rows: rows.length,
      cols: headers.length,
      headers
    };
    const match = matchPreset(headers);
    if (match) lastMatch = match;

    datasets.push({
      fileName,
      storeName: fileName.replace(/\.[^.]+$/, ''),
      headers,
      rows,
      summary
    });

    progress(id, '完成', 100);
    post({ id, type: 'parsed', summary, preview: rows.slice(0, 200), match });
  } catch (e) {
    fail(
      id,
      'PARSE_FAILED',
      `解析失败（${(e as Error).message}）。可尝试手动选择编码后重试，或确认文件未损坏`
    );
  }
}

async function handleTransform(msg: Extract<InMsg, { type: 'transform' }>) {
  const { id, mapping, rules, options } = msg;
  try {
    if (datasets.length === 0) {
      fail(id, 'NO_DATA', '没有可转换的数据，请先上传并解析文件');
      return;
    }
    const v = validateMapping(mapping);
    if (!v.ok) {
      fail(id, 'MAPPING_INCOMPLETE', `还有必填字段未映射：${v.missingRequired.join('、')}，请先完成映射`);
      return;
    }

    progress(id, '合并文件', 15);
    // 多文件合并：列取并集，附加 source_file（FR-T-06）
    const headerOrder: string[] = [];
    const seenH = new Set<string>();
    for (const d of datasets) {
      for (const h of d.headers) {
        if (!seenH.has(h)) {
          seenH.add(h);
          headerOrder.push(h);
        }
      }
    }
    const merged: Row[] = [];
    for (const d of datasets) {
      for (const r of d.rows) {
        const o: Row = { source_file: d.fileName };
        for (const h of headerOrder) o[h] = r[h] ?? '';
        merged.push(o);
      }
    }

    progress(id, '执行清洗规则', 45);
    const preset = options.presetId ? getPreset(options.presetId) : undefined;
    const result = runPipeline(merged, mapping, {
      rules,
      requiredFields: ['order_id', 'order_date', 'sales_amount', 'currency'],
      dateFields: ['order_date'],
      amountFields: ['sales_amount', 'amount_cny', 'net_amount', 'commission', 'shipping_fee', 'refund'],
      dupKeyField: 'order_id',
      amountThreshold: preset?.amountThreshold ?? 1000000,
      excludeAnomalies: options.excludeAnomalies
    });

    // 预设归属列：未映射时自动填充（FR-T-06 来源标识）
    const platformMapped = mapping.entries.some((e) => e.target === 'platform' && e.source);
    const storeMapped = mapping.entries.some((e) => e.target === 'store' && e.source);
    if (!platformMapped || !storeMapped) {
      result.rows.forEach((r, i) => {
        const ds = datasets[Math.min(i, datasets.length - 1)];
        if (!platformMapped && !r.platform) r.platform = preset?.displayName ?? '';
        if (!storeMapped && !r.store) r.store = ds?.storeName ?? '';
      });
    }

    const columns = [
      ...mapping.entries.filter((e) => e.source).map((e) => e.target),
      ...result.rows.reduce<string[]>((acc, r) => {
        for (const k of Object.keys(r)) if (!acc.includes(k)) acc.push(k);
        return acc;
      }, [])
    ].filter((c, i, a) => a.indexOf(c) === i);

    transformed = {
      rows: result.rows,
      columns,
      stats: result.stats,
      anomalies: result.anomalies,
      dedupeRemoved: result.dedupeRemoved
    };

    progress(id, '完成', 100);
    post({
      id,
      type: 'transformed',
      stats: result.stats,
      anomalies: result.anomalies,
      preview: result.rows.slice(0, 200)
    });
  } catch (e) {
    fail(id, 'TRANSFORM_FAILED', `转换失败（${(e as Error).message}）。请检查映射与规则配置后重试`);
  }
}

async function handleQuery(msg: Extract<InMsg, { type: 'query' }>) {
  const { id, offset, limit } = msg;
  if (!transformed) {
    fail(id, 'NO_DATA', '还没有转换结果，请先完成映射与清洗');
    return;
  }
  post({
    id,
    type: 'rows',
    rows: transformed.rows.slice(offset, offset + limit),
    total: transformed.rows.length
  });
}

async function handleExport(msg: Extract<InMsg, { type: 'export' }>) {
  const { id, format, sheetMode, fileName } = msg;
  try {
    if (!transformed) {
      fail(id, 'NO_DATA', '还没有可导出的结果，请先完成映射与清洗');
      return;
    }
    progress(id, '生成文件', 30);
    const { rows, columns, stats, anomalies, dedupeRemoved } = transformed;
    let blob: Blob;
    let name = fileName;
    if (format === 'xlsx') {
      const detailCols = columns.filter((c) => !c.startsWith('__'));
      const sheets = [{ name: '明细', headers: detailCols, rows }];
      if (sheetMode) {
        sheets.push({
          name: '汇总',
          headers: ['指标', '数值'],
          rows: [
            { 指标: '总行数', 数值: String(stats.total) },
            { 指标: '有效行数', 数值: String(stats.valid) },
            { 指标: '异常行数', 数值: String(stats.anomaly) },
            { 指标: '去重剔除', 数值: String(stats.dedupeRemoved) },
            { 指标: '币种', 数值: stats.currencies.join('、') }
          ]
        });
        const anomalyRows: Row[] = anomalies.items.map((a) => ({
          行号: String(a.rowIndex + 1),
          异常类型: a.type,
          列: a.columnKey,
          值: rows[a.rowIndex]?.[a.columnKey] ?? ''
        }));
        for (const r of dedupeRemoved) {
          anomalyRows.push({ 行号: '—', 异常类型: 'dup-removed', 列: 'order_id', 值: r.order_id ?? '' });
        }
        sheets.push({ name: '异常', headers: ['行号', '异常类型', '列', '值'], rows: anomalyRows });
      }
      blob = buildXlsx(sheets);
      if (!name.endsWith('.xlsx')) name += '.xlsx';
    } else {
      const detailCols = columns.filter((c) => !c.startsWith('__'));
      blob = buildCsv(detailCols, rows);
      if (!name.endsWith('.csv')) name += '.csv';
    }
    progress(id, '完成', 100);
    post({ id, type: 'export-ready', blob, fileName: name });
  } catch (e) {
    fail(
      id,
      'EXPORT_FAILED',
      `导出中断（${(e as Error).message}）。你的数据仍在本地，点击重试即可继续`
    );
  }
}

self.onmessage = (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  if (msg.type === 'parse') void handleParse(msg);
  else if (msg.type === 'transform') void handleTransform(msg);
  else if (msg.type === 'query') void handleQuery(msg);
  else if (msg.type === 'export') void handleExport(msg);
  else if (msg.type === 'reset') {
    datasets = [];
    transformed = null;
    lastMatch = null;
    post({ id: msg.id, type: 'reset-done' });
  }
};

export { lastMatch };

/**
 * WorkerClient — 主线程侧的 Worker 会话封装
 *
 * 优先使用 Web Worker；构造失败时降级为"主线程直跑"（同一 shared/core 实现，
 * 保证行为一致）。调用方只面对统一的 Promise 接口。
 */
import type {
  Row,
  FileSummary,
  PresetMatch,
  MappingTable,
  CleanRule,
  TransformStats,
  AnomalySummary
} from '../../shared/core/index';

export interface ParsedResult {
  summary: FileSummary;
  preview: Row[];
  match: PresetMatch | null;
}

export interface TransformedResult {
  stats: TransformStats;
  anomalies: AnomalySummary;
  preview: Row[];
}

export interface WorkerClient {
  parse(
    file: ArrayBuffer,
    fileName: string,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<ParsedResult>;
  transform(
    mapping: MappingTable,
    rules: CleanRule[],
    options: { excludeAnomalies: boolean; presetId: string | null },
    onProgress?: (stage: string, percent: number) => void
  ): Promise<TransformedResult>;
  query(offset: number, limit: number): Promise<{ rows: Row[]; total: number }>;
  exportFile(format: 'xlsx' | 'csv', sheetMode: boolean, fileName: string): Promise<{ blob: Blob; fileName: string }>;
  reset(): Promise<void>;
  terminate(): void;
}

let seq = 0;
const nextId = () => `req_${Date.now()}_${seq++}`;

type Pending = {
  resolve: (v: never) => void;
  reject: (e: Error) => void;
  onProgress?: (stage: string, percent: number) => void;
};

/** 真 Worker 实现 */
class RealWorkerClient implements WorkerClient {
  private worker: Worker;
  private pending = new Map<string, Pending>();

  constructor(worker: Worker) {
    this.worker = worker;
    worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data as { id: string; type: string; [k: string]: unknown };
      const p = this.pending.get(msg.id);
      if (!p) return;
      if (msg.type === 'progress') {
        p.onProgress?.(msg.stage as string, msg.percent as number);
        return;
      }
      this.pending.delete(msg.id);
      if (msg.type === 'error') {
        p.reject(new Error(msg.message as string));
        return;
      }
      p.resolve(msg as never);
    };
    worker.onerror = (e) => {
      for (const [, p] of this.pending) p.reject(new Error(`Worker 出错：${e.message}`));
      this.pending.clear();
    };
  }

  private call<T>(payload: Record<string, unknown>, onProgress?: Pending['onProgress']): Promise<T> {
    const id = nextId();
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: never) => void, reject, onProgress });
      // ArrayBuffer 零拷贝转移；其余字段先转纯对象——
      // Vue 响应式 Proxy 无法被 structuredClone，直接 postMessage 会抛
      // "Failed to execute 'postMessage' on 'Worker': #<Object> could not be cloned"
      const transfer: Transferable[] = [];
      const plain: Record<string, unknown> = { id };
      for (const [k, v] of Object.entries(payload)) {
        if (v instanceof ArrayBuffer) {
          plain[k] = v;
          transfer.push(v);
        } else {
          plain[k] = JSON.parse(JSON.stringify(v));
        }
      }
      this.worker.postMessage(plain, transfer);
    });
  }

  parse(file: ArrayBuffer, fileName: string, onProgress?: (s: string, p: number) => void) {
    return this.call<ParsedResult>({ type: 'parse', file, fileName }, onProgress);
  }
  transform(
    mapping: MappingTable,
    rules: CleanRule[],
    options: { excludeAnomalies: boolean; presetId: string | null },
    onProgress?: (s: string, p: number) => void
  ) {
    return this.call<TransformedResult>({ type: 'transform', mapping, rules, options }, onProgress);
  }
  query(offset: number, limit: number) {
    return this.call<{ rows: Row[]; total: number }>({ type: 'query', offset, limit });
  }
  exportFile(format: 'xlsx' | 'csv', sheetMode: boolean, fileName: string) {
    return this.call<{ blob: Blob; fileName: string }>({ type: 'export', format, sheetMode, fileName });
  }
  reset() {
    return this.call<void>({ type: 'reset' }).catch(() => undefined);
  }
  terminate() {
    this.pending.clear();
    this.worker.terminate();
  }
}

/** 降级：主线程直跑 shared/core（Worker 构造失败时） */
class MainThreadClient implements WorkerClient {
  private core: typeof import('../../shared/core/index') | null = null;
  private datasets: { fileName: string; storeName: string; headers: string[]; rows: Row[] }[] = [];
  private transformed: { rows: Row[]; columns: string[]; stats: TransformStats; anomalies: AnomalySummary; dedupeRemoved: Row[] } | null = null;
  private lastMatch: PresetMatch | null = null;

  private async getCore() {
    if (!this.core) this.core = await import('../../shared/core/index');
    return this.core;
  }

  async parse(file: ArrayBuffer, fileName: string, onProgress?: (s: string, p: number) => void) {
    const c = await this.getCore();
    onProgress?.('识别编码', 20);
    const bytes = new Uint8Array(file);
    const { encoding } = c.detectEncoding(bytes);
    const text = c.decodeBytes(bytes, encoding);
    onProgress?.('解析行', 60);
    let dataRows: string[][];
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') dataRows = c.readWorkbook(file).dataRows;
    else dataRows = c.parseCsvText(text, c.detectDelimiter(text).delimiter).dataRows;
    const { headers, headerRowIndex } = c.detectHeaderRow(dataRows);
    const rows: Row[] = dataRows
      .slice(headerRowIndex + 1)
      .filter((r) => r.some((x) => x.trim() !== ''))
      .map((r) => {
        const o: Row = {};
        headers.forEach((h, i) => { o[h || `列${i + 1}`] = (r[i] ?? '').trim(); });
        return o;
      });
    if (!rows.length) throw new Error('文件中没有可解析的数据行，请确认文件内容后重试');
    const summary: FileSummary = {
      fileName, encoding,
      delimiter: ext === 'xlsx' || ext === 'xls' ? '(工作表)' : c.detectDelimiter(text).delimiter,
      rows: rows.length, cols: headers.length, headers
    };
    const match = c.matchPreset(headers);
    if (match) this.lastMatch = match;
    this.datasets.push({ fileName, storeName: fileName.replace(/\.[^.]+$/, ''), headers, rows });
    onProgress?.('完成', 100);
    return { summary, preview: rows.slice(0, 200), match };
  }

  async transform(
    mapping: MappingTable,
    rules: CleanRule[],
    options: { excludeAnomalies: boolean; presetId: string | null },
    onProgress?: (s: string, p: number) => void
  ) {
    const c = await this.getCore();
    const v = c.validateMapping(mapping);
    if (!v.ok) throw new Error(`还有必填字段未映射：${v.missingRequired.join('、')}，请先完成映射`);
    onProgress?.('合并文件', 20);
    const headerOrder: string[] = [];
    const seen = new Set<string>();
    for (const d of this.datasets) for (const h of d.headers) if (!seen.has(h)) { seen.add(h); headerOrder.push(h); }
    const merged: Row[] = [];
    for (const d of this.datasets) for (const r of d.rows) {
      const o: Row = { source_file: d.fileName };
      for (const h of headerOrder) o[h] = r[h] ?? '';
      merged.push(o);
    }
    onProgress?.('执行清洗规则', 60);
    const preset = options.presetId ? c.getPreset(options.presetId) : undefined;
    const result = c.runPipeline(merged, mapping, {
      rules,
      requiredFields: ['order_id', 'order_date', 'sales_amount', 'currency'],
      dateFields: ['order_date'],
      amountFields: ['sales_amount', 'amount_cny', 'net_amount', 'commission', 'shipping_fee', 'refund'],
      dupKeyField: 'order_id',
      amountThreshold: preset?.amountThreshold ?? 1000000,
      excludeAnomalies: options.excludeAnomalies
    });
    const columns = [...mapping.entries.map((e) => e.target)];
    for (const r of result.rows) for (const k of Object.keys(r)) if (!columns.includes(k)) columns.push(k);
    this.transformed = { rows: result.rows, columns, stats: result.stats, anomalies: result.anomalies, dedupeRemoved: result.dedupeRemoved };
    onProgress?.('完成', 100);
    return { stats: result.stats, anomalies: result.anomalies, preview: result.rows.slice(0, 200) };
  }

  async query(offset: number, limit: number) {
    if (!this.transformed) throw new Error('还没有转换结果');
    return { rows: this.transformed.rows.slice(offset, offset + limit), total: this.transformed.rows.length };
  }

  async exportFile(format: 'xlsx' | 'csv', sheetMode: boolean, fileName: string) {
    const c = await this.getCore();
    if (!this.transformed) throw new Error('还没有可导出的结果');
    const { rows, columns, stats, anomalies, dedupeRemoved } = this.transformed;
    const detailCols = columns.filter((x) => !x.startsWith('__'));
    let blob: Blob;
    let name = fileName;
    if (format === 'xlsx') {
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
          行号: String(a.rowIndex + 1), 异常类型: a.type, 列: a.columnKey, 值: rows[a.rowIndex]?.[a.columnKey] ?? ''
        }));
        for (const r of dedupeRemoved) anomalyRows.push({ 行号: '—', 异常类型: 'dup-removed', 列: 'order_id', 值: r.order_id ?? '' });
        sheets.push({ name: '异常', headers: ['行号', '异常类型', '列', '值'], rows: anomalyRows });
      }
      blob = c.buildXlsx(sheets);
      if (!name.endsWith('.xlsx')) name += '.xlsx';
    } else {
      blob = c.buildCsv(detailCols, rows);
      if (!name.endsWith('.csv')) name += '.csv';
    }
    return { blob, fileName: name };
  }

  async reset() {
    this.datasets = [];
    this.transformed = null;
    this.lastMatch = null;
  }

  terminate() { /* 主线程模式无需清理 */ }
}

/** 工厂：优先 Worker，失败降级主线程 */
export async function createWorkerClient(): Promise<WorkerClient> {
  try {
    const worker = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' });
    return new RealWorkerClient(worker);
  } catch {
    return new MainThreadClient();
  }
}

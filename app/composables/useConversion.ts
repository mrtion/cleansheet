/**
 * useConversion — 3 步向导状态机 + Worker 会话管理
 *
 * stages: idle → parsing → mapping → preview → exporting → done → error
 * wizard steps: ①上传 ②映射与预览 ③导出
 *
 * 数据流：全量数据留在 Worker，主线程只持摘要与预览切片（技术设计 3.3）。
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
import { createWorkerClient, type WorkerClient } from '../workers/workerClient';
import { stamp } from '../utils/format';

export type Stage = 'idle' | 'parsing' | 'mapping' | 'preview' | 'exporting' | 'done' | 'error';
export type WizardStep = 1 | 2 | 3;
export type PaywallTrigger = 'quota' | 'rows' | 'template' | 'fx' | null;

export interface FileItem {
  id: string;
  name: string;
  size: number;
  status: 'queued' | 'parsing' | 'ready' | 'error';
  progress: number;
  progressStage: string;
  summary: FileSummary | null;
  /** 源文件前若干行的原始数据（用于映射示例值实时预览） */
  sampleRows: Row[];
  error: string | null;
  buffer: ArrayBuffer | null;
}

export interface RulesConfig {
  fxEnabled: boolean;
  fxMode: 'fixed' | 'monthly-avg';
  fixedRate: number;
  fxMonth: string;
  fxRates: Record<string, number>;
  dedupeEnabled: boolean;
  dedupeKeep: 'first' | 'last' | 'mark';
  dateFilterEnabled: boolean;
  dateFrom: string;
  dateTo: string;
  computed: { name: string; expression: string }[];
  excludeAnomalies: boolean;
}

export const ACCEPTED_EXTS = ['.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB 硬上限（客户端通道）

function defaultRulesConfig(): RulesConfig {
  const d = new Date();
  return {
    fxEnabled: false,
    fxMode: 'fixed',
    fixedRate: 7.16,
    fxMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    fxRates: {},
    dedupeEnabled: true,
    dedupeKeep: 'first',
    dateFilterEnabled: false,
    dateFrom: '',
    dateTo: '',
    computed: [],
    excludeAnomalies: false
  };
}

let clientPromise: Promise<WorkerClient> | null = null;
function getClient(): Promise<WorkerClient> {
  if (!clientPromise) clientPromise = createWorkerClient();
  return clientPromise;
}

/** 导出指纹：文件名 + 大小 + 映射 + 规则 → sha256 hex（服务端幂等键） */
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useConversion() {
  const { t } = useI18n();
  const toast = useToast();
  const stage = useState<Stage>('conv-stage', () => 'idle');
  const step = useState<WizardStep>('conv-step', () => 1);
  const files = useState<FileItem[]>('conv-files', () => []);
  const match = useState<PresetMatch | null>('conv-match', () => null);
  const mapping = useState<MappingTable | null>('conv-mapping', () => null);
  const rulesConfig = useState<RulesConfig>('conv-rules', defaultRulesConfig);
  const previewRows = useState<Row[]>('conv-preview', () => []);
  const allRows = useState<Row[]>('conv-allrows', () => []);
  const allTotal = useState<number>('conv-alltotal', () => 0);
  const stats = useState<TransformStats | null>('conv-stats', () => null);
  const anomalies = useState<AnomalySummary | null>('conv-anomalies', () => null);
  const errorMsg = useState<string>('conv-error', () => '');
  const paywall = useState<PaywallTrigger>('conv-paywall', () => null);
  const activePresetId = useState<string | null>('conv-preset-id', () => null);
  const templateName = useState<string>('conv-tpl-name', () => '');

  const quota = useQuota();

  function setError(msg: string) {
    errorMsg.value = msg;
    stage.value = 'error';
  }

  /** 目标字段标签（i18n 版，未知 key 回退为 key 本身） */
  function targetLabelT(key: string): string {
    const path = `mapping.target.${key}`;
    const label = t(path);
    return label === path ? key : label;
  }

  function reset() {
    stage.value = 'idle';
    step.value = 1;
    files.value = [];
    match.value = null;
    mapping.value = null;
    rulesConfig.value = defaultRulesConfig();
    previewRows.value = [];
    allRows.value = [];
    allTotal.value = 0;
    stats.value = null;
    anomalies.value = null;
    errorMsg.value = '';
    paywall.value = null;
    activePresetId.value = null;
    templateName.value = '';
    getClient().then((c) => c.reset()).catch(() => undefined);
  }

  function validExt(name: string): boolean {
    const lower = name.toLowerCase();
    return ACCEPTED_EXTS.some((e) => lower.endsWith(e));
  }

  async function addFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    for (const f of arr) {
      if (!validExt(f.name)) {
        toast.add({
          title: t('app.toast.unsupportedFormat'),
          description: t('app.toast.unsupportedFormatDesc', { name: f.name }),
          color: 'warning'
        });
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.add({
          title: t('app.toast.fileTooLarge'),
          description: t('app.toast.fileTooLargeDesc', { name: f.name }),
          color: 'error'
        });
        continue;
      }
      const item: FileItem = {
        id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        status: 'queued',
        progress: 0,
        progressStage: t('upload.stage.queued'),
        summary: null,
        sampleRows: [],
        error: null,
        buffer: null
      };
      try {
        item.buffer = await f.arrayBuffer();
      } catch {
        item.status = 'error';
        item.error = t('app.file.readFail');
      }
      files.value = [...files.value, item];
    }
    await parseAll();
  }

  async function parseAll() {
    const pending = files.value.filter((f) => f.status === 'queued' && f.buffer);
    if (pending.length === 0) return;
    stage.value = 'parsing';
    const client = await getClient();
    // 行数上限以服务端配额为准（/api/me → rowsPerFile，Free 2000）
    const rowsLimit = quota.rowsLimit.value;

    for (const item of pending) {
      item.status = 'parsing';
      try {
        // ArrayBuffer 转移给 Worker 后不可复用，先复制
        const buf = item.buffer!.slice(0);
        const res = await client.parse(buf, item.name, (s, p) => {
          item.progressStage = s;
          item.progress = p;
        });
        if (res.summary.rows > rowsLimit) {
          item.status = 'error';
          item.error = t('app.file.rowsExceeded', {
            rows: res.summary.rows.toLocaleString('en-US'),
            limit: rowsLimit.toLocaleString('en-US')
          });
          paywall.value = 'rows';
          continue;
        }
        item.summary = res.summary;
        item.sampleRows = res.preview ?? [];
        item.status = 'ready';
        item.progress = 100;
        if (res.match && (!match.value || res.match.confidence > match.value.confidence)) {
          match.value = res.match;
          activePresetId.value = res.match.presetId;
        }
      } catch (e) {
        item.status = 'error';
        item.error = (e as Error).message || t('app.file.parseFail');
      }
    }

    const ready = files.value.filter((f) => f.status === 'ready');
    if (ready.length > 0) {
      // 构建初始映射（智能建议预填）
      const { buildMapping } = await import('../../shared/core/mapping');
      const { getPreset } = await import('../../shared/core/fingerprint');
      const headers = [...new Set(ready.flatMap((f) => f.summary?.headers ?? []))];
      const preset = activePresetId.value ? getPreset(activePresetId.value) : undefined;
      mapping.value = buildMapping(headers, preset);
      stage.value = 'mapping';
    } else if (files.value.length > 0 && stage.value === 'parsing') {
      setError(t('app.file.allParseFail'));
    }
  }

  function removeFile(id: string) {
    files.value = files.value.filter((f) => f.id !== id);
    if (files.value.length === 0) {
      stage.value = 'idle';
      match.value = null;
      mapping.value = null;
    }
  }

  function clearAll() {
    reset();
  }

  async function changePreset(presetId: string | null) {
    activePresetId.value = presetId;
    const { buildMapping } = await import('../../shared/core/mapping');
    const { getPreset } = await import('../../shared/core/fingerprint');
    const headers = [...new Set(files.value.flatMap((f) => f.summary?.headers ?? []))];
    const preset = presetId ? getPreset(presetId) : undefined;
    if (preset) match.value = { presetId: preset.id, displayName: preset.displayName, confidence: 1 };
    else match.value = null;
    mapping.value = buildMapping(headers, preset);
  }

  function buildRules(): CleanRule[] {
    const cfg = rulesConfig.value;
    const rules: CleanRule[] = [];
    if (cfg.fxEnabled) {
      rules.push({
        type: 'fx',
        amountField: 'sales_amount',
        currencyField: 'currency',
        mode: cfg.fxMode,
        fixedRate: cfg.fxMode === 'fixed' ? cfg.fixedRate : undefined,
        month: cfg.fxMode === 'monthly-avg' ? cfg.fxMonth : undefined,
        rates: cfg.fxMode === 'monthly-avg' ? cfg.fxRates : undefined
      });
    }
    if (cfg.dedupeEnabled) {
      rules.push({ type: 'dedupe', keyField: 'order_id', keep: cfg.dedupeKeep });
    }
    if (cfg.dateFilterEnabled && (cfg.dateFrom || cfg.dateTo)) {
      rules.push({ type: 'date-filter', field: 'order_date', from: cfg.dateFrom || undefined, to: cfg.dateTo || undefined });
    }
    for (const c of cfg.computed) {
      if (c.name.trim() && c.expression.trim()) {
        rules.push({ type: 'computed', name: c.name.trim(), expression: c.expression.trim() });
      }
    }
    return rules;
  }

  async function runTransform() {
    if (!mapping.value) return;
    const { validateMapping } = await import('../../shared/core/mapping');
    const v = validateMapping(mapping.value);
    if (!v.ok) {
      const names = v.missingRequired.map(targetLabelT).join(t('mapping.separator'));
      toast.add({
        title: t('app.toast.mappingIncomplete'),
        description: t('app.toast.mappingIncompleteDesc', { n: v.missingRequired.length, names }),
        color: 'error'
      });
      return;
    }
    stage.value = 'preview';
    errorMsg.value = '';
    try {
      const client = await getClient();
      const res = await client.transform(
        mapping.value,
        buildRules(),
        { excludeAnomalies: rulesConfig.value.excludeAnomalies, presetId: activePresetId.value }
      );
      stats.value = res.stats;
      anomalies.value = res.anomalies;
      previewRows.value = res.preview;
      // 预览全量（免费版 ≤2000 行，主线程持有无压力；服务端通道为后续里程碑）
      const q = await client.query(0, res.stats.total);
      allRows.value = q.rows;
      allTotal.value = q.total;
      if (res.anomalies.items.length > 0) {
        toast.add({
          title: t('app.toast.anomaliesFound'),
          description: t('app.toast.anomaliesFoundDesc', {
            n: Object.values(res.anomalies.counts).reduce((a, b) => a + b, 0).toLocaleString('en-US')
          }),
          color: 'warning'
        });
      }
    } catch (e) {
      setError((e as Error).message || t('app.error.transformFail'));
    }
  }

  function exportFileName(platform: string, tplName: string): string {
    const cfg = rulesConfig.value;
    const range = cfg.dateFilterEnabled && (cfg.dateFrom || cfg.dateTo)
      ? `${cfg.dateFrom || t('app.exportName.earliest')}_${cfg.dateTo || t('app.exportName.latest')}`
      : t('app.exportName.allDates');
    const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_') || t('app.exportName.unnamed');
    return `${safe(platform)}_${safe(tplName)}_${range}_${stamp()}`;
  }

  async function exportFile(format: 'xlsx' | 'csv', sheetMode: boolean) {
    if (quota.exhausted.value) {
      paywall.value = 'quota';
      return;
    }
    stage.value = 'exporting';
    try {
      const client = await getClient();
      const platform = match.value?.displayName.split('（')[0] ?? t('app.exportName.general');
      const name = exportFileName(platform, templateName.value || match.value?.presetId || 'clean');
      const { blob, fileName } = await client.exportFile(format, sheetMode, name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      // 服务端扣减配额（幂等）：仅导出成功计数，失败不扣额
      const dedupKey = await sha256Hex(
        JSON.stringify({
          files: files.value.map((f) => ({ n: f.name, s: f.size })),
          mapping: mapping.value,
          rules: buildRules()
        })
      );
      const res = await quota.consumeExport(dedupKey, stats.value?.total ?? 0);
      if (!res.ok) {
        stage.value = 'preview';
        paywall.value = 'quota';
        toast.add({
          title: t('app.toast.quotaExhausted'),
          description: t('app.toast.quotaExhaustedDesc'),
          color: 'warning'
        });
        return;
      }
      stage.value = 'done';
      toast.add({
        title: t('app.toast.exportSuccess'),
        description: t('app.toast.exportSuccessDesc', { file: fileName }),
        color: 'success'
      });
    } catch (e) {
      stage.value = 'preview';
      toast.add({
        title: t('app.toast.exportFail'),
        description: (e as Error).message || t('app.toast.retry'),
        color: 'error'
      });
    }
  }

  function goStep(n: WizardStep) {
    step.value = n;
  }

  /** 映射示例行：取第一个就绪文件的源数据首行（实时反映源字段内容，不依赖转换） */
  const exampleSourceRow = computed<Row | null>(() => {
    for (const f of files.value) {
      if (f.status === 'ready' && f.sampleRows.length > 0) return f.sampleRows[0];
    }
    return null;
  });

  return {
    stage, step, files, match, mapping, rulesConfig,
    previewRows, allRows, allTotal, stats, anomalies,
    errorMsg, paywall, activePresetId, templateName,
    addFiles, removeFile, clearAll, changePreset,
    runTransform, exportFile, exportFileName, goStep, reset, setError, buildRules,
    exampleSourceRow
  };
}

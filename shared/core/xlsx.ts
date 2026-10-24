/**
 * SheetJS 职责：**读取** xlsx/xls，以及 MVP 阶段的 xlsx/csv **写入**。
 *
 * 说明（对应技术设计文档 ADR D8）：
 * D8 决策的自研 fflate 流式 XLSX 写入器（shared/core/xlsx-stream）被有意
 * 推迟到后续里程碑——当前 MVP 使用 SheetJS 写入，模块边界保持干净
 * （buildXlsx / buildCsv / readWorkbook 三个函数），后续替换为流式实现时
 * 只需改动本文件，调用方（parse.worker.ts）无需变更。
 */
import * as XLSX from 'xlsx';
import type { Row } from './types';

export interface SheetData {
  name: string;
  headers: string[];
  rows: Row[];
}

/** 读取工作簿首个工作表 → 原始二维数据（含合并单元格按左上值填充） */
export function readWorkbook(buf: ArrayBuffer): { sheetName: string; dataRows: string[][] } {
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' }) as string[][];
  const rows: string[][] = data.map((r) => r.map((c) => (c ?? '').toString()));

  // 合并单元格按左上值填充（FR-P-04）
  const merges = (ws['!merges'] as { s: { r: number; c: number }; e: { r: number; c: number } }[]) ?? [];
  for (const m of merges) {
    const v = rows[m.s.r]?.[m.s.c] ?? '';
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (rows[r]) rows[r][c] = v;
      }
    }
  }
  return { sheetName, dataRows: rows };
}

/** 多 Sheet 写入 XLSX → Blob（明细 / 汇总 / 异常） */
export function buildXlsx(sheets: SheetData[]): Blob {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const aoa: string[][] = [s.headers, ...s.rows.map((r) => s.headers.map((h) => r[h] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = s.headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Blob([arr], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/** CSV 写入：UTF-8 with BOM，保证 Excel 双击打开不乱码（FR-E-02） */
export function buildCsv(headers: string[], rows: Row[]): Blob {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h] ?? '')).join(','));
  }
  return new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

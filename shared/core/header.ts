/**
 * 表头行识别（FR-P-03）
 *
 * 扫描前 10 行，取首个满足"非空占比 ≥ 0.6 且以字符串为主"的行；
 * 之前的行视为无关前缀（如报表标题行）。
 */

function isNumericCell(v: string): boolean {
  const s = v.trim();
  if (s === '') return false;
  return !Number.isNaN(Number(s));
}

export function detectHeaderRow(dataRows: string[][]): { headerRowIndex: number; headers: string[] } {
  const scan = dataRows.slice(0, 10);
  for (let i = 0; i < scan.length; i++) {
    const cells = scan[i] ?? [];
    if (cells.length === 0) continue;
    const nonEmpty = cells.filter((c) => c.trim() !== '');
    if (nonEmpty.length / cells.length < 0.6) continue;
    const stringCells = nonEmpty.filter((c) => !isNumericCell(c));
    if (stringCells.length / nonEmpty.length < 0.5) continue;
    return { headerRowIndex: i, headers: cells.map((c) => c.trim()) };
  }
  // 兜底：首行即表头
  const first = dataRows[0] ?? [];
  return { headerRowIndex: 0, headers: first.map((c) => c.trim()) };
}

/**
 * 分隔符识别（FR-P-02）
 *
 * 候选 [',', ';', '\t']，在前 50 行样例上打分：
 * 字段数一致性（众数占比）≥ 0.9；并列时取字段数更多者（防千分位逗号误判）。
 */

/** 引号感知单行切分（处理 "" 转义） */
export function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function detectDelimiter(text: string): { delimiter: string; confidence: number } {
  const candidates = [',', ';', '\t'];
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .slice(0, 50);

  let bestDelim = ',';
  let bestConsistency = 0;
  let bestFields = 0;

  for (const d of candidates) {
    if (lines.length === 0) break;
    const counts = lines.map((l) => splitLine(l, d).length);
    const freq = new Map<number, number>();
    for (const c of counts) freq.set(c, (freq.get(c) ?? 0) + 1);
    let mode = 0;
    let modeCount = 0;
    freq.forEach((v, k) => {
      if (v > modeCount) {
        modeCount = v;
        mode = k;
      }
    });
    const consistency = modeCount / counts.length;
    if (
      consistency >= 0.9 &&
      (consistency > bestConsistency || (consistency === bestConsistency && mode > bestFields))
    ) {
      bestDelim = d;
      bestConsistency = consistency;
      bestFields = mode;
    }
  }

  return { delimiter: bestDelim, confidence: bestConsistency };
}

/** 分隔符展示名（UI 用） */
export function delimiterLabel(delim: string): string {
  if (delim === '\t') return 'Tab';
  if (delim === ';') return '分号';
  return '逗号';
}

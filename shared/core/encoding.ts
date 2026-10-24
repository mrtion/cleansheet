/**
 * 编码检测（FR-P-01）
 *
 * 策略（技术设计 4.1）：
 * 1. BOM 优先：EF BB BF → utf-8；FF FE → utf-16le；FE FF → utf-16be
 * 2. 非 BOM：UTF-8 严格校验（TextDecoder fatal:true），通过即 utf-8
 * 3. GBK 启发式：双字节对（0x81–0xFE / 0x40–0xFE，排除 0x7F）合法占比 > 0.95
 * 4. 兜底 → windows-1252
 *
 * 仅取前 8KB 判定。浏览器与 workerd 均实现 WHATWG Encoding 标准，
 * TextDecoder('gbk' / 'utf-16le') 两侧行为一致，无需 iconv 类依赖。
 */
import type { EncodingResult } from './types';

const SAMPLE_BYTES = 8192;

export function detectEncoding(bytes: Uint8Array): EncodingResult {
  const sample = bytes.subarray(0, Math.min(bytes.length, SAMPLE_BYTES));

  // 1. BOM 优先
  if (sample.length >= 3 && sample[0] === 0xef && sample[1] === 0xbb && sample[2] === 0xbf) {
    return { encoding: 'utf-8', confidence: 1 };
  }
  if (sample.length >= 2 && sample[0] === 0xff && sample[1] === 0xfe) {
    return { encoding: 'utf-16le', confidence: 1 };
  }
  if (sample.length >= 2 && sample[0] === 0xfe && sample[1] === 0xff) {
    return { encoding: 'utf-16be', confidence: 1 };
  }

  // 2. UTF-8 严格校验
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample);
    return { encoding: 'utf-8', confidence: 0.95 };
  } catch {
    /* 不是合法 UTF-8，继续启发式 */
  }

  // 3. GBK 启发式：统计高位字节组成的合法双字节对占比
  let legal = 0;
  let illegal = 0;
  let i = 0;
  while (i < sample.length) {
    const b = sample[i];
    if (b < 0x80) {
      i++;
      continue;
    }
    const n = sample[i + 1];
    if (b >= 0x81 && b <= 0xfe && n !== undefined && n >= 0x40 && n <= 0xfe && n !== 0x7f) {
      legal++;
      i += 2;
    } else {
      illegal++;
      i++;
    }
  }
  const total = legal + illegal;
  if (total > 0 && legal / total > 0.95) {
    return { encoding: 'gbk', confidence: 0.8 };
  }

  // 4. 兜底
  return { encoding: 'windows-1252', confidence: 0.5 };
}

/** 按判定编码解码全部字节（BOM 会被 TextDecoder 自动吞掉） */
export function decodeBytes(bytes: Uint8Array, encoding: string): string {
  return new TextDecoder(encoding, { fatal: false }).decode(bytes);
}

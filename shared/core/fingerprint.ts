/**
 * 预设匹配：表头指纹（FR-T-05）
 *
 * 表头归一化（小写、去符号、别名展开）→ 加权命中率
 * score = Σ命中权重 / Σ总权重；score ≥ 0.6 自动套用。
 */
import type { Preset, PresetMatch } from './types';
import { PRESETS } from './presets/registry';

export const PRESET_AUTO_APPLY_THRESHOLD = 0.6;

/** "Settlement ID" / "settlement_id" → "settlement-id" */
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function matchPreset(headers: string[]): PresetMatch | null {
  const norm = new Set(headers.map(normalizeHeader));
  let best: PresetMatch | null = null;
  for (const p of PRESETS) {
    let hit = 0;
    let total = 0;
    for (const s of p.signature) {
      total += s.weight;
      const candidates = [s.col, ...(s.aliases ?? [])].map(normalizeHeader);
      if (candidates.some((c) => norm.has(c))) hit += s.weight;
    }
    const score = total > 0 ? hit / total : 0;
    if (score >= PRESET_AUTO_APPLY_THRESHOLD && (!best || score > best.confidence)) {
      best = { presetId: p.id, displayName: p.displayName, confidence: score };
    }
  }
  return best;
}

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function listPresets(): Preset[] {
  return PRESETS;
}

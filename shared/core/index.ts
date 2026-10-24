/**
 * shared/core — 同构转换引擎入口
 *
 * 纯 TS，无 DOM / Node 依赖。运行于：
 * - 浏览器 Web Worker（app/workers/parse.worker.ts，默认通道）
 * - Cloudflare Workers 服务端（后续里程碑 /api/process，同一份实现）
 */
export * from './types';
export * from './encoding';
export * from './delimiter';
export * from './header';
export * from './fingerprint';
export * from './mapping';
export * from './expression';
export * from './anomaly';
export * from './csv';
export * from './xlsx';
export * from './rules/index';
export { validateComputed } from './rules/computed';
export { normalizeDate } from './rules/date-filter';

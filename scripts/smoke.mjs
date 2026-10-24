// CleanSheet 引擎冒烟测试：node 直接 import shared/core（TS 类型剥离）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const core = await import('../shared/core/index.ts');

let pass = 0;
const ok = (name, cond) => {
  assert(cond, `FAIL: ${name}`);
  pass++;
  console.log(`  ok - ${name}`);
};

console.log('== 编码检测 ==');
const amazonBuf = readFileSync(path.join(root, 'testdata/amazon-settlement-sample.csv'));
const gbkBuf = readFileSync(path.join(root, 'testdata/shopify-orders-sample-gbk.csv'));

const enc1 = core.detectEncoding(new Uint8Array(amazonBuf));
ok('UTF-8 文件判定为 utf-8', enc1.encoding === 'utf-8');

const enc2 = core.detectEncoding(new Uint8Array(gbkBuf));
ok(`GBK 文件判定为 gbk（实际: ${enc2.encoding}, 置信度 ${enc2.confidence}）`, enc2.encoding === 'gbk');

const gbkText = core.decodeBytes(new Uint8Array(gbkBuf), enc2.encoding);
ok('GBK 解码后中文正常（无替换符，有中文）', gbkText.includes('无线蓝牙耳机') && !gbkText.includes('�'));

console.log('== 分隔符 / 表头 ==');
const text = core.decodeBytes(new Uint8Array(amazonBuf), enc1.encoding);
const { delimiter } = core.detectDelimiter(text);
ok(`分隔符识别为逗号（实际: ${JSON.stringify(delimiter)}）`, delimiter === ',');
const { dataRows } = core.parseCsvText(text, delimiter);
const { headers, headerRowIndex } = core.detectHeaderRow(dataRows);
ok('表头行识别为第 0 行', headerRowIndex === 0);
ok(`首列为 settlement-id（实际: ${headers[0]}）`, headers[0] === 'settlement-id');

console.log('== 预设指纹 ==');
const match = core.matchPreset(headers);
ok(`匹配到 amazon-settlement（实际: ${match?.presetId}）`, match?.presetId === 'amazon-settlement');
ok(`置信度 >= 0.6（实际: ${match?.confidence.toFixed(2)}）`, (match?.confidence ?? 0) >= 0.6);

console.log('== 映射 ==');
const preset = core.getPreset('amazon-settlement');
const mapping = core.buildMapping(headers, preset);
const srcOf = (t) => mapping.entries.find((e) => e.target === t)?.source;
ok(`order_id 自动映射（实际: ${srcOf('order_id')}）`, srcOf('order_id') === 'order-id');
ok('必填校验通过', core.validateMapping(mapping).ok === true);

console.log('== 规则链 + 异常 ==');
const rows = dataRows.slice(1).filter((r) => r.some((c) => c.trim() !== '')).map((r) => {
  const o = {};
  headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
  return o;
});
const result = core.runPipeline(rows, mapping, {
  rules: [
    { type: 'fx', amountField: 'sales_amount', currencyField: 'currency', mode: 'fixed', fixedRate: 7.16 },
    { type: 'dedupe', keyField: 'order_id', keep: 'first' }
  ],
  requiredFields: ['order_id', 'order_id', 'order_date', 'sales_amount', 'currency'].filter((v, i, a) => a.indexOf(v) === i),
  dateFields: ['order_date'],
  amountFields: ['sales_amount', 'amount_cny'],
  dupKeyField: 'order_id',
  amountThreshold: 1000000
});
// Amazon 结算单为 amount-type 长表：同一 order_id 有 Principal/Commission/Shipping/Refund 多行，
// keep:'first' 去重会剔除后 3 类行（MVP 已知简化，见 preset 注释）
ok(`去重剔除 4 行（实际: ${result.stats.dedupeRemoved}）`, result.stats.dedupeRemoved === 4);
ok(`异常计数 missing=1（实际: ${result.anomalies.counts.missing}）`, result.anomalies.counts.missing === 1);
ok(`异常计数 date=1（实际: ${result.anomalies.counts.date}）`, result.anomalies.counts.date === 1);
// 2500000 同时触发 sales_amount 与换算后 amount_cny 两处金额异常（按单元格计）
ok(`异常计数 amount=2（实际: ${result.anomalies.counts.amount}）`, result.anomalies.counts.amount === 2);
const first = result.rows[0];
ok(`汇率换算正确 128*7.16=916.48（实际: ${first.amount_cny}）`, first.amount_cny === '916.48');
ok(`fx_rate 列保留（实际: ${first.fx_rate}）`, first.fx_rate === '7.16');

console.log('== 表达式解析器 ==');
const node = core.parseExpression('{sales_amount} - {commission} - {shipping_fee}');
const v = core.evalExpression(node, (f) => ({ sales_amount: 100, commission: 15, shipping_fee: 6 }[f] ?? 0));
ok(`表达式求值 100-15-6=79（实际: ${v}）`, v === 79);
let threw = false;
try { core.parseExpression('{sales_amount} + '); } catch { threw = true; }
ok('非法表达式抛错', threw);
ok('引用未映射字段校验', core.validateComputed('净收入', '{sales_amount} - {nope}', ['sales_amount']) !== null);

console.log('== 导出 ==');
const xlsxBlob = core.buildXlsx([{ name: '明细', headers: ['order_id', 'amount_cny'], rows: result.rows }]);
ok(`XLSX Blob 生成（${xlsxBlob.size} bytes）`, xlsxBlob.size > 1000);
const csvBlob = core.buildCsv(['order_id'], result.rows);
// 注意：Blob.text() 按规范会剥离 BOM，因此检查原始字节
const csvBytes = new Uint8Array(await csvBlob.arrayBuffer());
ok(
  `CSV 带 UTF-8 BOM（前三字节: ${[...csvBytes.slice(0, 3)].map((b) => b.toString(16)).join(' ')})`,
  csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf
);

console.log(`\n全部通过：${pass} 项`);

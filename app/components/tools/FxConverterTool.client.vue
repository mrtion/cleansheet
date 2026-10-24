<!-- 结算单汇率换算器主体（.client.vue：纯客户端，内部可直引 shared/core） -->
<template>
  <div class="rounded-card border border-neutral-200 bg-white p-8">
    <!-- 输入 -->
    <div v-if="step === 1">
      <p class="mb-2 text-sm font-medium text-neutral-900">{{ $t('tools.fx.pasteHint') }}</p>
      <UTextarea v-model="raw" :rows="6" placeholder="order_id&#9;amount&#9;currency&#10;701-001&#9;128.00&#9;USD" class="font-mono" />
      <div class="mt-3 flex items-center gap-3">
        <label class="cursor-pointer text-sm text-primary-700 hover:underline">
          {{ $t('tools.fx.orUpload') }}
          <input type="file" accept=".csv" class="hidden" @change="onFile" />
        </label>
      </div>
      <p v-if="error" class="mt-2 text-sm text-danger">{{ error }}</p>
      <UButton class="mt-4" :disabled="!raw.trim()" @click="parseInput">{{ $t('tools.fx.next') }}</UButton>
    </div>

    <!-- 配置 -->
    <div v-if="step === 2">
      <div class="grid gap-4 md:grid-cols-3">
        <div>
          <p class="mb-1 text-sm font-medium text-neutral-900">{{ $t('tools.fx.amountCol') }}</p>
          <USelect v-model="amountCol" :items="headers" class="w-full" />
        </div>
        <div>
          <p class="mb-1 text-sm font-medium text-neutral-900">{{ $t('tools.fx.currencyCol') }}</p>
          <USelect v-model="currencyCol" :items="[{ label: $t('tools.fx.unified'), value: '' }, ...headers]" class="w-full" />
        </div>
        <div v-if="!currencyCol">
          <p class="mb-1 text-sm font-medium text-neutral-900">{{ $t('tools.fx.currency') }}</p>
          <USelect v-model="currency" :items="currencies" class="w-full" />
        </div>
      </div>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <p class="mb-1 text-sm font-medium text-neutral-900">{{ $t('tools.fx.month') }}</p>
          <UInput v-model="month" type="month" class="w-full" />
        </div>
        <div>
          <p class="mb-1 text-sm font-medium text-neutral-900">{{ $t('tools.fx.rate') }}</p>
          <UInput v-model.number="rate" type="number" step="0.0001" min="0" class="w-full" />
        </div>
        <div class="flex items-end">
          <UButton size="lg" @click="convert">{{ $t('tools.fx.convert') }}</UButton>
        </div>
      </div>
      <p v-if="error" class="mt-3 text-sm text-danger">{{ error }}</p>
      <p class="mt-3 text-xs text-neutral-400">
        {{ $t('tools.fx.rateNote') }}
      </p>
    </div>

    <!-- 结果 -->
    <div v-if="step === 3">
      <div class="mb-3 flex items-center justify-between">
        <p class="font-medium text-neutral-900">{{ $t('tools.fx.result', { n: fmt(rows.length) }) }}</p>
        <UButton size="sm" icon="i-lucide-download" @click="download">{{ $t('tools.fx.downloadCsv') }}</UButton>
      </div>
      <p v-if="skipped" class="mb-3 text-sm text-amber-600">{{ $t('tools.fx.skipped', { n: skipped }) }}</p>
      <p v-if="downloaded" class="mb-3 text-sm text-success">{{ $t('tools.fx.downloaded') }}</p>
      <div class="max-h-96 overflow-auto rounded-control border border-neutral-200">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-neutral-50">
            <tr>
              <th v-for="h in outHeaders" :key="h" class="border-b border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-500">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows.slice(0, 200)" :key="i" class="border-b border-neutral-100">
              <td v-for="h in outHeaders" :key="h" class="tnum px-3 py-2 text-neutral-700">{{ r[h] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <UButton variant="ghost" color="neutral" class="mt-3" @click="step = 1; error = ''">{{ $t('tools.fx.restart') }}</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { parseCsvText } from '../../../shared/core/csv';
import { detectEncoding, decodeBytes } from '../../../shared/core/encoding';
import { buildCsv } from '../../../shared/core/xlsx';
import { fmt } from '../../utils/format';

const { t } = useI18n();
const step = ref(1);
const raw = ref('');
const error = ref('');
const headers = ref<string[]>([]);
const dataRows = ref<string[][]>([]);
const amountCol = ref('');
const currencyCol = ref('');
const currency = ref('USD');
const month = ref('');
const rate = ref(7.16);
const rows = ref<Record<string, string>[]>([]);
const outHeaders = ref<string[]>([]);
const skipped = ref(0);
const downloaded = ref(false);

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'];

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const buf = new Uint8Array(await f.arrayBuffer());
  raw.value = decodeBytes(buf, detectEncoding(buf).encoding);
}

function parseInput() {
  error.value = '';
  try {
    const text = raw.value.trim();
    const delim = text.includes('\t') ? '\t' : ',';
    const { dataRows: dr } = parseCsvText(text, delim);
    if (dr.length < 2) {
      error.value = t('tools.fx.needHeader');
      return;
    }
    headers.value = dr[0].map((h) => h.trim());
    dataRows.value = dr.slice(1);
    amountCol.value = headers.value[0];
    step.value = 2;
  } catch {
    error.value = t('tools.fx.parseFailed');
  }
}

function convert() {
  error.value = '';
  if (!amountCol.value) {
    error.value = t('tools.fx.selectAmount');
    return;
  }
  if (!rate.value || rate.value <= 0) {
    error.value = t('tools.fx.invalidRate');
    return;
  }
  const out: Record<string, string>[] = [];
  let skip = 0;
  for (const dr of dataRows.value) {
    const get = (h: string) => dr[headers.value.indexOf(h)] ?? '';
    const amount = parseFloat(get(amountCol.value));
    const cur = currencyCol.value ? get(currencyCol.value).toUpperCase() : currency.value;
    const bad = Number.isNaN(amount);
    if (bad) skip++;
    const cny = bad ? '' : (Math.round(amount * rate.value * 100) / 100).toFixed(2);
    out.push({ 金额: get(amountCol.value), 币种: cur, 汇率: String(rate.value), 折算人民币: cny });
  }
  rows.value = out;
  skipped.value = skip;
  downloaded.value = false;
  outHeaders.value = ['金额', '币种', '汇率', '折算人民币'];
  step.value = 3;
}

function download() {
  const blob = buildCsv(outHeaders.value, rows.value);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `汇率换算_${month.value || '手动汇率'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  downloaded.value = true;
  setTimeout(() => (downloaded.value = false), 4000);
}
</script>

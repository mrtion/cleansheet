<!-- 虚拟大表：40px 行高 / 吸顶表头 / 异常高亮 + 图标 / 左下图例（UI 风格指南 6.4） -->
<template>
  <div class="relative overflow-x-auto rounded-card border border-neutral-200 bg-white">
    <!-- 表头（吸顶） -->
    <div class="flex border-b border-neutral-200 bg-neutral-50" role="row" :style="{ width: totalWidth + 'px' }">
      <div
        v-for="col in columns"
        :key="col.key"
        class="flex shrink-0 items-center px-3 text-xs font-semibold text-neutral-500"
        :class="col.sticky ? 'sticky left-0 z-10 bg-neutral-50' : ''"
        :style="{ width: col.width + 'px', height: '44px' }"
        role="columnheader"
      >
        <span class="truncate" :title="col.key">{{ col.label }}</span>
      </div>
    </div>

    <!-- 数据区 -->
    <RecycleScroller
      ref="scroller"
      :items="rows"
      :item-size="40"
      key-field="__vid"
      class="scroller"
      :style="{ height: height + 'px' }"
      v-slot="{ item, index }"
    >
      <div
        class="flex border-b border-neutral-100 hover:bg-neutral-50"
        :class="flashIndex === index ? 'row-flash' : ''"
        role="row"
        :style="{ height: '40px', width: totalWidth + 'px' }"
      >
        <div
          v-for="col in columns"
          :key="col.key"
          class="flex shrink-0 items-center gap-1 overflow-hidden px-3 text-[13px] leading-5"
          :class="cellClass(col, item, index)"
          :style="{ width: col.width + 'px' }"
          role="cell"
          :title="String(item[col.key] ?? '')"
        >
          <UIcon v-if="anomalyIcon(item, index, col.key)" :name="anomalyIcon(item, index, col.key)!" class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate" :class="[col.mono ? 'font-mono' : '', col.numeric ? 'tnum ml-auto' : '']">
            {{ displayValue(item[col.key]) }}
          </span>
        </div>
      </div>
    </RecycleScroller>

    <!-- 图例（固定左下，UI 风格指南 2.3） -->
    <div class="absolute bottom-2 left-2 flex items-center gap-3 rounded-full border border-neutral-200 bg-white/95 px-3 py-1.5 text-xs text-neutral-500 shadow-xs">
      <span v-for="t in legend" :key="t.type" class="flex items-center gap-1">
        <span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: t.bg }" />
        {{ t.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { type Row, type AnomalySummary, type AnomalyType } from '../../../shared/core/index';

const { t } = useI18n();

const props = defineProps<{
  rows: (Row & { __vid: number })[];
  columns: { key: string; label: string; width: number; numeric: boolean; mono: boolean; sticky: boolean }[];
  anomalies: AnomalySummary | null;
  height?: number;
}>();

const scroller = ref<InstanceType<typeof RecycleScroller> | null>(null);
const flashIndex = ref<number | null>(null);
let flashTimer: ReturnType<typeof setTimeout> | null = null;

/** 列总宽：显式设置给表头与行，保证横向滚动时内容宽度一致（虚拟滚动的行是绝对定位，不参与 max-content 计算，故不用 w-max） */
const totalWidth = computed(() => props.columns.reduce((a, c) => a + (c.width || 150), 0));

const anomalyMap = computed(() => {
  const m = new Map<string, AnomalyType>();
  for (const a of props.anomalies?.items ?? []) m.set(`${a.rowIndex}:${a.columnKey}`, a.type);
  return m;
});

const legend = computed(() => [
  { type: 'missing', label: t('preview.anomaly.missing'), bg: '#FFF1F2' },
  { type: 'date', label: t('preview.anomaly.date'), bg: '#FFFBEB' },
  { type: 'amount', label: t('preview.anomaly.amount'), bg: '#F5F3FF' },
  { type: 'dup', label: t('preview.anomaly.dup'), bg: '#F0F9FF' }
]);

const ICONS: Record<AnomalyType, string> = {
  missing: 'i-lucide-circle-x',
  date: 'i-lucide-calendar-x',
  amount: 'i-lucide-badge-alert',
  dup: 'i-lucide-copy-x'
};

const CELL_BG: Record<AnomalyType, string> = {
  missing: 'bg-anomaly-missing-bg text-anomaly-missing-fg',
  date: 'bg-anomaly-date-bg text-anomaly-date-fg',
  amount: 'bg-anomaly-amount-bg text-anomaly-amount-fg',
  dup: 'bg-anomaly-dup-bg text-anomaly-dup-fg'
};

function anomalyTypeAt(index: number, colKey: string): AnomalyType | null {
  return anomalyMap.value.get(`${index}:${colKey}`) ?? null;
}

function anomalyIcon(_item: Row, index: number, colKey: string): string | null {
  const t = anomalyTypeAt(index, colKey);
  return t ? ICONS[t] : null;
}

function cellClass(col: { key: string }, _item: Row, index: number): string {
  const t = anomalyTypeAt(index, col.key);
  return t ? CELL_BG[t] : 'text-neutral-700';
}

function displayValue(v: unknown): string {
  const s = String(v ?? '');
  return s === '' ? '—' : s;
}

/** 滚动到指定行并闪烁一次（400ms，UI 风格指南 7 章动效 4） */
function scrollToRow(index: number) {
  scroller.value?.scrollToItem(index);
  flashIndex.value = index;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flashIndex.value = null;
  }, 900);
}

defineExpose({ scrollToRow });
</script>

<style scoped>
.scroller {
  overflow-y: auto;
}
.row-flash {
  animation: row-flash 0.9s var(--ease-standard);
}
@keyframes row-flash {
  0%, 100% { background-color: transparent; }
  30% { background-color: var(--color-primary-100); }
}
</style>

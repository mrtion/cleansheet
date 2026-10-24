<!-- 异常面板：右侧可折叠，按类型计数 chips，点击筛选定位异常行（FR-A-05） -->
<template>
  <div class="rounded-card border border-neutral-200 bg-white">
    <button class="flex w-full items-center justify-between px-4 py-3" :aria-expanded="open" @click="open = !open">
      <span class="flex items-center gap-2 font-semibold text-neutral-900">
        <UIcon name="i-lucide-triangle-alert" class="h-4 w-4 text-warning" />
        {{ $t('preview.anomaly.title') }}
      </span>
      <UIcon name="i-lucide-chevron-down" class="h-4 w-4 text-neutral-400 transition-transform duration-base" :class="open ? 'rotate-180' : ''" />
    </button>
    <div v-show="open" class="space-y-2 border-t border-neutral-200 px-4 py-3">
      <template v-if="total > 0">
        <button
          v-for="t in types"
          :key="t.type"
          class="flex w-full items-center justify-between rounded-control px-3 py-2 text-sm transition-colors duration-fast hover:bg-neutral-100"
          @click="$emit('locate', t.type)"
        >
          <span class="flex items-center gap-2 text-neutral-700">
            <span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: t.bg }" />
            {{ t.label }}
          </span>
          <UBadge :color="t.color" variant="soft">{{ fmt(t.count) }}</UBadge>
        </button>
        <p class="pt-1 text-xs text-neutral-400">{{ $t('preview.anomaly.hint') }}</p>
      </template>
      <p v-else class="flex items-center gap-2 py-2 text-sm text-success">
        <UIcon name="i-lucide-circle-check" class="h-4 w-4" />
        {{ $t('preview.anomaly.none') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type AnomalySummary, type AnomalyType } from '../../../shared/core/index';
import { fmt } from '../../utils/format';

const { t } = useI18n();

const props = defineProps<{ anomalies: AnomalySummary | null }>();
defineEmits<{ locate: [type: AnomalyType] }>();

const META: { type: AnomalyType; bg: string; color: 'error' | 'warning' | 'info' }[] = [
  { type: 'missing', bg: '#FFF1F2', color: 'error' },
  { type: 'date', bg: '#FFFBEB', color: 'warning' },
  { type: 'amount', bg: '#F5F3FF', color: 'info' },
  { type: 'dup', bg: '#F0F9FF', color: 'info' }
];

const types = computed(() =>
  META.map((m) => ({ ...m, label: t(`preview.anomaly.${m.type}`), count: props.anomalies?.counts[m.type] ?? 0 }))
);
const total = computed(() => types.value.reduce((a, b) => a + b.count, 0));
const open = ref(true);
</script>

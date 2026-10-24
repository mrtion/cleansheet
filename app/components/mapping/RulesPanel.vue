<!-- 清洗规则配置（FR-C）：汇率 / 去重 / 日期过滤 / 计算列 -->
<template>
  <div class="rounded-card border border-neutral-200 bg-white">
    <button
      class="flex w-full items-center justify-between px-5 py-3"
      :aria-expanded="open"
      @click="open = !open"
    >
      <h3 class="font-semibold text-neutral-900">{{ $t('mapping.rules.title') }}</h3>
      <UIcon name="i-lucide-chevron-down" class="h-4 w-4 text-neutral-400 transition-transform duration-base" :class="open ? 'rotate-180' : ''" />
    </button>

    <div v-show="open" class="space-y-5 border-t border-neutral-200 px-5 py-4">
      <!-- 货币换算 -->
      <div>
        <UCheckbox v-model="cfg.fxEnabled" :label="$t('mapping.rules.fx')" />
        <div v-if="cfg.fxEnabled" class="ml-7 mt-2 space-y-2">
          <URadioGroup v-model="cfg.fxMode" :items="fxModeItems" orientation="horizontal" />
          <div v-if="cfg.fxMode === 'fixed'" class="flex items-center gap-2">
            <span class="text-sm text-neutral-500">{{ $t('mapping.rules.fixedLabel') }}</span>
            <UInput v-model.number="cfg.fixedRate" type="number" step="0.01" min="0" class="w-28" size="sm" />
          </div>
          <div v-else class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-sm text-neutral-500">{{ $t('mapping.rules.billMonth') }}</span>
              <UInput v-model="cfg.fxMonth" type="month" size="sm" class="w-40" />
            </div>
            <div v-for="cur in currencies" :key="cur" class="flex items-center gap-2">
              <span class="w-20 text-sm text-neutral-500">{{ $t('mapping.rules.rateLabel', { cur }) }}</span>
              <UInput v-model.number="cfg.fxRates[cur]" type="number" step="0.0001" min="0" size="sm" class="w-32" :placeholder="$t('mapping.rules.ratePlaceholder')" />
            </div>
            <p v-if="!currencies.length" class="text-xs text-neutral-400">{{ $t('mapping.rules.noCurrencyHint') }}</p>
          </div>
          <p class="text-xs text-neutral-400">{{ $t('mapping.rules.fxNote') }}</p>
        </div>
      </div>

      <UDivider />

      <!-- 去重 -->
      <div>
        <UCheckbox v-model="cfg.dedupeEnabled" :label="$t('mapping.rules.dedupe')" />
        <div v-if="cfg.dedupeEnabled" class="ml-7 mt-2 flex items-center gap-2">
          <span class="text-sm text-neutral-500">{{ $t('mapping.rules.dedupeStrategy') }}</span>
          <USelect v-model="cfg.dedupeKeep" :items="dedupeItems" size="sm" class="w-40" />
        </div>
      </div>

      <UDivider />

      <!-- 日期过滤 -->
      <div>
        <UCheckbox v-model="cfg.dateFilterEnabled" :label="$t('mapping.rules.dateFilter')" />
        <div v-if="cfg.dateFilterEnabled" class="ml-7 mt-2 flex items-center gap-2">
          <UInput v-model="cfg.dateFrom" type="date" size="sm" />
          <span class="text-sm text-neutral-400">{{ $t('mapping.rules.to') }}</span>
          <UInput v-model="cfg.dateTo" type="date" size="sm" />
          <span class="text-xs text-neutral-400">{{ $t('mapping.rules.dateNote') }}</span>
        </div>
      </div>

      <UDivider />

      <!-- 计算列 -->
      <div>
        <p class="text-sm font-medium text-neutral-900">{{ $t('mapping.rules.computed') }}</p>
        <p class="mt-0.5 text-xs text-neutral-400">{{ $t('mapping.rules.computedHint') }}</p>
        <div v-for="(c, i) in cfg.computed" :key="i" class="mt-2 flex items-center gap-2">
          <UInput v-model="c.name" :placeholder="$t('mapping.rules.colName')" size="sm" class="w-36" />
          <UInput v-model="c.expression" placeholder="{sales_amount} - {commission}" size="sm" class="flex-1 font-mono" />
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-trash-2" :aria-label="$t('mapping.rules.deleteComputed')" @click="cfg.computed.splice(i, 1)" />
        </div>
        <p v-if="computedError" class="mt-1 text-xs text-danger">{{ computedError }}</p>
        <UButton size="sm" variant="ghost" icon="i-lucide-plus" class="mt-2" @click="addComputed">{{ $t('mapping.rules.addComputed') }}</UButton>
      </div>

      <UDivider />

      <!-- 异常处理 -->
      <div>
        <UCheckbox v-model="cfg.excludeAnomalies" :label="$t('mapping.rules.excludeAnomalies')" />
        <p class="ml-7 mt-1 text-xs text-neutral-400">{{ $t('mapping.rules.excludeNote') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RulesConfig } from '../../composables/useConversion';
import { validateComputed } from '../../../shared/core/rules/computed';

const { t } = useI18n();

const props = defineProps<{
  modelValue: RulesConfig;
  availableFields: string[];
  currencies: string[];
}>();
const emit = defineEmits<{
  'update:modelValue': [RulesConfig];
  'fx-auto': [];
}>();

const open = ref(true);
const cfg = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
});

const fxModeItems = computed(() => [
  { label: t('mapping.rules.fxFixed'), value: 'fixed' },
  { label: t('mapping.rules.fxMonthly'), value: 'monthly-avg' }
]);
const dedupeItems = computed(() => [
  { label: t('mapping.rules.keepFirst'), value: 'first' },
  { label: t('mapping.rules.keepLast'), value: 'last' },
  { label: t('mapping.rules.keepMark'), value: 'mark' }
]);
const computedError = ref('');

function addComputed() {
  cfg.value.computed.push({ name: '', expression: '' });
}

// 失焦即校验：引用未映射字段时给出阻断性提示（FR-C-04）
watch(
  () => cfg.value.computed.map((c) => c.expression).join('|'),
  () => {
    computedError.value = '';
    for (const c of cfg.value.computed) {
      if (!c.expression.trim()) continue;
      const err = validateComputed(c.name || t('mapping.rules.unnamed'), c.expression, props.availableFields);
      if (err) {
        computedError.value = err;
        break;
      }
    }
  },
  { deep: true }
);
</script>

<!-- 统计条：总行数 / 有效行 / 异常行 / 去重剔除 / 币种分布（FR-V-04） -->
<template>
  <div class="flex flex-wrap items-center gap-2" aria-live="polite">
    <UBadge color="neutral" variant="soft" size="lg">{{ $t('preview.stats.total') }} <b class="tnum ml-1">{{ fmt(stats.total) }}</b></UBadge>
    <UBadge color="success" variant="soft" size="lg">{{ $t('preview.stats.valid') }} <b class="tnum ml-1">{{ fmt(stats.valid) }}</b></UBadge>
    <UBadge color="warning" variant="soft" size="lg">{{ $t('preview.stats.anomaly') }} <b class="tnum ml-1">{{ fmt(stats.anomaly) }}</b></UBadge>
    <UBadge color="info" variant="soft" size="lg">{{ $t('preview.stats.dedupeRemoved') }} <b class="tnum ml-1">{{ fmt(stats.dedupeRemoved) }}</b></UBadge>
    <span v-for="c in stats.currencies" :key="c" class="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
      {{ c }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { TransformStats } from '../../../shared/core/index';
import { fmt } from '../../utils/format';

defineProps<{ stats: TransformStats }>();
</script>

<!-- PaywallCard：配额耗尽 / 超限升级引导（UI 风格指南 6.5） -->
<template>
  <UModal v-model:open="open" :ui="{ content: 'rounded-modal' }">
    <template #content>
      <div class="px-8 py-8">
        <!-- 上半：用量 -->
        <div class="text-center">
          <UIcon name="i-lucide-crown" class="mx-auto h-10 w-10 text-warning" />
          <h3 class="mt-3 text-xl font-semibold text-neutral-900">{{ title }}</h3>
          <p class="mt-2 text-sm text-neutral-500">{{ description }}</p>
          <div v-if="trigger === 'quota'" class="mx-auto mt-4 max-w-xs">
            <div class="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div class="h-full rounded-full bg-primary-600" :style="{ width: '100%' }" />
            </div>
            <p class="mt-1 text-xs text-neutral-500">{{ $t('exporter.paywall.quotaUsed', { used, limit }) }}</p>
          </div>
        </div>

        <UDivider class="my-6" />

        <!-- 下半：Pro 权益 -->
        <ul class="space-y-2.5">
          <li v-for="b in benefits" :key="b" class="flex items-start gap-2 text-sm text-neutral-700">
            <UIcon name="i-lucide-check" class="mt-0.5 h-4 w-4 shrink-0 text-success" />
            {{ b }}
          </li>
        </ul>

        <UButton size="lg" block class="mt-6" to="/pricing">{{ $t('exporter.paywall.upgrade') }}</UButton>
        <UButton variant="ghost" color="neutral" block class="mt-2" @click="open = false">{{ $t('exporter.paywall.later') }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PaywallTrigger } from '../../composables/useConversion';

const { t, tm } = useI18n();

const props = defineProps<{
  trigger: PaywallTrigger;
  used: number;
  limit: number;
}>();
const emit = defineEmits<{ 'update:trigger': [PaywallTrigger] }>();

const open = computed({
  get: () => props.trigger !== null,
  set: (v: boolean) => {
    if (!v) emit('update:trigger', null);
  }
});

const title = computed(() => (props.trigger ? t(`exporter.paywall.${props.trigger}Title`) : ''));
const description = computed(() => (props.trigger ? t(`exporter.paywall.${props.trigger}Desc`) : ''));
const benefits = computed<string[]>(() =>
  props.trigger ? (tm(`exporter.paywall.${props.trigger}Benefits`) as string[]) : []
);
</script>

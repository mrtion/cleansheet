<!-- FAQ 手风琴 -->
<template>
  <div class="divide-y divide-neutral-200 rounded-card border border-neutral-200 bg-white">
    <div v-for="(f, i) in items" :key="i">
      <button
        class="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
        :aria-expanded="open === i"
        @click="open = open === i ? -1 : i"
      >
        <span class="font-medium text-neutral-900">{{ f.q }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-base"
          :class="open === i ? 'rotate-180' : ''"
        />
      </button>
      <div v-show="open === i" class="px-6 pb-5 text-sm leading-7 text-neutral-500">
        {{ f.a }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ items: { q: string; a: string }[] }>();
const open = ref(0);
</script>

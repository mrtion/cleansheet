<!-- NuxtLinkLocale：兼容层，直接透传到 NuxtLink（当前采用 cookie 方案，URL 无前缀） -->
<template>
  <NuxtLink :to="to" v-bind="$attrs">
    <slot />
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{ to: string }>();
</script>

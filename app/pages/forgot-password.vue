<!-- 忘记密码：输入邮箱，发送重置链接 -->
<template>
  <div class="mx-auto max-w-md px-6 py-16">
    <div class="rounded-card border border-neutral-200 bg-white p-8">
      <h1 class="text-2xl font-bold text-neutral-900">{{ $t('auth.forgot.title') }}</h1>
      <p class="mt-2 text-sm text-neutral-500">{{ $t('auth.forgot.subtitle') }}</p>

      <UForm :state="state" class="mt-6 space-y-4" @submit="onSubmit">
        <UFormField :label="$t('auth.forgot.email')" name="email" :error="errors.email || undefined">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="you@example.com"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <p v-if="errors.form" class="flex items-center gap-1.5 text-sm text-danger">
          <UIcon name="i-lucide-circle-alert" class="h-4 w-4 shrink-0" />{{ errors.form }}
        </p>

        <UButton type="submit" size="lg" block :loading="loading">{{ $t('auth.forgot.submit') }}</UButton>
      </UForm>

      <div v-if="sent" class="mt-6 rounded-card border border-success/30 bg-success/5 p-4">
        <p class="flex items-center gap-2 text-sm font-medium text-success">
          <UIcon name="i-lucide-circle-check" class="h-4 w-4" />{{ $t('auth.forgot.sent') }}
        </p>
        <p class="mt-1 text-sm text-neutral-600">{{ $t('auth.forgot.sentTip') }}</p>
        <div v-if="devUrl" class="mt-3">
          <p class="text-xs text-neutral-500">{{ $t('auth.forgot.devTip') }}</p>
          <NuxtLinkLocale :to="devUrl" class="mt-1 block break-all text-sm text-primary-700 hover:underline">{{ devUrl }}</NuxtLinkLocale>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

const { t } = useI18n();

const state = reactive({ email: '' });
const errors = reactive({ email: '', form: '' });
const loading = ref(false);
const sent = ref(false);
const devUrl = ref('');

async function onSubmit() {
  errors.email = '';
  errors.form = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
    errors.email = t('auth.forgot.emailInvalid');
    return;
  }
  loading.value = true;
  try {
    const data = await $fetch<any>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: state.email.trim() }
    });
    sent.value = true;
    devUrl.value = data?.devResetUrl || '';
  } catch (e: any) {
    errors.form = e?.data?.message || t('auth.forgot.sendFailed');
  } finally {
    loading.value = false;
  }
}
</script>

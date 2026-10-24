<!-- 重置密码：通过 ?token= 链接设置新密码 -->
<template>
  <div class="mx-auto max-w-md px-6 py-16">
    <div class="rounded-card border border-neutral-200 bg-white p-8">
      <h1 class="text-2xl font-bold text-neutral-900">{{ $t('auth.reset.title') }}</h1>

      <div v-if="!token" class="mt-6 rounded-card border border-danger/30 bg-danger/5 p-4">
        <p class="text-sm text-danger">{{ $t('auth.reset.invalidToken') }}</p>
        <NuxtLinkLocale to="/forgot-password" class="mt-2 inline-block text-sm font-medium text-primary-700 hover:underline">{{ $t('auth.reset.reapply') }}</NuxtLinkLocale>
      </div>

      <div v-else-if="done" class="mt-6 rounded-card border border-success/30 bg-success/5 p-4">
        <p class="flex items-center gap-2 text-sm font-medium text-success">
          <UIcon name="i-lucide-circle-check" class="h-4 w-4" />{{ $t('auth.reset.done') }}
        </p>
        <NuxtLinkLocale to="/login" class="mt-2 inline-block text-sm font-medium text-primary-700 hover:underline">{{ $t('auth.reset.goLogin') }}</NuxtLinkLocale>
      </div>

      <UForm v-else :state="state" class="mt-6 space-y-4" @submit="onSubmit">
        <UFormField :label="$t('auth.reset.newPassword')" name="password" :error="errors.password || undefined" :hint="$t('auth.reset.passwordHint')">
          <UInput
            v-model="state.password"
            type="password"
            :placeholder="$t('auth.reset.newPasswordPlaceholder')"
            size="lg"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('auth.reset.confirmPassword')" name="confirm" :error="errors.confirm || undefined">
          <UInput
            v-model="state.confirm"
            type="password"
            :placeholder="$t('auth.reset.confirmPasswordPlaceholder')"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <p v-if="errors.form" class="flex items-center gap-1.5 text-sm text-danger">
          <UIcon name="i-lucide-circle-alert" class="h-4 w-4 shrink-0" />{{ errors.form }}
        </p>

        <UButton type="submit" size="lg" block :loading="loading">{{ $t('auth.reset.submit') }}</UButton>
      </UForm>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

const route = useRoute();
const { t } = useI18n();
const token = computed(() => String(route.query.token ?? ''));

const state = reactive({ password: '', confirm: '' });
const errors = reactive({ password: '', confirm: '', form: '' });
const loading = ref(false);
const done = ref(false);

async function onSubmit() {
  errors.password = '';
  errors.confirm = '';
  errors.form = '';
  if (state.password.length < 8) {
    errors.password = t('auth.reset.passwordTooShort');
    return;
  }
  if (state.password !== state.confirm) {
    errors.confirm = t('auth.reset.confirmMismatch');
    return;
  }
  loading.value = true;
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: state.password }
    });
    done.value = true;
  } catch (e: any) {
    errors.form = e?.data?.message || t('auth.reset.resetFailed');
  } finally {
    loading.value = false;
  }
}
</script>

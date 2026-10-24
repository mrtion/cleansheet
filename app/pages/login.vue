<!-- 登录页 -->
<template>
  <div class="flex min-h-[70vh] items-center justify-center px-6 py-12">
    <div class="w-full max-w-md rounded-card border border-neutral-200 bg-white p-8 shadow-sm">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-neutral-900">{{ $t('auth.login.title') }}</h1>
        <p class="mt-2 text-sm text-neutral-500">{{ $t('auth.login.subtitle') }}</p>
      </div>

      <UForm :state="state" class="mt-8 space-y-5" @submit="onSubmit">
        <UFormField :label="$t('auth.login.email')" name="email" required :error="errors.email || undefined">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="name@example.com"
            autocomplete="email"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('auth.login.password')" name="password" required :error="errors.password || undefined">
          <UInput
            v-model="state.password"
            type="password"
            :placeholder="$t('auth.login.passwordPlaceholder')"
            autocomplete="current-password"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <p v-if="errors.form" class="flex items-center gap-1.5 text-sm text-danger">
          <UIcon name="i-lucide-circle-alert" class="h-4 w-4 shrink-0" />{{ errors.form }}
        </p>

        <UButton type="submit" size="lg" block :loading="loading">{{ $t('auth.login.submit') }}</UButton>
      </UForm>

      <div class="mt-4">
        <UButton
          size="lg"
          block
          variant="outline"
          color="neutral"
          icon="i-lucide-chrome"
          :loading="googleLoading"
          @click="onGoogle"
        >
          {{ $t('auth.login.google') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

const route = useRoute();
const toast = useToast();
const { login } = useAuth();
const { t } = useI18n();

const state = reactive({ email: '', password: '' });
const errors = reactive({ email: '', password: '', form: '' });
const loading = ref(false);
const googleLoading = ref(false);

/** 只允许站内相对路径，防止开放重定向 */
function safeNext(): string {
  const n = route.query.next;
  return typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/app';
}

function validate(): boolean {
  errors.email = '';
  errors.password = '';
  errors.form = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
    errors.email = t('auth.login.emailInvalid');
  }
  if (!state.password) {
    errors.password = t('auth.login.passwordRequired');
  }
  return !errors.email && !errors.password;
}

async function onSubmit() {
  if (!validate()) return;
  loading.value = true;
  try {
    await login(state.email.trim(), state.password);
    await navigateTo(safeNext());
  } catch (e: any) {
    const data = e?.data ?? {};
    if (data.error === 'invalid_credentials') {
      errors.form = t('auth.login.invalidCredentials');
    } else if (data.error === 'rate_limited') {
      errors.form = data.message || t('auth.login.rateLimited');
    } else {
      errors.form = t('auth.login.loginFailed');
    }
  } finally {
    loading.value = false;
  }
}

async function onGoogle() {
  googleLoading.value = true;
  try {
    await $fetch('/api/auth/google');
  } catch (e: any) {
    const msg = e?.data?.message || t('auth.login.googleSoon');
    toast.add({ title: t('auth.login.hint'), description: msg, color: 'neutral' });
  } finally {
    googleLoading.value = false;
  }
}
</script>

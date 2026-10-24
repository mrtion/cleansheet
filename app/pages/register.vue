<!-- 注册页 -->
<template>
  <div class="flex min-h-[70vh] items-center justify-center px-6 py-12">
    <div class="w-full max-w-md rounded-card border border-neutral-200 bg-white p-8 shadow-sm">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-neutral-900">{{ $t('auth.register.title') }}</h1>
        <p class="mt-2 text-sm text-neutral-500">{{ $t('auth.register.subtitle') }}</p>
      </div>

      <UForm :state="state" class="mt-8 space-y-5" @submit="onSubmit">
        <UFormField :label="$t('auth.register.email')" name="email" required :error="errors.email || undefined">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="name@example.com"
            autocomplete="email"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('auth.register.password')" name="password" required :error="errors.password || undefined" :hint="$t('auth.register.passwordHint')">
          <UInput
            v-model="state.password"
            type="password"
            :placeholder="$t('auth.register.passwordHint')"
            autocomplete="new-password"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('auth.register.confirm')" name="confirm" required :error="errors.confirm || undefined">
          <UInput
            v-model="state.confirm"
            type="password"
            :placeholder="$t('auth.register.confirmPlaceholder')"
            autocomplete="new-password"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <p v-if="errors.form" class="flex items-center gap-1.5 text-sm text-danger">
          <UIcon name="i-lucide-circle-alert" class="h-4 w-4 shrink-0" />
          <span>
            {{ errors.form }}
          </span>
        </p>

        <UButton type="submit" size="lg" block :loading="loading">{{ $t('auth.register.submit') }}</UButton>
      </UForm>

      <p class="mt-4 text-center text-xs text-neutral-400">
        {{ $t('auth.register.agreement') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

const route = useRoute();
const { register } = useAuth();
const { t } = useI18n();

const state = reactive({ email: '', password: '', confirm: '' });
const errors = reactive({ email: '', password: '', confirm: '', form: '' });
const loading = ref(false);

function safeNext(): string {
  const n = route.query.next;
  return typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/app';
}

function validate(): boolean {
  errors.email = '';
  errors.password = '';
  errors.confirm = '';
  errors.form = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
    errors.email = t('auth.register.emailInvalid');
  }
  if (state.password.length < 8) {
    errors.password = t('auth.register.passwordTooShort');
  }
  if (state.confirm !== state.password) {
    errors.confirm = t('auth.register.confirmMismatch');
  }
  return !errors.email && !errors.password && !errors.confirm;
}

async function onSubmit() {
  if (!validate()) return;
  loading.value = true;
  try {
    await register(state.email.trim(), state.password);
    await navigateTo(safeNext());
  } catch (e: any) {
    const data = e?.data ?? {};
    if (data.error === 'email_exists') {
      errors.form = t('auth.register.emailExists');
    } else {
      errors.form = data.message || t('auth.register.registerFailed');
    }
  } finally {
    loading.value = false;
  }
}
</script>

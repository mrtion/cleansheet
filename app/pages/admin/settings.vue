<!-- 管理后台 · 站点配置：支付 / 邮件 -->
<template>
  <div class="mx-auto max-w-6xl px-6 py-10">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-neutral-900">{{ $t('admin.settings.title') }}</h1>
      <UButton to="/admin" variant="ghost" color="neutral" size="sm" icon="i-lucide-arrow-left">
        {{ $t('admin.common.backToOverview') }}
      </UButton>
    </div>

    <div v-if="loading" class="mt-6 text-sm text-neutral-500">{{ $t('admin.common.loading') }}</div>
    <div v-else-if="loadError" class="mt-6">
      <p class="text-sm text-danger">{{ loadError }}</p>
      <UButton class="mt-4" size="sm" @click="load">{{ $t('admin.common.retry') }}</UButton>
    </div>
    <div v-else class="mt-6 space-y-6">
      <!-- 支付配置 -->
      <div class="rounded-card border border-neutral-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-neutral-900">{{ $t('admin.settings.paymentTitle') }}</h2>
        <p class="mt-1 text-sm text-neutral-500">{{ $t('admin.settings.paymentDesc') }}</p>

        <div class="mt-4 grid max-w-2xl gap-4">
          <UFormField :label="$t('admin.settings.provider')" name="provider">
            <USelect v-model="payment.provider" :items="paymentProviders" size="sm" class="w-56" />
          </UFormField>

          <template v-if="payment.provider === 'stripe'">
            <UFormField :label="$t('admin.settings.stripePk')" name="pk">
              <UInput v-model="payment.stripePublishableKey" placeholder="pk_live_…" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.stripeSk')" name="sk">
              <UInput v-model="payment.stripeSecretKey" type="password" :placeholder="$t('admin.settings.keepEmpty')" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.stripeWh')" name="wh">
              <UInput v-model="payment.stripeWebhookSecret" type="password" :placeholder="$t('admin.settings.keepEmpty')" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.stripeMonthly')" name="priceMonthly">
              <UInput v-model="payment.stripePriceMonthly" placeholder="price_…" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.stripeYearly')" name="priceYearly">
              <UInput v-model="payment.stripePriceYearly" :placeholder="$t('admin.settings.optional')" size="sm" class="w-full font-mono" />
            </UFormField>
          </template>

          <template v-if="payment.provider === 'paddle'">
            <UFormField label="Vendor ID" name="vendorId">
              <UInput v-model="payment.paddleVendorId" :placeholder="$t('admin.settings.exampleId')" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.paddleKey')" name="apiKey">
              <UInput v-model="payment.paddleApiKey" type="password" :placeholder="$t('admin.settings.keepEmptyShort')" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.paddleMonthly')" name="planMonthly">
              <UInput v-model="payment.paddlePlanMonthly" :placeholder="$t('admin.settings.exampleId')" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.paddleYearly')" name="planYearly">
              <UInput v-model="payment.paddlePlanYearly" :placeholder="$t('admin.settings.optional')" size="sm" class="w-full font-mono" />
            </UFormField>
          </template>
        </div>
      </div>

      <!-- 邮件配置 -->
      <div class="rounded-card border border-neutral-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-neutral-900">{{ $t('admin.settings.emailTitle') }}</h2>
        <p class="mt-1 text-sm text-neutral-500">{{ $t('admin.settings.emailDesc') }}</p>

        <div class="mt-4 grid max-w-2xl gap-4">
          <UFormField :label="$t('admin.settings.emailProvider')" name="provider">
            <USelect v-model="email.provider" :items="emailProviders" size="sm" class="w-56" />
          </UFormField>

          <template v-if="email.provider === 'resend'">
            <UFormField :label="$t('admin.settings.resendKey')" name="apiKey">
              <UInput v-model="email.resendApiKey" type="password" :placeholder="$t('admin.settings.keepEmpty')" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.fromEmail')" name="fromEmail">
              <UInput v-model="email.fromEmail" placeholder="noreply@yourdomain.com" size="sm" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="$t('admin.settings.fromName')" name="fromName">
              <UInput v-model="email.fromName" placeholder="CleanSheet" size="sm" class="w-full" />
            </UFormField>

            <div class="flex items-end gap-2">
              <UFormField :label="$t('admin.settings.testTo')" name="testTo" class="flex-1">
                <UInput v-model="testTo" type="email" placeholder="you@example.com" size="sm" class="w-full" />
              </UFormField>
              <UButton size="sm" variant="outline" color="neutral" :loading="testSending" @click="sendTest">
                {{ $t('admin.settings.sendTest') }}
              </UButton>
            </div>
            <p v-if="testResult" class="text-sm" :class="testOk ? 'text-success' : 'text-danger'">{{ testResult }}</p>
          </template>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UButton :loading="saving" @click="save">{{ $t('admin.settings.saveConfig') }}</UButton>
        <p v-if="saveMsg" class="text-sm" :class="saveOk ? 'text-success' : 'text-danger'">{{ saveMsg }}</p>
      </div>

      <p class="text-xs text-neutral-400">{{ $t('admin.settings.securityNote') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });

const { t } = useI18n();

const paymentProviders = computed(() => [
  { label: t('admin.settings.disabled'), value: 'none' },
  { label: 'Stripe', value: 'stripe' },
  { label: 'Paddle', value: 'paddle' }
]);
const emailProviders = computed(() => [
  { label: t('admin.settings.disabled'), value: 'none' },
  { label: 'Resend', value: 'resend' }
]);

const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const saveMsg = ref('');
const saveOk = ref(false);
const testTo = ref('');
const testSending = ref(false);
const testResult = ref('');
const testOk = ref(false);

const payment = reactive<Record<string, any>>({ provider: 'none' });
const email = reactive<Record<string, any>>({ provider: 'none', fromName: 'CleanSheet' });

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await $fetch<any>('/api/admin/config');
    Object.assign(payment, data.payment ?? { provider: 'none' });
    Object.assign(email, data.email ?? { provider: 'none' });
  } catch (e: any) {
    loadError.value = e?.data?.message || t('admin.common.loadFailed');
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  saveMsg.value = '';
  try {
    await $fetch('/api/admin/config', {
      method: 'PUT',
      body: { payment: { ...payment }, email: { ...email } }
    });
    saveOk.value = true;
    saveMsg.value = t('admin.settings.saved');
    // 重新加载以刷新脱敏显示
    await load();
  } catch (e: any) {
    saveOk.value = false;
    saveMsg.value = e?.data?.message || t('admin.settings.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function sendTest() {
  testResult.value = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo.value.trim())) {
    testOk.value = false;
    testResult.value = t('admin.settings.testEmailInvalid');
    return;
  }
  testSending.value = true;
  try {
    await $fetch('/api/admin/config/test-email', {
      method: 'POST',
      body: { to: testTo.value.trim() }
    });
    testOk.value = true;
    testResult.value = t('admin.settings.testSent');
  } catch (e: any) {
    testOk.value = false;
    testResult.value = e?.data?.message || t('admin.settings.testFailed');
  } finally {
    testSending.value = false;
  }
}

onMounted(load);
</script>

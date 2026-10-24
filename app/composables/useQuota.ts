/**
 * 配额管理（服务端版，Phase 2）
 *
 * 配额以 GET /api/me 返回的 quota 为权威；匿名 localStorage 配额已移除
 *（转换功能现要求登录，见路由中间件 app/middleware/auth.ts）。
 * 免费工具页（/tools/*）保持匿名、无需配额。
 */

export const FREE_CONVERSIONS = 20;
export const FREE_ROWS_LIMIT = 2000;

export function useQuota() {
  const { quota, fetchMe } = useAuth();

  const used = computed(() => quota.value?.used ?? 0);
  const limit = computed(() => quota.value?.limit ?? FREE_CONVERSIONS);
  const rowsLimit = computed(() => quota.value?.rowsPerFile ?? FREE_ROWS_LIMIT);
  const rowsProcessed = computed(() => quota.value?.rows ?? 0);
  const month = computed(() => quota.value?.month ?? '');
  const remaining = computed(() => Math.max(0, limit.value - used.value));
  const exhausted = computed(() => used.value >= limit.value);

  /** 从服务端刷新配额 */
  async function refresh() {
    await fetchMe();
  }

  /**
   * 导出成功后调用：POST /api/quota/consume（服务端幂等 + 扣减）。
   * 返回 {ok}；配额耗尽时 ok=false（调用方弹 PaywallCard），不抛错。
   */
  async function consumeExport(
    dedupKey: string,
    rows: number
  ): Promise<{ ok: boolean; used: number; limit: number }> {
    try {
      const res = await $fetch<{ used: number; limit: number }>('/api/quota/consume', {
        method: 'POST',
        body: { dedupKey, rows }
      });
      if (quota.value) quota.value.used = res.used;
      return { ok: true, used: res.used, limit: res.limit };
    } catch (e: any) {
      const data = e?.data ?? {};
      if (data.error === 'quota_exhausted') {
        if (quota.value) quota.value.used = data.used ?? used.value;
        return { ok: false, used: data.used ?? used.value, limit: data.limit ?? limit.value };
      }
      throw e;
    }
  }

  return { used, limit, rowsLimit, rowsProcessed, month, remaining, exhausted, refresh, consumeExport };
}

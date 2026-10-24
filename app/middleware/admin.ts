/**
 * app/middleware/admin.ts — 管理后台守卫
 * 配合 auth 中间件使用（middleware: ['auth', 'admin']）：
 * 401 → 回登录页；403 → 回首页并提示"需要管理员权限"。
 * （/admin/** 为 ssr:false，中间件只在客户端运行）
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const toast = useToast();
  try {
    const res = await $fetch<{ admin: boolean }>('/api/admin/check');
    if (res?.admin) return;
    toast.add({ title: '需要管理员权限', color: 'warning' });
    return navigateTo('/');
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode;
    if (status === 401) {
      return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`);
    }
    if (status === 403) {
      toast.add({
        title: '需要管理员权限',
        description: '当前账号不在管理员名单中',
        color: 'warning'
      });
    }
    return navigateTo('/');
  }
});

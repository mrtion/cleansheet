/**
 * app/middleware/auth.ts — 登录守卫
 * 保护 /app/** 与 /account：未登录时跳 /login?next=<原路径>
 * （这两组路由均为 ssr:false，中间件只在客户端运行，无需 SSR Cookie 透传。）
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loaded, fetchMe } = useAuth();
  const localePath = useLocalePath();
  if (!loaded.value) {
    try {
      await fetchMe();
    } catch {
      /* 网络错误也视为未登录，由页面内错误处理 */
    }
  }
  if (!user.value) {
    return navigateTo(localePath(`/login?next=${encodeURIComponent(to.fullPath)}`));
  }
});

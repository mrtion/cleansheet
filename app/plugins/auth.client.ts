/**
 * app/plugins/auth.client.ts — 应用启动时恢复会话
 * 让导航栏（登录态/未登录态）在所有页面正确渲染，只请求一次。
 */
export default defineNuxtPlugin(async () => {
  const { loaded, fetchMe } = useAuth();
  if (!loaded.value) {
    try {
      await fetchMe();
    } catch {
      /* 未登录或网络失败：保持匿名态 */
    }
  }
});

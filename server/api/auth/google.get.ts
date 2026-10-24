/**
 * GET /api/auth/google — Google OAuth 登录（占位）
 * 诚实 501：GOOGLE_OAUTH_* 密钥到位前不伪造流程。
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 501);
  return { error: 'not_configured', message: 'Google 登录即将上线，敬请期待' };
});

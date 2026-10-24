/**
 * POST /api/auth/request-code — 邮箱验证码发送（占位）
 * 诚实 501：RESEND_API_KEY 到位前不伪造发送。
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 501);
  return { error: 'not_configured', message: '邮箱验证码登录即将上线，敬请期待' };
});

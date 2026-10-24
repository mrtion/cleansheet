/**
 * GET /api/admin/check — 当前会话是否为管理员
 * 401 未登录 / 403 非管理员；是管理员返回 {admin:true, email}
 * （客户端 admin 中间件与导航栏用此接口判断管理后台可见性）
 */
import { requireAdmin, forbidden } from '../../utils/admin';
import { unauthorized } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  return { admin: true, email: admin.email };
});

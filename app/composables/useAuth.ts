/**
 * useAuth — 会话状态（服务端权威）
 *
 * user/plan/quota 全部来自 GET /api/me；401 时清空状态。
 * 登录成功后触发本地模板一次性迁移（useTemplates.migrateLocalTemplates）。
 */

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthQuota {
  used: number;
  limit: number;
  rowsPerFile: number;
  rows: number;
  month: string;
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null);
  const plan = useState<string>('auth-plan', () => 'free');
  const quota = useState<AuthQuota | null>('auth-quota', () => null);
  const loaded = useState<boolean>('auth-loaded', () => false);
  const isAdmin = useState<boolean>('auth-is-admin', () => false);

  const loggedIn = computed(() => !!user.value);

  /** 查询管理后台权限（/api/admin/check）；失败一律视为非管理员 */
  async function fetchAdmin(): Promise<boolean> {
    try {
      const res = await $fetch<{ admin: boolean }>('/api/admin/check');
      isAdmin.value = !!res?.admin;
    } catch {
      isAdmin.value = false;
    }
    return isAdmin.value;
  }

  async function fetchMe(): Promise<AuthQuota | null> {
    try {
      const me = await $fetch<{
        user: AuthUser;
        plan: string;
        quota: AuthQuota;
      }>('/api/me');
      user.value = me.user;
      plan.value = me.plan;
      quota.value = me.quota;
      loaded.value = true;
      // 管理员身份顺带刷新（不阻塞、不抛错；导航栏"管理后台"入口依赖它）
      void fetchAdmin();
      return me.quota;
    } catch (e: any) {
      // 401 = 未登录：静默清空；其他错误向上抛
      if (e?.response?.status === 401 || e?.statusCode === 401) {
        clear();
        return null;
      }
      throw e;
    }
  }

  function clear() {
    user.value = null;
    plan.value = 'free';
    quota.value = null;
    isAdmin.value = false;
    loaded.value = true;
  }

  async function afterAuth() {
    await fetchMe();
    // 本地模板一次性迁移到服务端（匿名期遗留）
    try {
      const { useTemplates } = await import('./useTemplates');
      await useTemplates().migrateLocalTemplates();
    } catch {
      /* 迁移失败不阻断登录 */
    }
  }

  async function login(email: string, password: string) {
    await $fetch('/api/auth/login', { method: 'POST', body: { email, password } });
    await afterAuth();
  }

  async function register(email: string, password: string) {
    await $fetch('/api/auth/register', { method: 'POST', body: { email, password } });
    await afterAuth();
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* 登出失败也清空本地状态 */
    }
    user.value = null;
    plan.value = 'free';
    quota.value = null;
    isAdmin.value = false;
    loaded.value = true;
    await navigateTo('/');
  }

  /** 邮箱前缀，用于导航栏展示 */
  const emailPrefix = computed(() => user.value?.email.split('@')[0] ?? '');

  return { user, plan, quota, loaded, loggedIn, isAdmin, emailPrefix, fetchMe, fetchAdmin, login, register, logout };
}

/**
 * POST /api/admin/posts/preview — Markdown 预览
 * body: {contentMd} → {html}（与公开详情页同一套 renderMarkdown）
 */
import { requireAdmin, forbidden } from '../../../utils/admin';
import { unauthorized } from '../../../utils/auth';
import { renderMarkdown } from '../../../utils/markdown';

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (!admin.ok) {
    setResponseStatus(event, admin.code);
    return admin.code === 401 ? unauthorized() : forbidden();
  }
  const body = await readBody(event).catch(() => null);
  const contentMd = String(body?.contentMd ?? '');
  return { html: renderMarkdown(contentMd) };
});

/**
 * server/utils/markdown.ts — Markdown → HTML（博客 CMS 用）
 *
 * 用 marked 解析，之后做基础 XSS 清洗：
 * - 整体剥掉 <script>/<iframe>/<object>/<embed>/<style>/<form> 等危险标签（含内容）
 * - 剥掉所有 on* 事件属性（如 onclick）
 * - href/src 中的 javascript: 伪协议中和为 #
 * - 非白名单标签整体转义
 *
 * 说明：只有管理员能在后台写文章（可信来源），这里只做基础防护，
 * 不引入 DOMPurify 等重型依赖。
 */
import { marked } from 'marked';

/** 允许的 HTML 标签白名单 */
const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4',
  'p', 'ul', 'ol', 'li',
  'a', 'strong', 'em', 'del',
  'code', 'pre',
  'blockquote',
  'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'br',
  'span', 'div'
]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 基础 XSS 清洗（白名单制） */
export function sanitizeHtml(html: string): string {
  let out = html;
  // 1. 危险标签：连内容一起剥掉（含自闭合形式）
  out = out.replace(
    /<(script|iframe|object|embed|style|form|input|button|select|textarea|link|meta)[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ''
  );
  out = out.replace(
    /<(script|iframe|object|embed|style|form|input|button|select|textarea|link|meta)[^>]*\/?>/gi,
    ''
  );
  // 2. 事件处理器属性：onclick= / onerror= 等
  out = out.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  // 3. javascript: / data:text/html 伪协议中和
  out = out.replace(
    /\s(href|src)\s*=\s*("|\')\s*javascript:[^"']*("|\')/gi,
    ' $1="#"'
  );
  out = out.replace(
    /\s(href|src)\s*=\s*("|\')\s*data:text\/html[^"']*("|\')/gi,
    ' $1="#"'
  );
  // 4. 非白名单标签整体转义
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)(\s[^<>]*)?\/?>/g, (m, tag: string) =>
    ALLOWED_TAGS.has(tag.toLowerCase()) ? m : escapeHtml(m)
  );
  return out;
}

/** Markdown → 安全 HTML */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md ?? '', { async: false }) as string;
  let html = sanitizeHtml(raw);
  // 表格包一层横向滚动容器（移动端不溢出）
  html = html.replace(/<table(\s[^>]*)?>/gi, '<div class="table-wrap"><table$1>');
  html = html.replace(/<\/table>/gi, '</table></div>');
  return html;
}

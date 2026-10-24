// sitemap.xml — 动态生成（营销页 / 工具页 / 博客文章从 D1 实时读取）
// BASE 从请求 host 推导，测试/正式环境各用各的域名
import { getDB } from '../utils/db';

const staticRoutes: Array<{ loc: string; changefreq: string; priority: string; lastmod: string }> = [
  { loc: '/', changefreq: 'weekly', priority: '1.0', lastmod: '2026-10-10' },
  // 免费开放期：/pricing 临时隐藏，已从 sitemap 移除
  { loc: '/tools/csv-encoding-fix', changefreq: 'monthly', priority: '0.9', lastmod: '2026-10-08' },
  { loc: '/tools/fx-converter', changefreq: 'monthly', priority: '0.9', lastmod: '2026-10-08' },
  { loc: '/blog', changefreq: 'weekly', priority: '0.8', lastmod: '2026-10-08' }
];

interface PostRow {
  slug: string;
  locale: string;
  updated_at: string;
}

export default defineEventHandler(async (event) => {
  const db = getDB(event);
  // 从请求 host 推导站点域名（测试/正式环境自动区分）
  const reqUrl = getRequestURL(event);
  const BASE = `${reqUrl.protocol}//${reqUrl.host}`;
  let postUrls = '';
  try {
    const rows = await db
      .prepare(
        `select slug, max(updated_at) as updated_at from posts
         where status = 'published'
         group by slug
         order by max(published_at) desc`
      )
      .all<PostRow>();
    postUrls =
      (rows.results ?? [])
        .map((r) => {
          const lastmod = (r.updated_at || '').slice(0, 10) || '2026-10-08';
          const prefix = '';
          return (
            `  <url>\n    <loc>${BASE}${prefix}/blog/${r.slug}</loc>\n` +
            `    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`
          );
        })
        .join('\n') + '\n';
  } catch {
    // D1 不可用时降级为仅静态路由，保证 sitemap 本身可访问
  }

  const staticUrls = staticRoutes
    .map(
      (r) =>
        `  <url>\n    <loc>${BASE}${r.loc}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls}\n${postUrls}</urlset>`;
  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return xml;
});

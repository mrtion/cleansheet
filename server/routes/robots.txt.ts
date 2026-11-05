// robots.txt — 动态生成，Sitemap URL 按请求 host 推导（测试/正式环境自动区分）
export default defineEventHandler((event) => {
  const reqUrl = getRequestURL(event);
  const base = `${reqUrl.protocol}//${reqUrl.host}`;
  const body = `User-agent: *\nContent-Signal: search=yes, ai-input=no, ai-train=no\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return body;
});

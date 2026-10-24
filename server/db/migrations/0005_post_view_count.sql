-- CleanSheet D1 迁移 0005：博客文章访问量统计
-- view_count 记录文章详情页被访问次数（每次 GET /api/posts/:slug 成功返回时 +1，爬虫 UA 跳过）

alter table posts add column view_count integer not null default 0;

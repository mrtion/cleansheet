-- CleanSheet D1 迁移 0002：博客文章表（CMS 化）
-- posts 由管理后台统一发布，前台 /blog SSR 渲染。
-- wrangler d1 migrations apply 时按文件名顺序执行。

create table posts (
  id           text primary key,
  slug         text not null unique,
  title        text not null,
  description  text not null default '',
  content_md   text not null default '',
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at text,
  created_at   text not null,
  updated_at   text not null
);

create index idx_posts_status_pub on posts (status, published_at desc);

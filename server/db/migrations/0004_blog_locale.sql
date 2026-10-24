-- CleanSheet D1 迁移 0004：博客文章双语（locale 字段）
-- 每篇文章归属一个语言版本；同一主题的中英文通过 translation_group 关联。

alter table posts add column locale text not null default 'zh' check (locale in ('zh', 'en'));
alter table posts add column translation_group text;

-- 旧 slug 唯一约束改为 (slug, locale) 复合唯一
-- SQLite 不支持直接修改约束，重建表：
create table posts_new (
  id               text primary key,
  slug             text not null,
  title            text not null,
  description      text not null default '',
  content_md       text not null default '',
  status           text not null default 'draft' check (status in ('draft', 'published')),
  locale           text not null default 'zh' check (locale in ('zh', 'en')),
  translation_group text,
  published_at     text,
  created_at       text not null,
  updated_at       text not null,
  unique (slug, locale)
);

insert into posts_new (id, slug, title, description, content_md, status, locale, translation_group, published_at, created_at, updated_at)
  select id, slug, title, description, content_md, status, 'zh', id, published_at, created_at, updated_at from posts;

drop table posts;
alter table posts_new rename to posts;

create index idx_posts_status_pub on posts (status, published_at desc);
create index idx_posts_locale on posts (locale, status, published_at desc);

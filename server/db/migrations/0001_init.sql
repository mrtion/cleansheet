-- CleanSheet D1 初始迁移（Phase 2b：KV → D1）
-- 说明：相对 TDD 6.1 的表结构，仅多出 templates.platform_name 一列，
-- 用于承载前端模板的 platformName（预设显示名），保持 API 响应体不变。
-- wrangler d1 migrations apply 时按文件名顺序执行。

create table users (
  id             text primary key,
  email          text unique not null,
  password_hash  text,
  oauth_provider text,
  created_at     text not null default (datetime('now'))
);

create table subscriptions (
  user_id              text primary key references users(id),
  plan                 text not null default 'free',
  status               text not null default 'active',
  provider             text,
  provider_customer_id text,
  current_period_end   text,
  updated_at           text not null default (datetime('now'))
);

create table templates (
  id            text primary key,
  user_id       text not null references users(id),
  name          text not null,
  platform      text,
  platform_name text,
  mapping_json  text not null,
  rules_json    text not null default '[]',
  is_shared     integer not null default 0,
  created_at    text not null default (datetime('now'))
);
create index idx_templates_user on templates (user_id);

create table usage_records (
  user_id        text not null references users(id),
  month          text not null,
  conversions    integer not null default 0,
  rows_processed integer not null default 0,
  primary key (user_id, month)
);

create table usage_dedup (
  dedup_key  text primary key,
  created_at text not null default (datetime('now'))
);

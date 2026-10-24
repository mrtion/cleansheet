-- 站点配置表：管理后台可配置的支付 / 邮件等信息（key-value，value 为 JSON 字符串）
create table site_config (
  key        text primary key,
  value      text not null default '{}',
  updated_at text not null default (datetime('now'))
);

-- 预置空配置（后台首次打开显示默认值）
insert into site_config (key, value) values
  ('payment', '{"provider":"none"}'),
  ('email', '{"provider":"none","fromName":"CleanSheet"}');

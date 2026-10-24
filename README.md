# CleanSheet — 电商多平台数据清洗与对账工具

> Phase 2b（2026-10-07）：存储层 KV → D1 迁移。关系型数据（用户/订阅/模板/配额流水/
> 幂等键）改存 D1；KV 仅保留会话与登录限频。转换功能需登录后使用；认证（邮箱+密码，
> PBKDF2）、模板、配额全部走服务端。匿名仅可使用免费小工具。

## 已交付（本仓库）

| 模块 | 说明 |
|---|---|
| `shared/core/` | 同构转换引擎（纯 TS）：编码检测 / 分隔符 / 表头识别 / 4 平台预设指纹 / 字段映射 / 清洗规则（汇率/去重/日期过滤/计算列）/ 异常检测 / SheetJS 读写 |
| `app/workers/parse.worker.ts` | Web Worker：parse / transform / query / export 协议；全量数据留 Worker，主线程只拿摘要与预览 |
| `app/workers/workerClient.ts` | Worker 会话封装；Worker 构造失败时降级主线程直跑（同一引擎，行为一致） |
| `app/pages/` | 落地页 `/`、定价 `/pricing`、CSV 乱码修复器、汇率换算器、登录 `/login`、注册 `/register`、工作台 `/app`（3 步向导，登录门禁）、模板管理、账户中心 |
| `server/api/` | `GET /api/health`；`GET /api/fx?month=YYYY-MM`（占位汇率，诚实标注 stale）；`POST /api/auth/register|login|logout`；`GET /api/auth/google`、`POST /api/auth/request-code|verify`（501 诚实占位）；`GET /api/me`；`GET/POST /api/templates`、`PATCH/DELETE /api/templates/:id`；`POST /api/quota/consume`（幂等扣减） |
| `server/utils/` | `db.ts`（D1 访问 + 模板行映射）、`kv.ts`（KV 会话/限频）、`password.ts`（PBKDF2-SHA256）、`auth.ts`（会话 Cookie） |
| `server/db/migrations/` | D1 迁移：`0001_init.sql`（users / subscriptions / templates / usage_records / usage_dedup；templates 相对 TDD 6.1 仅多 `platform_name` 一列以承载前端 `platformName`） |

## 存储架构（Phase 2b，2026-10-07 起）

| 存储 | 内容 | 说明 |
|---|---|---|
| D1（binding `DB`） | users、subscriptions、templates、usage_records、usage_dedup | 关系型账本；迁移见 `server/db/migrations/` |
| KV（binding `KV`） | `sess:{token}`（会话，30 天 TTL）、`rl:login:{ip}`（登录限频，60s TTL） | 仅短暂数据 |
| `testdata/` | Amazon 结算单样本（UTF-8，含 5 类刻意异常）+ Shopify 订单样本（GBK，演示编码识别） |

## 与 TDD 的偏离（Phase 2b，2026-10-07）

| TDD 决策 | 现状 | 原因与升级路径 |
|---|---|---|
| D5 数据库 = D1 | **已采用**：users / subscriptions / templates / usage_records / usage_dedup 存 D1（`server/db/migrations/0001_init.sql`）；KV 仅保留会话与登录限频 | 用户已补 D1 权限（2026-10-07）；templates 表相对 TDD 6.1 仅多 `platform_name` 一列（承载前端 `platformName`，API 响应体不变） |
| D9 配额强一致 = Durable Objects | **不再需要**：`/api/quota/consume` 使用 D1 单语句条件更新 `... and conversions < 20`，原子语义保证不超扣（见该文件注释） | DO 方案取消；幂等键并发竞态仍为 best-effort，与之前一致 |
| 邮箱验证码 / Google OAuth 登录 | 未做（501 诚实占位） | 需 `RESEND_API_KEY` / `GOOGLE_OAUTH_*`（见下表） |
| 支付 / 订阅后端 | 未做。定价页 Pro/Team 按钮弹"订阅支付即将上线"占位弹窗 | 支付服务商未定（PRD Q2） |
| Cron 汇率月更 | 未做。`/api/fx` 返回占位值 + `stale:true` + 免责声明 | 需 `FX_API_KEY`（PRD Q3 终选） |
| 自研流式 XLSX 写入器（TDD D8） | 推迟。当前用 SheetJS 写入，`shared/core/xlsx.ts` 已注明替换边界 | — |
| 服务端大文件流式通道 `/api/process` | 未做（>10 万行场景，M4） | — |

## 本地开发

```bash
node -v   # 需要 >= 20
npm install
npm run dev   # http://localhost:3000
```

## 生产构建与部署

部署前需先应用 D1 迁移（只需执行一次）：

```bash
npx wrangler d1 migrations apply cleansheet --remote   # 应用 server/db/migrations/
```

```bash
npx nuxi build        # Nitro cloudflare_module preset（不要用 nuxi generate）
npx wrangler deploy   # 需先 wrangler login；发布到 cleansheet.mrtion.kdns.fr
```

## 管理后台（/admin）

- 入口：`/admin`（总览：用户数 / 近 7 日新增 / 本月转换 / 模板数 + 最新用户），
  `/admin/users`（搜索 / 列表 / 按行调整套餐 free·pro·team）。登录后导航栏出现「管理后台」入口。
- 鉴权：`server/utils/admin.ts` 的 `requireAdmin`（登录 + 邮箱在名单中）；
  客户端 `app/middleware/admin.ts` 守卫路由（401 回登录，403 回首页并提示）。
- 开启方式：设置服务端环境变量 `ADMIN_EMAILS` 为管理员邮箱（逗号分隔），
  留空则无人是管理员。两种设置方式（二选一）：
  ```bash
  printf '%s' 'you@example.com' | npx wrangler secret put ADMIN_EMAILS   # 推荐：立即生效，无需重新部署
  ```
  或直接改 `wrangler.jsonc` 的 `vars.ADMIN_EMAILS` 后重新 `wrangler deploy`。
- 接口（均需管理员）：`GET /api/admin/check`、`GET /api/admin/stats`、
  `GET /api/admin/users?q=&limit=&offset=`、`PATCH /api/admin/users/:id`（body `{plan}`）。

## 下一步需要的密钥（由用户在安全通道提供，勿写入代码）

| 密钥 | 用途 | 获取方式 |
|---|---|---|
| `RESEND_API_KEY` | 邮箱验证码发送（`/api/auth/request-code` 解除 501） | `wrangler secret put RESEND_API_KEY` |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google 登录（`/api/auth/google` 解除 501） | Google Cloud Console |
| 支付服务商密钥（Stripe / Paddle / Lemon Squeezy，待 Q2 终选） | 订阅支付、套餐升级 | 选定后 `wrangler secret put PAYMENT_*` |
| `FX_API_KEY` | 正式汇率数据源（PRD Q3 终选） | 选定后配置 |

D1 说明：数据库 `cleansheet` 已由用户在 Cloudflare 面板创建；`wrangler.jsonc` 的
`d1_databases.migrations_dir` 指向 `server/db/migrations`，部署前执行一次
`wrangler d1 migrations apply cleansheet --remote` 即可建表。

# CleanSheet 支付方案决策文档：Stripe vs Paddle

结论先行：**选 Paddle**。理由不是"更便宜"，而是"对你现在唯一可用"。

## 1. 决定性事实（先看这一条就够了）

Stripe 不给中国大陆主体开商户号。想用 Stripe，你得先有一家香港/新加坡/美国公司。Paddle 没有这个门槛，个人（Individual）+ 护照即可申请。

- Stripe 官方不支持的国家/地区包括中国大陆：商户必须注册在 Stripe 支持的国家/地区（来源：redstagfulfillment.com Stripe 支持国家 FAQ，2026；Medium @cs-cart-com，2026-04："If your company is not registered in one of these regions, you simply can't use Stripe"）。
- Paddle 接受个人卖家注册（Individual 类型），身份验证用护照，网站审核约 1–2 天（来源：dev.to 2025 年实测指南；非官方，注册时以 Paddle 实际审核为准）。

**Stripe 对你不是"贵一点"，而是"现在用不了"。** 除非你现在就去注册香港公司（几千块 + 几周时间），否则这个二选一其实没得选。

## 2. 费率对比（按你的实际客单价算）

你的定价：Pro $12.99/月，Team $34.99/月（源码 app/pages/pricing.vue，2026-10-08 部署版本）。

| | Paddle | Stripe（假设你有香港公司、买家用非美国卡） |
|---|---|---|
| 费率 | 官方价 5% + $0.50/笔，无月费（来源：paddle.com/pricing，2026-10-09 实查） | 约 2.9% + $0.30，国际卡 +1.5%，Stripe Tax +0.5%（来源：creem.io 博客，2026-10；alexcloudstar.com，2026） |
| Pro $12.99 到手成本 | $1.15（8.8%） | ≈$0.87（6.7%）；加 Stripe Tax ≈$0.94（7.2%） |
| Team $34.99 到手成本 | $2.25（6.4%） | ≈$1.84（5.3%）；加税 ≈$2.01（5.8%） |
| 税务 | Paddle 是 Merchant of Record：代收、代报、代缴全球销售税/VAT，费用已含在 5% 里 | 你自己是 Merchant of Record：Stripe Tax 只帮你"算"，注册和申报要自己来 |

算法：Paddle $12.99×5%+$0.50=$1.1495；Stripe $12.99×(2.9%+1.5%)+$0.30=$0.8716。

诚实地说：Paddle 每单贵约 $0.2–0.3。你买到的是：**不用注册海外公司 + 不用自己处理全球税务**。对单人团队，这两项的真实成本远不止每单两三毛。

## 3. 另外两个对你有利的事实

1. **Paddle 收款端支持微信支付，打款支持 CNY**（来源：developer.paddle.com 官方功能对比页）。你的买家是跨境卖家，不少在国内，微信支付是实实在在的转化加分；打款直接到人民币也省一道结汇。
2. **后台已经预留好了**：`/admin/settings` 的支付配置就是 Stripe/Paddle 二选一，密钥字段（paddleApiKey）已就位。选定之后要做的只是：Paddle webhook → 订阅激活链路 + 定价页购买按钮接 checkout。

## 4. 风险与缺口（如实标注）

- Paddle 网站审核要求站内有 Terms of Service 和 Privacy Policy 页面。**你现在没有这两个页面**（全站页面清单：account/admin/app/blog/forgot-password/index/login/pricing/register/reset-password/tools）。这是注册 Paddle 前必须补的，我可以顺手加上。
- 上方"个人+护照可注册"的依据是 2025 年第三方实测指南，不是 Paddle 官方口径。注册本身免费无成本，**真正的验证就是去申请一次**，被拒再换方案也不亏。
- 2026 年 2 月 Stripe 推出了自己的 MoR 产品 Stripe Managed Payments（在正常费率上 +3.5%），但同样要求主体在支持国家——对你依然不可用，先忽略。

## 5. 建议的下一步（拍板后我直接开干）

你回一句 **"Paddle"** 就行，然后：

1. 我来做（约 1 天）：补隐私政策 + 服务条款页 → Paddle webhook 接收 → 订阅状态激活/降级 → 定价页购买按钮接 Paddle checkout。
2. 你来做（10 分钟）：去 paddle.com 用 Individual 类型注册，护照验证，提交 cleansheet.mrtion.kdns.fr 过审；把 API Key 贴进 `/admin/settings`。
3. 第一笔真实收款跑通后，再回头看要不要为大客户补 Stripe（那时你大概已经有公司主体了）。

---
*测算方法：按官方公布费率 × 你的定价页客单价直接计算，未含汇率波动与买家所在国 VAT（Paddle 的 VAT 是向买家加收，不从你这 5% 里扣）。费率来源均为 2026 年公开资料，Paddle 官方价 2026-10-09 实查。*

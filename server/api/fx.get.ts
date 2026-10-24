/**
 * GET /api/fx?month=YYYY-MM — 月度平均汇率（占位实现）
 *
 * 正式数据源待接入（PRD Q3）：候选 ECB / 央行中间价 / 第三方汇率 API，
 * 上线后经 Cron 每月 1 日写入 KV，本接口改为读缓存。
 * 当前返回静态占位值并诚实标注 stale，UI 层必须展示 disclaimer。
 */
export default defineEventHandler((event) => {
  const q = getQuery(event);
  const month = typeof q.month === 'string' && /^\d{4}-\d{2}$/.test(q.month)
    ? q.month
    : new Date().toISOString().slice(0, 7);

  return {
    month,
    base: 'USD',
    // 占位值：以 USD 为基准的外币→USD 系数；USD→CNY 取示例值
    rates: {
      CNY: 7.16,
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      AUD: 1.52,
      CAD: 1.36,
      SGD: 1.34
    },
    stale: true,
    source: 'placeholder',
    fetchedAt: new Date().toISOString(),
    disclaimer: '汇率数据待接入正式数据源（PRD Q3），当前为占位值，仅供参考'
  };
});

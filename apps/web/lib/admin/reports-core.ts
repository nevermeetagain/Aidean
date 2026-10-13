// S8.1 报表看板纯聚合（restructure-admin-nav-rbac-cms WC#7）。
// 无 DB / 无 DOM 依赖：入参为 groupBy 原始行（金额 BigInt 分）+ 区间天数 + now，
// 出参为 AdminReportView（零填充日序列 + 元口径金额）。可独立单测。
import { fenToYuan, type AdminReportDailyPoint, type AdminReportModelRow, type AdminReportView } from "@aidean/shared";

/** usage_daily_stats groupBy(by:['day']) 行投影。 */
export interface UsageDailyGroup {
  day: Date;
  _sum: { requestCount: number | null; quotaMinor: bigint | null };
}
/** usage_daily_stats groupBy(by:['model']) 行投影。 */
export interface ModelTopGroup {
  model: string;
  _sum: { requestCount: number | null; quotaMinor: bigint | null };
}
/** recharge_orders（PAID）行投影。 */
export interface RechargeRow {
  paidAt: Date;
  amountMinor: bigint;
}

/** 本地零点日期键 YYYY-MM-DD（与 gateway/service.assembleStats 同口径）。 */
function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface BuildReportInput {
  days: number;
  usageDaily: UsageDailyGroup[];
  modelTop: ModelTopGroup[];
  rechargeRows: RechargeRow[];
  activeUsers: number;
  now?: Date;
}

/**
 * 构建报表看板视图：
 * - 以 [今天-(days-1), 今天] 生成本地零填充日序列；
 * - 逐日汇总调用次数与消耗（分→元），合并当日充值实收（PAID）与订单数；
 * - 模型 TopN 直接透传（金额转元）；totals 为区间求和。
 */
export function buildReportView(input: BuildReportInput): AdminReportView {
  const now = input.now ?? new Date();
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (input.days - 1));

  interface Bucket {
    calls: number;
    quotaMinor: bigint;
    rechargeMinor: bigint;
    rechargeOrders: number;
  }
  const dayMap = new Map<string, Bucket>();
  const cursor = new Date(start);
  const endTs = end.getTime();
  while (cursor.getTime() <= endTs) {
    dayMap.set(dayKeyOf(cursor), { calls: 0, quotaMinor: 0n, rechargeMinor: 0n, rechargeOrders: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const row of input.usageDaily) {
    const bucket = dayMap.get(dayKeyOf(new Date(row.day)));
    if (!bucket) continue; // 防御：越界行（查询已按 from 过滤）
    bucket.calls += row._sum.requestCount ?? 0;
    bucket.quotaMinor += row._sum.quotaMinor ?? 0n;
  }

  for (const row of input.rechargeRows) {
    if (!row.paidAt) continue;
    const bucket = dayMap.get(dayKeyOf(new Date(row.paidAt)));
    if (!bucket) continue;
    bucket.rechargeMinor += row.amountMinor;
    bucket.rechargeOrders += 1;
  }

  const daily: AdminReportDailyPoint[] = [...dayMap.entries()].map(([day, b]) => ({
    day,
    calls: b.calls,
    quotaYuan: fenToYuan(b.quotaMinor),
    rechargeYuan: fenToYuan(b.rechargeMinor),
    rechargeOrders: b.rechargeOrders,
  }));

  const modelTop: AdminReportModelRow[] = input.modelTop.map((m) => ({
    model: m.model,
    calls: m._sum.requestCount ?? 0,
    quotaYuan: fenToYuan(m._sum.quotaMinor ?? 0n),
  }));

  let totalCalls = 0;
  let totalQuota = 0n;
  let totalRecharge = 0n;
  let totalRechargeOrders = 0;
  for (const b of dayMap.values()) {
    totalCalls += b.calls;
    totalQuota += b.quotaMinor;
    totalRecharge += b.rechargeMinor;
    totalRechargeOrders += b.rechargeOrders;
  }

  return {
    range: { days: input.days, from: dayKeyOf(start), to: dayKeyOf(end) },
    daily,
    modelTop,
    totals: {
      calls: totalCalls,
      quotaYuan: fenToYuan(totalQuota),
      rechargeYuan: fenToYuan(totalRecharge),
      rechargeOrders: totalRechargeOrders,
      activeUsers: input.activeUsers,
    },
  };
}

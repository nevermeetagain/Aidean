import { z } from "zod";

// ==================================================================
// S8 报表看板（restructure-admin-nav-rbac-cms WC#7）——管理端只读聚合契约。
// 约定：全部端点只读，禁写；时间×指标二维图数据源= usage_daily_stats 日汇总
//       + recharge_orders（PAID）。金额 BigInt 分口径在路由层转元字符串（fenToYuan）。
// ==================================================================

/** 报表区间查询：days 近 N 天（7-90，缺省 30）。 */
export const AdminReportsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});
export type AdminReportsQuery = z.infer<typeof AdminReportsQuerySchema>;

/** 单日聚合点（时间×指标）。金额一律元字符串（两位小数）。 */
export interface AdminReportDailyPoint {
  /** YYYY-MM-DD */
  day: string;
  /** 当日网关调用次数 */
  calls: number;
  /** 当日消耗折算（元） */
  quotaYuan: string;
  /** 当日充值实收（元，PAID） */
  rechargeYuan: string;
  /** 当日充值订单数（PAID） */
  rechargeOrders: number;
}

/** 模型 TopN 行。 */
export interface AdminReportModelRow {
  model: string;
  calls: number;
  quotaYuan: string;
}

/** 区间总览。 */
export interface AdminReportTotals {
  calls: number;
  quotaYuan: string;
  rechargeYuan: string;
  rechargeOrders: number;
  /** 区间内产生过调用的独立用户数 */
  activeUsers: number;
}

/** 报表看板视图（overview 端点返回体）。 */
export interface AdminReportView {
  range: { days: number; from: string; to: string };
  daily: AdminReportDailyPoint[];
  modelTop: AdminReportModelRow[];
  totals: AdminReportTotals;
}

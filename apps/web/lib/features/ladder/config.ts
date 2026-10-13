import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma";

/**
 * ladder 天梯图域 config（v1.9）：性能轴颗粒度的后台管理配置。
 * - 存储：system_configs 表 configKey = ladder_score_granularity（config_group=ladder，NUMBER 型）；
 * - 读取：SSR 页面每渲染周期读一次，缺行/非法/DB 不可用一律回退默认 0.1（页面永不因配置失败阻断）；
 * - 颗粒度为纯呈现参数（矩阵 bandSize），不参与服务端排行与缓存数据，故更新后无需失效 Redis；
 *   生效时机 = 页面 ISR revalidate（3600s）后首刷。
 */

export const LADDER_GRANULARITY_KEY = "ladder_score_granularity";
export const LADDER_GRANULARITY_DEFAULT = 0.1;

/** 颗粒度合法域：[0.01, 10]，非法值回退默认 */
export function clampGranularity(value: number): number {
  if (!Number.isFinite(value)) return LADDER_GRANULARITY_DEFAULT;
  return Math.min(10, Math.max(0.01, Math.round(value * 100) / 100));
}

/** 读性能轴颗粒度；任何异常路径都收敛到默认 0.1 */
export async function getLadderGranularity(client: PrismaClient = prisma): Promise<number> {
  try {
    const row = await client.systemConfig.findUnique({
      where: { configKey: LADDER_GRANULARITY_KEY },
      select: { configValue: true },
    });
    if (!row) return LADDER_GRANULARITY_DEFAULT;
    return clampGranularity(Number(row.configValue));
  } catch {
    return LADDER_GRANULARITY_DEFAULT;
  }
}

/** 写性能轴颗粒度（后台 PUT 通道）：upsert 配置行并返回落库后的有效值 */
export async function setLadderGranularity(value: number, client: PrismaClient = prisma): Promise<number> {
  const clamped = clampGranularity(value);
  await client.systemConfig.upsert({
    where: { configKey: LADDER_GRANULARITY_KEY },
    update: { configValue: String(clamped) },
    create: {
      configKey: LADDER_GRANULARITY_KEY,
      configGroup: "ladder",
      configType: "NUMBER",
      configValue: String(clamped),
      defaultValue: String(LADDER_GRANULARITY_DEFAULT),
      description: "模型性能天梯图性能轴/分隔栏的固定分割颗粒值（如 0.1 表示 98.9 与 98.8 相邻档位）",
      inputType: "number",
    },
  });
  return clamped;
}

/**
 * 性能区段阈值（R-53 / TP-4.1）：按综合分将模型标记为高/中/低三档。
 * - 存储：system_configs 表 configKey = ladder_tier_thresholds（config_group=ladder，JSON 型）；
 * - 默认阈值：high=80（≥80 高性能绿色）、mid=60（60-79 中等黄色）、<60 低性能灰色；
 * - 读取：SSR 页面每渲染周期读一次，缺行/异常回退默认。
 */
export const LADDER_TIER_KEY = "ladder_tier_thresholds";
export const LADDER_TIER_DEFAULTS = { high: 80, mid: 60 } as const;

export interface TierThresholds {
  high: number;
  mid: number;
}

export type PerformanceTier = "high" | "mid" | "low";

/** 按综合分判定性能区段 */
export function getTier(score: number, thresholds: TierThresholds = LADDER_TIER_DEFAULTS): PerformanceTier {
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.mid) return "mid";
  return "low";
}

/** 读性能区段阈值；任何异常路径都收敛到默认 */
export async function getLadderTierThresholds(client: PrismaClient = prisma): Promise<TierThresholds> {
  try {
    const row = await client.systemConfig.findUnique({
      where: { configKey: LADDER_TIER_KEY },
      select: { configValue: true },
    });
    if (!row) return { ...LADDER_TIER_DEFAULTS };
    const parsed = JSON.parse(row.configValue) as Partial<TierThresholds>;
    return {
      high: typeof parsed.high === "number" ? parsed.high : LADDER_TIER_DEFAULTS.high,
      mid: typeof parsed.mid === "number" ? parsed.mid : LADDER_TIER_DEFAULTS.mid,
    };
  } catch {
    return { ...LADDER_TIER_DEFAULTS };
  }
}

/**
 * R-83 T2：首窗加载百分比（上拉加载更多/无限滚动的分数带分窗高度）。
 * - 存储：system_configs ladder_load_window_pct（config_group=ladder，NUMBER 型）；
 * - 语义：分带高度 = 百分比 × 100 分量程 = 分数跨度 → 默认 20 = 首窗载综合分 [80,100] 的模型
 *   （即「20 分一档」），滚动触及带底（80 分线）自动拉 [60,80) 带，依次到 0；合法域 [1,100] 整数；
 * - 读取方：/api/v1/ladder route（bandHeight 注入 service）与 SSR 首屏，异常一律回退默认。
 */
export const LADDER_LOAD_WINDOW_PCT_KEY = "ladder_load_window_pct";
export const LADDER_LOAD_WINDOW_PCT_DEFAULT = 20;

export function clampLoadWindowPct(value: number): number {
  if (!Number.isFinite(value)) return LADDER_LOAD_WINDOW_PCT_DEFAULT;
  return Math.min(100, Math.max(1, Math.round(value)));
}

export async function getLadderLoadWindowPct(client: PrismaClient = prisma): Promise<number> {
  try {
    const row = await client.systemConfig.findUnique({
      where: { configKey: LADDER_LOAD_WINDOW_PCT_KEY },
      select: { configValue: true },
    });
    if (!row) return LADDER_LOAD_WINDOW_PCT_DEFAULT;
    return clampLoadWindowPct(Number(row.configValue));
  } catch {
    return LADDER_LOAD_WINDOW_PCT_DEFAULT;
  }
}

export async function setLadderLoadWindowPct(value: number, client: PrismaClient = prisma): Promise<number> {
  const clamped = clampLoadWindowPct(value);
  await client.systemConfig.upsert({
    where: { configKey: LADDER_LOAD_WINDOW_PCT_KEY },
    update: { configValue: String(clamped) },
    create: {
      configKey: LADDER_LOAD_WINDOW_PCT_KEY,
      configGroup: "ladder",
      configType: "NUMBER",
      configValue: String(clamped),
      defaultValue: String(LADDER_LOAD_WINDOW_PCT_DEFAULT),
      description: "天梯图上拉加载的分数带窗口高度（量程百分比=分数跨度）：20=首窗载综合分 80-100 分的模型（20 分一档）",
      inputType: "number",
    },
  });
  return clamped;
}

/**
 * R-83 T2：热门开发商默认展示数（T4 列收敛）。
 * - 语义：矩阵默认只显示按 vendors.priority 排序的前 N 个开发商列（左右两侧按 ⌈N/2⌉ 分摊），
 *   其余收纳进「展开全部」；合法域 [1,100] 整数；
 * - 读取方：SSR 页面注入 LadderBoard → LadderMatrixBoard（呈现层参数，不参与排行/缓存）。
 */
export const LADDER_HOT_VENDOR_COUNT_KEY = "ladder_hot_vendor_count";
export const LADDER_HOT_VENDOR_COUNT_DEFAULT = 8;

export function clampHotVendorCount(value: number): number {
  if (!Number.isFinite(value)) return LADDER_HOT_VENDOR_COUNT_DEFAULT;
  return Math.min(100, Math.max(1, Math.round(value)));
}

export async function getLadderHotVendorCount(client: PrismaClient = prisma): Promise<number> {
  try {
    const row = await client.systemConfig.findUnique({
      where: { configKey: LADDER_HOT_VENDOR_COUNT_KEY },
      select: { configValue: true },
    });
    if (!row) return LADDER_HOT_VENDOR_COUNT_DEFAULT;
    return clampHotVendorCount(Number(row.configValue));
  } catch {
    return LADDER_HOT_VENDOR_COUNT_DEFAULT;
  }
}

export async function setLadderHotVendorCount(value: number, client: PrismaClient = prisma): Promise<number> {
  const clamped = clampHotVendorCount(value);
  await client.systemConfig.upsert({
    where: { configKey: LADDER_HOT_VENDOR_COUNT_KEY },
    update: { configValue: String(clamped) },
    create: {
      configKey: LADDER_HOT_VENDOR_COUNT_KEY,
      configGroup: "ladder",
      configType: "NUMBER",
      configValue: String(clamped),
      defaultValue: String(LADDER_HOT_VENDOR_COUNT_DEFAULT),
      description: "天梯矩阵图默认展示的热门开发商列数（按 vendors.priority 排序取前 N，其余经「展开全部」呈现）",
      inputType: "number",
    },
  });
  return clamped;
}

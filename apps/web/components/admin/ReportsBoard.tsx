"use client";

/**
 * S8.1 管理端报表看板（restructure-admin-nav-rbac-cms WC#7）。
 * - 数据：GET /api/v1/admin/reports/overview?days=7|30|90（时间×指标二维图，只读聚合）；
 * - 取数：swr（自动去重/取消；区间切换换 key 即取新数）；
 * - 图表：EChartWrapper 经 next/dynamic 懒加载（echarts 不入公共 bundle）；
 *   option 由 lib/admin/reports-chart-option.ts 纯函数 builder 生成（可单测）；
 * - 三态：骨架 / 空态 / 错误重试。全部只读，无写/删入口。
 * - S2r（B1 裁决）：`variant="compact"` 用于 /admin 概览（仅 KPI 卡 + 趋势图）；
 *   缺省 `variant="full"` 用于 /admin/reports 独立页（含模型排行，预留导出/自定义区间扩展位）。
 */
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import useSWR from "swr";
import type { AdminReportView } from "@aidean/shared";

import { buildReportModelRankOption, buildReportTrendOption } from "../../lib/admin/reports-chart-option";

const EChartWrapper = dynamic(
  () => import("@aidean/ui/charts").then((mod) => mod.EChartWrapper),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded-xl bg-slate-100" />,
  }
);

interface Envelope<T> {
  code?: number;
  message?: string;
  data?: T | null;
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.code !== 0 || !body.data) {
    throw new Error(body?.message ?? "报表请求失败");
  }
  return body.data;
}

/** echarts 不解析 CSS 变量：运行时读取主题色，读取失败回落主题默认值 */
function themeColors(): { primary: string; accent: string } {
  const read = (name: string, fallback: string): string => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch {
      return fallback;
    }
  };
  return { primary: read("--primary", "#4f46e5"), accent: read("--accent", "#0ea5e9") };
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const RANGES = [
  { days: 7, label: "近 7 天" },
  { days: 30, label: "近 30 天" },
  { days: 90, label: "近 90 天" },
] as const;

const SUMMARY_CARDS: Array<{ key: keyof AdminReportView["totals"]; label: string; yuan?: boolean }> = [
  { key: "calls", label: "网关调用" },
  { key: "quotaYuan", label: "消耗折算（元）", yuan: true },
  { key: "rechargeYuan", label: "充值实收（元）", yuan: true },
  { key: "activeUsers", label: "活跃用户" },
];

export function ReportsBoard({ variant = "full" }: { variant?: "full" | "compact" }) {
  const compact = variant === "compact";
  const [days, setDays] = useState<number>(30);
  const { data, error, isLoading, mutate } = useSWR<AdminReportView>(
    `/api/v1/admin/reports/overview?days=${days}`,
    fetcher
  );

  const colors = useMemo(themeColors, []);
  const animation = useMemo(() => !prefersReducedMotion(), []);
  const trendOption = useMemo(
    () => (data ? buildReportTrendOption(data.daily, colors, animation) : null),
    [data, colors, animation]
  );
  const rankOption = useMemo(
    () => (data && data.modelTop.length > 0 ? buildReportModelRankOption(data.modelTop, colors.primary, animation) : null),
    [data, colors, animation]
  );

  /* 趋势图面板内层（compact 独占整行 / full 占 2/3） */
  const trendPanel = isLoading ? (
    <div className="h-[300px] w-full animate-pulse rounded-xl bg-slate-100" />
  ) : trendOption ? (
    <EChartWrapper option={trendOption} style={{ height: 300 }} />
  ) : (
    <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">区间内暂无调用数据</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">运营报表</h2>
          {!compact && (
            <p className="mt-0.5 text-xs text-slate-500">
              基于网关调用日汇总（usage_daily_stats）+ 充值订单（PAID）聚合，区间内时间×指标趋势；只读，不可增删改。
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              data-testid={`reports-range-${r.days}`}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                days === r.days ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          报表加载失败：{error.message}
          <button type="button" onClick={() => mutate()} className="ml-3 font-medium underline">
            重试
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SUMMARY_CARDS.map((c) => (
              <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
                <p className="text-xs font-medium text-slate-400">{c.label}</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                  {isLoading ? (
                    <span className="inline-block h-6 w-16 animate-pulse rounded bg-slate-100" />
                  ) : data ? (
                    c.yuan ? `¥${data.totals[c.key] as string}` : (data.totals[c.key] as number).toLocaleString()
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            ))}
          </div>

          {compact ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">{trendPanel}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)] xl:col-span-2">{trendPanel}</div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
                <p className="mb-2 text-xs font-medium text-slate-400">模型调用 Top{data?.modelTop.length ?? 0}</p>
                {isLoading ? (
                  <div className="h-[268px] w-full animate-pulse rounded-xl bg-slate-100" />
                ) : rankOption ? (
                  <EChartWrapper option={rankOption} style={{ height: 268 }} />
                ) : (
                  <div className="flex h-[268px] items-center justify-center text-sm text-slate-400">暂无模型排行</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

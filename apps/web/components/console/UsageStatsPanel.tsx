"use client";

/**
 * 控制台「统计报表」板块（WF-22 / AT-22.2，P5 前端）。
 *
 * - 数据：GET /api/v1/user/usage/stats?range=|dateFrom&dateTo（UsageStatsQuerySchema 契约，服务端已零填充）；
 *   多维消耗：GET /api/v1/user/usage/breakdown（同源区间，渠道×模型×计费路径，走 usage_logs 有界聚合）；
 * - 取数：swr（自动去重/取消；AT-22.2.1）；区间切换换 key 即取新数；
 * - 区间：预设 7d/30d/90d + 自定义日期区间（问题 4：指定日期查看，≤92 天由服务端硬上限）；
 * - 图表：EChartWrapper 经 next/dynamic 懒加载（echarts 不入公共 bundle，打样 LadderBarChart）；
 *   option 由 usage-chart-option.ts 纯函数 builder 生成（可单测）；
 * - 三态：骨架 / 空态 / 错误重试（沿用 UsageLedger 口径）；
 * - 无障碍：prefers-reduced-motion 命中时关闭 echarts 动画（AT-22.3.3）；
 *   区间切换由 swr key 变更天然取消在途请求（AT-22.3.2）；range 服务端硬上限（AT-22.3.1）。
 */
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import type { UsageBreakdownRow, UsageBreakdownView, UsageStatsView } from "@aidean/shared";

import { buildDailyTrendOption, buildModelRankOption } from "../../lib/features/gateway/usage-chart-option";
import { billingPathLabel } from "../../lib/features/gateway/stream-parse";
import { presetWindow } from "../../lib/features/gateway/usage-window";

const EChartWrapper = dynamic(
  () => import("@aidean/ui/charts").then((mod) => mod.EChartWrapper),
  {
    ssr: false,
    loading: () => <div className="h-[280px] w-full animate-pulse rounded-lg bg-muted" />,
  }
);

const RANGES = [
  { id: "7d", label: "近 7 日" },
  { id: "30d", label: "近 30 日" },
  { id: "90d", label: "近 90 日" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

/** 消耗来源类型 → 中文展示 */
const SOURCE_TYPE_LABEL: Record<"station" | "channel" | "platform", string> = {
  station: "上游站点",
  channel: "自定义渠道",
  platform: "平台",
};

/** 类型汇总卡固定口径：全部走 billingPath 维度（与明细表计费路径列同源，杜绝重复计数） */
const TYPE_CARD_PATHS = ["PLATFORM", "UPSTREAM", "FREE_PROXY", "FREE_QUOTA", "PACKAGE"] as const;

interface Envelope<T> {
  code?: number;
  message?: string;
  data?: T | null;
}

/** 通用取数：信封解包（code!==0 或缺 data → 抛错，交 swr 错误态） */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.code !== 0 || !body.data) {
    throw new Error(body?.message ?? "统计请求失败");
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
  return { primary: read("--primary", "#0f766e"), accent: read("--accent", "#14b8a6") };
}

/** prefers-reduced-motion 命中 → 关闭 canvas 动画 */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** 打开原生日期选择器（问题 B：点"年/月/日"文字区域也要弹日历）；
 *  showPicker 需用户手势，非手势或老浏览器会抛 SecurityError/TypeError → 静默回落原生手输。 */
function openDatePicker(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    el.showPicker?.();
  } catch {
    /* 回落原生输入行为，不阻断 */
  }
}

/** 单类型卡聚合（纯函数，可独立单测）：按 billingPath 聚合，quota 用分累加防浮点漂移 */
function aggregateByBillingPath(rows: UsageBreakdownRow[]): Array<{
  path: string;
  label: string;
  requestCount: number;
  tokens: number;
  quotaYuan: string;
}> {
  return TYPE_CARD_PATHS.map((path) => {
    let requestCount = 0;
    let tokens = 0;
    let quotaMinor = 0;
    for (const r of rows) {
      if (r.billingPath !== path) continue;
      requestCount += r.requestCount;
      tokens += r.tokens;
      quotaMinor += Math.round(Number(r.quotaYuan) * 100);
    }
    return {
      path,
      label: billingPathLabel(path),
      requestCount,
      tokens,
      quotaYuan: (quotaMinor / 100).toFixed(2),
    };
  });
}

export function UsageStatsPanel() {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [range, setRange] = useState<RangeId>("30d");
  // 初始即回填 30 日窗口（与服务端 getUsageStats 同公式），杜绝"默认近30日但日期框空白"
  const [dateFrom, setDateFrom] = useState<string>(() => presetWindow("30d", new Date()).dateFrom);
  const [dateTo, setDateTo] = useState<string>(() => presetWindow("30d", new Date()).dateTo);
  // 明细表按 billingPath 过滤（点击类型卡切换；null=不过滤）
  const [activePath, setActivePath] = useState<string | null>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  // 单一取数源：日期齐备即走 dateFrom&dateTo（含 preset 态），preset/custom 不再双源漂移
  const windowQuery =
    dateFrom && dateTo
      ? `dateFrom=${dateFrom}&dateTo=${dateTo}`
      : `range=${range}`;

  const { data, error, isLoading, mutate } = useSWR<UsageStatsView>(
    `/api/v1/user/usage/stats?${windowQuery}`,
    fetcher
  );
  const { data: breakdown, mutate: mutateBreakdown } = useSWR<UsageBreakdownView>(
    `/api/v1/user/usage/breakdown?${windowQuery}`,
    fetcher
  );

  const colors = useMemo(themeColors, []);
  const animation = useMemo(() => !prefersReducedMotion(), []);
  const trendOption = useMemo(
    () => (data ? buildDailyTrendOption(data.daily, colors, animation) : null),
    [data, colors, animation]
  );
  const rankOption = useMemo(
    () => (data && data.models.length > 0 ? buildModelRankOption(data.models, colors.primary, animation) : null),
    [data, colors, animation]
  );

  /** 类型汇总卡（纯前端聚合 breakdown.rows，零新端点） */
  const typeCards = useMemo(() => (breakdown ? aggregateByBillingPath(breakdown.rows) : []), [breakdown]);

  /** 明细表可见行：受 activePath 过滤 */
  const visibleRows = useMemo(() => {
    if (!breakdown) return [];
    if (!activePath) return breakdown.rows;
    return breakdown.rows.filter((r) => r.billingPath === activePath);
  }, [breakdown, activePath]);

  const handlePreset = useCallback((id: RangeId) => {
    setMode("preset");
    setRange(id);
    const w = presetWindow(id, new Date());
    setDateFrom(w.dateFrom);
    setDateTo(w.dateTo);
    setActivePath(null);
  }, []);

  return (
    <div data-testid="usage-stats-panel">
      {/* 区间切换（预设硬上限 90d + 自定义日期区间≤ 92 天） */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="统计区间">
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handlePreset(r.id)}
              aria-pressed={mode === "preset" && range === r.id}
              className={
                mode === "preset" && range === r.id
                  ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors"
                  : "rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-muted hover:text-foreground"
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        {/* 自定义日期区间（问题 4：指定日期查看）；整行可点即弹日历（问题 B） */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1">
          <input
            ref={fromRef}
            type="date"
            aria-label="开始日期"
            value={dateFrom}
            max={dateTo || undefined}
            onClick={() => openDatePicker(fromRef.current)}
            onChange={(e) => {
              setDateFrom(e.target.value);
              if (e.target.value) setMode("custom");
            }}
            className="cursor-pointer bg-transparent text-xs text-slate-700 outline-none"
          />
          <span className="text-xs text-slate-400">至</span>
          <input
            ref={toRef}
            type="date"
            aria-label="结束日期"
            value={dateTo}
            min={dateFrom || undefined}
            onClick={() => openDatePicker(toRef.current)}
            onChange={(e) => {
              setDateTo(e.target.value);
              if (e.target.value && dateFrom) setMode("custom");
            }}
            className="cursor-pointer bg-transparent text-xs text-slate-700 outline-none"
          />
        </div>
      </div>

      {/* 错误态（重试动作） */}
      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          统计加载失败：{(error as Error).message}
          <button
            type="button"
            onClick={() => void mutate()}
            className="ml-3 rounded-md border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            重试
          </button>
        </div>
      ) : null}

      {/* 骨架态 */}
      {isLoading ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {["s1", "s2", "s3"].map((k) => (
            <div key={k} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
          <div className="h-[280px] animate-pulse rounded-lg bg-muted sm:col-span-3" />
        </div>
      ) : null}

      {/* 数据态 */}
      {data ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-slate-500">总请求数</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {data.summary.totalRequests.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-slate-500">总 Tokens</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {data.summary.totalTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-slate-500">总花费</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                ¥{data.summary.totalQuotaYuan}
              </p>
            </div>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-foreground">每日趋势（Tokens / 花费）</h3>
          <div className="mt-2 h-[280px] w-full rounded-lg border border-border bg-card p-2">
            {trendOption ? <EChartWrapper option={trendOption} /> : null}
          </div>

          <h3 className="mt-6 text-sm font-semibold text-foreground">模型 TopN（按 Tokens）</h3>
          {rankOption ? (
            <div className="mt-2 h-[280px] w-full rounded-lg border border-border bg-card p-2">
              <EChartWrapper option={rankOption} />
            </div>
          ) : (
            <p className="mt-2 rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-slate-400">
              当前区间暂无模型调用记录
            </p>
          )}
        </>
      ) : null}

      {/* 消耗明细（问题 4：渠道×模型×计费路径；走 usage_logs 有界聚合） */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">消耗明细（来源 × 模型 × 计费路径）</h3>
      </div>

      {/* 按类型消耗汇总卡（纯前端聚合；点击卡过滤明细表） */}
      {breakdown && breakdown.rows.length > 0 ? (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="按类型消耗汇总">
          {typeCards.map((c) => {
            const active = activePath === c.path;
            return (
              <button
                key={c.path}
                type="button"
                onClick={() => setActivePath(active ? null : c.path)}
                aria-pressed={active}
                className={
                  active
                    ? "rounded-lg border border-primary bg-primary/5 px-3 py-2 text-left"
                    : "rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/40"
                }
              >
                <p className="truncate text-xs text-slate-500">{c.label}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">¥{c.quotaYuan}</p>
                <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                  {c.requestCount.toLocaleString()} 次 · {c.tokens.toLocaleString()} tokens
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {breakdown ? (
        visibleRows.length > 0 ? (
          <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">来源</th>
                  <th className="px-3 py-2 font-medium">类型</th>
                  <th className="px-3 py-2 font-medium">模型</th>
                  <th className="px-3 py-2 font-medium">计费路径</th>
                  <th className="px-3 py-2 text-right font-medium tabular-nums">请求数</th>
                  <th className="px-3 py-2 text-right font-medium tabular-nums">Tokens</th>
                  <th className="px-3 py-2 text-right font-medium tabular-nums">花费</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr key={`${row.source}-${row.model}-${row.billingPath}-${i}`} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 text-foreground">{row.source}</td>
                    <td className="px-3 py-2 text-slate-500">{SOURCE_TYPE_LABEL[row.sourceType]}</td>
                    <td className="px-3 py-2 text-slate-700">{row.model}</td>
                    <td className="px-3 py-2 text-slate-500">{billingPathLabel(row.billingPath)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">{row.requestCount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">{row.tokens.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">¥{row.quotaYuan}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border text-slate-600">
                <tr>
                  <td className="px-3 py-2 font-medium" colSpan={4}>
                    合计（{breakdown.from} ~ {breakdown.to}
                    {activePath ? ` · ${billingPathLabel(activePath)}` : ""}）
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {activePath
                      ? visibleRows.reduce((s, r) => s + r.requestCount, 0).toLocaleString()
                      : breakdown.summary.totalRequests.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {activePath
                      ? visibleRows.reduce((s, r) => s + r.tokens, 0).toLocaleString()
                      : breakdown.summary.totalTokens.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {activePath
                      ? `¥${((visibleRows.reduce((s, r) => s + Math.round(Number(r.quotaYuan) * 100), 0) / 100).toFixed(2))}`
                      : `¥${breakdown.summary.totalQuotaYuan}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="mt-2 rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-slate-400">
            当前区间暂无{activePath ? `「${billingPathLabel(activePath)}」` : ""}消耗明细
          </p>
        )
      ) : (
        <div className="mt-2 h-16 animate-pulse rounded-lg border border-border bg-card" />
      )}
    </div>
  );
}

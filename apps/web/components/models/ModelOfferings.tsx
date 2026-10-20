"use client";

/**
 * 模型详情「在哪里可调用」· 多源上架观测（TASK-067；数据 GET /api/v1/models/[id]/offerings，TASK-066）。
 *
 * 五态（MONITORING_UX_STATES.modelOfferings）：offerings-loading / offerings-empty / offerings-error / offerings-ready；
 *   forbidden 不出现（公开区块）。
 * 呈现口径：
 *   - 价格以原币原单位展示并标注来源（U-15 未决前不出现任何 ¥ 换算值）；
 *   - kind=relay（中转）源显示「身份未验证」：中转站自报的模型名不能作为身份证据（REQ-M-014）；
 *   - attribution_required 源在区块底部署名并链接（ADR-P007）；
 *   - 时间按 Asia/Shanghai 展示；桌面表格、移动端卡片。
 */
import { useCallback, useEffect, useMemo, useState } from "react";

interface OfferingItem {
  sourceKey: string;
  sourceLabel: string;
  tier: "S1" | "S2" | "A" | "B" | "C";
  kind: string;
  isListed: boolean;
  identityVerified: boolean;
  priceUnit: "usd_per_1m_tokens" | "cny_per_1m_tokens" | "usd_per_request" | "ratio" | null;
  priceInput: string | null;
  priceOutput: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceUrl: string;
  attribution: string | null;
}

const TIER_CLS: Record<OfferingItem["tier"], string> = {
  S1: "border-emerald-300 bg-emerald-50 text-emerald-700",
  S2: "border-teal-300 bg-teal-50 text-teal-700",
  A: "border-sky-300 bg-sky-50 text-sky-700",
  B: "border-slate-300 bg-slate-50 text-slate-600",
  C: "border-amber-300 bg-amber-50 text-amber-700",
};

export const KIND_LABEL: Record<string, string> = {
  official: "官方",
  cloud: "云平台",
  hosted: "托管推理",
  aggregator: "聚合平台",
  relay: "中转",
  benchmark: "评测",
  community: "社区",
};

/** 原币单位标签（不换算） */
export function unitLabel(unit: OfferingItem["priceUnit"]): string {
  switch (unit) {
    case "usd_per_1m_tokens":
      return "USD / 1M Tokens";
    case "cny_per_1m_tokens":
      return "CNY / 1M Tokens";
    case "usd_per_request":
      return "USD / 次";
    case "ratio":
      return "倍率（相对官方价）";
    default:
      return "单位未公开";
  }
}

/** 原币价格：保留源数据精度（去尾随 0），0 显示「免费」，缺失「—」 */
export function fmtOrigin(v: string | null, unit: OfferingItem["priceUnit"]): string {
  if (v === null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n === 0 && unit !== "ratio") return "免费";
  const plain = v.includes(".") ? v.replace(/0+$/, "").replace(/\.$/, "") : v;
  if (unit === "usd_per_1m_tokens" || unit === "usd_per_request") return `$${plain}`;
  if (unit === "cny_per_1m_tokens") return `¥${plain}`;
  if (unit === "ratio") return `×${plain}`;
  return plain;
}

const SH_DATE = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : SH_DATE.format(d);
};

/**
 * 摘要：在架源数 + 同单位（USD/1M）最低输入价及其来源。
 * 最低价只在「身份已验证」的源中取（中转源价格低但无法证明背后模型，不能作为「最低价」宣传）；全部为中转时才退而取中转并标注。
 */
export function summarize(items: OfferingItem[]): { listed: number; cheapest: OfferingItem | null } {
  const listed = items.filter((i) => i.isListed);
  const priced = listed.filter((i) => i.priceUnit === "usd_per_1m_tokens" && i.priceInput !== null);
  const pool = priced.some((i) => i.identityVerified) ? priced.filter((i) => i.identityVerified) : priced;
  const cheapest = pool.reduce<OfferingItem | null>((best, i) => (best === null || Number(i.priceInput) < Number(best.priceInput) ? i : best), null);
  return { listed: listed.length, cheapest };
}

function RelayChip() {
  return (
    <span
      data-testid="offerings-relay-unverified"
      title="中转站自报的模型名无法证明其背后真实调用的模型，仅作价格参考"
      className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
    >
      身份未验证
    </span>
  );
}

function ListedChip({ listed }: { listed: boolean }) {
  return listed ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">在架</span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">已下架</span>
  );
}

function SourceCell({ it }: { it: OfferingItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex rounded border px-1 text-[10px] font-semibold leading-4 ${TIER_CLS[it.tier]}`} title={`源分级 ${it.tier}`}>
        {it.tier}
      </span>
      <span className="font-medium text-slate-700">{it.sourceLabel}</span>
      <span className="text-[11px] text-slate-400">{KIND_LABEL[it.kind] ?? it.kind}</span>
      {!it.identityVerified ? <RelayChip /> : null}
    </div>
  );
}

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; items: OfferingItem[] };

export function ModelOfferings({ modelId }: { modelId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/v1/models/${encodeURIComponent(modelId)}/offerings`, { headers: { accept: "application/json" } });
      const body = (await res.json()) as { code?: number; message?: string; data?: { items: OfferingItem[] } };
      if (res.ok && body.code === 0 && body.data) setState({ kind: "ready", items: body.data.items });
      else setState({ kind: "error", message: body.message ?? `加载失败（${res.status}）` });
    } catch {
      setState({ kind: "error", message: "网络异常" });
    }
  }, [modelId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => (state.kind === "ready" ? summarize(state.items) : null), [state]);

  if (state.kind === "loading") {
    return (
      <div data-testid="offerings-loading" aria-busy="true" className="space-y-2">
        <span className="sr-only">多源上架数据加载中…</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div data-testid="offerings-error" role="alert" className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
        <span>多源上架数据加载失败：{state.message}</span>
        <button type="button" onClick={() => void load()} className="rounded-md border border-rose-200 bg-white px-3 py-1 text-xs hover:bg-rose-50">
          重试
        </button>
      </div>
    );
  }
  if (state.items.length === 0) {
    return (
      <p data-testid="offerings-empty" className="rounded-md border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-slate-500">
        暂无多源上架数据
      </p>
    );
  }

  const items = state.items;
  const hasRelay = items.some((i) => !i.identityVerified);
  const attributions = [...new Map(items.filter((i) => i.attribution).map((i) => [i.attribution as string, i.sourceUrl])).entries()];

  return (
    <div data-testid="offerings-ready" className="space-y-3">
      {summary ? (
        summary.listed === 0 ? (
          <p className="text-sm text-slate-600">目前各来源均已下架，以下为历史观测记录。</p>
        ) : (
          <p className="text-sm text-slate-600">
            已在 <span className="font-semibold text-foreground">{summary.listed}</span> 个来源上架
            {summary.cheapest ? (
              <>
                ，最低输入价 <span className="font-semibold text-primary">{fmtOrigin(summary.cheapest.priceInput, summary.cheapest.priceUnit)}</span>
                <span className="text-xs text-slate-400">
                  {Number(summary.cheapest.priceInput) === 0 ? "（" : " / 1M Tokens（"}
                  {summary.cheapest.sourceLabel}
                  {summary.cheapest.identityVerified ? "" : "，中转·身份未验证"}）
                </span>
              </>
            ) : null}
          </p>
        )
      ) : null}

      {/* 桌面：表格 */}
      <div className="hidden overflow-x-auto rounded-lg border border-[var(--border)] sm:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--muted)] text-xs text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">来源</th>
              <th scope="col" className="px-3 py-2 font-medium">状态</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">输入</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">输出</th>
              <th scope="col" className="px-3 py-2 font-medium">单位（原币）</th>
              <th scope="col" className="px-3 py-2 font-medium">最后采集（北京时间）</th>
              <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">来源链接</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.sourceKey} data-testid="offerings-row" className={`border-t border-[var(--border)] ${it.isListed ? "" : "text-slate-400"}`}>
                <td className="px-3 py-2"><SourceCell it={it} /></td>
                <td className="px-3 py-2"><ListedChip listed={it.isListed} /></td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtOrigin(it.priceInput, it.priceUnit)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtOrigin(it.priceOutput, it.priceUnit)}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{unitLabel(it.priceUnit)}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{fmtTime(it.lastSeenAt)}</td>
                <td className="px-3 py-2 text-xs">
                  <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">
                    查看来源
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动：卡片 */}
      <ul className="space-y-2 sm:hidden">
        {items.map((it) => (
          <li key={it.sourceKey} data-testid="offerings-card" className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <SourceCell it={it} />
              <ListedChip listed={it.isListed} />
            </div>
            <p className="mt-2 font-mono text-xs text-slate-600">
              输入 {fmtOrigin(it.priceInput, it.priceUnit)} · 输出 {fmtOrigin(it.priceOutput, it.priceUnit)}
              <span className="ml-1 font-sans text-slate-400">（{unitLabel(it.priceUnit)}）</span>
            </p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>最后采集 {fmtTime(it.lastSeenAt)}</span>
              <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-primary">查看来源</a>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-1 text-[11px] leading-relaxed text-slate-400">
        <p>价格为各来源公开目录的原币原单位，按日采集，平台不做换算；实际调用价以来源页面为准。</p>
        {hasRelay ? <p>「身份未验证」：中转站自报的模型名无法证明其背后调用的真实模型，仅作价格参考。</p> : null}
        {attributions.length > 0 ? (
          <p data-testid="offerings-attribution">
            部分数据来源：
            {attributions.map(([name, url], i) => (
              <span key={name}>
                {i > 0 ? "、" : null}
                <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{name}</a>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}

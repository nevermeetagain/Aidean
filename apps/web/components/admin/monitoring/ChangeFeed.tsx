"use client";

/**
 * ChangeFeed — 目录变更流（TASK-064）。
 *
 * 4 类事件（listed/delisted/model_first_seen/price_changed）按 sourceKey+kind 过滤、分页；
 * 事件卡展示模型 ID、源、检测时间与证据外链；price_changed 额外展示原币原单位的前后价格与
 * 带符号 deltaPct（不做汇率换算，U-15 未决）。
 */
import { Button } from "@aidean/ui";
import type { CatalogChangeEvent, MonitoringPriceUnit } from "@aidean/shared";

export type ChangeKind = CatalogChangeEvent["kind"];

const KIND_LABEL: Record<ChangeKind, string> = {
  listed: "上架",
  delisted: "下架",
  model_first_seen: "首次发现",
  price_changed: "价格变更",
};

const KIND_CLASS: Record<ChangeKind, string> = {
  listed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  delisted: "bg-red-50 text-red-700 ring-red-200",
  model_first_seen: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  price_changed: "bg-amber-50 text-amber-700 ring-amber-200",
};

const PRICE_UNIT_LABEL: Record<MonitoringPriceUnit, string> = {
  usd_per_1m_tokens: "USD / 1M tokens",
  cny_per_1m_tokens: "CNY / 1M tokens",
  usd_per_request: "USD / 请求",
  ratio: "倍率",
};

const priceText = (v: string | null) => (v === null ? "—" : v);

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

export interface ChangeFeedProps {
  rows: CatalogChangeEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  kind: ChangeKind | "";
  sourceKey: string;
  sourceOptions: Array<{ key: string; label: string }>;
  onKindChange: (kind: ChangeKind | "") => void;
  onSourceChange: (sourceKey: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

export function ChangeFeed({
  rows,
  total,
  page,
  pageSize,
  totalPages,
  loading,
  error,
  kind,
  sourceKey,
  sourceOptions,
  onKindChange,
  onSourceChange,
  onPageChange,
  onRetry,
}: ChangeFeedProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">变更流</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            价格按源站原币原单位展示（不做汇率换算）；证据链接直达源站页面。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-500">
            类型
            <select
              data-testid="monitoring-kind-filter"
              value={kind}
              onChange={(e) => onKindChange(e.target.value as ChangeKind | "")}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
            >
              <option value="">全部</option>
              {(Object.keys(KIND_LABEL) as ChangeKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            来源
            <select
              data-testid="monitoring-source-filter"
              value={sourceKey}
              onChange={(e) => onSourceChange(e.target.value)}
              className="max-w-48 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
            >
              <option value="">全部</option>
              {sourceOptions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div
          data-testid="monitoring-changes-error"
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-red-700"
        >
          <span>变更流加载失败：{error}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <p data-testid="monitoring-changes-loading" className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
          <span className="inline-flex animate-pulse items-center gap-2">加载中…</span>
        </p>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p data-testid="monitoring-changes-empty" className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
          暂无变更事件
        </p>
      ) : null}

      <ul data-testid="monitoring-change-list" className="space-y-2">
        {rows.map((e) => (
          <li
            key={e.id}
            data-testid="monitoring-change-item"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-[var(--shadow-sm)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid={`monitoring-change-kind-${e.kind}`}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                  KIND_CLASS[e.kind] ?? KIND_CLASS.listed
                }`}
              >
                {KIND_LABEL[e.kind] ?? e.kind}
              </span>
              <span className="font-mono text-xs font-medium text-slate-800">{e.normalizedModelId}</span>
              {e.externalModelId !== e.normalizedModelId ? (
                <span className="font-mono text-[11px] text-slate-400">源内 ID: {e.externalModelId}</span>
              ) : null}
              <span className="ml-auto text-[11px] text-slate-400">
                {e.sourceKey} · {formatWhen(e.detectedAt)}
              </span>
            </div>

            {e.kind === "price_changed" ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                  {PRICE_UNIT_LABEL[e.priceUnit] ?? e.priceUnit}
                </span>
                <span className="text-slate-500">
                  输入 <span className="font-mono text-slate-700">{priceText(e.before.input)}</span>
                  <span className="mx-1 text-slate-400">→</span>
                  <span className="font-mono font-medium text-slate-900">{priceText(e.after.input)}</span>
                </span>
                <span className="text-slate-500">
                  输出 <span className="font-mono text-slate-700">{priceText(e.before.output)}</span>
                  <span className="mx-1 text-slate-400">→</span>
                  <span className="font-mono font-medium text-slate-900">{priceText(e.after.output)}</span>
                </span>
                <span
                  data-testid="monitoring-change-delta"
                  className={`font-mono text-[11px] font-semibold ${
                    e.deltaPct > 0 ? "text-red-600" : e.deltaPct < 0 ? "text-emerald-600" : "text-slate-500"
                  }`}
                >
                  {e.deltaPct > 0 ? "+" : ""}
                  {e.deltaPct.toFixed(2)}%
                </span>
              </div>
            ) : null}

            <a
              href={e.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block text-[11px] text-[var(--primary)] hover:underline"
            >
              查看证据 ↗
            </a>
          </li>
        ))}
      </ul>

      {total > 0 ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1 || loading}>
            上一页
          </Button>
          <span className="text-xs text-slate-500">
            第 {page} / {Math.max(1, totalPages)} 页 · {from}–{to} / 共 {total} 条
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(Math.max(1, totalPages), page + 1))}
            disabled={page >= Math.max(1, totalPages) || loading}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  );
}

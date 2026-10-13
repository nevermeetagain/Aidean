"use client";

/**
 * 余额页「用量明细」区块（WP-FE01 §资产链路：用量可解释 / 分→元统一）。
 *
 * 契约：GET /api/v1/user/usage?page&pageSize&model&billingPath（UsagePageSchema）
 *   → { items: UsageLogView[], total, page, pageSize }，金额字段 quotaYuan **已是元字符串**
 *     （网关 listUsagePage 读侧即分转元），本组件不再做二次换算，避免重复除百。
 * 呈现：时间倒序分页列表 + 模型/计费路径筛选 + 加载骨架 + 空态 + 错误态（含重试动作）。
 * 约束：不引 globals.css / uiStore / ThemeProvider；不新增色值；动画仅 motion-safe:。
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { billingPathLabel } from "../../lib/features/gateway/stream-parse";

/** 计费路径筛选可选项（与 shared UsageQuerySchema 枚举同域） */
const PATH_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "全部计费路径" },
  { value: "PLATFORM", label: "平台余额" },
  { value: "FREE_QUOTA", label: "免费额度" },
  { value: "PACKAGE", label: "套餐额度" },
  { value: "FREE_PROXY", label: "自定义渠道" },
  { value: "UPSTREAM", label: "自有 Key 上游" },
];

const PAGE_SIZE = 20;

interface UsageItem {
  id: string;
  model: string;
  stationName?: string | null;
  promptTokens: number;
  completionTokens: number;
  quotaYuan: string;
  billingPath: string;
  latencyMs?: number | null;
  statusCode?: number | null;
  createdAt: string;
}

interface UsageEnvelope {
  code?: number;
  message?: string;
  data?: { items?: UsageItem[]; total?: number; page?: number; pageSize?: number };
}

const FIELD_CLS =
  "rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary";

/** ISO → 本地 MM-DD HH:mm；非法时间原样回显 */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function UsageLedger() {
  const [page, setPage] = useState(1);
  const [model, setModel] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [billingPath, setBillingPath] = useState("");

  const [items, setItems] = useState<UsageItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (model) params.set("model", model);
    if (billingPath) params.set("billingPath", billingPath);

    fetch(`/api/v1/user/usage?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => ({ status: res.status, body: (await res.json().catch(() => null)) as UsageEnvelope | null }))
      .then(({ status, body }) => {
        if (controller.signal.aborted) return;
        if (status === 200 && body?.code === 0 && Array.isArray(body.data?.items)) {
          setItems(body.data.items);
          setTotal(body.data.total ?? body.data.items.length);
        } else {
          setError(body?.message ?? `用量明细加载失败（HTTP ${status}）`);
          setItems(null);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "用量明细加载失败");
        setItems(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, model, billingPath, reloadToken]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyModelFilter = useCallback(() => {
    setPage(1);
    setModel(modelDraft.trim());
  }, [modelDraft]);

  const resetFilters = useCallback(() => {
    setModelDraft("");
    setModel("");
    setBillingPath("");
    setPage(1);
  }, []);

  return (
    <div data-testid="usage-ledger">
      {/* 筛选行 */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          模型
          <input
            value={modelDraft}
            onChange={(event) => setModelDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyModelFilter();
              }
            }}
            placeholder="如 claude-3-7-sonnet"
            data-testid="usage-model-filter"
            className={`${FIELD_CLS} w-52`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          计费路径
          <select
            value={billingPath}
            onChange={(event) => {
              setBillingPath(event.target.value);
              setPage(1);
            }}
            data-testid="usage-path-filter"
            className={FIELD_CLS}
          >
            {PATH_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={applyModelFilter}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-muted"
        >
          筛选
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-muted"
        >
          重置
        </button>
      </div>

      {/* 加载骨架 */}
      {loading ? (
        <div className="mt-4 space-y-2" aria-busy="true" aria-label="用量明细加载中" data-testid="usage-loading">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-6 w-full rounded bg-muted motion-safe:animate-pulse" aria-hidden="true" />
          ))}
        </div>
      ) : error ? (
        /* 错误态：文案 + 重试动作 */
        <div
          role="alert"
          data-testid="usage-error"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
        >
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            用量明细加载失败
          </p>
          <p className="mt-1 text-xs">{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            重试
          </button>
        </div>
      ) : !items || items.length === 0 ? (
        /* 空态 */
        <p className="mt-4 py-6 text-center text-sm text-slate-400" data-testid="usage-empty">
          暂无用量记录。在控制台「调用测试台」发起一次调用后，此处会按时间倒序展示 token 与金额明细。
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-slate-400">
                  <th scope="col" className="py-2 pr-3 font-medium">时间</th>
                  <th scope="col" className="py-2 pr-3 font-medium">模型</th>
                  <th scope="col" className="py-2 pr-3 font-medium">站点</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">输入 tokens</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">输出 tokens</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">金额</th>
                  <th scope="col" className="py-2 pr-3 font-medium">计费路径</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">延迟</th>
                  <th scope="col" className="py-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{fmtTime(item.createdAt)}</td>
                    <td className="py-2 pr-3">{item.model}</td>
                    <td className="py-2 pr-3">{item.stationName ?? "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{item.promptTokens.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{item.completionTokens.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium" data-testid="usage-amount">
                      ¥{item.quotaYuan}
                    </td>
                    <td className="py-2 pr-3">{billingPathLabel(item.billingPath)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {item.latencyMs === null || item.latencyMs === undefined ? "—" : `${item.latencyMs} ms`}
                    </td>
                    <td className="py-2 tabular-nums">{item.statusCode ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <nav aria-label="用量明细分页" className="mt-3 flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-primary transition-opacity hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
            >
              上一页
            </button>
            <span className="text-slate-500">
              {page} / {totalPages} · 共 {total} 条
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-primary transition-opacity hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
            >
              下一页
            </button>
          </nav>
        </>
      )}

      <p className="mt-3 text-xs text-slate-400">
        金额单位统一为元；网关成功响应头 x-aidean-quota-minor 为分，二者按 100 换算一致。
      </p>
    </div>
  );
}

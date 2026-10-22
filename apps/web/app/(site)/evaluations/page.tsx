"use client";

/**
 * /evaluations — 对比测评历史列表（EVAL-01）。
 * - 客户端拉取我的分页 + 公开示例（demo）；401 → 登录引导 + 示例区；
 * - 状态标签映射后端 status（0/1/2/3），所有金额/文案来自后端。
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_META, type EvaluationListRow } from "../../../lib/features/evaluation/list-view";
import { toPanelResource, type EnvelopeLike } from "../../../lib/admin/panel-resource";

type ListData = { rows: EvaluationListRow[]; total: number };

/**
 * 列表状态（UX-02，复用 B11-05 五态口径 toPanelResource：失败永不落 empty）：
 * loading → guest(401) | empty(200 且 total=0) | ready | error(断网/5xx/非 JSON，可重试)。
 */
type ListState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "empty" }
  | { status: "ready"; data: ListData }
  | { status: "error"; message: string };

async function fetchEnvelope<T>(url: string): Promise<EnvelopeLike<T>> {
  try {
    const res = await fetch(url);
    const body = (await res.json().catch(() => null)) as { code?: number; data?: T; message?: string } | null;
    const ok = res.ok && !!body && body.code === 0;
    return { ok, status: res.status, data: ok ? (body?.data ?? null) : null, message: body?.message ?? null };
  } catch {
    return { ok: false, status: 0, data: null, message: null };
  }
}

export default function EvaluationsListPage() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [demos, setDemos] = useState<EvaluationListRow[]>([]);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const pageSize = 10;
  const rows = state.status === "ready" ? state.data.rows : [];
  const total = state.status === "ready" ? state.data.total : 0;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      // 列表与公开示例互不牵连：示例失败只隐藏示例区，列表失败仍可展示示例
      const [listRes, demoRes] = await Promise.all([
        fetchEnvelope<{ rows?: EvaluationListRow[]; total?: number }>(`/api/v1/evaluations?page=${page}&pageSize=${pageSize}`),
        fetchEnvelope<{ items?: EvaluationListRow[] }>("/api/v1/evaluations/demo?limit=3"),
      ]);
      if (cancelled) return;
      setDemos(demoRes.ok ? (demoRes.data?.items ?? []) : []);
      if (listRes.status === 401) {
        setState({ status: "guest" });
        return;
      }
      const resource = toPanelResource<ListData>(
        {
          ...listRes,
          data: listRes.data ? { rows: listRes.data.rows ?? [], total: listRes.data.total ?? 0 } : null,
        },
        (d) => d.rows.length === 0 && d.total === 0,
      );
      if (resource.status === "ready") setState({ status: "ready", data: resource.data });
      else if (resource.status === "empty") setState({ status: "empty" });
      else if (resource.status === "error" || resource.status === "forbidden")
        setState({ status: "error", message: resource.message });
      else setState({ status: "loading" });
    })();
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  return (
    // UX-14：正文容器全宽（M-WIDE，与页头同宽；原 max-w-4xl 窄容器已去除）
    <main className="w-full px-4 py-14 md:px-6">
      <div className="w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">对比测评</h1>
          <Link
            href="/evaluations/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            新建测评
          </Link>
        </div>

        {state.status === "guest" ? (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="text-base font-semibold text-slate-700">请先登录</p>
            <p className="mt-2 text-sm text-slate-500">
              登录后查看你的对比测评记录；下方可预览公开示例。
            </p>
            <Link
              href="/login?redirect=%2Fevaluations"
              className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
            >
              去登录
            </Link>
          </div>
        ) : (
          <section aria-label="我的测评" className="mt-8">
            {state.status === "loading" ? (
              <p role="status" className="py-10 text-center text-sm text-slate-500" data-testid="evaluations-loading">加载中…</p>
            ) : state.status === "error" ? (
              <div role="alert" data-testid="evaluations-error" className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                <p className="text-sm font-medium text-red-700">测评记录加载失败</p>
                <p className="mt-1 text-xs text-red-600">{state.message}</p>
                <button
                  type="button"
                  data-testid="evaluations-retry"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-4 inline-block rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-50"
                >
                  重试
                </button>
              </div>
            ) : state.status === "empty" ? (
              <div data-testid="evaluations-empty" className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">还没有测评记录，选择 2–6 个模型开始第一次对比吧。</p>
                <Link
                  href="/evaluations/new"
                  className="mt-4 inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  去创建
                </Link>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <Link href={`/evaluations/${row.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[row.status]?.cls ?? ""}`}>
                          {STATUS_META[row.status]?.label ?? String(row.status)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{row.prompt}</span>
                        <span className="text-xs text-slate-400">{row.modelCount} 模型</span>
                        <span className="text-xs tabular-nums text-slate-500">¥{row.costYuan}</span>
                        <span className="text-xs tabular-nums text-slate-400">{row.createdAt.slice(0, 16).replace("T", " ")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {total > pageSize && (
                  <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition-colors hover:text-primary disabled:opacity-40"
                    >
                      上一页
                    </button>
                    <span className="text-slate-500">
                      {page} / {Math.ceil(total / pageSize)}
                    </span>
                    <button
                      type="button"
                      disabled={page >= Math.ceil(total / pageSize)}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition-colors hover:text-primary disabled:opacity-40"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {demos.length > 0 && (
          <section aria-label="公开示例" className="mt-10">
            <h2 className="text-sm font-semibold text-slate-700">公开示例（免费预览）</h2>
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {demos.map((row) => (
                <li key={row.id}>
                  <Link href={`/evaluations/${row.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">示例</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{row.prompt}</span>
                    <span className="text-xs text-slate-400">{row.modelCount} 模型</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

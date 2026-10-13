"use client";

/**
 * /evaluations — 对比测评历史列表（EVAL-01）。
 * - 客户端拉取我的分页 + 公开示例（demo）；401 → 登录引导 + 示例区；
 * - 状态标签映射后端 status（0/1/2/3），所有金额/文案来自后端。
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_META, type EvaluationListRow } from "../../../lib/features/evaluation/list-view";

export default function EvaluationsListPage() {
  const [rows, setRows] = useState<EvaluationListRow[]>([]);
  const [demos, setDemos] = useState<EvaluationListRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "guest">("loading");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [listRes, demoRes] = await Promise.all([
          fetch(`/api/v1/evaluations?page=${page}&pageSize=${pageSize}`),
          fetch("/api/v1/evaluations/demo?limit=3"),
        ]);
        const listBody = await listRes.json().catch(() => null);
        const demoBody = await demoRes.json().catch(() => null);
        if (cancelled) return;
        if (listRes.status === 401) {
          setState("guest");
        } else {
          setState("ready");
          setRows(listBody?.data?.rows ?? []);
          setTotal(listBody?.data?.total ?? 0);
        }
        setDemos(demoBody?.data?.items ?? []);
      } catch {
        if (!cancelled) setState("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-14 md:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">对比测评</h1>
        <Link
          href="/evaluations/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          新建测评
        </Link>
      </div>

      {state === "guest" ? (
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
          {state === "loading" ? (
            <p className="py-10 text-center text-sm text-slate-400">加载中…</p>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
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
    </main>
  );
}

"use client";

/**
 * /evaluations/[id] — 对比测评并排详情（EVAL-01）。
 * - 多列并排（≥lg 多列、窄屏横向滚动）；失败列显示原因；每列可复制回答；
 * - status=1 时每 2s 轮询至终态；未登录 401 → 登录引导。
 */
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { STATUS_META, type EvaluationDetailView } from "../../../../lib/features/evaluation/list-view";

export default function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [evaluation, setEvaluation] = useState<EvaluationDetailView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "guest" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const res = await fetch(`/api/v1/evaluations/${id}`);
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          setState("guest");
          return;
        }
        if (!res.ok || !body?.data?.evaluation) {
          setState("error");
          setMessage(body?.message ?? "加载失败");
          return;
        }
        const ev = body.data.evaluation as EvaluationDetailView;
        setEvaluation(ev);
        setState("ready");
        if (ev.status === 1) {
          timer = setTimeout(load, 2000); // 执行中轮询
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  async function copyText(modelId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(modelId);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* 剪贴板不可用静默 */
    }
  }

  if (state === "guest") {
    return (
      <main className="w-full px-4 py-14 text-center md:px-6">
        <p className="text-base font-semibold text-slate-700">请先登录</p>
        <p className="mt-2 text-sm text-slate-500">登录后可查看测评详情。</p>
        <Link
          href="/login?redirect=%2Fevaluations"
          className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        >
          去登录
        </Link>
      </main>
    );
  }

  if (state === "loading") {
    return (
      <main className="w-full px-4 py-14 md:px-6">
        <p className="py-10 text-center text-sm text-slate-400">加载中…</p>
      </main>
    );
  }

  if (state === "error" || !evaluation) {
    return (
      <main className="w-full px-4 py-14 text-center md:px-6">
        <p className="text-base font-semibold text-slate-700">无法查看该测评</p>
        <p className="mt-2 text-sm text-slate-500">{message || "记录不存在或无权访问"}</p>
        <Link
          href="/evaluations"
          className="mt-5 inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-primary/40 hover:text-primary"
        >
          返回列表
        </Link>
      </main>
    );
  }

  const statusMeta = STATUS_META[evaluation.status] ?? { label: String(evaluation.status), cls: "bg-slate-100 text-slate-500" };

  return (
    <main className="w-full px-4 py-14 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800">对比测评详情</h1>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{evaluation.prompt}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.cls}`}>{statusMeta.label}</span>
          <span className="text-xs tabular-nums text-slate-400">{evaluation.isPaid ? `¥${evaluation.costYuan}` : "免费示例"}</span>
        </div>
      </div>

      {evaluation.status === 1 && (
        <p className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
          模型正在并行回答中，页面将自动刷新…
        </p>
      )}
      {evaluation.errorMsg && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{evaluation.errorMsg}</p>
      )}

      <div className="mt-6 overflow-x-auto">
        <div className="flex min-w-max gap-4">
          {evaluation.models.map((m) => {
            const isWinner = evaluation.winnerModelId === m.modelId;
            return (
              <article key={m.id} className="flex w-72 shrink-0 flex-col rounded-lg border border-slate-200 bg-white">
                <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={m.modelSlug ? `/models/${m.modelSlug}` : `/models/${m.modelId}`}
                      className="truncate text-sm font-semibold text-slate-700 transition-colors hover:text-primary"
                    >
                      {m.modelName}
                    </Link>
                    {isWinner && (
                      <span className="mt-0.5 block text-xs font-medium text-primary">🏆 优胜</span>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      m.status === "completed"
                        ? "bg-emerald-50 text-emerald-600"
                        : m.status === "error"
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {m.status === "completed" ? "成功" : m.status === "error" ? "失败" : "待执行"}
                  </span>
                </header>

                <div className="min-h-48 grow whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed text-slate-700">
                  {m.status === "error" ? (
                    <p className="text-red-600">{m.errorMessage ?? "该模型调用失败"}</p>
                  ) : (
                    m.response || <span className="text-slate-300">（空响应）</span>
                  )}
                </div>

                <footer className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
                  <span className="tabular-nums">
                    {m.tokensTotal > 0 ? `${m.tokensTotal} tokens` : "—"}
                    {m.latencyMs != null ? ` · ${m.latencyMs}ms` : ""}
                  </span>
                  {m.status === "completed" && m.response && (
                    <button
                      type="button"
                      onClick={() => copyText(m.id, m.response as string)}
                      className="text-slate-400 transition-colors hover:text-primary"
                    >
                      {copied === m.id ? "已复制" : "复制"}
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-center">
        <Link
          href="/evaluations"
          className="text-sm text-slate-500 transition-colors hover:text-primary"
        >
          ← 返回测评列表
        </Link>
      </p>
    </main>
  );
}

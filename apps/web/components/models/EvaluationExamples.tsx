"use client";

/**
 * 模型详情 · 历史测评示例（TASK-074；替换「测评示例功能即将上线」占位）。
 *
 * 数据：后台预置的公开示例（evaluations.isPaid=false、status=已完成、未删除）中包含本模型的最近 3 条，服务端查询后传入。
 * 呈现：每条示例 = 题目 + 多模型回答并排（md 两列 / xl 三列），本模型高亮、胜者标注；长回答默认折叠。
 * 四态：samples-loading（页面 Suspense fallback）/ samples-empty / samples-error（服务端查询失败）/ samples-ready。
 * 回答按纯文本渲染（React 默认转义），不解析 HTML/Markdown，杜绝注入。
 */
import Link from "next/link";
import { useState } from "react";

export interface ExampleModelAnswer {
  modelId: string;
  modelName: string;
  modelSlug: string | null;
  response: string | null;
  latencyMs: number | null;
  tokensTotal: number;
  score: number | null;
}

export interface EvaluationExample {
  id: string;
  title: string | null;
  prompt: string;
  completedAt: string | null;
  winnerModelId: string | null;
  /** 后台预置演示单：必须显示「演示数据」（需求 §五.7 provenance） */
  isDemo: boolean;
  answers: ExampleModelAnswer[];
}

const COLLAPSE_AT = 360;
const SH_DAY = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });

function Answer({ a, isSelf, isWinner }: { a: ExampleModelAnswer; isSelf: boolean; isWinner: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const text = a.response?.trim() ?? "";
  const long = text.length > COLLAPSE_AT;
  return (
    <div
      data-testid="samples-answer"
      className={`flex flex-col rounded-lg border p-3 ${isSelf ? "border-primary/50 bg-primary/5" : "border-[var(--border)] bg-[var(--card)]"}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        {a.modelSlug && !isSelf ? (
          <Link href={`/models/${a.modelSlug}`} className="font-semibold text-slate-700 hover:text-primary">{a.modelName}</Link>
        ) : (
          <span className="font-semibold text-slate-700">{a.modelName}</span>
        )}
        {isSelf ? <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">本模型</span> : null}
        {isWinner ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">胜出</span> : null}
        <span className="ml-auto text-[10px] text-slate-400">
          {a.latencyMs !== null ? `${(a.latencyMs / 1000).toFixed(1)}s · ` : ""}
          {a.tokensTotal > 0 ? `${a.tokensTotal} tokens` : ""}
          {a.score !== null ? ` · ${a.score.toFixed(1)} 分` : ""}
        </span>
      </div>
      {text ? (
        <>
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">
            {long && !expanded ? `${text.slice(0, COLLAPSE_AT)}…` : text}
          </p>
          {long ? (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 self-start text-[11px] text-primary hover:underline">
              {expanded ? "收起" : "展开全文"}
            </button>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-slate-400">该模型未返回内容</p>
      )}
    </div>
  );
}

export function EvaluationExamples({ examples, currentModelId, error = false }: { examples: EvaluationExample[]; currentModelId: string; error?: boolean }) {
  if (error) {
    return (
      <p data-testid="samples-error" role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700">
        测评示例暂时无法加载，请稍后刷新重试
      </p>
    );
  }
  if (examples.length === 0) {
    return (
      <div data-testid="samples-empty" className="mt-4 rounded-md border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-slate-500">
        暂无包含该模型的公开测评示例
        <div className="mt-3">
          <Link href="/evaluations" className="text-xs text-primary hover:underline">去发起一次对比测评 →</Link>
        </div>
      </div>
    );
  }
  return (
    <div data-testid="samples-ready" className="mt-4 space-y-6">
      {examples.map((ex) => (
        <article key={ex.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <header className="mb-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                {ex.title ?? "对比测评"}
                {ex.isDemo ? (
                  <span data-testid="samples-demo-badge" className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    演示数据
                  </span>
                ) : null}
              </h3>
              <span className="text-[11px] text-slate-400">
                {ex.answers.length} 个模型{ex.completedAt ? ` · ${SH_DAY.format(new Date(ex.completedAt))}` : ""}
              </span>
            </div>
            <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-slate-600">
              <span className="mr-1 font-medium text-slate-500">题目</span>
              {ex.prompt}
            </p>
          </header>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ex.answers.map((a) => (
              <Answer key={a.modelId} a={a} isSelf={a.modelId === currentModelId} isWinner={ex.winnerModelId === a.modelId} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function EvaluationExamplesSkeleton() {
  return (
    <div data-testid="samples-loading" aria-busy="true" className="mt-4 space-y-3">
      <span className="sr-only">测评示例加载中…</span>
      <div className="h-6 w-1/3 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

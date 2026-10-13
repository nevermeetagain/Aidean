"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Wallet, Trash2 } from "lucide-react";
import { useLadderStore } from "@/stores";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";

interface EvaluationItem {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  evaluationModels?: Array<{
    model?: {
      id: string;
      nameDisplay: string;
    };
  }>;
}

export default function Page() {
  const compareList = useLadderStore((state) => state.compareList);
  const removeFromCompare = useLadderStore((state) => state.removeFromCompare);
  const [hasToken, setHasToken] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setHasToken(Boolean(token));

    if (!token) {
      setUserId(null);
      return;
    }

    api.get<{ user: { id: string } }>("/auth/me")
      .then((res) => setUserId(res.user.id))
      .catch(() => setUserId(null));
  }, []);

  const { data: balanceData } = useApi<{ balance: number; currency: string }>(
    hasToken ? "/finance/balance" : null
  );
  const { data: evaluationData, mutate } = useApi<{ items: EvaluationItem[]; pagination?: { total: number } }>(
    "/evaluations?page=1&limit=5"
  );

  const balance = balanceData?.balance ?? 0;
  const canSubmit = hasToken && balance > 0 && compareList.length > 0 && prompt.trim().length > 0 && !!userId;

  const latestCases = useMemo(() => evaluationData?.items || [], [evaluationData]);

  const handleSubmit = async () => {
    if (!canSubmit || !userId) {
      return;
    }

    setSubmitting(true);
    setSubmitMessage(null);
    try {
      await api.post("/evaluations", {
        userId,
        title: `自定义测评 ${new Date().toLocaleString("zh-CN")}`,
        prompt: prompt.trim(),
        evalType: "comparison",
        comparisonMode: "side-by-side",
        modelIds: compareList.map((item) => item.id),
      });
      setPrompt("");
      setSubmitMessage("测评任务已创建，可在历史案例中查看。");
      mutate();
    } catch (error) {
      setSubmitMessage("测评创建失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  if (compareList.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-base font-medium text-slate-900">当前没有待测评的模型</p>
          <p className="mt-2 text-sm text-slate-500">请先从模型详情或对比页加入模型，再进入测评页。</p>
          <Link href="/models" className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            返回天梯图
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">模型测评</h1>
          <p className="mt-1 text-sm text-slate-500">阶段1最小闭环：已选模型、历史案例、自定义提示词与余额提示。</p>
        </div>
        <Link href="/compare" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          返回对比页
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">已选模型</h2>
          <div className="mt-4 space-y-3">
            {compareList.map((model) => (
              <div key={model.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">{model.name}</div>
                  <div className="text-sm text-slate-500">{model.vendor} · 综合分 {model.score.toFixed(1)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCompare(model.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  移除
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Wallet className="h-4 w-4 text-emerald-600" />
            余额与提交
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            {!hasToken ? (
              <div className="text-sm text-slate-600">
                未登录用户可查看历史测评案例；登录后才可提交自定义测评。
                <Link href="/auth/login" className="ml-2 font-semibold text-blue-600 hover:text-blue-700">
                  去登录
                </Link>
              </div>
            ) : balance <= 0 ? (
              <div className="text-sm text-slate-600">
                余额不足，请先充值后再发起自定义测评。
                <Link href="/user/recharge" className="ml-2 font-semibold text-blue-600 hover:text-blue-700">
                  去充值
                </Link>
              </div>
            ) : (
              <div className="text-sm text-slate-600">当前余额：¥{balance.toFixed(2)}，可发起自定义测评。</div>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">自定义提示词</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={6}
              placeholder="输入你的测评问题，例如：请对比这些模型在代码生成和数学推理上的差异。"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold transition ${
              canSubmit && !submitting
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            {submitting ? "提交中..." : "开始测评"}
          </button>

          {submitMessage && <p className="mt-3 text-sm text-slate-500">{submitMessage}</p>}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">历史测评案例</h2>
        <div className="mt-4 space-y-3">
          {latestCases.length === 0 ? (
            <p className="text-sm text-slate-500">当前暂无历史测评案例。</p>
          ) : (
            latestCases.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("zh-CN")}</div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.prompt}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(item.evaluationModels || []).map((entry) => (
                    <span key={entry.model?.id || Math.random()} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {entry.model?.nameDisplay || "未知模型"}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

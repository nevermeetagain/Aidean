"use client";

/**
 * EvaluationCreateForm：对比测评创建表单（EVAL-01）。
 * - 模型 chips 直接驱动 compareStore（与 Dock 共享同一选择源）；
 * - 预计花费 = 已选数 × 每模型价（单价文本来自后端 props，客户端零硬编码价）；
 * - 提交防重复（submitting 禁用）；成功后跳转详情页轮询终态。
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EVALUATION_LIMITS } from "../../lib/features/evaluation/types";
import { useCompareStore } from "../../stores/compareStore";
import { formatEvalPrice, type PricingCurrency } from "@aidean/shared";

interface Props {
  models: { id: string; nameDisplay: string; slug: string | null }[];
  perModelYuan: number; // 后端 pricing 配置（非客户端硬编码）
  currency: PricingCurrency;
  perModelLabel: string; // 后端格式化，如 ¥2.00
}

export function EvaluationCreateForm({ models, perModelYuan, currency, perModelLabel }: Props) {
  const router = useRouter();
  const selected = useCompareStore((s) => s.items);
  const toggle = useCompareStore((s) => s.toggle);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selected.length;
  const canSubmit =
    count >= EVALUATION_LIMITS.MIN_MODELS &&
    count <= EVALUATION_LIMITS.MAX_MODELS &&
    prompt.trim().length > 0 &&
    !submitting;

  const priceEstimate = useMemo(() => {
    if (count === 0) return null;
    return `${count} × ${perModelLabel} = ${formatEvalPrice(count * perModelYuan, currency)}`;
  }, [count, perModelYuan, currency, perModelLabel]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/evaluations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelIds: selected.map((s) => s.modelId),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data?.evaluation?.id) {
        setError(body?.message ?? "创建失败，请稍后重试");
        return;
      }
      router.push(`/evaluations/${body.data.evaluation.id}`);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {/* 模型选择 chips */}
      <section aria-labelledby="model-pick-title">
        <h2 id="model-pick-title" className="text-sm font-semibold text-slate-700">
          选择模型（{count}/{EVALUATION_LIMITS.MAX_MODELS}）
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {models.map((m) => {
            const active = selected.some((s) => s.modelId === m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle({ modelId: m.id, nameDisplay: m.nameDisplay, slug: m.slug })}
                className={
                  active
                    ? "rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors"
                    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-primary/40 hover:text-primary"
                }
              >
                {m.nameDisplay}
              </button>
            );
          })}
        </div>
        {count < EVALUATION_LIMITS.MIN_MODELS && (
          <p className="mt-2 text-xs text-slate-400">
            至少选择 {EVALUATION_LIMITS.MIN_MODELS} 个模型（当前 {count} 个）
          </p>
        )}
      </section>

      {/* 提示词 */}
      <section aria-labelledby="prompt-title">
        <h2 id="prompt-title" className="text-sm font-semibold text-slate-700">
          提示词
        </h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="例如：请分别从推理能力、代码质量、回答准确性三个维度评价以下需求……"
          className="mt-3 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-primary"
        />
        <p className="mt-1 text-right text-xs text-slate-400">{prompt.length}/2000</p>
      </section>

      {/* 预计花费 */}
      <section aria-label="预计花费" className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-sm text-slate-600">预计花费（每模型 {perModelLabel}，按模型数计）</span>
        <span className="text-sm font-semibold text-slate-800">
          {priceEstimate ?? "—"}
        </span>
      </section>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "提交中…" : "开始对比测评"}
        </button>
        {!canSubmit && count < EVALUATION_LIMITS.MIN_MODELS && (
          <span className="text-xs text-slate-400">选择模型并填写提示词后可提交</span>
        )}
      </div>
    </div>
  );
}

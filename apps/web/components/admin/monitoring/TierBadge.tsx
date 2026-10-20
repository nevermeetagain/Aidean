/**
 * TierBadge — 监控源结构性风险分级徽章（S1 原厂 / S2 云厂商 / A 托管推理 / B 聚合路由 / C 中转）。
 *
 * 分级来自补充1，是「结构性风险分层」而非实测 SLA（DESIGN-004）：颜色只作辨识，
 * title 注明含义，避免把 S1 误读为质量承诺。
 */
import type { SourceTier } from "@aidean/shared";

const TIER_META: Record<SourceTier, { hint: string; className: string }> = {
  S1: { hint: "S1 · 原厂官方源", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  S2: { hint: "S2 · 云厂商源", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  A: { hint: "A · 托管推理平台", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  B: { hint: "B · 聚合路由", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  C: { hint: "C · 中转 / 社区源", className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function TierBadge({ tier }: { tier: SourceTier }) {
  const meta = TIER_META[tier];
  return (
    <span
      data-testid={`tier-${tier}`}
      title={meta.hint}
      className={`inline-flex h-5 min-w-7 items-center justify-center rounded px-1.5 text-[11px] font-semibold ring-1 ring-inset ${meta.className}`}
    >
      {tier}
    </span>
  );
}

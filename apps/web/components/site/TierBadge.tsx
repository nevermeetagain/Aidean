"use client";
import { Badge } from "@aidean/ui";

/**
 * 等级徽章（Phase 4 · 需求 12）。
 * [D3 裁决 2026-09-30]：HeaderSession 已摘除本组件挂载（等级仅存于 UserMenu 下拉，
 * 消除主页/下拉双「普通」重复）；组件保留为可复用底座，如需回开可直接复挂。
 * label/配色引用 lib/features/user/tier.ts 单源（AT-20.1.1）。
 */
import { TIER_BADGE_CLS, TIER_SHORT_LABEL } from "../../lib/features/user/tier";

export function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const cls = TIER_BADGE_CLS[tier as keyof typeof TIER_BADGE_CLS];
  const label = TIER_SHORT_LABEL[tier as keyof typeof TIER_SHORT_LABEL];
  if (!cls || !label) return null;
  return (
    <Badge
      variant={tier === "MAX" ? "default" : "secondary"}
      className={`inline-flex h-5 items-center rounded-full border px-2 text-xs font-semibold leading-none ${cls}`}
      data-testid="tier-badge"
    >
      {label}
    </Badge>
  );
}


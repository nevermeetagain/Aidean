/**
 * 账户等级（AccountTier）展示单源（AT-20.1.1 / WF-20，P4 根治）。
 *
 * 背景：P4 反馈「两处普通标记」排查发现等级语义分裂四处——
 *   ① site/TierBadge.TIER_META（徽章 label+配色）
 *   ② site/UserMenu.TIER_LABEL（下拉短名）
 *   ③ features/user/service.TIER_LABELS（卡片全名，经 tierLabelOf 消费）
 *   ④ admin/UsersTable.TIER_LABEL+TIER_CLS（管理端行内徽标）
 * 且短名「普通」与全名「普通用户」两种口径并存。本模块为唯一真源：
 * 新增等级（如 TEAM）只改本文件，四处消费方零改动。
 *
 * 口径约定（显式化）：短名用于徽章/下拉等紧凑位；全名用于卡片/资料等说明位。
 */
import type { AccountTierKey } from "./repository";

/** 等级短名：NORMAL=普通 / PRO=Pro / MAX=Max */
export const TIER_SHORT_LABEL: Record<AccountTierKey, string> = {
  NORMAL: "普通",
  PRO: "Pro",
  MAX: "Max",
};

/** 等级全名：NORMAL=普通用户 / PRO=Pro 用户 / MAX=Max 用户 */
export const TIER_FULL_LABEL: Record<AccountTierKey, string> = {
  NORMAL: "普通用户",
  PRO: "Pro 用户",
  MAX: "Max 用户",
};

/** 头部徽章配色（TierBadge 专用；浅色单一主题，不使用 dark: 变体） */
export const TIER_BADGE_CLS: Record<AccountTierKey, string> = {
  NORMAL: "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
  PRO: "border-primary/30 bg-primary/10 text-primary",
  MAX: "border-amber-500/40 bg-amber-500/15 text-amber-700",
};

/** 管理端行内徽标配色（UsersTable 专用） */
export const TIER_ROW_CLS: Record<AccountTierKey, string> = {
  NORMAL: "bg-slate-100 text-slate-600",
  PRO: "bg-primary/10 text-primary",
  MAX: "bg-amber-100 text-amber-700",
};

/** 等级 → 短名（可空/未知值回落原值，兼容后端新增枚举未同步场景） */
export function tierShortLabelOf(tier: string | null | undefined): string {
  if (!tier) return "";
  return TIER_SHORT_LABEL[tier as AccountTierKey] ?? tier;
}

/** 等级 → 全名（未知值回落原值） */
export function tierFullLabelOf(tier: string): string {
  return TIER_FULL_LABEL[tier as AccountTierKey] ?? tier;
}

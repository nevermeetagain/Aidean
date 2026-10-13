// 计费/钱包域常量（Task 1.3 单一来源；B.1.1 对齐 prisma LedgerEntryType 实况）
export const REFRESH_CYCLES = ["DAY", "WEEK", "MONTH"] as const;
export type RefreshCycle = (typeof REFRESH_CYCLES)[number];

export const CURRENCY_DEFAULT = "CNY";

/**
 * 账本分录类型七值 —— 与 prisma `LedgerEntryType` 枚举逐值对齐
 * （TOPUP 充值 / CONSUME 消费扣费 / REFUND 退款 / REVERSAL 冲正 /
 *   GRANT 赠送·兑换码入账 / EXPIRE 过期 / ADJUST 后台调整）。
 */
export const LEDGER_ENTRY_TYPES = [
  "TOPUP",
  "CONSUME",
  "REFUND",
  "REVERSAL",
  "GRANT",
  "EXPIRE",
  "ADJUST",
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

/** 流水方向，与 prisma `LedgerDirection` 对齐 */
export const LEDGER_DIRECTIONS = ["DEBIT", "CREDIT"] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

/** 预扣(hold)生命周期 TTL（分钟） */
export const HOLD_TTL_MINUTES = 30;

/** 充值支付方式，与 prisma `PayMethod` 对齐 */
export const PAY_METHODS = ["WECHAT", "ALIPAY"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

/** 充值档位（需求文档 §3.5 五档；赠额业务未定，bonus 恒 0，调整只改此处单一来源） */
export interface RechargeTierDef {
  id: string;
  label: string;
  amountMinor: bigint;
  bonusMinor: bigint;
}

export const RECHARGE_TIERS: readonly RechargeTierDef[] = [
  { id: "trial", label: "体验", amountMinor: 1000n, bonusMinor: 0n },
  { id: "basic", label: "基础", amountMinor: 5500n, bonusMinor: 0n },
  { id: "standard", label: "标准", amountMinor: 11500n, bonusMinor: 0n },
  { id: "pro", label: "专业", amountMinor: 60000n, bonusMinor: 0n },
  { id: "enterprise", label: "企业", amountMinor: 250000n, bonusMinor: 0n },
] as const;

import { z } from "zod";
import {
  CURRENCY_DEFAULT,
  LEDGER_DIRECTIONS,
  LEDGER_ENTRY_TYPES,
  PAY_METHODS,
} from "../constants/billing.constants";

/** 充值档位(amount/bonus/total 一律以"分"承载,接受数字或数字字符串 coerce) */
export const RechargeTierSchema = z.object({
  id: z.string().min(1),
  amountMinor: z.coerce.bigint(),
  bonusMinor: z.coerce.bigint().default(0n),
  totalMinor: z.coerce.bigint(),
  currency: z.string().length(3).default(CURRENCY_DEFAULT),
});
export type RechargeTier = z.infer<typeof RechargeTierSchema>;

/** 兑换码余额查询入参 */
export const RedemptionBalanceInputSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
});
export type RedemptionBalanceInput = z.infer<typeof RedemptionBalanceInputSchema>;

/** 免费额度用量响应 */
export const QuotaUsageResponseSchema = z.object({
  modelId: z.string().min(1),
  usedTokens: z.number().int().nonnegative(),
  quotaTokens: z.number().int().nonnegative(),
  resetAt: z.string(),
});
export type QuotaUsageResponse = z.infer<typeof QuotaUsageResponseSchema>;

// ==================== 余额账本视图（B.1.1，金额均为两位小数元字符串） ====================

/** 钱包概览：available = balance - held */
export const WalletViewSchema = z.object({
  balanceYuan: z.string(),
  heldYuan: z.string(),
  availableYuan: z.string(),
  currency: z.string().length(3).default(CURRENCY_DEFAULT),
});
export type WalletView = z.infer<typeof WalletViewSchema>;

/** 单条流水视图 */
export const LedgerEntryViewSchema = z.object({
  id: z.string().min(1),
  txnId: z.string().min(1),
  direction: z.enum(LEDGER_DIRECTIONS),
  entryType: z.enum(LEDGER_ENTRY_TYPES),
  status: z.string().min(1),
  amountYuan: z.string(),
  sourceType: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  effectiveAt: z.string(),
});
export type LedgerEntryView = z.infer<typeof LedgerEntryViewSchema>;

/** 流水日期分组（按 effectiveAt 自然日倒序分组） */
export const LedgerDateGroupSchema = z.object({
  date: z.string().min(1), // YYYY-MM-DD
  entries: z.array(LedgerEntryViewSchema),
});
export type LedgerDateGroup = z.infer<typeof LedgerDateGroupSchema>;

/** 流水分页响应 */
export const LedgerPageSchema = z.object({
  groups: z.array(LedgerDateGroupSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type LedgerPage = z.infer<typeof LedgerPageSchema>;

/** 流水查询入参 */
export const LedgerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  entryType: z.enum(LEDGER_ENTRY_TYPES).optional(),
});
export type LedgerQuery = z.infer<typeof LedgerQuerySchema>;

/** 创建充值订单入参 */
export const RechargeOrderCreateSchema = z.object({
  tierId: z.string().min(1),
  payMethod: z.enum(PAY_METHODS),
});
export type RechargeOrderCreate = z.infer<typeof RechargeOrderCreateSchema>;

/** 充值档位展示视图 */
export const RechargeTierViewSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  amountYuan: z.string(),
  bonusYuan: z.string(),
});
export type RechargeTierView = z.infer<typeof RechargeTierViewSchema>;

/** 充值订单视图 */
export const RechargeOrderViewSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  amountYuan: z.string(),
  bonusYuan: z.string(),
  totalYuan: z.string(),
  payMethod: z.enum(PAY_METHODS),
  createdAt: z.string(),
  paidAt: z.string().nullable().optional(),
});
export type RechargeOrderView = z.infer<typeof RechargeOrderViewSchema>;
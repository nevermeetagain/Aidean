import { z } from "zod";

/** 兑换码核销入参:8-64 位,字母数字下划线连字符 */
export const RedeemInputSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
});
export type RedeemInput = z.infer<typeof RedeemInputSchema>;

/** 核销结果:余额注入 或 套餐开通(kind 判别) */
export const RedemptionResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("balance"), balanceMinor: z.coerce.bigint() }),
  z.object({ kind: z.literal("package"), packageTitle: z.string().min(1) }),
]);
export type RedemptionResult = z.infer<typeof RedemptionResultSchema>;
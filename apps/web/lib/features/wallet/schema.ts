/**
 * wallet 钱包域 schema：Zod 契约层。
 * 管理员余额调整、状态变更的输入校验。
 */

import { z } from 'zod';

/** 管理员手动调整余额 */
export const WalletAdjustSchema = z.object({
  userId: z.string().uuid('用户 ID 格式错误'),
  amountMinor: z.number().int('金额必须为整数（分）'),
  reason: z.string().min(1, '调整原因必填').max(200),
  operatorId: z.string().uuid('操作者 ID 格式错误'),
});

/** 钱包状态变更 */
export const WalletStatusSchema = z.object({
  userId: z.string().uuid('用户 ID 格式错误'),
  status: z.enum(['ACTIVE', 'FROZEN']),
});

export type WalletAdjustSchemaType = z.infer<typeof WalletAdjustSchema>;
export type WalletStatusSchemaType = z.infer<typeof WalletStatusSchema>;

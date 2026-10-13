/**
 * model-change-log 写入辅助（T-1.4.2）。
 *
 * admin 对 AiModel 的所有写操作（CREATE / UPDATE / DELETE）
 * 必须同步写入 ModelChangeLog，实现字段所有权的留痕要求。
 * sync writers 已有自己的 ModelChangeLog 写入路径（writers/index.ts），
 * 本辅助仅服务于 admin 手动操作路径。
 */

import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';

export interface ModelChangeLogInput {
  modelId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  changedFields: string[];
  operatorId: string;
  sourceIp?: string | null;
}

/**
 * 写一条 ModelChangeLog。
 * 在事务外调用时自动开启独立事务；也可传入 tx 在调用方事务内执行。
 */
export async function writeModelChangeLog(
  input: ModelChangeLogInput,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  await client.modelChangeLog.create({
    data: {
      modelId: input.modelId,
      changeType: input.changeType,
      beforeData: input.beforeData
        ? (input.beforeData as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      afterData: input.afterData
        ? (input.afterData as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      changedFields: input.changedFields,
      source: 'admin_manual',
      sourceIp: input.sourceIp ?? null,
      operatorId: input.operatorId,
      syncBatchId: null,
      validationStatus: 'pending',
    },
  });
}

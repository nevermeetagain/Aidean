/**
 * TASK-081 · 批量写价幂等（body.requestId）。
 *
 * 双层幂等：
 * - Redis（REDIS_URL 配置时）：SETNX PENDING 挡并发双击；完成后缓存首次响应 7 天，重放直接回放。
 * - audit_logs 回执（始终写）：tableName=model_prices_batch、recordId=requestId，
 *   作为 Redis 缺失/过期后的持久幂等锚（顺序重放仍返回首次结果）。
 *
 * Redis 包装层为 fail-open（lib/db/redis），不可用时退化为回执判重：
 * 顺序重放幂等；并发窗口由 ModelPrice「每个模型一条 isCurrent」部分唯一索引兜底（冲突行记 failed）。
 */
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../../../../lib/db/prisma";
import { getRedis } from "../../../../../../lib/db/redis";

const PENDING = "PENDING";
const PENDING_TTL_SECONDS = 300;
const RESULT_TTL_SECONDS = 7 * 24 * 3600;
const RECEIPT_TABLE = "model_prices_batch";

export type BatchReceipt = Record<string, unknown>;

const keyOf = (requestId: string) => `admin:price-batch:idem:${requestId}`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 读持久回执（Redis 缺失/过期后的幂等真源） */
async function findReceipt(requestId: string): Promise<BatchReceipt | null> {
  const row = await prisma.auditLog.findFirst({
    where: { tableName: RECEIPT_TABLE, recordId: requestId, action: 1 },
    orderBy: { createdAt: "desc" },
    select: { newData: true },
  });
  return isRecord(row?.newData) ? row.newData : null;
}

export type BeginBatchResult =
  | { kind: "first" }
  | { kind: "replay"; response: BatchReceipt }
  | { kind: "in_flight" };

/** 幂等入口：first=首次执行；replay=回放首次结果；in_flight=同 requestId 正在处理 */
export async function beginBatch(requestId: string): Promise<BeginBatchResult> {
  const redis = getRedis();
  if (redis) {
    const claimed = await redis.setNxEx(keyOf(requestId), PENDING, PENDING_TTL_SECONDS);
    if (claimed !== "OK") {
      const raw = await redis.get(keyOf(requestId));
      if (raw && raw !== PENDING) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (isRecord(parsed)) return { kind: "replay", response: parsed };
        } catch {
          // 缓存损坏：不当作可回放结果，按在途处理（宁拒绝不重复写）
        }
      }
      return { kind: "in_flight" };
    }
  }

  const receipt = await findReceipt(requestId);
  if (receipt) {
    if (redis) await redis.set(keyOf(requestId), JSON.stringify(receipt), "EX", RESULT_TTL_SECONDS);
    return { kind: "replay", response: receipt };
  }
  return { kind: "first" };
}

/** 成功后写回执（审计表持久 + Redis 缓存） */
export async function completeBatch(
  requestId: string,
  actorId: string,
  response: BatchReceipt,
  httpTraceId?: string | null
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      actorId,
      tableName: RECEIPT_TABLE,
      recordId: requestId,
      action: 1,
      changedFields: [],
      newData: response as Prisma.InputJsonValue,
      // 回执的 recordId 是批量幂等键；requestId 仍存 HTTP 链路追踪 id
      requestId: httpTraceId ?? null,
    },
  });
  const redis = getRedis();
  if (redis) await redis.set(keyOf(requestId), JSON.stringify(response), "EX", RESULT_TTL_SECONDS);
}

/** 处理失败时释放 PENDING 占位（值相等才删，绝不误删他人锁） */
export async function releaseBatch(requestId: string): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.compareDelete(keyOf(requestId), PENDING);
}

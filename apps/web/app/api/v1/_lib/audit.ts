/**
 * 管理端审计日志写入（rebuild-admin-console-and-harden-auth Phase 2）。
 *
 * 口径：管理端任何写操作（POST/PATCH/PUT/DELETE）成功后必须落一条 audit_logs
 * （action 1=INSERT 2=UPDATE 3=DELETE）；oldData/newData 中 BigInt 序列化为字符串
 * （Prisma Json 字段不接纳 BigInt）。审计写失败随业务响应报错，不静默吞掉。
 */
import { prisma } from "../../../../lib/db/prisma";
import type { Prisma } from "@prisma/client";

export interface AuditEntry {
  actorId: string;
  tableName: string;
  recordId: string;
  /** 1=INSERT 2=UPDATE 3=DELETE */
  action: 1 | 2 | 3;
  changedFields?: string[];
  oldData?: unknown;
  newData?: unknown;
  requestId?: string | null;
}

function jsonSafe(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_k, v: unknown) => (typeof v === "bigint" ? v.toString() : v))
  );
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: entry.actorId,
      actorId: entry.actorId,
      tableName: entry.tableName,
      recordId: entry.recordId,
      action: entry.action,
      changedFields: entry.changedFields ?? [],
      oldData: jsonSafe(entry.oldData) as Prisma.InputJsonValue | undefined,
      newData: jsonSafe(entry.newData) as Prisma.InputJsonValue | undefined,
      requestId: entry.requestId ?? null,
    },
  });
}

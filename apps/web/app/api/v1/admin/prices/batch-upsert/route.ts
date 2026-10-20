/**
 * /api/v1/admin/prices/batch-upsert — 后台批量调价（TASK-081 / REQ-F-061）。
 *
 * POST：requireAdminApi("admin.models.write") + PriceBatchUpsertSchema（≤500 行，requestId uuid 幂等）。
 * 语义（E9-05 部分成功）：
 * - 逐行独立事务 upsert（有当前价 → 更新；无 → 新建，billingMode 缺省 PER_TOKEN、更新保留原值）；
 * - 每行同事务写 audit_logs（action 1/2）；单行失败记 failed[]（index 为请求 rows 下标），不回滚已成功行；
 * - 响应 total = created + updated + failed.length；
 * - requestId 重放返回首次结果（replayed=true），不重复写价（幂等实现在 ./idempotency.ts）。
 */
import type { Prisma } from "@prisma/client";

import { invalidatePriceViews } from "../../../../../../lib/features/ladder/price-views";
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import {
  PriceBatchUpsertResponseSchema,
  PriceBatchUpsertSchema,
  type PriceBatchRow,
  type PriceBatchRowError,
} from "@aidean/shared";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { beginBatch, completeBatch, releaseBatch } from "./idempotency";

export const dynamic = "force-dynamic";

type Tx = Prisma.TransactionClient;
type RowOutcome = "created" | "updated";

const AUDIT_FIELDS = [
  "priceInput",
  "priceOutput",
  "priceCache",
  "pricePerRequest",
  "billingMode",
  "billingUnit",
  "billingCurrency",
  "notes",
] as const;

/** 单行 upsert + 同事务审计；模型不存在/并发唯一冲突抛 ApiError（计入 failed[]） */
async function upsertRow(
  tx: Tx,
  row: PriceBatchRow,
  ctx: { actorId: string; requestId?: string | null; now: Date }
): Promise<RowOutcome> {
  const existing = await tx.modelPrice.findFirst({
    where: { modelId: row.modelId, isCurrent: true },
    select: {
      id: true,
      priceInput: true,
      priceOutput: true,
      priceCache: true,
      pricePerRequest: true,
      billingMode: true,
      billingUnit: true,
      billingCurrency: true,
      notes: true,
    },
  });

  if (existing) {
    await tx.modelPrice.update({
      where: { id: existing.id },
      data: {
        priceInput: row.priceInput,
        priceOutput: row.priceOutput,
        priceCache: row.priceCache ?? null,
        pricePerRequest: row.pricePerRequest ?? null,
        ...(row.billingMode !== undefined ? { billingMode: row.billingMode } : {}),
        ...(row.billingUnit !== undefined ? { billingUnit: row.billingUnit } : {}),
        ...(row.billingCurrency !== undefined ? { billingCurrency: row.billingCurrency } : {}),
        ...(row.notes !== undefined ? { notes: row.notes } : {}),
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        userId: ctx.actorId,
        actorId: ctx.actorId,
        tableName: "model_prices",
        recordId: existing.id,
        action: 2,
        changedFields: [...AUDIT_FIELDS],
        oldData: {
          priceInput: existing.priceInput.toString(),
          priceOutput: existing.priceOutput.toString(),
          priceCache: existing.priceCache?.toString() ?? null,
          pricePerRequest: existing.pricePerRequest?.toString() ?? null,
          billingMode: existing.billingMode,
          billingUnit: existing.billingUnit,
          billingCurrency: existing.billingCurrency,
          notes: existing.notes,
        },
        newData: {
          modelId: row.modelId,
          priceInput: String(row.priceInput),
          priceOutput: String(row.priceOutput),
          priceCache: row.priceCache ?? null,
          pricePerRequest: row.pricePerRequest ?? null,
        },
        requestId: ctx.requestId ?? null,
      },
    });
    return "updated";
  }

  const model = await tx.aiModel.findUnique({ where: { id: row.modelId }, select: { id: true } });
  if (!model) throw new ApiError(ERROR_CODES.BAD_REQUEST, "模型不存在");

  const created = await tx.modelPrice.create({
    data: {
      modelId: row.modelId,
      priceInput: row.priceInput,
      priceOutput: row.priceOutput,
      priceCache: row.priceCache ?? null,
      pricePerRequest: row.pricePerRequest ?? null,
      billingMode: row.billingMode ?? "PER_TOKEN",
      billingUnit: row.billingUnit ?? "per_1k_tokens",
      billingCurrency: row.billingCurrency ?? "CNY",
      notes: row.notes ?? "后台批量录入",
      sourceType: "OFFICIAL",
      sourceName: "admin-batch",
      effectiveFrom: ctx.now,
      isCurrent: true,
    },
    select: { id: true },
  });
  await tx.auditLog.create({
    data: {
      userId: ctx.actorId,
      actorId: ctx.actorId,
      tableName: "model_prices",
      recordId: created.id,
      action: 1,
      changedFields: [...AUDIT_FIELDS],
      newData: {
        modelId: row.modelId,
        priceInput: String(row.priceInput),
        priceOutput: String(row.priceOutput),
        priceCache: row.priceCache ?? null,
        pricePerRequest: row.pricePerRequest ?? null,
        billingMode: row.billingMode ?? "PER_TOKEN",
      },
      requestId: ctx.requestId ?? null,
    },
  });
  return "created";
}

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.models.write");

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = PriceBatchUpsertSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { requestId, rows } = parsed.data;
  const httpRequestId = req.headers.get("x-request-id");

  const gate = await beginBatch(requestId);
  if (gate.kind === "in_flight") {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "同 requestId 的批次正在处理，请稍后重试", 429);
  }
  if (gate.kind === "replay") {
    const replay = PriceBatchUpsertResponseSchema.safeParse({ ...gate.response, replayed: true });
    if (!replay.success) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "幂等回执损坏");
    return replay.data;
  }

  let created = 0;
  let updated = 0;
  const failed: PriceBatchRowError[] = [];
  const now = new Date();

  try {
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      try {
        const outcome = await prisma.$transaction((tx) =>
          upsertRow(tx, row, { actorId: session.userId, requestId: httpRequestId, now })
        );
        if (outcome === "created") created++;
        else updated++;
      } catch (e) {
        const prismaCode = (e as { code?: string } | null)?.code;
        const isApi = e instanceof ApiError;
        failed.push({
          index,
          modelId: row.modelId,
          code: isApi ? e.code : prismaCode === "P2002" ? ERROR_CODES.BAD_REQUEST : ERROR_CODES.INTERNAL_ERROR,
          message: isApi
            ? e.message
            : prismaCode === "P2002"
              ? "当前价并发冲突，请重试"
              : "写入失败",
        });
      }
    }

    if (created + updated > 0) await invalidatePriceViews();
  } catch (e) {
    await releaseBatch(requestId);
    throw e;
  }

  const response = PriceBatchUpsertResponseSchema.parse({
    requestId,
    total: rows.length,
    created,
    updated,
    failed,
    replayed: false,
  });
  await completeBatch(requestId, session.userId, response, httpRequestId);
  return response;
});

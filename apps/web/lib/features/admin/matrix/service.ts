/**
 * 协议兼容矩阵 / 能力矩阵服务层（B11-03a / Q-11-01=A 投入运营，2026-10-22）。
 *
 * 职责：校验 → 引用完整性 → 写库 → 审计，路由只做 RBAC + 参数搬运 + revalidate。
 * 错误码口径（复用既有目录，不新增码；对齐 vendors/[id]、feature-flags/[id] 等兄弟资源）：
 *   - 请求体/路由 id 校验失败                → 40000 BAD_REQUEST（formatZodMessage 文案）
 *   - 记录不存在（含并发删除 P2025）          → 40000 BAD_REQUEST「…不存在」
 *   - 唯一键冲突（P2002，PATCH 改键撞已有行） → 40000 BAD_REQUEST「…已存在」
 *   - capability.modelId / entityType=model 指向不存在模型 → 20001 MODEL_NOT_FOUND
 *   - 其他实体（vendor/provider/station）不存在 → 40000 BAD_REQUEST
 * 审计：tableName 沿用列表 POST 既有口径 protocol_compatibilities / capability_matrices；
 *       action 1=INSERT 2=UPDATE 3=DELETE；oldData/newData 为行快照，changedFields 为提交键。
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../db/prisma";
import { ApiError, ERROR_CODES, formatZodMessage, type ZodLikeIssue } from "../../../../app/api/v1/_lib/errors";
import { writeAudit } from "../../../../app/api/v1/_lib/audit";
import type { MatrixEntityType } from "./constants";
import {
  CapabilityCreateSchema,
  CapabilityPatchSchema,
  MatrixIdSchema,
  ProtocolCreateSchema,
  ProtocolPatchSchema,
} from "./schemas";

export const PROTOCOL_TABLE = "protocol_compatibilities";
export const CAPABILITY_TABLE = "capability_matrices";

export interface MatrixActor {
  userId: string;
  requestId?: string | null;
}

type SafeParser<T> = {
  safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: ZodLikeIssue[] } };
};

function parseOrThrow<T>(schema: SafeParser<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(r.error.issues[0]!));
  return r.data;
}

export function parseMatrixId(id: unknown): string {
  return parseOrThrow(MatrixIdSchema as unknown as SafeParser<string>, id);
}

function prismaCode(err: unknown): string | undefined {
  return err && typeof err === "object" ? (err as { code?: string }).code : undefined;
}

/** Prisma 已知错误 → 业务码；其余原样上抛（withApi 收敛为 50000）。 */
function mapWriteError(err: unknown, label: string): never {
  const code = prismaCode(err);
  if (code === "P2002") throw new ApiError(ERROR_CODES.BAD_REQUEST, `${label}已存在（唯一键冲突）`);
  if (code === "P2025") throw new ApiError(ERROR_CODES.BAD_REQUEST, `${label}不存在`);
  throw err;
}

const json = (v: Record<string, unknown> | null | undefined) =>
  v === undefined ? undefined : v === null ? (null as unknown as Prisma.InputJsonValue) : (v as Prisma.InputJsonValue);

/** 引用完整性：实体必须真实存在（软删视为不存在）。 */
async function assertEntityExists(entityType: MatrixEntityType, entityId: string): Promise<void> {
  let found: unknown = null;
  switch (entityType) {
    case "model":
      found = await prisma.aiModel.findFirst({ where: { id: entityId, deletedAt: null }, select: { id: true } });
      if (!found) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");
      return;
    case "vendor":
      found = await prisma.vendor.findFirst({ where: { id: entityId, deletedAt: null }, select: { id: true } });
      break;
    case "provider":
      found = await prisma.modelProvider.findUnique({ where: { id: entityId }, select: { id: true } });
      break;
    case "station":
      found = await prisma.aPIStation.findUnique({ where: { id: entityId }, select: { id: true } });
      break;
  }
  if (!found) throw new ApiError(ERROR_CODES.BAD_REQUEST, `实体不存在（${entityType}:${entityId}）`);
}

async function assertModelExists(modelId: string): Promise<void> {
  const m = await prisma.aiModel.findFirst({ where: { id: modelId, deletedAt: null }, select: { id: true } });
  if (!m) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");
}

// ==================== 协议兼容矩阵 ====================

export async function getProtocol(rawId: unknown) {
  const id = parseMatrixId(rawId);
  const row = await prisma.protocolCompatibility.findUnique({ where: { id } });
  if (!row) throw new ApiError(ERROR_CODES.BAD_REQUEST, "协议兼容记录不存在");
  return row;
}

/** POST 语义保持既有契约：按 (entityType, entityId, protocol) upsert；新建记 action=1，命中既有记 action=2。 */
export async function upsertProtocol(body: unknown, actor: MatrixActor) {
  const d = parseOrThrow(ProtocolCreateSchema, body);
  await assertEntityExists(d.entityType, d.entityId);
  const key = { entityType: d.entityType, entityId: d.entityId, protocol: d.protocol };
  const before = await prisma.protocolCompatibility.findUnique({ where: { entityType_entityId_protocol: key } });
  const record = await prisma.protocolCompatibility.upsert({
    where: { entityType_entityId_protocol: key },
    create: {
      ...key,
      supported: d.supported,
      probeMethod: d.probeMethod ?? "documented",
      probeResult: json(d.probeResult),
      confidence: d.confidence ?? 0.5,
    },
    update: {
      supported: d.supported,
      probedAt: new Date(),
      ...(d.probeMethod !== undefined ? { probeMethod: d.probeMethod } : {}),
      ...(d.probeResult !== undefined ? { probeResult: json(d.probeResult) } : {}),
      ...(d.confidence !== undefined ? { confidence: d.confidence } : {}),
    },
  });
  await writeAudit({
    actorId: actor.userId,
    tableName: PROTOCOL_TABLE,
    recordId: record.id,
    action: before ? 2 : 1,
    changedFields: Object.keys(d),
    oldData: before ?? undefined,
    newData: record,
    requestId: actor.requestId,
  });
  return record;
}

export async function patchProtocol(rawId: unknown, body: unknown, actor: MatrixActor) {
  const id = parseMatrixId(rawId);
  const d = parseOrThrow(ProtocolPatchSchema, body);
  const before = await prisma.protocolCompatibility.findUnique({ where: { id } });
  if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "协议兼容记录不存在");
  if (d.entityType !== undefined || d.entityId !== undefined) {
    await assertEntityExists(d.entityType ?? (before.entityType as MatrixEntityType), d.entityId ?? before.entityId);
  }
  let record;
  try {
    record = await prisma.protocolCompatibility.update({
      where: { id },
      data: {
        ...(d.entityType !== undefined ? { entityType: d.entityType } : {}),
        ...(d.entityId !== undefined ? { entityId: d.entityId } : {}),
        ...(d.protocol !== undefined ? { protocol: d.protocol } : {}),
        ...(d.supported !== undefined ? { supported: d.supported } : {}),
        ...(d.probeMethod !== undefined ? { probeMethod: d.probeMethod } : {}),
        ...(d.probeResult !== undefined ? { probeResult: json(d.probeResult) } : {}),
        ...(d.confidence !== undefined ? { confidence: d.confidence } : {}),
        // 探测结论变化即视为一次新探测
        ...(d.supported !== undefined || d.probeMethod !== undefined ? { probedAt: new Date() } : {}),
      },
    });
  } catch (err) {
    mapWriteError(err, "协议兼容记录");
  }
  await writeAudit({
    actorId: actor.userId,
    tableName: PROTOCOL_TABLE,
    recordId: id,
    action: 2,
    changedFields: Object.keys(d),
    oldData: before,
    newData: record,
    requestId: actor.requestId,
  });
  return record;
}

export async function deleteProtocol(rawId: unknown, actor: MatrixActor) {
  const id = parseMatrixId(rawId);
  const before = await prisma.protocolCompatibility.findUnique({ where: { id } });
  if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "协议兼容记录不存在");
  try {
    await prisma.protocolCompatibility.delete({ where: { id } });
  } catch (err) {
    mapWriteError(err, "协议兼容记录");
  }
  await writeAudit({
    actorId: actor.userId,
    tableName: PROTOCOL_TABLE,
    recordId: id,
    action: 3,
    oldData: before,
    requestId: actor.requestId,
  });
  return { deleted: true as const, id };
}

// ==================== 能力矩阵 ====================

export async function getCapability(rawId: unknown) {
  const id = parseMatrixId(rawId);
  const row = await prisma.capabilityMatrix.findUnique({ where: { id } });
  if (!row) throw new ApiError(ERROR_CODES.BAD_REQUEST, "能力矩阵记录不存在");
  return row;
}

/** POST 语义保持既有契约：按 (modelId, capability, source) upsert。 */
export async function upsertCapability(body: unknown, actor: MatrixActor) {
  const d = parseOrThrow(CapabilityCreateSchema, body);
  await assertModelExists(d.modelId);
  const key = { modelId: d.modelId, capability: d.capability, source: d.source ?? "official" };
  const before = await prisma.capabilityMatrix.findUnique({ where: { modelId_capability_source: key } });
  const record = await prisma.capabilityMatrix.upsert({
    where: { modelId_capability_source: key },
    create: {
      ...key,
      supported: d.supported,
      confidence: d.confidence ?? 0.5,
      maxContextLength: d.maxContextLength ?? null,
      detail: json(d.detail),
    },
    update: {
      supported: d.supported,
      detectedAt: new Date(),
      ...(d.confidence !== undefined ? { confidence: d.confidence } : {}),
      ...(d.maxContextLength !== undefined ? { maxContextLength: d.maxContextLength } : {}),
      ...(d.detail !== undefined ? { detail: json(d.detail) } : {}),
    },
  });
  await writeAudit({
    actorId: actor.userId,
    tableName: CAPABILITY_TABLE,
    recordId: record.id,
    action: before ? 2 : 1,
    changedFields: Object.keys(d),
    oldData: before ?? undefined,
    newData: record,
    requestId: actor.requestId,
  });
  return record;
}

export async function patchCapability(rawId: unknown, body: unknown, actor: MatrixActor) {
  const id = parseMatrixId(rawId);
  const d = parseOrThrow(CapabilityPatchSchema, body);
  const before = await prisma.capabilityMatrix.findUnique({ where: { id } });
  if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "能力矩阵记录不存在");
  if (d.modelId !== undefined) await assertModelExists(d.modelId);
  let record;
  try {
    record = await prisma.capabilityMatrix.update({
      where: { id },
      data: {
        ...(d.modelId !== undefined ? { modelId: d.modelId } : {}),
        ...(d.capability !== undefined ? { capability: d.capability } : {}),
        ...(d.source !== undefined ? { source: d.source } : {}),
        ...(d.supported !== undefined ? { supported: d.supported } : {}),
        ...(d.confidence !== undefined ? { confidence: d.confidence } : {}),
        ...(d.maxContextLength !== undefined ? { maxContextLength: d.maxContextLength } : {}),
        ...(d.detail !== undefined ? { detail: json(d.detail) } : {}),
        ...(d.supported !== undefined ? { detectedAt: new Date() } : {}),
      },
    });
  } catch (err) {
    mapWriteError(err, "能力矩阵记录");
  }
  await writeAudit({
    actorId: actor.userId,
    tableName: CAPABILITY_TABLE,
    recordId: id,
    action: 2,
    changedFields: Object.keys(d),
    oldData: before,
    newData: record,
    requestId: actor.requestId,
  });
  return record;
}

export async function deleteCapability(rawId: unknown, actor: MatrixActor) {
  const id = parseMatrixId(rawId);
  const before = await prisma.capabilityMatrix.findUnique({ where: { id } });
  if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "能力矩阵记录不存在");
  try {
    await prisma.capabilityMatrix.delete({ where: { id } });
  } catch (err) {
    mapWriteError(err, "能力矩阵记录");
  }
  await writeAudit({
    actorId: actor.userId,
    tableName: CAPABILITY_TABLE,
    recordId: id,
    action: 3,
    oldData: before,
    requestId: actor.requestId,
  });
  return { deleted: true as const, id };
}

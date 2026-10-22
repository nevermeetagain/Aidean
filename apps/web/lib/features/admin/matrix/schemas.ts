/**
 * 协议 / 能力矩阵请求体校验（B11-03a）。
 *
 * 落位说明：packages/shared/src 为冻结契约区，本轮不静默扩写；矩阵 request schema 先驻留
 * web 侧 lib（与 service 同目录），待契约评审后可原样上移 @aidean/shared（见 EVD-B11-03/deviation.md）。
 * 所有 schema 均 strict（未知键 → 40000），PATCH 至少一字段。
 */
import { z } from "zod";
import {
  CAPABILITY_SOURCES,
  MATRIX_CAPABILITIES,
  MATRIX_ENTITY_TYPES,
  MATRIX_PROTOCOLS,
  PROBE_METHODS,
} from "./constants";

/** 路由段 id：uuid 形（含 uuid v7）；非法 id 不触库直接 40000。 */
export const MatrixIdSchema = z.string().uuid("id 非法（须为 UUID）");

const confidence = z.number().min(0).max(1);
const jsonRecord = z.record(z.unknown());

export const ProtocolCreateSchema = z
  .object({
    entityType: z.enum(MATRIX_ENTITY_TYPES),
    entityId: z.string().trim().min(1).max(64),
    protocol: z.enum(MATRIX_PROTOCOLS),
    supported: z.boolean(),
    probeMethod: z.enum(PROBE_METHODS).optional(),
    probeResult: jsonRecord.nullable().optional(),
    confidence: confidence.optional(),
  })
  .strict();
export type ProtocolCreateInput = z.infer<typeof ProtocolCreateSchema>;

export const ProtocolPatchSchema = ProtocolCreateSchema.partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "至少提供一个可更新字段" });
export type ProtocolPatchInput = z.infer<typeof ProtocolPatchSchema>;

export const CapabilityCreateSchema = z
  .object({
    modelId: z.string().trim().min(1).max(64),
    capability: z.enum(MATRIX_CAPABILITIES),
    supported: z.boolean(),
    source: z.enum(CAPABILITY_SOURCES).optional(),
    confidence: confidence.optional(),
    maxContextLength: z.number().int().positive().max(100_000_000).nullable().optional(),
    detail: jsonRecord.nullable().optional(),
  })
  .strict();
export type CapabilityCreateInput = z.infer<typeof CapabilityCreateSchema>;

export const CapabilityPatchSchema = CapabilityCreateSchema.partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "至少提供一个可更新字段" });
export type CapabilityPatchInput = z.infer<typeof CapabilityPatchSchema>;

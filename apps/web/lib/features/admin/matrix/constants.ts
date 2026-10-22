/**
 * 协议 / 能力矩阵 —— 维度真源（B11-03a / Q-11-01=A，2026-10-22）。
 *
 * 纯常量（无 Prisma 运行时依赖），客户端组件与服务端共用：
 * - MATRIX_PROTOCOLS：与 Prisma `enum ModelProtocol`（ai_models.protocol）逐值一致，
 *   终结组件内小写蛇形硬编码（DEF-011-03「协议名两套口径分裂」）。一致性由
 *   __tests__/matrix-constants.spec.ts 对 `@prisma/client` 枚举做反向断言锁定。
 * - MATRIX_CAPABILITIES：capability_matrices.capability 的 8 个能力维度（schema 注释口径）。
 */
import type { $Enums } from "@prisma/client";

export const MATRIX_PROTOCOLS = ["OPENAI", "ANTHROPIC", "GOOGLE", "RESPONSES", "CUSTOM"] as const satisfies readonly $Enums.ModelProtocol[];
export type MatrixProtocol = (typeof MATRIX_PROTOCOLS)[number];

/** 协议矩阵实体类型：model/vendor 由 ai_models.protocol 回填派生；provider/station 由后台录入或探针写入。 */
export const MATRIX_ENTITY_TYPES = ["model", "vendor", "provider", "station"] as const;
export type MatrixEntityType = (typeof MATRIX_ENTITY_TYPES)[number];

export const PROBE_METHODS = ["endpoint_check", "minimal_request", "documented", "backfill"] as const;
export type ProbeMethod = (typeof PROBE_METHODS)[number];

export const MATRIX_CAPABILITIES = [
  "function_calling",
  "vision",
  "reasoning",
  "structured_output",
  "prompt_caching",
  "code_execution",
  "web_search",
  "long_context",
] as const;
export type MatrixCapability = (typeof MATRIX_CAPABILITIES)[number];

export const CAPABILITY_SOURCES = ["official", "benchmark", "observed"] as const;
export type CapabilitySource = (typeof CAPABILITY_SOURCES)[number];

/** long_context 判定阈值（tokens）：≥128K 记为支持（回填派生口径）。 */
export const LONG_CONTEXT_THRESHOLD = 128_000;

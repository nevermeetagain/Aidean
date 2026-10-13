/**
 * evaluation 模型评测域 schema：创建/查询契约的手写校验（web 侧零 zod 依赖，与仓库路由校验风格一致）。
 * 错误码一律 ERROR_CODES.BAD_REQUEST（40000），不自造。
 */
import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import { EVALUATION_LIMITS, type CreateEvaluationInput } from "./types";

/** 创建对比测评入参校验：prompt 非空且 ≤2000；模型数 [2..6] 且元素非空；幂等键可选 ≤64 */
export function parseCreateEvaluationInput(raw: unknown): CreateEvaluationInput {
  if (!raw || typeof raw !== "object") {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "请求体非法");
  }
  const body = raw as Record<string, unknown>;

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) throw new ApiError(ERROR_CODES.BAD_REQUEST, "提示词不能为空");
  if (prompt.length > 2000) throw new ApiError(ERROR_CODES.BAD_REQUEST, "提示词过长（≤2000 字）");

  if (!Array.isArray(body.modelIds) || body.modelIds.length === 0) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `至少选择 ${EVALUATION_LIMITS.MIN_MODELS} 个模型`);
  }
  const modelIds = body.modelIds.filter((m): m is string => typeof m === "string" && m.trim().length > 0);
  if (modelIds.length < EVALUATION_LIMITS.MIN_MODELS) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `至少选择 ${EVALUATION_LIMITS.MIN_MODELS} 个模型`);
  }
  if (modelIds.length > EVALUATION_LIMITS.MAX_MODELS) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `最多选择 ${EVALUATION_LIMITS.MAX_MODELS} 个模型`);
  }

  let idempotencyKey: string | undefined;
  if (body.idempotencyKey !== undefined && body.idempotencyKey !== null) {
    if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.trim().length === 0) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "幂等键非法");
    }
    idempotencyKey = body.idempotencyKey.trim();
    if (idempotencyKey.length > 64) throw new ApiError(ERROR_CODES.BAD_REQUEST, "幂等键过长（≤64 字符）");
  }

  return { prompt, modelIds: [...new Set(modelIds)], idempotencyKey };
}

/** 分页参数校验 */
export function parseEvaluationPage(raw: URLSearchParams): { page: number; pageSize: number } {
  const page = Number(raw.get("page") ?? "1");
  const pageSize = Number(raw.get("pageSize") ?? "10");
  if (!Number.isInteger(page) || page < 1) throw new ApiError(ERROR_CODES.BAD_REQUEST, "page 须为 ≥1 整数");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "pageSize 须为 1-50 整数");
  }
  return { page, pageSize };
}

/** 结果内容长度裁剪上限（详情响应防止巨型 payload） */
export const EVAL_RESPONSE_TRIM = 40_000;

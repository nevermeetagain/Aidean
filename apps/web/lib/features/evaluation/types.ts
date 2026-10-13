/**
 * evaluation 模型评测域 types：对比测评域类型与状态机常量。
 *
 * 关键决策（EVAL-01）：
 * - 状态机 0/1/2/3 对齐 schema 注释（0:待执行 1:执行中 2:已完成 3:失败）；
 * - EvaluationModel.status 列仅记录列级终态（completed | error），运行期中间态不落库；
 * - 金额一律 BigInt 分（minor）整数，展示层才转元——金额断言不得出现浮点比较。
 */
import type { Evaluation, EvaluationModel, AiModel } from "@prisma/client";

/** Evaluation.status 状态机（与 schema.prisma L1111 注释对齐） */
export const EVALUATION_STATUS = {
  PENDING: 0, // 待执行
  RUNNING: 1, // 执行中
  COMPLETED: 2, // 已完成（已结算）
  FAILED: 3, // 失败（全额退还/建单即败）
} as const;
export type EvaluationStatusValue = (typeof EVALUATION_STATUS)[keyof typeof EVALUATION_STATUS];

/** 模型列级终态（schema EvaluationModel.status 字符串列） */
export const EVAL_MODEL_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

/** 对比测评模型数边界（需求 §3.3：2–6 个模型并排） */
export const EVALUATION_LIMITS = {
  MIN_MODELS: 2,
  MAX_MODELS: 6,
  /** 单模型调用超时（毫秒）：Promise.race 放弃等待并标列失败 */
  MODEL_TIMEOUT_MS: 60_000,
  /** 崩溃遗留单判定阈值（毫秒）：status=1 超此时长视为执行中断，读路径触发对账 */
  STALE_AFTER_MS: 2 * 60_000,
  /** pricing 配置读缓存（毫秒），仿 auth security 数缓存模式 */
  PRICING_CACHE_MS: 60_000,
} as const;

/** winner 判定规则（常量可配，未来可进 config.winnerRule）：错误剔除 → 完整响应优先 → 响应最长 */
export const WINNER_RULE = {
  preferCompleteResponse: true,
  tieBreak: "longest" as const,
};

/** 创建对比测评入参（POST /api/v1/evaluations） */
export interface CreateEvaluationInput {
  prompt: string;
  modelIds: string[]; // [2..6]，须全部存在且未删除
  /** 幂等键（可选）：同用户同键重放返回既有单，不重复创建/扣费 */
  idempotencyKey?: string;
}

/** 详情视图中的模型列（含模型展示信息） */
export interface EvaluationModelView {
  id: string;
  modelId: string;
  modelName: string;
  modelSlug: string | null;
  status: string;
  response: string | null;
  errorMessage: string | null;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  latencyMs: number | null;
  ttftMs: number | null;
}

/** 详情视图 */
export interface EvaluationDetailView {
  id: string;
  status: EvaluationStatusValue;
  isPaid: boolean;
  prompt: string;
  title: string | null;
  winnerModelId: string | null;
  /** 费用（分/minor 整数字符串）——金额断言用此字段 */
  costMinor: string;
  /** 费用（元、两位小数字符串）——展示用 */
  costYuan: string;
  errorMsg: string | null;
  createdAt: string;
  completedAt: string | null;
  models: EvaluationModelView[];
}

/** 列表行视图（不含 models 明细） */
export interface EvaluationListRow {
  id: string;
  status: EvaluationStatusValue;
  isPaid: boolean;
  prompt: string;
  winnerModelId: string | null;
  /** 费用（分/minor 整数字符串） */
  costMinor: string;
  /** 费用（元、两位小数字符串） */
  costYuan: string;
  createdAt: string;
  modelCount: number;
}

export type EvaluationRow = Evaluation & {
  evaluationModels: (EvaluationModel & { model: AiModel })[];
};

/**
 * evaluation 模型评测域 repository：Prisma 数据访问层。
 * 仅被本域 service 调用，禁止跨域直连；金额相关字段（cost 等）由 service 写入，此处只做存取。
 */
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  EVAL_MODEL_STATUS,
  EVALUATION_STATUS,
  type EvaluationRow,
} from "./types";

export type EvalClient = PrismaClient;

/** 占位行（pending）字段形状 */
type ModelPlaceholder = {
  modelId: string;
  status: string;
};

/** 事务内创建 Evaluation + N 个 EvaluationModel 占位行（原子） */
export async function createEvaluationWithModels(
  client: EvalClient,
  input: {
    userId: string;
    prompt: string;
    title?: string | null;
    evalType: string;
    comparisonMode?: string | null;
    modelIds: string[];
    isPaid: boolean;
    costMinor: bigint;
    configJson: Prisma.InputJsonValue;
    idempotencyKey?: string;
  }
): Promise<{ evaluation: EvaluationRow; placeholders: ModelPlaceholder[] }> {
  return client.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.create({
      data: {
        userId: input.userId,
        prompt: input.prompt,
        title: input.title ?? null,
        evalType: input.evalType,
        comparisonMode: input.comparisonMode ?? null,
        config: input.configJson,
        isPaid: input.isPaid,
        cost: input.costMinor.toString(),
        status: EVALUATION_STATUS.PENDING,
      },
      include: { evaluationModels: true },
    });
    const placeholders: ModelPlaceholder[] = [];
    for (const modelId of input.modelIds) {
      await tx.evaluationModel.create({
        data: { evaluationId: evaluation.id, modelId, status: EVAL_MODEL_STATUS.PENDING },
      });
      placeholders.push({ modelId, status: EVAL_MODEL_STATUS.PENDING });
    }
    const row = (await tx.evaluation.findUniqueOrThrow({
      where: { id: evaluation.id },
      include: { evaluationModels: { include: { model: true } } },
    })) as unknown as EvaluationRow;
    return { evaluation: row, placeholders };
  });
}

/** 幂等键查重（同用户同键） */
export async function findByIdempotencyKey(
  client: EvalClient,
  userId: string,
  idempotencyKey: string
): Promise<EvaluationRow | null> {
  const row = await client.evaluation.findFirst({
    where: {
      userId,
      config: { path: ["idempotencyKey"], equals: idempotencyKey },
    },
    include: { evaluationModels: { include: { model: true } } },
  });
  return (row as unknown as EvaluationRow | null) ?? null;
}

/** 详情（本人；含模型列与模型展示信息） */
export async function findByIdWithModels(
  client: EvalClient,
  id: string
): Promise<EvaluationRow | null> {
  const row = await client.evaluation.findUnique({
    where: { id },
    include: { evaluationModels: { include: { model: true } } },
  });
  return (row as unknown as EvaluationRow | null) ?? null;
}

/** 我的分页列表（倒序；不含 models 明细，仅计数） */
export async function listByUser(
  client: EvalClient,
  userId: string,
  page: number,
  pageSize: number
): Promise<{ rows: EvaluationRow[]; total: number }> {
  const [rows, total] = await client.$transaction([
    client.evaluation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { evaluationModels: { select: { id: true } } },
    }),
    client.evaluation.count({ where: { userId } }),
  ]);
  return { rows: rows as unknown as EvaluationRow[], total };
}

/** 公开示例列表（isPaid=false；免费/未登录可看后台预置示例） */
export async function listDemo(
  client: EvalClient,
  limit: number
): Promise<EvaluationRow[]> {
  const rows = await client.evaluation.findMany({
    where: { isPaid: false, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { evaluationModels: { include: { model: true } } },
  });
  return rows as unknown as EvaluationRow[];
}

/** CAS 状态推进：WHERE status=旧值 → 新值；返回影响行数（0=并发已被他人推进） */
export async function advanceStatus(
  client: EvalClient,
  id: string,
  from: number,
  to: number,
  extra?: { startedAt?: Date; errorMsg?: string | null }
): Promise<number> {
  const res = await client.evaluation.updateMany({
    where: { id, status: from },
    data: {
      status: to,
      ...(extra?.startedAt ? { startedAt: extra.startedAt } : {}),
      ...(extra && "errorMsg" in extra
        ? { errorMsg: extra.errorMsg ?? null }
        : {}),
    },
  });
  return res.count;
}

/** 逐模型回写结果（响应/token/latency/ttft；error 列写 errorMessage） */
export async function updateModelResult(
  client: EvalClient,
  input: {
    evaluationId: string;
    modelId: string;
    status: string;
    response?: string | null;
    tokensInput?: number;
    tokensOutput?: number;
    tokensTotal?: number;
    latencyMs?: number | null;
    ttftMs?: number | null;
    errorMessage?: string | null;
    rawResponse?: Prisma.InputJsonValue | null;
  }
): Promise<void> {
  await client.evaluationModel.updateMany({
    where: { evaluationId: input.evaluationId, modelId: input.modelId },
    data: {
      status: input.status,
      ...(input.response !== undefined ? { response: input.response } : {}),
      ...(input.tokensInput !== undefined ? { tokensInput: input.tokensInput } : {}),
      ...(input.tokensOutput !== undefined ? { tokensOutput: input.tokensOutput } : {}),
      ...(input.tokensTotal !== undefined ? { tokensTotal: input.tokensTotal } : {}),
      ...(input.latencyMs !== undefined ? { latencyMs: input.latencyMs } : {}),
      ...(input.ttftMs !== undefined ? { ttftMs: input.ttftMs } : {}),
      ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
      ...(input.rawResponse !== undefined ? { rawResponse: (input.rawResponse ?? Prisma.JsonNull) as Prisma.InputJsonValue } : {}),
    },
  });
}

/** 终态收口：results + winner + status + completedAt（CAS：仅 RUNNING/PENDING → COMPLETED） */
export async function finalizeEvaluation(
  client: EvalClient,
  id: string,
  input: {
    status: number;
    results: Prisma.InputJsonValue;
    winnerModelId?: string | null;
    completedAt: Date;
    errorMsg?: string | null;
  }
): Promise<number> {
  const res = await client.evaluation.updateMany({
    where: { id, status: { in: [EVALUATION_STATUS.RUNNING, EVALUATION_STATUS.PENDING] } },
    data: {
      status: input.status,
      results: input.results,
      winnerModelId: input.winnerModelId ?? null,
      completedAt: input.completedAt,
      progress: input.status === EVALUATION_STATUS.COMPLETED ? 100 : 0,
      ...(input.errorMsg !== undefined ? { errorMsg: input.errorMsg ?? null } : {}),
    },
  });
  return res.count;
}

/**
 * 按 requestId 前缀查网关 usage_logs 的**成功**条数（对账用：eval:<id>:<modelId>）。
 *
 * ⚠️ error: null 过滤是结算正确性关键，不可省略：网关「全链失败」分支同样写一条 usage_log
 * （gateway/service.ts 全链败：error=消息、quotaMinor=0n），requestId 与成功路径同为
 * eval:<id>:<modelId> 且该列 @unique —— 若只按前缀计数，崩溃单里的**失败列也会被计入 k**，
 * 对账便 capture(k×单价) 向用户多扣费、并把失败列按成功结算。
 * 加上 error: null 后，k ≡ 真正产出结果的列数，与正常结算口径 runs.filter(r=>r.ok) 精确对齐
 * （UPSTREAM / FREE_PROXY 免扣路径成功行同为 error: null——评估域按「有结果即计费」，不分底层路径）。
 */
export async function countSuccessfulUsageLogsByRequestPrefix(
  client: EvalClient,
  prefix: string
): Promise<number> {
  return client.usageLog.count({ where: { requestId: { startsWith: prefix }, error: null } });
}

export const evaluationRepository = {
  createEvaluationWithModels,
  findByIdempotencyKey,
  findByIdWithModels,
  listByUser,
  listDemo,
  advanceStatus,
  updateModelResult,
  finalizeEvaluation,
  countSuccessfulUsageLogsByRequestPrefix,
} as const;

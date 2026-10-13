/**
 * evaluation 模型评测域 service：对比测评编排（EVAL-01 交付核心）。
 *
 * 关键决策（登记）：
 * - 建单即败：先建单（status=0 + 占位列）再 hold；hold 失败（40001 余额不足）→ 单置 status=3 保留
 *   失败痕迹，不留悬浮冻结——账本铁律「有单无扣钱 OK / 扣钱必须有结果」；
 * - 创建即跑：POST 内**同步**建单→hold→并行 executeChat→结算后才返回（spec「创建即跑」口径，
 *   非异步任务投递）；前端仍轮询 GET /[id]，作用是崩溃/超时停在 status=1 时的**兜底收敛**；
 * - 结算语义复用 billing 原生：全成功 → capture(总额)；部分成功 → capture(成功数×单价)，差额由
 *   captureHold 自动解冻（= 单败 void 差额）；全败 → void(总额)，status=3；
 * - 崩溃遗留单对账（读路径触发）：status=1 超时 → 按网关 usage_logs **成功行**（error:null）前缀计数补偿；
 * - 单模型 60s 超时（Promise.race 放弃等待并标列失败）；模型下架只污该列，不影响他列结算；
 * - 评估域 hold/capture 与网关 executeChat 自身计费为两条独立账（各自自洽）；潜在重复计费疑问
 *   登记报告 §风险，待经理/角色1 仲裁（本期按需求实现）。
 */
import { prisma } from "../../db/prisma";
import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import { billingService } from "../billing/service";
import { gatewayOrchestrator } from "../gateway/service";
import { DEFAULT_PRICING, PRICING_CONFIG_KEYS, parsePricingConfig, fenToYuan, type PricingConfig } from "@aidean/shared";
import type { Prisma } from "@prisma/client";
import { evaluationRepository } from "./repository";
import { EVAL_RESPONSE_TRIM } from "./schema";
import {
  EVALUATION_LIMITS,
  EVALUATION_STATUS,
  EVAL_MODEL_STATUS,
  WINNER_RULE,
  type CreateEvaluationInput,
  type EvaluationDetailView,
  type EvaluationListRow,
  type EvaluationRow,
  type EvaluationModelView,
} from "./types";

// ==================== 计价读取（60s 缓存 + 回退默认，仿 auth security 数缓存模式） ====================

let pricingCache: { at: number; value: PricingConfig } | null = null;

export async function readEvalPricing(force = false): Promise<PricingConfig> {
  const now = Date.now();
  if (!force && pricingCache && now - pricingCache.at < EVALUATION_LIMITS.PRICING_CACHE_MS) {
    return pricingCache.value;
  }
  let cfg: PricingConfig = DEFAULT_PRICING;
  try {
    const rows = await prisma.systemConfig.findMany({
      where: {
        configKey: { in: [PRICING_CONFIG_KEYS.evalPerModel, PRICING_CONFIG_KEYS.currency] },
      },
      select: { configKey: true, configValue: true },
    });
    const map: Record<string, string | null> = {};
    for (const r of rows) map[r.configKey] = r.configValue;
    cfg = parsePricingConfig({ evalPerModel: map[PRICING_CONFIG_KEYS.evalPerModel] ?? null, currency: map[PRICING_CONFIG_KEYS.currency] ?? null });
  } catch {
    /* DB 不可用回退默认（读侧容错不抛错） */
  }
  pricingCache = { at: now, value: cfg };
  return cfg;
}

/** 单价（元）→ 分（minor）整数；非法值回退默认 */
export function evalPerModelMinor(cfg: PricingConfig): bigint {
  const n = Number.isFinite(cfg.evalPerModel) && cfg.evalPerModel >= 0 ? cfg.evalPerModel : DEFAULT_PRICING.evalPerModel;
  return BigInt(Math.round(n * 100));
}

// ==================== 响应内容提取（兼容 openai / anthropic 归一形状） ====================

export function extractContent(res: unknown): string {
  if (!res || typeof res !== "object") return "";
  const json = res as Record<string, unknown>;
  const choices = json.choices as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(choices) && choices.length > 0) {
    const msg = choices[0].message as Record<string, unknown> | undefined;
    const c = msg?.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) return c.map((p) => (typeof p === "object" && p !== null && "text" in p ? String((p as Record<string, unknown>).text) : String(p))).join("");
  }
  const content = json.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === "object" && p !== null && "text" in p ? String((p as Record<string, unknown>).text) : ""))
      .join("");
  }
  return "";
}

// ==================== 内部工具 ====================

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** 单模型超时包装：超时即放弃等待（executeChat 不接受 signal，race 语义足矣） */
async function withModelTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("模型响应超时（60s）")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** winner 判定：错误剔除 → 完整响应优先 → 响应最长（规则常量可配） */
export function pickWinner(
  runs: { modelId: string; ok: boolean; content: string }[]
): string | null {
  const ok = runs.filter((r) => r.ok);
  if (ok.length === 0) return null;
  const complete = WINNER_RULE.preferCompleteResponse
    ? ok.filter((r) => r.content.trim().length > 0)
    : ok;
  const pool = complete.length > 0 ? complete : ok;
  return pool.reduce((a, b) => (a.content.length >= b.content.length ? a : b)).modelId;
}

// ==================== 视图映射 ====================

/**
 * Evaluation.cost（Decimal，落库口径=分/minor，见 spec「建单（cost=N×单价，分）」）→ 双字段输出：
 * - costMinor：分整数字符串（API 消费方做整数断言用，金额铁律）；
 * - costYuan ：元两位小数字符串（UI 直显，¥ 前缀与 balance 页 / UsageLedger 同口径）。
 * 原实现只有 costYuan 一个字段却装分值（命名与语义相反，UI 靠额外写「分」后缀侥幸自洽）。
 * RW-3 更正为语义正确的双字段，属**契约变更**（已同步 types / list-view / 两页 UI / 单测 / API 文档）。
 * Decimal 可能带小数位，取整数部分再转 BigInt；脏数据兜底不抛错（结算金额以 ledger/holds 为权威）。
 */
function costFields(cost: Prisma.Decimal | string | number): { costMinor: string; costYuan: string } {
  const costMinor = String(cost ?? "0");
  let costYuan = "0.00";
  try {
    costYuan = fenToYuan(BigInt(costMinor.split(".")[0] ?? "0"));
  } catch {
    /* 脏数据兜底：展示层不抛错（结算金额以账本 ledger/holds 为权威，cost 仅展示用） */
  }
  return { costMinor, costYuan };
}

function toModelView(m: EvaluationRow["evaluationModels"][number]): EvaluationModelView {
  const raw = m.response ?? "";
  return {
    id: m.id,
    modelId: m.modelId,
    modelName: m.model?.nameDisplay ?? m.model?.modelCode ?? m.modelId,
    modelSlug: m.model?.slug ?? null,
    status: m.status,
    // 截断防巨型 payload（spec §schema EVAL_RESPONSE_TRIM=40000）——网关 mock 上游可能回吐超长内容
    response: raw.length > EVAL_RESPONSE_TRIM ? raw.slice(0, EVAL_RESPONSE_TRIM) + "…[截断]" : raw,
    errorMessage: m.errorMessage,
    tokensInput: m.tokensInput,
    tokensOutput: m.tokensOutput,
    tokensTotal: m.tokensTotal,
    latencyMs: m.latencyMs,
    ttftMs: m.ttftMs,
  };
}

function toDetailView(row: EvaluationRow): EvaluationDetailView {
  const cost = costFields(row.cost);
  return {
    id: row.id,
    status: row.status as EvaluationDetailView["status"],
    isPaid: row.isPaid,
    prompt: row.prompt,
    title: row.title,
    winnerModelId: row.winnerModelId,
    costMinor: cost.costMinor,
    costYuan: cost.costYuan,
    errorMsg: row.errorMsg,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    models: row.evaluationModels.map(toModelView),
  };
}

function toListRow(row: EvaluationRow): EvaluationListRow {
  const cost = costFields(row.cost);
  return {
    id: row.id,
    status: row.status as EvaluationListRow["status"],
    isPaid: row.isPaid,
    prompt: row.prompt.slice(0, 120),
    winnerModelId: row.winnerModelId,
    costMinor: cost.costMinor,
    costYuan: cost.costYuan,
    createdAt: row.createdAt.toISOString(),
    modelCount: row.evaluationModels.length,
  };
}

// ==================== 崩溃遗留单对账（读路径触发） ====================

/**
 * 惰性对账：status=1 超时 → 按 usage_logs 实况补偿。
 * 网关对每模型写 usage_log（requestId=eval:<id>:<modelId>）→ 成功条数即成功列数；
 * k>0 → capture(k×单价)（幂等，hold 已捕获则原样返回）+ status=2；
 * k=0 → void（幂等，已作废/过期视作成功）+ status=3。
 */
async function reconcileStale(row: EvaluationRow): Promise<EvaluationRow> {
  const holdKey = `eval:${row.id}`;
  const cfg = await readEvalPricing();
  const perModelMinor = evalPerModelMinor(cfg);
  const okCount = await evaluationRepository.countSuccessfulUsageLogsByRequestPrefix(prisma, `eval:${row.id}:`);
  const now = new Date();
  if (okCount > 0) {
    try {
      await billingService.captureHold(holdKey, perModelMinor * BigInt(okCount));
    } catch {
      /* hold 已捕获/已失效：幂等容忍，账以最终状态为准 */
    }
    const results = { reconcile: true, perModel: [] as unknown[], okCount };
    await evaluationRepository.finalizeEvaluation(prisma, row.id, {
      status: EVALUATION_STATUS.COMPLETED,
      results: results as never,
      winnerModelId: null,
      completedAt: now,
    });
  } else {
    try {
      await billingService.voidHold(holdKey);
    } catch {
      /* 已解冻/不存在：无需再释放 */
    }
    await evaluationRepository.finalizeEvaluation(prisma, row.id, {
      status: EVALUATION_STATUS.FAILED,
      results: { reconcile: true, perModel: [] } as never,
      winnerModelId: null,
      completedAt: now,
      errorMsg: "执行中断，已自动退还",
    });
  }
  const fresh = await evaluationRepository.findByIdWithModels(prisma, row.id);
  return fresh ?? row;
}

// ==================== 服务主体 ====================

export const evaluationService = {
  /**
   * 创建并执行对比测评（付费用户能力）：
   * 建单（幂等键查重）→ RUNNING → hold 总额 → 并行逐模型 executeChat（60s 超时）→ 结算。
   */
  async createAndRun(
    userId: string,
    tier: string,
    input: CreateEvaluationInput
  ): Promise<{ evaluation: EvaluationDetailView; idempotent: boolean }> {
    // 1) tier 门禁：付费用户（Pro/Max）能力
    if (tier === "NORMAL") {
      throw new ApiError(ERROR_CODES.FORBIDDEN, "对比测评为付费用户能力，请升级 Pro/Max 后使用");
    }

    // 2) 幂等键查重（同用户同键 → 返回既有单，不重复扣费）
    if (input.idempotencyKey) {
      const existing = await evaluationRepository.findByIdempotencyKey(prisma, userId, input.idempotencyKey);
      if (existing) return { evaluation: toDetailView(existing), idempotent: true };
    }

    // 3) 模型存在性（须全部存在且未删除；下架只污对应列，此处整体校验防无效单）
    //    同时取 modelCode：网关 executeChat 的 body.model 按 modelCode/slug 解析候选
    //    （gateway repository.findModelByCode），**不接受 AiModel uuid**——若把 uuid 直接透传，
    //    每一列都会 30002「无可用路由」，整单退化成付费必失败（单测因 mock 网关未能暴露）。
    const modelIds = [...new Set(input.modelIds)];
    const modelRows = await prisma.aiModel.findMany({
      where: { id: { in: modelIds }, deletedAt: null },
      select: { id: true, modelCode: true },
    });
    if (modelRows.length !== modelIds.length) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "存在无效或已下架模型");
    }
    const codeByModelId = new Map(modelRows.map((m) => [m.id, m.modelCode]));

    // 4) 计价（60s 缓存 + 回退默认）
    const cfg = await readEvalPricing();
    const perModelMinor = evalPerModelMinor(cfg);
    const totalMinor = perModelMinor * BigInt(modelIds.length);

    // 5) 建单（事务：Evaluation + N 占位列；config 存幂等键）
    const { evaluation } = await evaluationRepository.createEvaluationWithModels(prisma, {
      userId,
      prompt: input.prompt,
      evalType: "comparison",
      comparisonMode: "side-by-side",
      modelIds,
      isPaid: true,
      costMinor: totalMinor,
      configJson: { idempotencyKey: input.idempotencyKey ?? null } as never,
      idempotencyKey: input.idempotencyKey,
    });
    const id = evaluation.id;

    // 6) RUNNING（CAS 0→1）
    await evaluationRepository.advanceStatus(prisma, id, EVALUATION_STATUS.PENDING, EVALUATION_STATUS.RUNNING, {
      startedAt: new Date(),
    });

    // 7) hold 总额（requestId = eval:<id>；同 id 天然幂等）
    const holdKey = `eval:${id}`;
    try {
      await billingService.hold(userId, holdKey, totalMinor);
    } catch (err) {
      // 建单即败：单保留 status=3 + errorMsg，不留悬浮冻结
      await evaluationRepository.advanceStatus(prisma, id, EVALUATION_STATUS.RUNNING, EVALUATION_STATUS.FAILED, {
        errorMsg: err instanceof ApiError && err.code === ERROR_CODES.INSUFFICIENT_BALANCE ? "余额不足" : `预扣失败：${errMessage(err)}`,
      });
      throw err;
    }

    // 8) 并行执行（边执行边回写列结果；单败只污该列）
    const runs = await Promise.all(
      modelIds.map(async (modelId): Promise<{ modelId: string; ok: boolean; content: string; error?: string; tokensInput: number; tokensOutput: number; latencyMs: number }> => {
        const t0 = Date.now();
        try {
          const result = await withModelTimeout(
            gatewayOrchestrator.executeChat(
              userId,
              { model: codeByModelId.get(modelId) as string, messages: [{ role: "user", content: input.prompt }], stream: false },
              `eval:${id}:${modelId}`,
              new Date(),
              { billingExempt: true }
            ),
            EVALUATION_LIMITS.MODEL_TIMEOUT_MS
          );
          const content = extractContent(result.response);
          const latencyMs = result.meta.latencyMs ?? Date.now() - t0;
          await evaluationRepository.updateModelResult(prisma, {
            evaluationId: id,
            modelId,
            status: EVAL_MODEL_STATUS.COMPLETED,
            response: content,
            tokensInput: result.meta.promptTokens,
            tokensOutput: result.meta.completionTokens,
            tokensTotal: result.meta.promptTokens + result.meta.completionTokens,
            latencyMs,
            ttftMs: null,
            rawResponse: result.response as never,
          });
          return { modelId, ok: true, content, tokensInput: result.meta.promptTokens, tokensOutput: result.meta.completionTokens, latencyMs };
        } catch (err) {
          const message = errMessage(err);
          await evaluationRepository.updateModelResult(prisma, {
            evaluationId: id,
            modelId,
            status: EVAL_MODEL_STATUS.ERROR,
            errorMessage: message,
            latencyMs: Date.now() - t0,
          });
          return { modelId, ok: false, content: "", error: message, tokensInput: 0, tokensOutput: 0, latencyMs: Date.now() - t0 };
        }
      })
    );

    // 9) 结算：成功份额 capture（差额自动解冻=失败份额 void），全败 void 整单
    const okCount = runs.filter((r) => r.ok).length;
    const now = new Date();
    if (okCount > 0) {
      await billingService.captureHold(holdKey, perModelMinor * BigInt(okCount));
      const winnerModelId = pickWinner(runs);
      const results = {
        perModel: runs.map((r) => ({
          modelId: r.modelId,
          ok: r.ok,
          error: r.error ?? null,
          latencyMs: r.latencyMs,
          tokensInput: r.tokensInput,
          tokensOutput: r.tokensOutput,
        })),
        winnerRule: WINNER_RULE,
        settle: { okCount, failCount: runs.length - okCount, perModelMinor: perModelMinor.toString() },
      };
      await evaluationRepository.finalizeEvaluation(prisma, id, {
        status: EVALUATION_STATUS.COMPLETED,
        results: results as never,
        winnerModelId: winnerModelId,
        completedAt: now,
      });
    } else {
      await billingService.voidHold(holdKey);
      const results = {
        perModel: runs.map((r) => ({ modelId: r.modelId, ok: false, error: r.error ?? null, latencyMs: r.latencyMs })),
        winnerRule: WINNER_RULE,
        settle: { okCount: 0, failCount: runs.length, perModelMinor: perModelMinor.toString() },
      };
      await evaluationRepository.finalizeEvaluation(prisma, id, {
        status: EVALUATION_STATUS.FAILED,
        results: results as never,
        winnerModelId: null,
        completedAt: now,
        errorMsg: "全部模型调用失败，已全额退还",
      });
    }

    const fresh = await evaluationRepository.findByIdWithModels(prisma, id);
    return { evaluation: toDetailView(fresh ?? evaluation), idempotent: false };
  },

  /** 我的测评分页（倒序） */
  async getMyEvaluations(userId: string, page: number, pageSize: number): Promise<{ rows: EvaluationListRow[]; total: number; page: number; pageSize: number }> {
    const { rows, total } = await evaluationRepository.listByUser(prisma, userId, page, pageSize);
    return { rows: rows.map(toListRow), total, page, pageSize };
  },

  /** 详情：本人 或 公开示例；status=1 超时触发惰性对账 */
  async getEvaluation(userId: string, id: string): Promise<EvaluationDetailView> {
    let row = await evaluationRepository.findByIdWithModels(prisma, id);
    if (!row) throw new ApiError(ERROR_CODES.BAD_REQUEST, "测评不存在");
    if (row.userId !== userId && !(row.isPaid === false)) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, "无权查看该测评");
    }
    if (
      row.status === EVALUATION_STATUS.RUNNING &&
      row.startedAt &&
      Date.now() - row.startedAt.getTime() > EVALUATION_LIMITS.STALE_AFTER_MS
    ) {
      row = await reconcileStale(row);
    }
    return toDetailView(row);
  },

  /** 公开示例列表（isPaid=false，免费/未登录可看） */
  async getDemoEvaluations(limit = 3): Promise<EvaluationDetailView[]> {
    const rows = await evaluationRepository.listDemo(prisma, limit);
    return rows.map(toDetailView);
  },

  /** 对账工具（测试/运维用）：强制推进一条 status=1 超时单 */
  async reconcileById(id: string): Promise<EvaluationDetailView> {
    const row = await evaluationRepository.findByIdWithModels(prisma, id);
    if (!row) throw new ApiError(ERROR_CODES.BAD_REQUEST, "测评不存在");
    if (row.status !== EVALUATION_STATUS.RUNNING) return toDetailView(row);
    return toDetailView(await reconcileStale(row));
  },
};

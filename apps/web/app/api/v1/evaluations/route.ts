/**
 * /api/v1/evaluations — 对比测评创建与我的列表（EVAL-01）。
 *
 * POST：付费用户（Pro/Max）创建即跑——建单 → hold 总额 → 并行 executeChat → 结算；
 *       返回 evaluation（客户端轮询 GET /[id] 拿终态）。幂等键重放返回既有单。
 * GET：我的测评分页（倒序）。
 * 决策：「创建即跑」按 spec 流程 = 在 POST 请求内同步完成并行执行与结算（非异步投递后台任务），
 *       故正常路径下响应返回时已是终态（2/3）；GET /[id] 轮询是**崩溃/超时场景的兜底**——
 *       进程中途死亡时单会停在 status=1，由读路径惰性对账收敛（见 service.reconcileStale）。
 *       等待上限 = 单模型 60s 超时（EVALUATION_LIMITS.MODEL_TIMEOUT_MS，并行不叠加）。
 *       tier 门禁在 service 内（NORMAL → 403）。
 */
import { requireUserApi } from "../../../../lib/features/auth/session";
import { requireFeature } from "../../../../lib/features/flags/service";
import { evaluationService } from "../../../../lib/features/evaluation/service";
import { parseCreateEvaluationInput, parseEvaluationPage } from "../../../../lib/features/evaluation/schema";
import { withApi } from "../_lib/handler";

export const dynamic = "force-dynamic";

/** 创建对比测评（创建即跑；返回单，客户端轮询详情） */
export const POST = withApi(async (req: Request) => {
  // S2 受控面（TASK-015 / FEATURE_GATES["evaluation.enabled"]）：付费测评开关关闭 → 403+50011。先于鉴权短路，
  // 阻断流量进入下游 createAndRun 计费；受控态已由 PUBLIC /system/features 公开，不新增泄露面。
  await requireFeature("evaluation.enabled");
  const session = await requireUserApi();
  const input = parseCreateEvaluationInput(await req.json().catch(() => null));
  const result = await evaluationService.createAndRun(session.userId, session.tier, input);
  return { evaluation: result.evaluation, idempotent: result.idempotent };
});

/** 我的测评分页 */
export const GET = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const { page, pageSize } = parseEvaluationPage(new URL(req.url).searchParams);
  return await evaluationService.getMyEvaluations(session.userId, page, pageSize);
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

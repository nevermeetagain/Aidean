/**
 * /api/v1/evaluations/[id] — 对比测评详情（EVAL-01）。
 *
 * GET：本人可见；公开示例（isPaid=false）任何人可见；他人付费单 → 403。
 * 读路径触发惰性对账：status=1 超时（2×60s）→ 按 usage_logs 实况补偿后再返回。
 */
import { requireUserApi } from "../../../../../lib/features/auth/session";
import { evaluationService } from "../../../../../lib/features/evaluation/service";
import { withApi, type RouteContext } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireUserApi();
    const evaluation = await evaluationService.getEvaluation(session.userId, (await ctx.params).id);
    return { evaluation };
  }
);

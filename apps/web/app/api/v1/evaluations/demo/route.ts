/**
 * /api/v1/evaluations/demo — 公开对比测评示例（EVAL-01）。
 *
 * GET：后台预置 isPaid=false 的历史示例，免费/未登录均可看（演示付费能力形态）。
 * 注意：静态段 demo 优先于动态段 [id]，不会冲突。
 * 参数口径：limit 缺省 3；显式传入时须为 1..10 整数，越界 → 40000
 * （与同域 parseEvaluationPage 的「参数非法即拒」风格一致；此前静默收敛为 3 会掩盖调用方缺陷，
 * 且与角色3 G6 契约用例 E6 的断言冲突 —— RW-3 统一为拒参，契约见《API接口文档》§5.4.1）。
 */
import { evaluationService } from "../../../../../lib/features/evaluation/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

// ==================== 路由 ====================

/** 公开 demo 条数上限（超出即 40000；spec 契约 limit 1..10 默认 3） */
const DEMO_LIMIT_MAX = 10;

/** limit 归一：缺省 3；非 1..10 整数 → 抛 40000（RW-3 定论：越界拒参，不静默收敛） */
function normalizeDemoLimit(raw: string | null): number {
  if (raw === null || raw === "") return 3;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > DEMO_LIMIT_MAX) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `limit 须为 1-${DEMO_LIMIT_MAX} 整数`);
  }
  return n;
}

export const GET = withApi(async (req: Request) => {
  const limit = normalizeDemoLimit(new URL(req.url).searchParams.get("limit"));
  return { items: await evaluationService.getDemoEvaluations(limit) };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);

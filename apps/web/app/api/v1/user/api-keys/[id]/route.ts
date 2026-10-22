/**
 * DELETE /api/v1/user/api-keys/[id] — 删除本人 API Key（GW-KEY-01 / RW-2 路由层）。
 *
 * 物理删除（Key 应删除而非吊销）：UsageLog 不引用 apiKeyId，删除不破坏历史消耗明细；
 * 0 行（不存在/非本人）→ 40000。鉴权：requireUserApi（管理面 cookie 会话）。
 */
import { requireUserApi } from "../../../../../../lib/features/auth/session";
import { deleteApiKey } from "../../../../../../lib/features/apikey/service";
import { withApi, type RouteContext } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

export const DELETE = withApi(async (_req: Request, ctx: RouteContext) => {
  const session = await requireUserApi();
  const { id } = await ctx.params;
  await deleteApiKey(session.userId, id);
  return { deleted: true };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, PATCH, OPTIONS } = methodNotAllowed(["DELETE"]);

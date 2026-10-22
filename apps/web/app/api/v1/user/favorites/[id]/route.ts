/**
 * DELETE /api/v1/user/favorites/[id] — 取消收藏（API-007 / TASK-022）。
 *
 * 物理删除本人记录（收藏无语义「吊销」，直接删）。0 行（不存在/非本人）→ 40000（防枚举，沿用 api-keys DELETE 口径）。
 * 受控面：路由首行 requireFeature('favorites.enabled') 先于鉴权（同 POST）。鉴权：requireUserApi。
 */
import { requireUserApi } from "../../../../../../lib/features/auth/session";
import { requireFeature } from "../../../../../../lib/features/flags/service";
import { deleteFavorite } from "../../../../../../lib/features/favorites/service";
import { withApi, type RouteContext } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

export const DELETE = withApi(async (_req: Request, ctx: RouteContext) => {
  await requireFeature("favorites.enabled");
  const session = await requireUserApi();
  const { id } = await ctx.params;
  return deleteFavorite(session.userId, id);
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, PATCH, OPTIONS } = methodNotAllowed(["DELETE"]);

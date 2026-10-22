/**
 * /api/v1/user/favorites — 收藏读写端点（API-005 GET / API-006 POST / TASK-022）。
 *
 * 受控面：feature flag `favorites.enabled`（FEATURE_GATES.api，01-api.contract.ts:86）——
 *   路由首行 requireFeature（先于鉴权，阻断未鉴权流量进下游；受控态已由 PUBLIC /system/features 公开，S2 既定口径）。
 * 鉴权：requireUserApi（管理面 cookie 会话；未登录 10004→401）。
 * 幂等：POST 依赖 @@unique[userId,refType,refId]，重复收藏返回既有记录 HTTP 200（service.createFavorite）。
 * 路由零业务逻辑：解析 → 守卫 → 调 favorites service → withApi 信封。
 */
import { requireUserApi } from "../../../../../lib/features/auth/session";
import { requireFeature } from "../../../../../lib/features/flags/service";
import { createFavorite, listFavorites } from "../../../../../lib/features/favorites/service";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireFeature("favorites.enabled");
  const session = await requireUserApi();
  const query = Object.fromEntries(new URL(req.url).searchParams);
  return listFavorites(session.userId, query);
});

export const POST = withApi(async (req: Request) => {
  await requireFeature("favorites.enabled");
  const session = await requireUserApi();
  const raw = await req.json().catch(() => null);
  return createFavorite(session.userId, raw);
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

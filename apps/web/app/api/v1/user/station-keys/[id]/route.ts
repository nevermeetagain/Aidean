/**
 * /api/v1/user/station-keys/[id] — 单条自有 Key 编辑与删除（控制台问题 3 修复）。
 *
 * PATCH：部分更新（name / apiKey / isActive）——改名与启停免重填密钥；
 * DELETE：按行 id 删除本人 Key，0 行 → 40000。鉴权：requireUserApi（管理面 cookie 会话）。
 */
import { requireUserApi } from "../../../../../../lib/features/auth/session";
import {
  parseStationKeyPatchInput,
  removeStationUserKeyById,
  updateStationUserKey,
} from "../../../../../../lib/features/apikey/station-user-key";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

export const PATCH = withApi(async (req: Request, ctx: RouteContext) => {
  const session = await requireUserApi();
  const { id } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = parseStationKeyPatchInput(raw);
  if (!parsed.ok) throw new ApiError(ERROR_CODES.BAD_REQUEST, parsed.message);
  return { item: await updateStationUserKey(session.userId, id, parsed.value) };
});

export const DELETE = withApi(async (_req: Request, ctx: RouteContext) => {
  const session = await requireUserApi();
  const { id } = await ctx.params;
  await removeStationUserKeyById(session.userId, id);
  return { deleted: true };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);

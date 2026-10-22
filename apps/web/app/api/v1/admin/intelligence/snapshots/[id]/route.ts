/**
 * /api/v1/admin/intelligence/snapshots/[id] — 快照详情。
 */
import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdminApi("admin.intelligence.read");
  const { id } = await ctx.params;

  const snapshot = await prisma.marketSnapshot.findUnique({ where: { id } });
  if (!snapshot) throw new ApiError(ERROR_CODES.BAD_REQUEST, "快照不存在");
  return snapshot;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);

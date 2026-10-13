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

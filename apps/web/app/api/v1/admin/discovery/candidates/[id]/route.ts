/**
 * /api/v1/admin/discovery/candidates/[id] — 候选详情 + 更新 + 删除。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";
import { writeAudit } from "../../../../_lib/audit";

export const dynamic = "force-dynamic";

/** 候选状态机合法值（schema 注释口径：discovered → verifying → verified → promoted / rejected） */
const CANDIDATE_STATUSES = ["discovered", "verifying", "verified", "promoted", "rejected"];

export const GET = withApi(async (_req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdminApi("admin.discovery.read");
  const { id } = await ctx.params;

  const candidate = await prisma.discoveryCandidate.findUnique({
    where: { id },
    include: { evidence: { orderBy: { confidence: "desc" } } },
  });
  if (!candidate) throw new ApiError(ERROR_CODES.BAD_REQUEST, "候选不存在");
  return candidate;
});

export const PUT = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.discovery.write");
  const { id } = await ctx.params;
  const body = await req.json() as Partial<{
    name: string; domain: string; apiBase: string; status: string;
  }>;

  // 白名单字段显式映射（废除 data:body 裸展开，防批量赋值/私网地址注入状态机）
  const data: Prisma.DiscoveryCandidateUpdateInput = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.domain === "string") data.domain = body.domain;
  if (typeof body.apiBase === "string") data.apiBase = body.apiBase;
  if (body.status !== undefined) {
    if (!CANDIDATE_STATUSES.includes(body.status)) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "非法候选状态值");
    }
    data.status = body.status;
  }

  const updated = await prisma.discoveryCandidate.update({
    where: { id },
    data,
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "discovery_candidates",
    action: 2,
    recordId: id,
    newData: body,
  });

  return updated;
});

export const DELETE = withApi(async (_req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.discovery.write");
  const { id } = await ctx.params;

  await prisma.discoveryCandidate.delete({ where: { id } });

  await writeAudit({
    actorId: session.userId,
    tableName: "discovery_candidates",
    action: 3,
    recordId: id,
  });

  return { success: true };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { POST, PATCH, OPTIONS } = methodNotAllowed(["GET", "PUT", "DELETE"]);

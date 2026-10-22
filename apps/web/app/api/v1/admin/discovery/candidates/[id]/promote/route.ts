/**
 * /api/v1/admin/discovery/candidates/[id]/promote — 升级候选为正式 Provider/Station。
 */
import { prisma } from "../../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";
import { writeAudit } from "../../../../../_lib/audit";

export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.discovery.write");
  const { id } = await ctx.params;
  const body = await req.json() as { targetType: "ModelProvider" | "APIStation" };

  const candidate = await prisma.discoveryCandidate.findUnique({ where: { id } });
  if (!candidate) throw new ApiError(ERROR_CODES.BAD_REQUEST, "候选不存在");
  if (candidate.status !== "verified") {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "仅已验证候选可升级");
  }

  let promotedId: string;
  if (body.targetType === "ModelProvider") {
    const provider = await prisma.modelProvider.create({
      data: {
        code: candidate.domain ?? candidate.name.toLowerCase().replace(/\s+/g, "-"),
        name: candidate.name,
        website: candidate.domain ? `https://${candidate.domain}` : null,
        apiUrl: candidate.apiBase,
        rechargeRatio: 1,
      },
    });
    promotedId = provider.id;
  } else {
    const station = await prisma.aPIStation.create({
      data: {
        name: candidate.name,
        displayName: candidate.name,
        description: "",
        baseUrl: candidate.apiBase,
        models: [],
        protocols: [],
        features: [],
      },
    });
    promotedId = station.id;
  }

  await prisma.discoveryCandidate.update({
    where: { id },
    data: { status: "promoted" },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "discovery_candidates",
    action: 2,
    recordId: id,
    newData: { promotedTo: body.targetType, promotedId },
  });

  return { success: true, promotedId, targetType: body.targetType };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);

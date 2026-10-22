/**
 * PATCH  /api/v1/admin/tier-mappings/[id] — update (tierLevel/modelId)
 * DELETE /api/v1/admin/tier-mappings/[id] — delete
 *
 * #18 L4: 用户模型等级映射 admin CRUD。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.tier-mappings.write");
    const { id } = await ctx.params;

    const existing = await prisma.userTierMapping.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "等级映射不存在");
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const { tierLevel, modelId } = body;

    const validTiers = ["OPUS", "SONNET", "FABLE", "HAIKU"];
    if (tierLevel !== undefined && !validTiers.includes(String(tierLevel))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `tierLevel 必须为 ${validTiers.join("/")} 之一`);
    }

    const updated = await prisma.userTierMapping.update({
      where: { id },
      data: {
        ...(tierLevel !== undefined ? { tierLevel: String(tierLevel) as "OPUS" | "SONNET" | "FABLE" | "HAIKU" } : {}),
        ...(modelId !== undefined ? { modelId: String(modelId) } : {}),
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "user_tier_mappings",
      recordId: id,
      action: 2,
      changedFields: Object.keys(body),
      oldData: { tierLevel: existing.tierLevel, modelId: existing.modelId },
      newData: { tierLevel: updated.tierLevel, modelId: updated.modelId },
      requestId: req.headers.get("x-request-id"),
    });

    return { item: updated };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.tier-mappings.write");
    const { id } = await ctx.params;

    const existing = await prisma.userTierMapping.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "等级映射不存在");
    }

    await prisma.userTierMapping.delete({ where: { id } });

    await writeAudit({
      actorId: session.userId,
      tableName: "user_tier_mappings",
      recordId: id,
      action: 3,
      changedFields: ["deleted"],
      oldData: { userId: existing.userId, tierLevel: existing.tierLevel, modelId: existing.modelId },
      requestId: req.headers.get("x-request-id"),
    });

    return { deleted: true, id };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);

/**
 * /api/v1/admin/ranking-weights — 排名维度权重管理（R-34 集成）。
 *
 * GET ：requireAdminApi → 全部 RankingWeight 行（含 4 主维 + 9 扩展维），按 sortOrder 升序。
 * PUT ：requireAdminApi → { dimension, weight, isActive? } → 更新指定维度的权重和启用状态。
 *       weight 范围 [0, 100]；isActive 可选，默认不修改。
 *       更新后 revalidatePath('/models') + revalidatePath('/ladder')。
 *
 * 安全：dimension 必须在 ALL_DIMENSIONS 白名单内；weight 非负有限数。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { writeAudit } from "../../_lib/audit";
import { withApi } from "../../_lib/handler";
import { ApiError, ERROR_CODES } from "../../_lib/errors";

export const dynamic = "force-dynamic";

const VALID_DIMENSIONS = [
  "official", "actual", "review", "selfTest",
  "reasoning", "coding", "math", "multilingual",
  "creativity", "instruction", "safety", "efficiency", "value",
] as const;

export const GET = withApi(async () => {
  await requireAdminApi("admin.configs.read");
  const weights = await prisma.rankingWeight.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });
  return { weights };
});

export const PUT = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.configs.write");
  const body = (await req.json().catch(() => null)) as {
    dimension?: string;
    weight?: number;
    isActive?: boolean;
  } | null;

  if (!body?.dimension || !VALID_DIMENSIONS.includes(body.dimension as typeof VALID_DIMENSIONS[number])) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `dimension 必须为: ${VALID_DIMENSIONS.join(", ")}`);
  }

  const weight = Number(body.weight);
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "weight 必须为 0-100 之间的数值");
  }

  const updated = await prisma.rankingWeight.update({
    where: { dimension: body.dimension },
    data: {
      weight,
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });

  revalidatePath("/models");
  revalidatePath("/ladder");

  await writeAudit({
    actorId: session.userId,
    tableName: "ranking_weights",
    recordId: body.dimension,
    action: 2,
    changedFields: body.isActive !== undefined ? ["weight", "isActive"] : ["weight"],
    newData: { dimension: body.dimension, weight, isActive: updated.isActive },
    requestId: req.headers.get("x-request-id"),
  });

  return { weight: updated };
});

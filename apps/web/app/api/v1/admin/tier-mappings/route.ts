/**
 * GET  /api/v1/admin/tier-mappings — list (paginated, tier/user filter)
 * POST /api/v1/admin/tier-mappings — create
 *
 * #18 L4: 用户模型等级映射（UserTierMapping）admin CRUD。
 * 操作 OPUS/SONNET/FABLE/HAIKU 四档绑定关系。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.tier-mappings.read");

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
  const tierLevel = url.searchParams.get("tierLevel");
  const userId = url.searchParams.get("userId");

  const where: Record<string, string> = {
    ...(tierLevel ? { tierLevel } : {}),
    ...(userId ? { userId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.userTierMapping.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        model: { select: { id: true, nameDisplay: true, modelCode: true } },
        user: { select: { id: true, email: true, nickname: true } },
      },
    }),
    prisma.userTierMapping.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
});

export const POST = withApi(
  async (req: Request) => {
    const session = await requireAdminApi("admin.tier-mappings.write");

    const body = await req.json().catch(() => ({}));
    const { userId, tierLevel, modelId } = body as Record<string, unknown>;

    if (!userId || !tierLevel || !modelId) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "userId、tierLevel、modelId 不能为空");
    }

    // Validate tierLevel enum
    const validTiers = ["OPUS", "SONNET", "FABLE", "HAIKU"];
    if (!validTiers.includes(String(tierLevel))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `tierLevel 必须为 ${validTiers.join("/")} 之一`);
    }

    // 存在性校验：否则 FK 违约会以 50000「内部错误」暴露给前端
    const userExists = await prisma.user.findFirst({
      where: { id: String(userId), deletedAt: null },
      select: { id: true },
    });
    if (!userExists) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "用户不存在");
    }
    const modelExists = await prisma.aiModel.findFirst({
      where: { id: String(modelId), deletedAt: null },
      select: { id: true },
    });
    if (!modelExists) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "模型不存在");
    }

    // Check unique constraint
    const existing = await prisma.userTierMapping.findUnique({
      where: { userId_tierLevel_modelId: { userId: String(userId), tierLevel: String(tierLevel) as "OPUS" | "SONNET" | "FABLE" | "HAIKU", modelId: String(modelId) } },
    });
    if (existing) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "该用户此等级已绑定此模型");
    }

    const created = await prisma.userTierMapping.create({
      data: {
        userId: String(userId),
        tierLevel: String(tierLevel) as "OPUS" | "SONNET" | "FABLE" | "HAIKU",
        modelId: String(modelId),
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "user_tier_mappings",
      recordId: created.id,
      action: 1,
      changedFields: ["userId", "tierLevel", "modelId"],
      newData: { userId: created.userId, tierLevel: created.tierLevel, modelId: created.modelId },
      requestId: req.headers.get("x-request-id"),
    });

    return { item: created };
  }
);

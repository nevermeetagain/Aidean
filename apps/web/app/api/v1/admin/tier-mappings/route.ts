/**
 * GET  /api/v1/admin/tier-mappings — list (paginated, tier/user filter)
 * POST /api/v1/admin/tier-mappings — create
 *
 * #18 L4: 用户模型等级映射（UserTierMapping）admin CRUD。
 * 操作 OPUS/SONNET/FABLE/HAIKU 四档绑定关系。
 */
import { ModelTierLevel } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { parseIntParam, parsePagination } from "../../../../../lib/http/pagination";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";

export const dynamic = "force-dynamic";

/** 合法 tierLevel 白名单：取 Prisma 枚举 ModelTierLevel（OPUS/SONNET/FABLE/HAIKU），GET 与 POST 共用。 */
const VALID_TIER_LEVELS: readonly string[] = Object.values(ModelTierLevel);

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.tier-mappings.read");

  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：非法整数串显式 400（不再 500，也不静默回退）；
  // 空串视同缺省；合法值仍由 parsePagination 钳制到既有区间。
  for (const key of ["page", "pageSize"] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== "" && Number.isNaN(parseIntParam(raw, Number.NaN))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `参数 ${key} 必须为整数`);
    }
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 100 });
  const tierLevel = url.searchParams.get("tierLevel");
  const userId = url.searchParams.get("userId");
  // P0.2（B11-11 待裁定第 5 项）：非法枚举在构造 where 之前拦成 400——
  // tierLevel 是 Prisma 枚举列，交给 Prisma 转换会抛 PrismaClientValidationError → 500。
  // 白名单取 ModelTierLevel 枚举本身，不手写字符串数组。空串视同缺省。
  if (tierLevel !== null && tierLevel !== "" && !VALID_TIER_LEVELS.includes(tierLevel)) {
    throw new ApiError(
      ERROR_CODES.BAD_REQUEST,
      `tierLevel 必须为 ${VALID_TIER_LEVELS.join("/")} 之一`,
    );
  }

  const where: Record<string, string> = {
    ...(tierLevel ? { tierLevel } : {}),
    ...(userId ? { userId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.userTierMapping.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
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

    // Validate tierLevel enum（白名单取 ModelTierLevel 枚举，与 GET 共用单点）
    if (!VALID_TIER_LEVELS.includes(String(tierLevel))) {
      throw new ApiError(
        ERROR_CODES.BAD_REQUEST,
        `tierLevel 必须为 ${VALID_TIER_LEVELS.join("/")} 之一`,
      );
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

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

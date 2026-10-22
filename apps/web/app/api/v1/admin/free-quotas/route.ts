/**
 * GET  /api/v1/admin/free-quotas — list (paginated, tier filter)
 * POST /api/v1/admin/free-quotas — create
 *
 * #18 L4: 免费额度配置（UserFreeQuota）admin CRUD。
 * 定义每个账户等级（NORMAL/PRO/MAX）的免费模型及 token 额度 + 刷新周期。
 * 网关 FREE 路径消费此表控制台自动加载。
 */
import { AccountTier } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { parseIntParam, parsePagination } from "../../../../../lib/http/pagination";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";

export const dynamic = "force-dynamic";

/** 合法 tier 白名单：取 Prisma 枚举 AccountTier（NORMAL/PRO/MAX），GET 校验与 POST 写入共用单点。 */
const VALID_TIERS: readonly string[] = Object.values(AccountTier);

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.free-quotas.read");

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
  const tier = url.searchParams.get("tier");
  // P0.2（B11-11 待裁定第 5 项）：非法枚举必须在构造 where 之前拦成 400——
  // 交给 Prisma 做枚举转换会抛 PrismaClientValidationError → 500。空串视同缺省。
  if (tier !== null && tier !== "" && !VALID_TIERS.includes(tier)) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `tier 必须为 ${VALID_TIERS.join("/")} 之一`);
  }

  const where: Record<string, string> = {
    ...(tier ? { tier } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.userFreeQuota.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        model: { select: { id: true, nameDisplay: true, modelCode: true } },
      },
    }),
    prisma.userFreeQuota.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
});

export const POST = withApi(
  async (req: Request) => {
    const session = await requireAdminApi("admin.free-quotas.write");

    const body = await req.json().catch(() => ({}));
    const { tier, modelId, quotaTokens, refreshCycle } = body as Record<string, unknown>;

    if (!tier || !modelId || quotaTokens === undefined || !refreshCycle) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "tier、modelId、quotaTokens、refreshCycle 不能为空");
    }

    if (!VALID_TIERS.includes(String(tier))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `tier 必须为 ${VALID_TIERS.join("/")} 之一`);
    }

    const validCycles = ["DAY", "WEEK", "MONTH"];
    if (!validCycles.includes(String(refreshCycle))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `refreshCycle 必须为 ${validCycles.join("/")} 之一`);
    }

    const tokens = Number(quotaTokens);
    if (!Number.isFinite(tokens) || tokens < 0) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "quotaTokens 必须为非负数");
    }

    // 存在性校验：否则 FK 违约会以 50000「内部错误」暴露给前端
    const modelExists = await prisma.aiModel.findFirst({
      where: { id: String(modelId), deletedAt: null },
      select: { id: true },
    });
    if (!modelExists) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "模型不存在");
    }

    // Check unique constraint (tier + modelId)
    const existing = await prisma.userFreeQuota.findUnique({
      where: { tier_modelId: { tier: String(tier) as "NORMAL" | "PRO" | "MAX", modelId: String(modelId) } },
    });
    if (existing) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "该等级已配置此模型的免费额度");
    }

    const created = await prisma.userFreeQuota.create({
      data: {
        tier: String(tier) as "NORMAL" | "PRO" | "MAX",
        modelId: String(modelId),
        quotaTokens: tokens,
        refreshCycle: String(refreshCycle) as "DAY" | "WEEK" | "MONTH",
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "user_free_quotas",
      recordId: created.id,
      action: 1,
      changedFields: ["tier", "modelId", "quotaTokens", "refreshCycle"],
      newData: { tier: created.tier, modelId: created.modelId, quotaTokens: created.quotaTokens, refreshCycle: created.refreshCycle },
      requestId: req.headers.get("x-request-id"),
    });

    return { item: created };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

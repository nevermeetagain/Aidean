/**
 * GET  /api/v1/admin/free-quotas — list (paginated, tier filter)
 * POST /api/v1/admin/free-quotas — create
 *
 * #18 L4: 免费额度配置（UserFreeQuota）admin CRUD。
 * 定义每个账户等级（NORMAL/PRO/MAX）的免费模型及 token 额度 + 刷新周期。
 * 网关 FREE 路径消费此表控制台自动加载。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.free-quotas.read");

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
  const tier = url.searchParams.get("tier");

  const where: Record<string, string> = {
    ...(tier ? { tier } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.userFreeQuota.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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

    const validTiers = ["NORMAL", "PRO", "MAX"];
    if (!validTiers.includes(String(tier))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `tier 必须为 ${validTiers.join("/")} 之一`);
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

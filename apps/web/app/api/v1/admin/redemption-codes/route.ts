/**
 * /api/v1/admin/redemption-codes — 兑换码管理（SubTask 3.3.1）。
 *
 * GET：分页列表（batchNo/status 筛选）+ 批次聚合（批次维度统计）。
 *      明文码不在此接口返回（仅批次创建响应一次性返回）。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { redemptionRepository } from "../../../../../lib/features/package/redemption/repository";
import { AdminRedemptionListQuerySchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.redemptions.read");
  const url = new URL(req.url);
  const parsed = AdminRedemptionListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    batchNo: url.searchParams.get("batchNo") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, batchNo, status } = parsed.data;

  const { rows, total } = await redemptionRepository.listPage({
    ...(batchNo ? { batchNo } : {}),
    ...(status ? { status } : {}),
    page,
    pageSize,
  });
  const batches = await redemptionRepository.listBatches();
  const activePackages = await prisma.package.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, title: true },
  });

  return {
    codes: rows.map((r) => ({
      id: r.id,
      codeMasked: r.code ? `${r.code.slice(0, 4)}****${r.code.slice(-4)}` : "",
      targetType: r.targetType as string,
      balanceYuan: r.balanceMinor !== null ? (Number(r.balanceMinor) / 100).toFixed(2) : null,
      packageId: r.packageId,
      batchNo: r.batchNo,
      status: r.status as string,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      redeemedAt: r.redeemedAt ? r.redeemedAt.toISOString() : null,
    })),
    batches: batches.map((b) => ({
      batchNo: b.batchNo,
      name: b.name,
      targetType: b.targetType as string,
      total: b.total,
      enabled: b.enabled,
      issued: b.issued,
      used: b.used,
      disabled: b.disabled,
      expired: b.expired,
      createdAt: b.createdAt.toISOString(),
    })),
    packages: activePackages,
    total,
    page,
    pageSize,
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);

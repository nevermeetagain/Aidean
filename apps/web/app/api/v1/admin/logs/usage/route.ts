/**
 * /api/v1/admin/logs/usage — 网关调用日志只读查询（S5 日志中心）。
 *
 * GET：requireAdminApi("admin.logs.read") → AdminUsageLogsQuerySchema（分页 page≥1/pageSize≤100 +
 *      userId/model/stationId/billingPath/onlyErrors/from/to 筛选）→ UsageLog 只读分页投影。
 *      金额 quotaMinor 一律 BigInt→string（分）并附 fenToYuan 元口径，规避 JSON 抛错。
 *      本端点只读，禁写/禁删；调用记录属账本类，永不提供修改或删除。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { AdminUsageLogsQuerySchema, fenToYuan } from "@aidean/shared";

export const dynamic = "force-dynamic";

/** 日期筛选：date-only 视为当日末（含），带时间戳原样解析。 */
function toRangeEnd(v: string): Date {
  return v.length === 10 ? new Date(`${v}T23:59:59.999Z`) : new Date(v);
}

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.logs.read");

  const url = new URL(req.url);
  const parsed = AdminUsageLogsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    model: url.searchParams.get("model") ?? undefined,
    stationId: url.searchParams.get("stationId") ?? undefined,
    billingPath: url.searchParams.get("billingPath") ?? undefined,
    onlyErrors: url.searchParams.get("onlyErrors") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, userId, model, stationId, billingPath, onlyErrors, from, to } = parsed.data;

  const where: Prisma.UsageLogWhereInput = {};
  if (userId) where.userId = userId;
  if (model) where.model = model;
  if (stationId) where.stationId = stationId;
  if (billingPath) where.billingPath = billingPath;
  if (onlyErrors) where.error = { not: null };
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: toRangeEnd(to) } : {}),
    };
  }

  const skip = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    prisma.usageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        requestId: true,
        model: true,
        provider: true,
        stationId: true,
        billingPath: true,
        promptTokens: true,
        completionTokens: true,
        cachedTokens: true,
        reasoningTokens: true,
        quotaMinor: true,
        latencyMs: true,
        statusCode: true,
        isStream: true,
        error: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.usageLog.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      requestId: r.requestId,
      userEmail: r.user.email,
      model: r.model,
      provider: r.provider,
      billingPath: r.billingPath as string,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      cachedTokens: r.cachedTokens,
      reasoningTokens: r.reasoningTokens,
      quotaMinor: r.quotaMinor.toString(),
      quotaYuan: fenToYuan(r.quotaMinor),
      latencyMs: r.latencyMs,
      statusCode: r.statusCode,
      isStream: r.isStream,
      hasError: r.error != null,
      error: r.error,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

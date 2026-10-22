/**
 * GET /api/v1/models — 模型分页列表端点（Task L.3.3）。
 *
 * 分页 page/pageSize(≤100) + 筛选 modelType/protocol（Prisma 枚举名白名单，不合法静默忽略）
 * + keyword(ilike nameDisplay)；返回 items 简表与 pagination meta。
 */
import { ModelProtocol, ModelType } from "@prisma/client";
import { ModelListQuerySchema } from "@aidean/shared";
import { prisma } from "../../../../lib/db/prisma";
import { ladderRepository } from "../../../../lib/features/ladder/repository";
import { ApiError, ERROR_CODES } from "../_lib/errors";
import { withApi } from "../_lib/handler";

export const dynamic = "force-dynamic";

/** 枚举名归一：大写后落在 Prisma 枚举值域才参与筛选，否则忽略该筛选键 */
function normalizeEnumName<T extends Record<string, string>>(enumObj: T, raw?: string): keyof T & string | undefined {
  if (!raw) return undefined;
  const upper = raw.trim().toUpperCase();
  return (Object.values(enumObj) as string[]).includes(upper) ? (upper as keyof T & string) : undefined;
}

export const GET = withApi(async (req: Request) => {
  const searchParams = new URL(req.url).searchParams;
  const rawQuery = {
    ...(searchParams.has("page") ? { page: searchParams.get("page") ?? undefined } : {}),
    ...(searchParams.has("pageSize") ? { pageSize: searchParams.get("pageSize") ?? undefined } : {}),
    modelType: searchParams.get("modelType") ?? undefined,
    protocol: searchParams.get("protocol") ?? undefined,
    keyword: searchParams.get("keyword") ?? undefined,
  };
  const parsed = ModelListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "分页或筛选参数非法");
  }
  const { page, pageSize, keyword } = parsed.data;

  const { rows, total } = await ladderRepository.listModels(prisma, {
    skip: (page - 1) * pageSize,
    take: pageSize,
    modelType: normalizeEnumName(ModelType, parsed.data.modelType),
    protocol: normalizeEnumName(ModelProtocol, parsed.data.protocol),
    keyword: keyword?.trim() || undefined,
  });

  return {
    items: rows.map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      vendor: m.vendor,
      vendorBrandColor: m.vendorBrandColor,
      modelType: m.modelType,
      protocol: m.protocol,
      isOpenSource: m.isOpenSource,
      contextLength: m.contextLength,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);

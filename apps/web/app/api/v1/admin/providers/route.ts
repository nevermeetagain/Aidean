/**
 * /api/v1/admin/providers — 模型提供商列表 + 新增。
 *
 * GET：requireAdminApi → 分页 + code/name 模糊搜索。
 * POST：requireAdminApi → AdminProviderCreateSchema → 校验 code 唯一 →
 *       创建 ModelProvider + 写 AuditLog(tableName="model_providers", action=1)。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminPageQuerySchema, AdminProviderCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.providers.read");
  const url = new URL(req.url);
  const parsed = AdminPageQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) throw new ApiError(ERROR_CODES.BAD_REQUEST, "分页参数非法");
  const { page, pageSize, q } = parsed.data;

  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.modelProvider.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        name: true,
        nameCn: true,
        nameEn: true,
        logoUrl: true,
        brandColor: true,
        website: true,
        apiUrl: true,
        rechargeRatio: true,
        priceCurrency: true,
        rechargeCurrency: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { offerings: { where: { isActive: true } } } },
      },
    }),
    prisma.modelProvider.count({ where }),
  ]);

  return {
    items: rows,
    total,
    page,
    pageSize,
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.providers.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminProviderCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const d = parsed.data;

  const existing = await prisma.modelProvider.findUnique({ where: { code: d.code } });
  if (existing) throw new ApiError(ERROR_CODES.BAD_REQUEST, `提供商 code 已存在: ${d.code}`);

  const provider = await prisma.modelProvider.create({
    data: {
      code: d.code,
      name: d.name,
      nameCn: d.nameCn,
      nameEn: d.nameEn,
      logoUrl: d.logoUrl,
      brandColor: d.brandColor,
      website: d.website,
      apiUrl: d.apiUrl,
      description: d.description,
      descriptionCn: d.descriptionCn,
      rechargeRatio: d.rechargeRatio,
      priceCurrency: d.priceCurrency,
      rechargeCurrency: d.rechargeCurrency,
      isActive: d.isActive,
      sortOrder: d.sortOrder,
    },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "model_providers",
    action: 1,
    recordId: provider.id,
    newData: { code: provider.code, name: provider.name },
  });

  revalidatePath("/providers");
  return provider;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

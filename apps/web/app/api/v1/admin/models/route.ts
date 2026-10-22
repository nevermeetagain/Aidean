/**
 * /api/v1/admin/models — 模型管理列表 + 新增（T-2.2.1）。
 *
 * GET：requireAdminApi → 分页 + modelCode/nameDisplay 模糊搜索（含 vendor 名称投影）。
 * POST：requireAdminApi → AdminModelCreateSchema 白名单 → 校验 vendorId 存在 →
 *       创建 AiModel + 写 AuditLog(tableName="ai_models", action=1)。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { listAdminModels } from "../../../../../lib/features/admin/model-list";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { writeModelChangeLog } from "../../../../../lib/features/admin/model-change-log";
import { AdminPageQuerySchema, AdminModelCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.models.read");
  const url = new URL(req.url);
  const parsed = AdminPageQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) throw new ApiError(ERROR_CODES.BAD_REQUEST, "分页参数非法");
  const { page, pageSize, q } = parsed.data;

  // 与 /admin/models 首屏预取共用同一取数真源（where/orderBy/select/映射单点收敛）。
  return await listAdminModels({ page, pageSize, q });
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.models.write");

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminModelCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const data = parsed.data;

  // 校验 vendorId 存在
  const vendor = await prisma.vendor.findUnique({
    where: { id: data.vendorId },
    select: { id: true },
  });
  if (!vendor) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "vendorId 不存在");
  }

  // 唯一性冲突预检（modelCode / slug）
  const existing = await prisma.aiModel.findFirst({
    where: {
      OR: [{ modelCode: data.modelCode }, { slug: data.slug }],
      deletedAt: null,
    },
    select: { modelCode: true, slug: true },
  });
  if (existing) {
    throw new ApiError(
      ERROR_CODES.BAD_REQUEST,
      existing.modelCode === data.modelCode
        ? `modelCode "${data.modelCode}" 已存在`
        : `slug "${data.slug}" 已存在`,
    );
  }

  const model = await prisma.aiModel.create({
    data: {
      modelCode: data.modelCode,
      nameDisplay: data.nameDisplay,
      nameCn: data.nameCn ?? null,
      nameEn: data.nameEn ?? null,
      slug: data.slug,
      vendorId: data.vendorId,
      modelType: data.modelType,
      protocol: data.protocol,
      contextLength: data.contextLength ?? null,
      parameterCount: data.parameterCount ?? null,
      isOpenSource: data.isOpenSource,
      isMultiModal: data.isMultiModal,
      isReasoning: data.isReasoning,
      isCodingOptimized: data.isCodingOptimized,
      officialUrl: data.officialUrl ?? null,
      docsUrl: data.docsUrl ?? null,
      isActive: data.isActive,
      visibility: data.visibility,
      sortOrder: data.sortOrder,
    },
    select: {
      id: true,
      modelCode: true,
      nameDisplay: true,
      slug: true,
      modelType: true,
      isActive: true,
    },
  });

  // 新模型上架后前台 /models 需重渲染
  revalidatePath("/models");
  revalidatePath("/ladder");

  await writeAudit({
    actorId: session.userId,
    tableName: "ai_models",
    recordId: model.id,
    action: 1, // INSERT
    changedFields: Object.keys(data),
    oldData: null,
    newData: model,
    requestId: req.headers.get("x-request-id"),
  });

  // T-1.4.2: admin 写操作留痕 ModelChangeLog
  await writeModelChangeLog({
    modelId: model.id,
    changeType: 'CREATE',
    beforeData: null,
    afterData: { ...model, ...data },
    changedFields: Object.keys(data),
    operatorId: session.userId,
    sourceIp: req.headers.get("x-forwarded-for"),
  });

  return { model };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

/**
 * /api/v1/admin/capabilities — 能力矩阵。
 */
import { withApi } from "../../_lib/handler";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { prisma } from "../../../../../lib/db/prisma";
import { parseIntParam, parsePagination } from "../../../../../lib/http/pagination";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { upsertCapability } from "../../../../../lib/features/admin/matrix/service";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.capabilities.read");
  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：原写法 `Number.parseInt(...) || 50` 虽不产生 NaN，
  // 但把非法串静默当缺省；现统一为显式 400。合法值仍按 pageSize 上限 100 钳制（S8.4 / WC#8）。
  for (const key of ["page", "pageSize"] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== "" && Number.isNaN(parseIntParam(raw, Number.NaN))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `参数 ${key} 必须为整数`);
    }
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 50, maxPageSize: 100 });
  const modelId = url.searchParams.get("modelId");
  const capability = url.searchParams.get("capability");
  // B11-03b G4（矩阵 UI）：新增 source 等值筛选（值域 = CAPABILITY_SOURCES，String 列，非法值只落空集不 500）；
  // modelId 由等值放宽为子串检索，管理员可从矩阵行头复制 UUID 片段定位单个模型（表量级 ~1.7k 行，无索引风险可忽略）。
  const source = url.searchParams.get("source");

  const where = {
    ...(modelId ? { modelId: { contains: modelId } } : {}),
    ...(capability ? { capability } : {}),
    ...(source ? { source } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.capabilityMatrix.findMany({
      where,
      orderBy: { detectedAt: "desc" },
      skip,
      take,
    }),
    prisma.capabilityMatrix.count({ where }),
  ]);

  return { rows, total, page, pageSize };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.capabilities.write");
  // B11-03a：zod 校验 + 引用完整性 + 审计统一下沉 service（upsert 语义不变）
  const body = (await req.json().catch(() => null)) as unknown;
  const record = await upsertCapability(body, { userId: session.userId, requestId: req.headers.get("x-request-id") });
  revalidatePath("/admin/capabilities");
  return record;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

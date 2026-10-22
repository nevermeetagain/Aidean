/**
 * /api/v1/admin/capabilities — 能力矩阵。
 */
import { withApi } from "../../_lib/handler";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { prisma } from "../../../../../lib/db/prisma";
import { upsertCapability } from "../../../../../lib/features/admin/matrix/service";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.capabilities.read");
  const url = new URL(req.url);
  // S8.4 / WC#8：分页封顶——page≥1、pageSize 经 Math.min 封顶 100（防超大 take 扫全表），NaN 回落默认
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50));
  const modelId = url.searchParams.get("modelId");
  const capability = url.searchParams.get("capability");

  const where = {
    ...(modelId ? { modelId } : {}),
    ...(capability ? { capability } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.capabilityMatrix.findMany({
      where,
      orderBy: { detectedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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

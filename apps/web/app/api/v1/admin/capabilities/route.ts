/**
 * /api/v1/admin/capabilities — 能力矩阵。
 */
import { withApi } from "../../_lib/handler";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { prisma } from "../../../../../lib/db/prisma";
import { writeAudit } from "../../_lib/audit";
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
  const body = await req.json() as {
    modelId: string;
    capability: string;
    supported: boolean;
    source?: string;
    confidence?: number;
    maxContextLength?: number;
  };

  const record = await prisma.capabilityMatrix.upsert({
    where: {
      modelId_capability_source: {
        modelId: body.modelId,
        capability: body.capability,
        source: body.source ?? "official",
      },
    },
    create: {
      modelId: body.modelId,
      capability: body.capability,
      supported: body.supported,
      source: body.source ?? "official",
      confidence: body.confidence ?? 0.5,
      maxContextLength: body.maxContextLength,
    },
    update: {
      supported: body.supported,
      confidence: body.confidence,
      maxContextLength: body.maxContextLength,
    },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "capability_matrices",
    action: 1,
    recordId: record.id,
    newData: body,
  });

  revalidatePath("/admin/capabilities");
  return record;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

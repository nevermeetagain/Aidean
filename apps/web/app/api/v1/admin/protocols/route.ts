/**
 * /api/v1/admin/protocols — 协议兼容性矩阵。
 */
import { withApi } from "../../_lib/handler";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { prisma } from "../../../../../lib/db/prisma";
import { writeAudit } from "../../_lib/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.protocols.read");
  const url = new URL(req.url);
  // S8.4 / WC#8：分页封顶——page≥1、pageSize 经 Math.min 封顶 100（防超大 take 扫全表），NaN 回落默认
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50));
  const entityType = url.searchParams.get("entityType");
  const protocol = url.searchParams.get("protocol");

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(protocol ? { protocol } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.protocolCompatibility.findMany({
      where,
      orderBy: { probedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.protocolCompatibility.count({ where }),
  ]);

  return { rows, total, page, pageSize };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.protocols.write");
  const body = await req.json() as {
    entityType: string;
    entityId: string;
    protocol: string;
    supported: boolean;
    probeMethod?: string;
    confidence?: number;
  };

  const record = await prisma.protocolCompatibility.upsert({
    where: {
      entityType_entityId_protocol: {
        entityType: body.entityType,
        entityId: body.entityId,
        protocol: body.protocol,
      },
    },
    create: {
      entityType: body.entityType,
      entityId: body.entityId,
      protocol: body.protocol,
      supported: body.supported,
      probeMethod: body.probeMethod ?? "documented",
      confidence: body.confidence ?? 0.5,
    },
    update: {
      supported: body.supported,
      probeMethod: body.probeMethod,
      confidence: body.confidence,
    },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "protocol_compatibilities",
    action: 1,
    recordId: record.id,
    newData: body,
  });

  revalidatePath("/admin/protocols");
  return record;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

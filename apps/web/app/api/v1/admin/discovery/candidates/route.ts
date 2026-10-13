/**
 * /api/v1/admin/discovery/candidates — 发现候选列表 + 手动创建。
 */
import { withApi } from "../../../_lib/handler";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { prisma } from "../../../../../../lib/db/prisma";
import { writeAudit } from "../../../_lib/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.discovery.read");
  const url = new URL(req.url);
  // S8.4 / WC#8：分页封顶——page≥1、pageSize 经 Math.min 封顶 100（防超大 take 扫全表），NaN 回落默认
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20));
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { candidateType: type } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.discoveryCandidate.findMany({
      where,
      orderBy: { discoveredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { evidence: { take: 5, orderBy: { confidence: "desc" } } },
    }),
    prisma.discoveryCandidate.count({ where }),
  ]);

  return { rows, total, page, pageSize };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.discovery.write");
  const body = await req.json() as {
    candidateType: string;
    name: string;
    domain?: string;
    apiBase?: string;
    sourceType: string;
    sourceUrl?: string;
  };

  const candidate = await prisma.discoveryCandidate.create({
    data: {
      candidateType: body.candidateType,
      name: body.name,
      domain: body.domain ?? null,
      apiBase: body.apiBase ?? null,
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl ?? "",
      status: "discovered",
    },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "discovery_candidates",
    action: 1,
    recordId: candidate.id,
    newData: body,
  });

  revalidatePath("/admin/discovery");
  return candidate;
});

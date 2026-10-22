/**
 * /api/v1/admin/discovery/candidates — 发现候选列表 + 手动创建。
 */
import { withApi } from "../../../_lib/handler";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { prisma } from "../../../../../../lib/db/prisma";
import { parseIntParam, parsePagination } from "../../../../../../lib/http/pagination";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { writeAudit } from "../../../_lib/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.discovery.read");
  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：原写法 `Number.parseInt(...) || 20` 虽不产生 NaN，
  // 但把非法串静默当缺省；现统一为显式 400。合法值仍按 pageSize 上限 100 钳制（S8.4 / WC#8）。
  for (const key of ["page", "pageSize"] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== "" && Number.isNaN(parseIntParam(raw, Number.NaN))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `参数 ${key} 必须为整数`);
    }
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 100 });
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
      skip,
      take,
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

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

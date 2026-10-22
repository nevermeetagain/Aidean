/**
 * GET  /api/v1/admin/api-stations — list API stations (paginated, search)
 * POST /api/v1/admin/api-stations — create a new API station
 *
 * R-49: API站点 admin 板块——管理模型站（APIStation）的 CRUD。
 */
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { parseIntParam, parsePagination } from "../../../../../lib/http/pagination";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ApiStationCreateSchema = z.object({
  name: z.string().min(1, "名称必填").max(100),
  nameCn: z.string().max(100).optional(),
  displayName: z.string().min(1, "显示名必填").max(100),
  description: z.string().max(500).optional().default(""),
  provider: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  apiDocs: z.string().url().optional().or(z.literal("")),
  baseUrl: z.string().url().optional().or(z.literal("")),
  models: z.array(z.string()).optional().default([]),
  protocols: z.array(z.string()).optional().default([]),
  features: z.array(z.string()).optional().default([]),
  useCase: z.string().max(200).optional(),
  icon: z.string().optional(),
  isVerified: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
});

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.api-stations.read");

  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：非法整数串显式 400（不再 500，也不静默回退）；
  // 空串视同缺省；合法值仍由 parsePagination 钳制到既有区间。
  for (const key of ["page", "pageSize"] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== "" && Number.isNaN(parseIntParam(raw, Number.NaN))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `参数 ${key} 必须为整数`);
    }
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 100 });
  const search = url.searchParams.get("search");

  const where: Prisma.APIStationWhereInput = {
    deletedAt: null,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.aPIStation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        _count: { select: { keys: true, packages: true } },
        billingRule: true,
      },
    }),
    prisma.aPIStation.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.api-stations.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = ApiStationCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }

  const station = await prisma.aPIStation.create({
    data: parsed.data,
    select: {
      id: true, name: true, nameCn: true, displayName: true, description: true,
      provider: true, website: true, apiDocs: true, baseUrl: true,
      models: true, protocols: true, features: true, useCase: true,
      icon: true, isVerified: true, isFeatured: true, createdAt: true,
    },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "api_stations",
    recordId: station.id,
    action: 1,
    changedFields: Object.keys(parsed.data),
    newData: station,
    requestId: req.headers.get("x-request-id"),
  });

  return { item: station };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

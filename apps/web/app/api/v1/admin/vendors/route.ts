/**
 * /api/v1/admin/vendors — 模型厂商后台管理（v1.9 优先级 + Phase 2 CRUD 扩展）。
 *
 * GET ：requireAdminApi → 厂商简表（含 modelCount），按 priority 升序（1 最高）+ name 兜底。
 * PUT ：requireAdminApi → { priorities: [{ id, priority }] }（AdminConfigPanel 原口径，兼容保留；逐行写 AuditLog action=2）。
 * POST：requireAdminApi → AdminVendorCreateSchema 新建（code 唯一，重复 400）；
 *       写 AuditLog(tableName="vendors", action=1)。
 */
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminVendorCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdminApi("admin.vendors.read");
  const vendors = await prisma.vendor.findMany({
    where: { deletedAt: null },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      nameCn: true,
      country: true,
      priority: true,
      isActive: true,
      modelCount: true,
    },
  });
  return { vendors };
});

/** POST 新建厂商（SubTask 2.3.1）：code 唯一约束冲突 → 400；成功写 INSERT 审计 */
export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.vendors.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminVendorCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const data = parsed.data;
  try {
    const vendor = await prisma.vendor.create({
      data: {
        code: data.code,
        name: data.name,
        nameCn: data.nameCn ?? null,
        priority: data.priority,
        isActive: data.isActive,
      },
      select: { id: true, code: true, name: true },
    });
    await writeAudit({
      actorId: session.userId,
      tableName: "vendors",
      recordId: vendor.id,
      action: 1,
      changedFields: ["code", "name", "nameCn", "priority", "isActive"],
      newData: vendor,
      requestId: req.headers.get("x-request-id"),
    });
    return { vendor };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "厂商 code 已存在");
    }
    throw err;
  }
});

interface PriorityPatch {
  id?: unknown;
  priority?: unknown;
}

export const PUT = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.vendors.write");
  const body = (await req.json().catch(() => null)) as { priorities?: PriorityPatch[] } | null;
  const patches = Array.isArray(body?.priorities) ? body!.priorities : [];

  const valid = patches.filter(
    (p): p is { id: string; priority: number } =>
      typeof p.id === "string" &&
      p.id.length > 0 &&
      Number.isInteger(p.priority) &&
      (p.priority as number) >= 1 &&
      (p.priority as number) <= 99
  );
  if (!valid.length) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "优先级配置格式非法（需 {id, priority 1-99} 数组）");
  }

  // 审计前置：抓取更新前 priority（查不到的 id 允许落 update，update 抛 P2025 走全局 50000）
  const befores = (await prisma.vendor.findMany({
    where: { id: { in: valid.map((p) => p.id) } },
    select: { id: true, priority: true },
  })) ?? [];
  const beforeMap = new Map(befores.map((b) => [b.id, b.priority]));

  const saved = await prisma.$transaction(
    valid.map((p) =>
      prisma.vendor.update({
        where: { id: p.id },
        data: { priority: p.priority },
        select: { id: true },
      })
    )
  );

  // 管理端写操作审计口径补全：旧 PUT 批量优先级亦逐行落 audit_logs(action=2)
  await Promise.all(
    valid.map((p) =>
      writeAudit({
        actorId: session.userId,
        tableName: "vendors",
        recordId: p.id,
        action: 2,
        changedFields: ["priority"],
        oldData: { priority: beforeMap.get(p.id) ?? null },
        newData: { priority: p.priority },
        requestId: req.headers.get("x-request-id"),
      })
    )
  );

  return { saved: saved.length };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST", "PUT"]);

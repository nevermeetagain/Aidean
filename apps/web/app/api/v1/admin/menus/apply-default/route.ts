/**
 * /api/v1/admin/menus/apply-default — 一键应用「出厂默认三级导航树（7 板块）」。
 * POST：requireAdminApi("admin.menus.write") → applyDefaultAdminNav（URL 不变、只增不减，自定义多余入口停用）
 *       → revalidateTag("admin-nav") → 审计（action=2 UPDATE）→ 返回 {upserted, deactivated}。
 * 与 prisma/seed-admin-nav-default.ts 同一实现（lib/admin/apply-default-nav.ts）。
 */
import { revalidateTag } from "next/cache";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { applyDefaultAdminNav } from "../../../../../../lib/admin/apply-default-nav";
import { withApi } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.menus.write");
  const result = await applyDefaultAdminNav(prisma.navigationMenu);
  revalidateTag("admin-nav");
  await writeAudit({
    actorId: session.userId,
    tableName: "navigation_menus",
    recordId: "seed-admin-nav-default",
    action: 2,
    changedFields: ["level", "parentCode", "sortOrder", "isActive"],
    newData: { scope: "ADMIN", defaultTree: "7-sections", ...result },
    requestId: req.headers.get("x-request-id"),
  });
  return result;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);

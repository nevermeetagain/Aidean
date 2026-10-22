/**
 * GET /api/v1/admin/feature-flags — 后台功能开关列表（TASK-016 / API-003）。
 *
 * requireAdminApi("admin.configs.read") → 全部 FeatureFlag 的**管理投影**（含优先级/类目/描述/时间戳等运营字段），
 * 与 PUBLIC GET /system/features（仅 7 布尔开/关）分工：本端点供后台开关页读全量元数据。
 * 稳定排序：priority desc（高优先级在前）→ flagCode asc（同优先级字典序），避免展示抖动。
 * flagCode 真源受 seed + feature-flags.spec 漂移守卫约束，恒属 7 码枚举。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdminApi("admin.configs.read");
  const rows = await prisma.featureFlag.findMany({
    orderBy: [{ priority: "desc" }, { flagCode: "asc" }],
    select: {
      id: true,
      flagCode: true,
      name: true,
      nameCn: true,
      description: true,
      isEnabled: true,
      category: true,
      priority: true,
      updatedAt: true,
    },
  });
  return {
    items: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);

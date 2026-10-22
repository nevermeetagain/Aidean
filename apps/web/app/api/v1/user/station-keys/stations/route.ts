/**
 * GET /api/v1/user/station-keys/stations — 可选 UPSTREAM 计费站点列表（控制台问题 3 修复）。
 *
 * 供「官方平台 Key」面板下拉选择平台，替代手填 UUID。
 * 返回 = 数据库内 UPSTREAM 站点（billingMode=UPSTREAM 且活跃）∪ 官方平台目录（N3 丁：六大主流平台，
 * 即使未入库也能开箱可选）。两路以 displayName 去重，数据库行优先（保留真实 id 供录入落库）。
 * 鉴权：requireUserApi（管理面 cookie 会话）。
 */
import { requireUserApi } from "../../../../../../lib/features/auth/session";
import { listUpstreamStations } from "../../../../../../lib/features/apikey/station-user-key";
import { OFFICIAL_PLATFORM_CATALOG } from "../../../../../../lib/features/upstream/official-catalog";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireUserApi();

  const dbItems = await listUpstreamStations();
  // 官方平台目录：catalog:<code> 前缀命名空间 id，避免与真实站点 UUID 冲突；未入库也能开箱可选
  const catalogItems = OFFICIAL_PLATFORM_CATALOG.map((p) => ({
    id: `catalog:${p.code}`,
    displayName: p.nameCn || p.name,
    baseUrl: p.baseUrl,
    code: p.code,
    icon: p.icon,
    brandColor: p.brandColor,
    models: p.models,
    format: p.format,
  }));

  // 去重：同名官方平台以数据库行优先（带真实站点 id，录入才能落库；目录项作开箱兜底）
  const seenNames = new Set<string>();
  const merged = [...dbItems, ...catalogItems].filter((item) => {
    const key = item.displayName.trim().toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  return { items: merged };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);

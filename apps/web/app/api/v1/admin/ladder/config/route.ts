/**
 * /api/v1/admin/ladder/config — 天梯图后台配置（v1.9；R-83 T2 扩两键）。
 *
 * GET ：requireAdminApi → { granularity, loadWindowPct, hotVendorCount }
 *       （缺行回退默认 0.1 / 25 / 8）。
 * PUT ：requireAdminApi → body 三键至少其一（granularity / loadWindowPct / hotVendorCount）
 *       → 各 set* clamp 后 upsert system_configs → 三键有效值。
 * 说明：granularity/hotVendorCount 为纯呈现参数、loadWindowPct 为分带高度（band 缓存按带独立），
 *       均无需失效 Redis；PUT 落库后 revalidatePath 即时失效 /models 与 /ladder 的 ISR 页面缓存
 *       （v2.2 修正：此前依赖页面 3600s revalidate 首刷，运营改配置最长 1 小时不可见）。
 */
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import {
  getLadderGranularity,
  setLadderGranularity,
  getLadderLoadWindowPct,
  setLadderLoadWindowPct,
  getLadderHotVendorCount,
  setLadderHotVendorCount,
} from "../../../../../../lib/features/ladder/config";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdminApi("admin.configs.read");
  const [granularity, loadWindowPct, hotVendorCount] = await Promise.all([
    getLadderGranularity(),
    getLadderLoadWindowPct(),
    getLadderHotVendorCount(),
  ]);
  return { granularity, loadWindowPct, hotVendorCount };
});

export const PUT = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.configs.write");
  const body = (await req.json().catch(() => null)) as
    | { granularity?: unknown; loadWindowPct?: unknown; hotVendorCount?: unknown }
    | null;
  const hasGranularity = body && Number.isFinite(Number(body.granularity));
  const hasLoadWindowPct = body && Number.isFinite(Number(body.loadWindowPct));
  const hasHotVendorCount = body && Number.isFinite(Number(body.hotVendorCount));
  if (!hasGranularity && !hasLoadWindowPct && !hasHotVendorCount) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "至少提供 granularity / loadWindowPct / hotVendorCount 之一（数值）");
  }

  const changed: string[] = [];
  const auditFor = async (recordId: string, value: number) => {
    await writeAudit({
      actorId: session.userId,
      tableName: "system_configs",
      recordId,
      action: 2,
      changedFields: ["configValue"],
      newData: { configValue: String(value) },
      requestId: req.headers.get("x-request-id"),
    });
  };

  const granularity = hasGranularity ? await setLadderGranularity(Number(body?.granularity)) : undefined;
  if (granularity !== undefined) {
    changed.push("granularity");
    await auditFor("ladder_score_granularity", granularity);
  }
  const loadWindowPct = hasLoadWindowPct ? await setLadderLoadWindowPct(Number(body?.loadWindowPct)) : undefined;
  if (loadWindowPct !== undefined) {
    changed.push("loadWindowPct");
    await auditFor("ladder_load_window_pct", loadWindowPct);
  }
  const hotVendorCount = hasHotVendorCount ? await setLadderHotVendorCount(Number(body?.hotVendorCount)) : undefined;
  if (hotVendorCount !== undefined) {
    changed.push("hotVendorCount");
    await auditFor("ladder_hot_vendor_count", hotVendorCount);
  }

  revalidatePath("/models");
  revalidatePath("/ladder");

  return {
    granularity: granularity ?? (await getLadderGranularity()),
    loadWindowPct: loadWindowPct ?? (await getLadderLoadWindowPct()),
    hotVendorCount: hotVendorCount ?? (await getLadderHotVendorCount()),
    changed,
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "PUT"]);

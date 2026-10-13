/**
 * GET /api/v1/ladder — 天梯矩阵公开端点（Task L.3.3；L.4.1 扩容前端通道；v1.9 分页扩容）。
 *
 * 校验契约：
 * - type 仍由 shared LadderQuerySchema fail-fast（非法 → 20002 错误信封）；
 * - sort 在 shared 五键之上放行 service.resolveSortSpec 已支持的扩展键
 *   （composite/contextLength/latency/price/custom）——shared 包保持不动，
 *   仅 route 层适配 MatrixQuery 直调通道（types.ts 注明的前端扩展意图）；
 * - filters 六键 CSV → service applyFilters；formula 为 sort=custom 的白名单公式；
 * - offset/limit（v1.9 无限滚动）：rank/排序全量计算后窗口切片；limit 上限 300，缺省=全量（兼容旧消费方）。
 * 成功时 data = { type, entries[...], updatedAt }。
 */
import { LadderQuerySchema } from "@aidean/shared";
import { ApiError, ERROR_CODES } from "../_lib/errors";
import { withApi } from "../_lib/handler";
import { ladderService } from "../../../../lib/features/ladder/service";
import { getLadderLoadWindowPct } from "../../../../lib/features/ladder/config";

export const dynamic = "force-dynamic";

/** shared SortKey ∪ service 扩展键 */
const EXT_SORT_KEYS = new Set([
  "default",
  "scoreDesc",
  "priceAsc",
  "priceDesc",
  "name",
  "composite",
  "contextLength",
  "latency",
  "price",
  "custom",
]);

/** CSV 查询参数 → 非空字符串数组；缺失/空段返回 undefined */
function csvParam(sp: URLSearchParams, key: string): string[] | undefined {
  const raw = sp.get(key);
  if (!raw) return undefined;
  const list = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

/** 分页上限（v1.9）：单页最多 300 条，防全量拖库 */
const MAX_PAGE_LIMIT = 300;

/** 正整数参数解析；缺失/非法返回 undefined（缺省语义由 service 兜底） */
function intParam(sp: URLSearchParams, key: string): number | undefined {
  const raw = sp.get(key);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

export const GET = withApi(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  // type 契约校验沿用 shared schema（显式必填：缺失/非法一律 20002），其余键走宽松白名单
  const parsed = LadderQuerySchema.safeParse({ type: sp.get("type") });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.RANKING_TYPE_INVALID, "榜单类型非法");
  }
  const sort = sp.get("sort") ?? undefined;
  if (sort && !EXT_SORT_KEYS.has(sort)) {
    throw new ApiError(ERROR_CODES.RANKING_TYPE_INVALID, "榜单类型非法");
  }
  const limit = intParam(sp, "limit");
  // R-83 T3 分数带分窗：band=带序号（0=顶带）；bandHeight 取后台 ladder_load_window_pct（缺省 20）
  const bandIndex = intParam(sp, "band");
  const bandHeight = bandIndex !== undefined ? await getLadderLoadWindowPct() : undefined;
  const { data } = await ladderService.getRanking({
    type: parsed.data.type,
    sort,
    customFormula: sp.get("formula") ?? undefined,
    offset: intParam(sp, "offset"),
    limit: limit && limit <= MAX_PAGE_LIMIT ? limit : undefined,
    bandIndex,
    bandHeight,
    filters: {
      modelType: csvParam(sp, "modelType"),
      protocol: csvParam(sp, "protocol"),
      isOpenSource: sp.get("isOpenSource") ?? undefined,
      benchmark: csvParam(sp, "benchmark"),
      tags: csvParam(sp, "tags"),
      updatedWithin: sp.get("updatedWithin") ?? undefined,
    },
  });
  return data;
});

/**
 * 模型搜索选项（UX-08 / UX-09）：可搜索 Combobox 的取数口径，纯函数 + 可注入 fetch。
 *
 * - 数据源：公开 GET /api/v1/models（keyword ilike nameDisplay，pageSize≤100，仅上架模型）；
 *   一次只取一页（默认 50 条），按需随输入关键字重新取数——不再一次铺开全量 ~1000 个模型。
 * - 失败与空严格区分（失败 ok=false，绝不落为空列表）。
 * - 结果按厂商分组（组序=首次出现序，保留服务端 sortOrder 口径）。
 */

export interface ModelOption {
  id: string;
  name: string;
  vendor: string;
  slug: string | null;
}

/** 单次取数条数（首屏 ≤50 项，验收口径 UX-08） */
export const MODEL_SEARCH_PAGE_SIZE = 50;
/** 关键字长度上限（与 ModelListQuerySchema.keyword max(100) 一致） */
export const MODEL_SEARCH_KEYWORD_MAX = 100;

export function buildModelSearchUrl(keyword: string, pageSize: number = MODEL_SEARCH_PAGE_SIZE): string {
  const params = new URLSearchParams({ page: "1", pageSize: String(Math.min(100, Math.max(1, pageSize))) });
  const kw = keyword.trim().slice(0, MODEL_SEARCH_KEYWORD_MAX);
  if (kw) params.set("keyword", kw);
  return `/api/v1/models?${params.toString()}`;
}

/** 解析 /api/v1/models 信封；形状不符返回 null（按失败处理） */
export function parseModelSearchResponse(body: unknown): { items: ModelOption[]; total: number } | null {
  if (!body || typeof body !== "object") return null;
  const env = body as { code?: unknown; data?: unknown };
  if (env.code !== 0 || !env.data || typeof env.data !== "object") return null;
  const data = env.data as { items?: unknown; pagination?: { total?: unknown } };
  if (!Array.isArray(data.items)) return null;
  const items: ModelOption[] = [];
  for (const raw of data.items) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as { id?: unknown; name?: unknown; vendor?: unknown; slug?: unknown };
    if (typeof r.id !== "string" || typeof r.name !== "string") continue;
    items.push({
      id: r.id,
      name: r.name,
      vendor: typeof r.vendor === "string" && r.vendor ? r.vendor : "其他",
      slug: typeof r.slug === "string" ? r.slug : null,
    });
  }
  const total = typeof data.pagination?.total === "number" ? data.pagination.total : items.length;
  return { items, total };
}

export type ModelSearchResult =
  | { ok: true; items: ModelOption[]; total: number }
  | { ok: false; message: string };

export async function searchModels(
  keyword: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ModelSearchResult> {
  try {
    const res = await fetchImpl(buildModelSearchUrl(keyword), { signal });
    const body = await res.json().catch(() => null);
    const parsed = res.ok ? parseModelSearchResponse(body) : null;
    if (!parsed) {
      const msg = (body as { message?: unknown } | null)?.message;
      return { ok: false, message: typeof msg === "string" && msg ? msg : `模型列表加载失败（${res.status}）` };
    }
    return { ok: true, ...parsed };
  } catch (error) {
    if ((error as { name?: string } | null)?.name === "AbortError") throw error;
    return { ok: false, message: "网络异常，模型列表加载失败" };
  }
}

/** 按厂商分组（组序与组内序均保持输入顺序） */
export function groupModelOptions(items: ModelOption[]): Array<{ vendor: string; items: ModelOption[] }> {
  const groups = new Map<string, ModelOption[]>();
  for (const item of items) {
    const list = groups.get(item.vendor);
    if (list) list.push(item);
    else groups.set(item.vendor, [item]);
  }
  return [...groups.entries()].map(([vendor, list]) => ({ vendor, items: list }));
}

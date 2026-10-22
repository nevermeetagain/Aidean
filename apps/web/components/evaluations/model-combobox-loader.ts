/**
 * 模型 Combobox 取数器（UX-08 测评新建 / UX-09 控制台绑定共用）：
 * GET /api/v1/models 按关键字取一页（≤50），按厂商分组展平为 Combobox 选项；
 * 结果写入调用方提供的 seen 缓存（id → 模型，供选中时取 slug / 名称）。
 */
import type { ComboboxLoadResult } from "../common/Combobox";
import { groupModelOptions, searchModels, type ModelOption } from "../../lib/features/ladder/model-options";

export function createModelOptionsLoader(seen: Map<string, ModelOption>) {
  return async (query: string, signal: AbortSignal): Promise<ComboboxLoadResult> => {
    const res = await searchModels(query, signal);
    if (!res.ok) return res;
    for (const m of res.items) seen.set(m.id, m);
    return {
      ok: true,
      total: res.total,
      options: groupModelOptions(res.items).flatMap((g) =>
        g.items.map((m) => ({ value: m.id, label: m.name, group: g.vendor })),
      ),
    };
  };
}

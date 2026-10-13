/**
 * ladder 天梯榜前端状态（Task L.4.1）。
 *
 * - 纯内存态，不持久化（持久化仅 uiStore 的主题/语言键）；
 * - 可分享回放由 URL query 承担：序列化/解析同文件导出，
 *   hooks/useLadderQuerySync 负责 store ↔ URL 双向同步。
 */
import { create } from "zustand";
import { LADDER_BENCHMARK_COMPOSITE, LADDER_DEFAULT_MODEL_TYPES } from "../lib/features/ladder/types";

export const LADDER_PAGE_TYPES = ["models", "stations"] as const;
export type LadderPageType = (typeof LADDER_PAGE_TYPES)[number];

/** 排序五键（service.resolveSortSpec 扩展集的前端口径；composite 为默认不入 URL） */
export type LadderSortKey = "composite" | "contextLength" | "latency" | "price" | "custom";

/** 版本视角：professional=全类型不限，application=预设对话类型筛选 */
export type LadderVersionName = "professional" | "application";

/** 双视图呈现键（shared ViewModeEnum 同名对齐：table=矩阵表 / chart=柱状图） */
export type LadderViewMode = "table" | "chart";

/**
 * 标签组内置伪标签（v1.8）：排序型快捷透镜迁自 v1.7 快速筛选 chips，随 tags 进 URL 可回放。
 * - 最新：客户端按 publishedAt 降序重排；
 * - 热门：不透镜（服务端现行排序即综合分降序，选中=显式回到默认序）；
 * - 冷门：客户端按综合分升序重排。
 * 互斥约定：三者至多选中一个（FilterBar 勾选时替换其余伪标签）；
 * 用户显式改排序下拉时剥离伪标签（排序意图优先，延续 v1.7 setSort 重置语义）。
 */
export const LADDER_PSEUDO_TAGS = ["最新", "热门", "冷门"] as const;

/**
 * 六个筛选组。统一以 string[] 建模（含单选语义的组），
 * 便于面板 checkbox 复用与「全部」三态循环的数组整体提交；
 * 出口经 ladderFetchQuery 以 CSV 序列化，service/route 侧做归一。
 */
export interface LadderFilters {
  modelType: string[];
  protocol: string[];
  isOpenSource: string[];
  benchmark: string[];
  tags: string[];
  updatedWithin: string[];
}

export const LADDER_FILTER_KEYS = [
  "modelType",
  "protocol",
  "isOpenSource",
  "benchmark",
  "tags",
  "updatedWithin",
] as const;
export type LadderFilterKey = (typeof LADDER_FILTER_KEYS)[number];

const EMPTY_FILTERS: LadderFilters = {
  modelType: [],
  protocol: [],
  isOpenSource: [],
  benchmark: [],
  tags: [],
  updatedWithin: [],
};

/** 复位基准：全部不限（resetFilterGroup 用） */
export const LADDER_EMPTY_FILTERS: LadderFilters = EMPTY_FILTERS;

/** 默认筛选（v1.8）：类型默认「推理」、测评默认「综合」，其余组默认不限 */
export const LADDER_DEFAULT_FILTERS: LadderFilters = {
  ...EMPTY_FILTERS,
  modelType: [...LADDER_DEFAULT_MODEL_TYPES],
  benchmark: [LADDER_BENCHMARK_COMPOSITE],
};

/**
 * 标签伪标签透镜（v1.8）：纯客户端重排，不改写 rank（rank 恒为综合分名次，与呈现解耦）。
 * 由 filters.tags 推导：取 tags 数组中首个伪标签命中（互斥由 UI 保证，此处兜底防御）；
 * 热门/未选伪标签 → 不透镜（服务端现行排序）。
 */
export function applyTagLens<T extends { publishedAt: string | null; score: { composite: number }; modelName: string }>(
  entries: T[],
  tags: string[] | undefined
): T[] {
  const picked = tags?.find((t) => (LADDER_PSEUDO_TAGS as readonly string[]).includes(t));
  if (picked === "最新") {
    return [...entries].sort((a, b) => {
      const av = a.publishedAt ? Date.parse(a.publishedAt) : Number.NEGATIVE_INFINITY;
      const bv = b.publishedAt ? Date.parse(b.publishedAt) : Number.NEGATIVE_INFINITY;
      return bv - av || b.score.composite - a.score.composite;
    });
  }
  if (picked === "冷门") {
    return [...entries].sort(
      (a, b) =>
        a.score.composite - b.score.composite ||
        a.modelName.localeCompare(b.modelName, "zh-Hans-CN")
    );
  }
  return entries;
}

interface LadderState {
  type: LadderPageType;
  version: LadderVersionName;
  filters: LadderFilters;
  sort: LadderSortKey;
  customFormula: string;
  view: LadderViewMode;
  /** 阵营侧开关（v1.8）：天梯图左（国外）右（国内）列显隐，仅呈现层消费；双关=仅轴居中 */
  showIntl: boolean;
  showDom: boolean;
  pending: boolean;
  lastError: string | null;

  setType: (type: LadderPageType) => void;
  setVersion: (version: LadderVersionName) => void;
  setFilter: (group: LadderFilterKey, values: string[]) => void;
  resetFilterGroup: (group: LadderFilterKey) => void;
  setSort: (sort: LadderSortKey) => void;
  setCustomFormula: (formula: string) => void;
  setView: (view: LadderViewMode) => void;
  toggleCamp: (side: "intl" | "dom") => void;
  setPending: (pending: boolean) => void;
  setError: (message: string | null) => void;
}

const isPseudoTag = (value: string): boolean => (LADDER_PSEUDO_TAGS as readonly string[]).includes(value);

export const useLadderStore = create<LadderState>()((set) => ({
  type: "models",
  version: "professional",
  filters: { ...LADDER_DEFAULT_FILTERS },
  sort: "composite",
  customFormula: "",
  view: "table",
  showIntl: true,
  showDom: true,
  pending: false,
  lastError: null,

  setType: (type) => set({ type }),
  setVersion: (version) => set({ version }),
  setFilter: (group, values) =>
    set((state) => ({ filters: { ...state.filters, [group]: values } })),
  resetFilterGroup: (group) =>
    set((state) => ({ filters: { ...state.filters, [group]: EMPTY_FILTERS[group] } })),
  // 排序意图优先：显式改排序即剥离标签组伪标签（延续 v1.7 setSort 重置 quick 语义）
  setSort: (sort) =>
    set((state) => {
      if (!state.filters.tags?.some(isPseudoTag)) return { sort };
      return {
        sort,
        filters: { ...state.filters, tags: state.filters.tags.filter((t) => !isPseudoTag(t)) },
      };
    }),
  setCustomFormula: (customFormula) => set({ customFormula }),
  setView: (view) => set({ view }),
  toggleCamp: (side) =>
    set((state) =>
      side === "intl" ? { showIntl: !state.showIntl } : { showDom: !state.showDom }
    ),
  setPending: (pending) => set({ pending }),
  setError: (lastError) => set({ lastError }),
}));

// ==================== 查询串序列化 / 解析 ====================

interface QueryShapedState {
  filters: LadderFilters;
  sort: LadderSortKey;
  customFormula: string;
}

/**
 * 数据相关参数 → fetch 用查询串（页面 type 打头恒存在，保证非空）。
 * sort=composite 为默认省略；custom 附带 formula；
 * 视图态（viewMode）与数据无关，不进入本串（避免切视图触发请求）。
 */
export function ladderFetchQuery(pageType: LadderPageType, state: QueryShapedState): string {
  const params = new URLSearchParams();
  params.set("type", pageType);
  for (const key of LADDER_FILTER_KEYS) {
    const values = state.filters[key];
    if (Array.isArray(values) && values.length > 0) params.set(key, values.join(","));
  }
  if (state.sort === "custom") {
    params.set("sort", "custom");
    const formula = state.customFormula.trim();
    if (formula) params.set("formula", formula);
  } else if (state.sort !== "composite") {
    params.set("sort", state.sort);
  }
  return params.toString();
}

/** fetch 串 + 视图态 → 完整可分享 URL query */
export function ladderUrlQuery(fetchQuery: string, view: LadderViewMode): string {
  return view === "chart" ? `${fetchQuery}&viewMode=chart` : fetchQuery;
}

const VALID_SORTS: readonly LadderSortKey[] = [
  "composite",
  "contextLength",
  "latency",
  "price",
  "custom",
];
/** updatedWithin 合法窗口（v1.7）：30 天/90 天/半年/一年/两年，未知值丢弃回退不限 */
const VALID_UPDATE_WINDOWS = new Set(["30d", "90d", "180d", "365d", "730d"]);
const VALID_OPEN_SOURCE = new Set(["true", "false"]);

function csv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * URLSearchParams → store 增量补丁（回放入口）。
 * 非法值一律丢弃回退默认，保证任意手改 URL 都收敛到合法状态。
 */
export function parseLadderQuery(sp: URLSearchParams): Partial<LadderState> | null {
  const patch: Record<string, unknown> = {};
  const filters: LadderFilters = { ...EMPTY_FILTERS };
  let hasFilter = false;

  for (const key of LADDER_FILTER_KEYS) {
    const list = csv(sp.get(key));
    if (!list.length) continue;
    if (key === "isOpenSource") {
      const valid = list.filter((v) => VALID_OPEN_SOURCE.has(v));
      if (!valid.length) continue;
      filters.isOpenSource = [...new Set(valid)];
    } else if (key === "updatedWithin") {
      // v1.9 多选：任一合法窗口保留（并集语义=服务端取最早下限），未知值丢弃
      const valid = list.filter((v) => VALID_UPDATE_WINDOWS.has(v));
      if (!valid.length) continue;
      filters.updatedWithin = [...new Set(valid)];
    } else {
      filters[key] = [...new Set(list)];
    }
    hasFilter = true;
  }
  if (hasFilter) patch.filters = filters;

  const sortRaw = sp.get("sort");
  if (sortRaw === "custom") {
    patch.sort = "custom";
    patch.customFormula = sp.get("formula") ?? "";
  } else if (sortRaw && (VALID_SORTS as readonly string[]).includes(sortRaw)) {
    patch.sort = sortRaw as LadderSortKey;
  }

  if (sp.get("viewMode") === "chart") patch.view = "chart";

  return Object.keys(patch).length > 0 ? (patch as Partial<LadderState>) : null;
}

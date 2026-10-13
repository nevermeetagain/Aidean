/**
 * ladderStore 客户端状态单测（v1.8）：
 * - 测评组「综合」默认口径（LADDER_DEFAULT_FILTERS 与 SSR 共用常量真源）；
 * - 标签伪标签透镜 applyTagLens（最新/冷门纯客户端重排，热门/未选=原序）；
 * - setSort 显式排序剥离伪标签（排序意图优先）；
 * - 阵营开关 toggleCamp（showIntl/showDom 独立翻转，仅呈现层消费）。
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  applyTagLens,
  ladderFetchQuery,
  ladderUrlQuery,
  LADDER_DEFAULT_FILTERS,
  LADDER_PSEUDO_TAGS,
  useLadderStore,
} from "../../../../stores/ladderStore";
import {
  LADDER_BENCHMARK_COMPOSITE,
  LADDER_DEFAULT_MODEL_TYPES,
} from "../types";

interface LensEntry {
  publishedAt: string | null;
  score: { composite: number };
  modelName: string;
}

const entry = (name: string, composite: number, publishedAt: string | null): LensEntry => ({
  modelName: name,
  score: { composite },
  publishedAt,
});

describe("v1.8 默认筛选（综合口径）", () => {
  it("类型默认「推理」、测评默认「综合」，其余组默认不限", () => {
    expect(LADDER_DEFAULT_FILTERS.modelType).toEqual([...LADDER_DEFAULT_MODEL_TYPES]);
    expect(LADDER_DEFAULT_FILTERS.benchmark).toEqual([LADDER_BENCHMARK_COMPOSITE]);
    expect(LADDER_DEFAULT_FILTERS.protocol).toEqual([]);
    expect(LADDER_DEFAULT_FILTERS.isOpenSource).toEqual([]);
    expect(LADDER_DEFAULT_FILTERS.tags).toEqual([]);
    expect(LADDER_DEFAULT_FILTERS.updatedWithin).toEqual([]);
  });

  it("伪标签常量恒为 最新/热门/冷门（FilterBar 置顶/置底与互斥 UI 的共同契约）", () => {
    expect([...LADDER_PSEUDO_TAGS]).toEqual(["最新", "热门", "冷门"]);
  });
});

describe("applyTagLens 伪标签透镜（纯客户端重排）", () => {
  it("最新：publishedAt 降序，缺失沉底，同日期综合分降序决胜", () => {
    const entries = [
      entry("old", 90, "2024-01-01T00:00:00.000Z"),
      entry("none", 99, null),
      entry("new-a", 80, "2025-01-20T00:00:00.000Z"),
      entry("new-b", 85, "2025-01-20T00:00:00.000Z"),
    ];
    const sorted = applyTagLens(entries, ["最新"]);
    expect(sorted.map((e) => e.modelName)).toEqual(["new-b", "new-a", "old", "none"]);
  });

  it("冷门：综合分升序，同分按名称 zh-Hans-CN 兜底", () => {
    const entries = [
      entry("b", 92, "2025-01-01T00:00:00.000Z"),
      entry("a", 92, "2025-01-01T00:00:00.000Z"),
      entry("c", 61.5, "2025-02-01T00:00:00.000Z"),
    ];
    const sorted = applyTagLens(entries, ["冷门"]);
    expect(sorted.map((e) => e.modelName)).toEqual(["c", "a", "b"]);
  });

  it("热门/未选/仅真实标签：不透镜（返回原数组引用）", () => {
    const entries = [entry("a", 90, null), entry("b", 80, null)];
    expect(applyTagLens(entries, ["热门"])).toBe(entries);
    expect(applyTagLens(entries, undefined)).toBe(entries);
    expect(applyTagLens(entries, ["推理", "编程"])).toBe(entries);
  });

  it("伪标签互斥由 UI 保证，透镜取 tags 数组中首个伪标签兜底防御", () => {
    const entries = [
      entry("a", 90, "2024-06-01T00:00:00.000Z"),
      entry("b", 80, "2025-06-01T00:00:00.000Z"),
    ];
    // 首个命中 = 冷门 → 综合分升序
    const byCold = applyTagLens(entries, ["冷门", "最新"]);
    expect(byCold.map((e) => e.modelName)).toEqual(["b", "a"]);
    // 首个命中 = 最新 → 发布时间降序
    const byNew = applyTagLens(entries, ["最新", "冷门"]);
    expect(byNew.map((e) => e.modelName)).toEqual(["b", "a"]);
  });
});

describe("store：setSort 剥离伪标签 / toggleCamp 阵营开关", () => {
  beforeEach(() => {
    useLadderStore.setState({
      sort: "composite",
      showIntl: true,
      showDom: true,
      filters: { ...LADDER_DEFAULT_FILTERS, tags: ["最新", "编程"] },
    });
  });

  it("显式改排序即剥离伪标签、保留真实标签（排序意图优先）", () => {
    useLadderStore.getState().setSort("price");
    const state = useLadderStore.getState();
    expect(state.sort).toBe("price");
    expect(state.filters.tags).toEqual(["编程"]);
  });

  it("排序无伪标签时不改写 filters", () => {
    useLadderStore.setState({ filters: { ...LADDER_DEFAULT_FILTERS, tags: ["编程"] } });
    useLadderStore.getState().setSort("price");
    expect(useLadderStore.getState().filters.tags).toEqual(["编程"]);
  });

  it("toggleCamp 独立翻转两侧；双关为轴居中的呈现前提（本测只证状态位）", () => {
    useLadderStore.getState().toggleCamp("intl");
    expect(useLadderStore.getState().showIntl).toBe(false);
    expect(useLadderStore.getState().showDom).toBe(true);
    useLadderStore.getState().toggleCamp("dom");
    expect(useLadderStore.getState().showDom).toBe(false);
    useLadderStore.getState().toggleCamp("intl");
    expect(useLadderStore.getState().showIntl).toBe(true);
  });
});

describe("零重取契约显式锁（切视图零 /api/v1/ladder 请求的结构保证）", () => {
  it("ladderFetchQuery 输出不含 viewMode：视图态只经 ladderUrlQuery 进 URL 面，不进数据面", () => {
    const state = { filters: LADDER_DEFAULT_FILTERS, sort: "composite" as const, customFormula: "" };
    // 数据面：同参数下无论 view 何值，fetch 串恒等（LadderBoard fetch effect 仅依赖 fetchQuery，
    // 串不变 ⇒ 切视图不触发 /api/v1/ladder 重取）
    expect(ladderFetchQuery("models", state)).toBe(ladderFetchQuery("models", state));
    expect(ladderFetchQuery("models", state)).not.toContain("viewMode");
    // URL 面：viewMode=chart 仅在分享回放串中追加（useLadderQuerySync router.replace → RSC flight，
    // 非 /api/** 面，与零重取契约正交）
    expect(ladderUrlQuery(ladderFetchQuery("models", state), "chart")).toContain("viewMode=chart");
    expect(ladderUrlQuery(ladderFetchQuery("models", state), "table")).not.toContain("viewMode");
  });
});

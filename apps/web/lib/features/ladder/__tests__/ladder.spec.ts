/**
 * ladder 天梯图域单测（Task L.3.2/L.3.3 / M-LADDER T2.6 排行化重写）。
 *
 * 策略：redis 以 Map 实现 stub（get/set/unlink/scan 模拟 MATCH 前缀通配），
 * repository 以内存数组 stub——全程零外部连接；route 层仅以内存 Request 直调 handler。
 */
import { describe, expect, it, vi } from "vitest";
import { LADDER_CACHE_TTL_SECONDS, ladderService } from "../service";
import { evaluateFormula } from "../../ranking/formula-parser";
import type { MatrixItem } from "../types";

// ==================== 测试设施 ====================

/** 通配模式转正则（stub SCAN 的 MATCH 语义模拟，仅支持 '*' 通配段） */
function patternToRegExp(pattern: string): RegExp {
  const literal = pattern
    .split("*")
    .map((seg) => seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\S]*");
  return new RegExp(`^${literal}$`);
}

function makeStubRedis() {
  const store = new Map<string, string>();
  const setCalls: Array<{ key: string; ttl: number; mode: string }> = [];
  const scanPatterns: string[] = [];
  const unlinkedKeys: string[] = [];

  return {
    store,
    setCalls,
    scanPatterns,
    unlinkedKeys,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, mode: "EX", ttl: number) => {
      setCalls.push({ key, ttl, mode });
      store.set(key, value);
      return "OK";
    }),
    scan: vi.fn(async (cursor: string, _m: "MATCH", pattern: string) => {
      scanPatterns.push(pattern);
      const re = patternToRegExp(pattern);
      return ["0", [...store.keys()].filter((k) => re.test(k))] as [string, string[]];
    }),
    unlink: vi.fn(async (key: string) => {
      unlinkedKeys.push(key);
      store.delete(key);
      return "OK";
    }),
    incr: vi.fn(async (key: string) => {
      const next = (store.get(key) ? Number(store.get(key)) : 0) + 1;
      store.set(key, String(next));
      return next;
    }),
    expire: vi.fn(async () => "OK"),
    getdel: vi.fn(async (key: string) => {
      const value = store.get(key) ?? null;
      store.delete(key);
      return value;
    }),
    setNxEx: vi.fn(async (key: string, value: string, ttl: number) => {
      if (store.has(key)) return null;
      store.set(key, value);
      return "OK" as const;
    }),
    compareDelete: vi.fn(async (key: string, value: string) => {
      if (store.get(key) !== value) return 0 as const;
      store.delete(key);
      return 1 as const;
    }),
  };
}
type StubRedis = ReturnType<typeof makeStubRedis>;

function makeRepository(models: MatrixItem[], stations: MatrixItem[] = []) {
  return {
    getModelsForMatrix: vi.fn(async () => models),
    getStationsForMatrix: vi.fn(async () => stations),
  };
}

let seqCounter = 0;
/** 平铺行工厂：显式给 composite/vendor 键名简写，其余补齐 MatrixItem 形状 */
function item(seed: {
  modelId?: string;
  modelName?: string;
  composite: number;
  priceInput?: number;
  contextLength?: number;
  isOpenSource?: boolean;
  modelType?: string;
  protocol?: string;
  publishedAt?: string | null;
  vendorPriority?: number;
}): MatrixItem {
  seqCounter += 1;
  const id = seed.modelId ?? `m-${seqCounter}`;
  const name = seed.modelName ?? `Model ${seqCounter}`;
  return {
    modelId: id,
    modelName: name,
    slug: id,
    vendorId: seed.modelId?.startsWith("s-") ? name : "v-acme",
    vendorName: seed.modelId?.startsWith("s-") ? name : "Acme",
    vendorCode: null,
    vendorTierLevel: 1,
    vendorBrandColor: "#00AAFF",
    vendorCountry: null,
    vendorPriority: seed.vendorPriority ?? 50,
    score: { composite: seed.composite, official: null, actual: null, review: null, selfTest: null },
    price: { priceInput: seed.priceInput ?? null, priceOutput: null },
    modelType: seed.modelType ?? "CHAT",
    protocol: seed.protocol ?? "OPENAI",
    publishedAt: seed.publishedAt ?? null,
    isOpenSource: seed.isOpenSource ?? false,
    contextLength: seed.contextLength ?? 128_000,
    avgLatency: null,
    uptime: null,
  };
}

// ==================== 服务行为：读穿缓存 ====================

describe("ladderService.getRanking 读穿缓存", () => {
  it("首次 MISS 回写 SETEX(TTL 3600)，二次同参 HIT 且 repository spy 调用数不变", async () => {
    const repo = makeRepository([item({ modelId: "a1", composite: 86.2 })]);
    const cache = makeStubRedis();
    const deps = { repository: repo, cache };

    const first = await ladderService.getRanking({ type: "models" }, deps);
    expect(first.hit).toBe(false);
    expect(repo.getModelsForMatrix).toHaveBeenCalledTimes(1);

    // 缓存键规范：ladder:matrix:v8:{type}:{hash12}，SETEX 语义 mode=EX ttl=3600
    expect(cache.store.size).toBe(1);
    const key = [...cache.store.keys()][0];
    expect(key.startsWith("ladder:matrix:v8:models:")).toBe(true);
    expect(key.slice(-12)).toMatch(/^[0-9a-f]{12}$/);
    expect(cache.setCalls[0].mode).toBe("EX");
    expect(cache.setCalls[0].ttl).toBe(LADDER_CACHE_TTL_SECONDS);

    const second = await ladderService.getRanking({ type: "models" }, deps);
    expect(second.hit).toBe(true);
    expect(repo.getModelsForMatrix).toHaveBeenCalledTimes(1); // 未再触库
    expect(second.data.entries).toEqual(first.data.entries);
  });

  it("invalidateLadderCache 按 SCAN(MATCH ladder:matrix:v8:*) UNLINK 批删，之后再次调用为 MISS", async () => {
    const repo = makeRepository([item({ modelId: "a2", composite: 91.0 })]);
    const cache = makeStubRedis();
    const deps = { repository: repo, cache };

    await ladderService.getRanking({ type: "models" }, deps);
    expect(cache.store.size).toBe(1);

    await ladderService.invalidateLadderCache({ cache });
    expect(cache.scanPatterns[0]).toBe("ladder:matrix:v8:*");
    expect(cache.unlinkedKeys.length).toBeGreaterThanOrEqual(1);
    expect(cache.store.size).toBe(0);

    const again = await ladderService.getRanking({ type: "models" }, deps);
    expect(again.hit).toBe(false);
    expect(repo.getModelsForMatrix).toHaveBeenCalledTimes(2); // 失效后重新回源
  });

  it("不同参数派生不同缓存键（同参数两次写入互不串档）", async () => {
    const repo = makeRepository([item({ modelId: "a3", composite: 70 })]);
    const cache = makeStubRedis();
    const deps = { repository: repo, cache };

    await ladderService.getRanking({ type: "models" }, deps);
    await ladderService.getRanking({ type: "models", sort: "price" }, deps);
    await ladderService.getRanking({ type: "models", filters: { isOpenSource: true } }, deps);

    expect(cache.store.size).toBe(3);
    expect(repo.getModelsForMatrix).toHaveBeenCalledTimes(3);
  });
});

// ==================== 排行结构（M-LADDER T2.2） ====================

describe("buildRanking 连续排行结构", () => {
  it("default=scoreDesc 全序：entries 按综合分降序，rank 1..n 连续且等于位次", async () => {
    const repo = makeRepository([
      item({ modelId: "low", modelName: "Low 79.9", composite: 79.9 }),
      item({ modelId: "mid", modelName: "Mid 86.2", composite: 86.2 }),
      item({ modelId: "high", modelName: "High 92.4", composite: 92.4 }),
    ]);
    const { data } = await ladderService.getRanking(
      { type: "models" },
      { repository: repo, cache: makeStubRedis() }
    );

    expect(data.type).toBe("models");
    expect(data.entries.map((e) => e.modelId)).toEqual(["high", "mid", "low"]);
    expect(data.entries.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("同分并列 competition ranking（1,2,2,4）：完全相等才并列，分数并列者名次取首个位次", async () => {
    const repo = makeRepository([
      item({ modelId: "top", modelName: "Top", composite: 92.4 }),
      item({ modelId: "tie-a", modelName: "AAA", composite: 77.7 }),
      item({ modelId: "tie-b", modelName: "BBB", composite: 77.7 }),
      item({ modelId: "low", modelName: "Low", composite: 70 }),
    ]);
    const { data } = await ladderService.getRanking(
      { type: "models" },
      { repository: repo, cache: makeStubRedis() }
    );

    expect(data.entries.map((e) => e.modelId)).toEqual(["top", "tie-a", "tie-b", "low"]);
    expect(data.entries.map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it("rank 与展示排序解耦：按价格升序排列时 rank 仍呈现综合分名次", async () => {
    const repo = makeRepository([
      item({ modelId: "expensive", modelName: "Expensive", composite: 92.4, priceInput: 300 }),
      item({ modelId: "cheap", modelName: "Cheap", composite: 70, priceInput: 0.5 }),
    ]);
    const { data } = await ladderService.getRanking(
      { type: "models", sort: "priceAsc" },
      { repository: repo, cache: makeStubRedis() }
    );

    expect(data.entries.map((e) => e.modelId)).toEqual(["cheap", "expensive"]); // 价格升序展示
    expect(data.entries.map((e) => e.rank)).toEqual([2, 1]); // rank 恒为分数名次
  });

  it("小数分数参与精确并列判定：61.25 与 61.5 不并列", async () => {
    const repo = makeRepository([
      item({ modelId: "q1", modelName: "Q1", composite: 61.25 }),
      item({ modelId: "q2", modelName: "Q2", composite: 61.5 }),
    ]);
    const { data } = await ladderService.getRanking(
      { type: "models" },
      { repository: repo, cache: makeStubRedis() }
    );

    expect(data.entries.map((e) => e.rank)).toEqual([1, 2]);
  });
});

// ==================== 排序与自定义公式 ====================

describe("排序键与自定义公式（formula-parser 白名单）", () => {
  it("custom='{priceInput}' 经 evaluateFormula 生效：entries 按公式值降序", async () => {
    const repo = makeRepository([
      item({ modelId: "cheap", modelName: "Cheap", composite: 82.5, priceInput: 3 }),
      item({ modelId: "dear", modelName: "Dear", composite: 81.5, priceInput: 300 }),
    ]);
    const { data } = await ladderService.getRanking(
      { type: "models", sort: "custom", customFormula: "{priceInput}" },
      { repository: repo, cache: makeStubRedis() }
    );
    // vars 映射 { score, priceInput, contextLength } 直接复用求值器口径做参照
    expect(evaluateFormula("{priceInput}", { score: 0, priceInput: 42, contextLength: 0 })).toBe(42);

    expect(data.entries.map((e) => e.modelId)).toEqual(["dear", "cheap"]);
  });

  it("custom='{contextLength}' 映射上下文长度变量：等分并列时由 ctx 决胜而非名称兜底", async () => {
    const repo = makeRepository([
      item({ modelId: "ctx-small", modelName: "AAA-first-by-name", composite: 77.7, contextLength: 8_000 }),
      item({ modelId: "ctx-big", modelName: "ZZZ-last-by-name", composite: 77.7, contextLength: 2_000_000 }),
    ]);
    const { data } = await ladderService.getRanking(
      { type: "models", sort: "custom", customFormula: "{contextLength}" },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(data.entries.map((e) => e.modelId)).toEqual(["ctx-big", "ctx-small"]);
  });

  it("name 排序：名称 zh-Hans-CN 升序，rank 仍为分数名次", async () => {
    const repo = makeRepository([
      item({ modelId: "b", modelName: "Beta", composite: 90 }),
      item({ modelId: "a", modelName: "Alpha", composite: 80 }),
    ]);
    const { data } = await ladderService.getRanking(
      { type: "models", sort: "name" },
      { repository: repo, cache: makeStubRedis() }
    );

    expect(data.entries.map((e) => e.modelId)).toEqual(["a", "b"]);
    expect(data.entries.map((e) => e.rank)).toEqual([2, 1]);
  });
});

// ==================== stations 分支与降级直查 ====================

describe("stations 分支与降级直查", () => {
  it("stations 榜复用同一排行形状：每站一行、modelName=站名、携带 latency/uptime；cache 显式 null 时直查", async () => {
    const stations: MatrixItem[] = [
      { ...item({ modelId: "s-one", modelName: "OpenPort", composite: 93.1 }), avgLatency: 320, uptime: 99.9 },
      { ...item({ modelId: "s-two", modelName: "RelayHub", composite: 88.6 }), avgLatency: 180, uptime: 97.2 },
    ];
    const repo = makeRepository([], stations);
    const spyStations = repo.getStationsForMatrix;

    const { data, hit } = await ladderService.getRanking(
      { type: "stations" },
      { repository: repo, cache: null }
    );

    expect(hit).toBe(false);
    expect(spyStations).toHaveBeenCalledTimes(1);
    expect(data.type).toBe("stations");
    expect(data.entries.map((e) => e.modelId)).toEqual(["s-one", "s-two"]);
    expect(data.entries.map((e) => e.rank)).toEqual([1, 2]);
    expect(data.entries[0].vendorName).toBe("OpenPort");
    expect(data.entries[0].avgLatency).toBe(320);
    expect(data.entries[0].uptime).toBe(99.9);
  });

  it("未配置 REDIS_URL（getRedis→null）时走直查分支，结果来自 repository", async () => {
    const savedUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL; // 生产降级路径：不注入 cache，让 service 自己解析出 null
    try {
      const repo = makeRepository([item({ modelId: "nodb", composite: 66.6 })]);
      const { data, hit } = await ladderService.getRanking(
        { type: "models" },
        { repository: repo } // 未提供 cache ⇒ resolve getRedis()
      );
      expect(hit).toBe(false);
      expect(data.entries[0]?.modelId).toBe("nodb");
    } finally {
      if (savedUrl !== undefined) process.env.REDIS_URL = savedUrl;
    }
  });
});

// ==================== 筛选应用点 ====================

describe("筛选应用点", () => {
  it("modelType 大小写不敏感过滤 + isOpenSource 三态过滤", async () => {
    const repo = makeRepository([
      item({ modelId: "chat-open", composite: 90, modelType: "CHAT", isOpenSource: true }),
      item({ modelId: "chat-closed", composite: 85, modelType: "CHAT", isOpenSource: false }),
      item({ modelId: "embed-open", composite: 80, modelType: "EMBEDDING", isOpenSource: true }),
    ]);

    const onlyChatOpen = await ladderService.getRanking(
      { type: "models", filters: { modelType: "chat", isOpenSource: true } },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(onlyChatOpen.data.entries.map((e) => e.modelId)).toEqual(["chat-open"]);
  });

  it("updatedWithin 时间窗过滤（v1.7）：窗口内命中、窗口外与 publishedAt 缺失均排除，未知窗口值不过滤", async () => {
    const recent = new Date(Date.now() - 10 * 86_400_000).toISOString(); // 10 天前
    const stale = new Date(Date.now() - 120 * 86_400_000).toISOString(); // 120 天前
    const repo = makeRepository([
      item({ modelId: "fresh", composite: 90, publishedAt: recent }),
      item({ modelId: "stale", composite: 85, publishedAt: stale }),
      item({ modelId: "no-date", composite: 80, publishedAt: null }),
    ]);

    const within30 = await ladderService.getRanking(
      { type: "models", filters: { updatedWithin: "30d" } },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(within30.data.entries.map((e) => e.modelId)).toEqual(["fresh"]);

    const unknown = await ladderService.getRanking(
      { type: "models", filters: { updatedWithin: "7d" } },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(unknown.data.entries.map((e) => e.modelId)).toEqual(["fresh", "stale", "no-date"]);
  });

  it("v1.9 标签开源/闭源为真实过滤：仅选开源=isOpenSource true，同选=不限，未选回退旧参数", async () => {
    const repo = makeRepository([
      item({ modelId: "open", composite: 90, isOpenSource: true }),
      item({ modelId: "closed", composite: 85, isOpenSource: false }),
    ]);

    const openOnly = await ladderService.getRanking(
      { type: "models", filters: { tags: ["开源"] } },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(openOnly.data.entries.map((e) => e.modelId)).toEqual(["open"]);

    const closedOnly = await ladderService.getRanking(
      { type: "models", filters: { tags: ["闭源"] } },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(closedOnly.data.entries.map((e) => e.modelId)).toEqual(["closed"]);

    const both = await ladderService.getRanking(
      { type: "models", filters: { tags: ["开源", "闭源"] } },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(both.data.entries.map((e) => e.modelId)).toEqual(["open", "closed"]);

    const legacy = await ladderService.getRanking(
      { type: "models", filters: { tags: ["推理"], isOpenSource: "true" } },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(legacy.data.entries.map((e) => e.modelId)).toEqual(["open"]);
  });

  it("v1.9 updatedWithin 多选并集：任一窗口命中即保留（生效窗口=最早下限）", async () => {
    const recent = new Date(Date.now() - 10 * 86_400_000).toISOString(); // 10 天前
    const mid = new Date(Date.now() - 60 * 86_400_000).toISOString(); // 60 天前
    const repo = makeRepository([
      item({ modelId: "fresh", composite: 90, publishedAt: recent }),
      item({ modelId: "mid", composite: 85, publishedAt: mid }),
    ]);

    const union = await ladderService.getRanking(
      { type: "models", filters: { updatedWithin: ["30d", "90d"] } },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(union.data.entries.map((e) => e.modelId)).toEqual(["fresh", "mid"]);
  });

  it("v1.9 分页：rank/排序在全量上确定后窗口切片，翻页无缝衔接", async () => {
    const repo = makeRepository([
      item({ modelId: "p1", composite: 95 }),
      item({ modelId: "p2", composite: 90 }),
      item({ modelId: "p3", composite: 85 }),
    ]);

    const page1 = await ladderService.getRanking(
      { type: "models", offset: 0, limit: 2 },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(page1.data.entries.map((e) => e.modelId)).toEqual(["p1", "p2"]);
    expect(page1.data.entries.map((e) => e.rank)).toEqual([1, 2]);

    const page2 = await ladderService.getRanking(
      { type: "models", offset: 2, limit: 2 },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(page2.data.entries.map((e) => e.modelId)).toEqual(["p3"]);
    expect(page2.data.entries.map((e) => e.rank)).toEqual([3]);
  });

  // R-83 T3 分数带分窗（上拉加载更多的服务端语义）
  it("v2.x 分数带分窗：band=0 取 [75,100] 顶带含满分并附元数据，band=1 取 [50,75) 边界归高带", async () => {
    const repo = makeRepository([
      item({ modelId: "s100", composite: 100 }),
      item({ modelId: "s90", composite: 90 }),
      item({ modelId: "s75", composite: 75 }),
      item({ modelId: "s60", composite: 60 }),
      item({ modelId: "s50", composite: 50 }),
      item({ modelId: "s10", composite: 10 }),
    ]);

    const band0 = await ladderService.getRanking(
      { type: "models", bandIndex: 0, bandHeight: 25 },
      { repository: repo, cache: makeStubRedis() }
    );
    expect(band0.data.entries.map((e) => e.modelId)).toEqual(["s100", "s90", "s75"]);
    expect(band0.data.band).toEqual({ index: 0, height: 25, gte: 75, hasMore: true });

    const band1 = await ladderService.getRanking(
      { type: "models", bandIndex: 1, bandHeight: 25 },
      { repository: repo, cache: makeStubRedis() }
    );
    // 75.00 归顶带（band0），band1 = [50,75) 只收 60/50
    expect(band1.data.entries.map((e) => e.modelId)).toEqual(["s60", "s50"]);
    expect(band1.data.band).toEqual({ index: 1, height: 25, gte: 50, hasMore: true });

    const band3 = await ladderService.getRanking(
      { type: "models", bandIndex: 3, bandHeight: 25 },
      { repository: repo, cache: makeStubRedis() }
    );
    // 末带 [0,25)：gte 触底 0 → hasMore=false
    expect(band3.data.entries.map((e) => e.modelId)).toEqual(["s10"]);
    expect(band3.data.band).toEqual({ index: 3, height: 25, gte: 0, hasMore: false });
  });
});

// ==================== L.3.3 route 触发式核验 ====================

describe("GET /api/v1/ladder（withApi 包装路由）", () => {
  it("非法 type=skills 收敛为 code=20002 信封（榜单类型非法），data=null 且携带 x-request-id", async () => {
    const savedUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      const { GET } = await import("../../../../app/api/v1/ladder/route");
      const res = await GET(new Request("http://localhost/api/v1/ladder?type=skills"));
      expect(res.status).toBe(400);
      expect(res.headers.get("x-request-id")).toBeTruthy();
      const body = (await res.json()) as { code: number; message: string; data: unknown };
      expect(body.code).toBe(20002);
      expect(body.message).toBe("榜单类型非法");
      expect(body.data).toBeNull();
    } finally {
      if (savedUrl !== undefined) process.env.REDIS_URL = savedUrl;
    }
  });

  it("缺失 type 参数同样视为非法榜型并返回 20002", async () => {
    const savedUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      const { GET } = await import("../../../../app/api/v1/ladder/route");
      const res = await GET(new Request("http://localhost/api/v1/ladder"));
      const body = (await res.json()) as { code: number };
      expect(body.code).toBe(20002);
    } finally {
      if (savedUrl !== undefined) process.env.REDIS_URL = savedUrl;
    }
  });
});

// ==================== v2.1 定距档布局（spec: document-lessons-and-fix-granularity） ====================

import { buildLayout, computeAxisTop, ROW_H } from "../matrix-layout";
import type { LadderRankEntry } from "../types";

/** 最小排行条目夹具：仅布局数学所需字段，其余填中性值 */
function makeEntry(overrides: Partial<LadderRankEntry> & { modelName: string; composite: number }): LadderRankEntry {
  return {
    modelId: `id-${overrides.modelName}`,
    slug: null,
    vendorId: "vendor-x",
    vendorName: "VendorX",
    vendorCode: null,
    vendorTierLevel: 1,
    vendorBrandColor: null,
    vendorCountry: "USA",
    vendorPriority: 50,
    score: { composite: overrides.composite, official: null, actual: null, review: null, selfTest: null },
    price: { priceInput: null, priceOutput: null },
    modelType: null,
    protocol: null,
    publishedAt: null,
    isOpenSource: null,
    contextLength: null,
    avgLatency: null,
    uptime: null,
    rank: 1,
    ...overrides,
  } as LadderRankEntry;
}

describe("buildLayout 定距档（v2.1 分度值=行距）", () => {
  it("g=5.0 → 刻度序列 [100, 95, 90, …, 5, 0]，顶格 100、底缘 0，每行一枚刻度", () => {
    const layout = buildLayout([makeEntry({ modelName: "m-a", composite: 87.5 })], true, 5);
    expect(layout).not.toBeNull();
    const scores = layout!.ticks.map((t) => t.score);
    expect(scores[0]).toBe(100);
    expect(scores[1]).toBe(95);
    expect(scores[2]).toBe(90);
    expect(scores[scores.length - 2]).toBe(5);
    expect(scores[scores.length - 1]).toBe(0);
    // bandCount = 100/5 = 20 行 → 21 枚刻度（含底缘 0）；布局高度 = bandCount × ROW_H
    expect(layout!.ticks).toHaveLength(21);
    expect(layout!.ticks[0].row).toBe(0);
    expect(layout!.ticks[layout!.ticks.length - 1].row).toBe(20);
    expect(layout!.height).toBe(20 * ROW_H);
    expect(layout!.ticks[layout!.ticks.length - 1].score).toBe(0);
  });

  it("g=3（100 不被整除）→ 刻度 [100, 97, …, 1, 0]，末尾收敛到 0", () => {
    const layout = buildLayout([makeEntry({ modelName: "m-a", composite: 50 })], true, 3)!;
    const scores = layout.ticks.map((t) => t.score);
    // bandCount = ceil(10000/300) = 34 → 末两枚为 1 与 0
    expect(scores[scores.length - 2]).toBe(1);
    expect(scores[scores.length - 1]).toBe(0);
    expect(layout.ticks).toHaveLength(35);
    expect(layout.height).toBe(34 * ROW_H);
  });

  it("floor 自顶入档：恰在刻度值上的分数（95 @ g=5）归属其所在行；98.9 与 98.8（g=0.1）为相邻档", () => {
    // 95 恰在刻度值上：第 1 行覆盖 (90, 95]，归属 row 1
    const atTick = buildLayout([makeEntry({ modelName: "m-a", composite: 95 })], true, 5)!;
    expect(atTick.right[0].cells[0].row).toBe(1);
    // g=0.1：98.9 → row 11、98.8 → row 12（相邻档，不重叠）
    const fine = buildLayout(
      [
        makeEntry({ modelName: "m-a", composite: 98.9 }),
        makeEntry({ modelName: "m-b", composite: 98.8 }),
      ],
      true,
      0.1
    )!;
    const col = fine.right[0];
    expect(col.cells.map((c) => c.row)).toEqual([11, 12]);
  });

  it("切换分度值即时重排：同一数据 g=0.1 与 g=5 输出不同档数/高度（纯函数确定性、无副作用）", () => {
    const entries = [makeEntry({ modelName: "m-a", composite: 87.5 })];
    const fine = buildLayout(entries, true, 0.1)!;
    const coarse = buildLayout(entries, true, 5)!;
    expect(fine.ticks.length).toBeGreaterThan(coarse.ticks.length);
    expect(fine.height).toBeGreaterThan(coarse.height);
    expect(fine.granularity).toBe(0.1);
    expect(coarse.granularity).toBe(5);
  });
});

describe("UX-07 轴顶 = 最高综合分向上取整（computeAxisTop + buildLayout axisTopScore）", () => {
  it("computeAxisTop：ceil 到整数再对齐分度值，封顶 100；无条目 100", () => {
    expect(computeAxisTop([makeEntry({ modelName: "a", composite: 98 })], 0.1)).toBe(98);
    expect(computeAxisTop([makeEntry({ modelName: "a", composite: 97.3 })], 0.1)).toBe(98);
    expect(computeAxisTop([makeEntry({ modelName: "a", composite: 97.3 })], 5)).toBe(100);
    expect(computeAxisTop([makeEntry({ modelName: "a", composite: 86.2 })], 5)).toBe(90);
    expect(computeAxisTop([makeEntry({ modelName: "a", composite: 50 }), makeEntry({ modelName: "b", composite: 72.01 })], 3)).toBe(75);
    expect(computeAxisTop([makeEntry({ modelName: "a", composite: 100 })], 0.1)).toBe(100);
    expect(computeAxisTop([], 0.1)).toBe(100);
  });

  it("云服务榜最高 98 @ g=0.1：首张卡落在第 0 行（原恒 100 时空 20 行），刻度自 98 起", () => {
    const entries = [makeEntry({ modelName: "s-a", composite: 98 }), makeEntry({ modelName: "s-b", composite: 97.5 })];
    const legacy = buildLayout(entries, false, 0.1)!;
    expect(legacy.right[0].cells[0].row).toBe(20);
    const layout = buildLayout(entries, false, 0.1, 0, computeAxisTop(entries, 0.1))!;
    const rows = [...layout.left, ...layout.right].flatMap((c) => c.cells.map((x) => x.row)).sort((a, b) => a - b);
    expect(rows[0]).toBe(0);
    expect(layout.ticks[0].score).toBe(98);
    expect(layout.ticks[layout.ticks.length - 1].score).toBe(0);
    expect(layout.height).toBe(980 * ROW_H);
  });

  it("渐进轴底与轴顶共存：[80, 98] 量程 → 180 行；轴顶低于轴底+一档时抬到轴底+一档", () => {
    const entries = [makeEntry({ modelName: "m-a", composite: 97.2 })];
    const layout = buildLayout(entries, true, 0.1, 80, 98)!;
    expect(layout.height).toBe(180 * ROW_H);
    expect(layout.ticks[0].score).toBe(98);
    expect(layout.ticks[layout.ticks.length - 1].score).toBe(80);
    const clamped = buildLayout(entries, true, 5, 80, 60)!;
    expect(clamped.ticks[0].score).toBe(85);
  });
});

// ==================== UX-08 / UX-09 模型搜索选项（Combobox 取数口径；并入本文件以不增 spec 文件数） ====================

import {
  MODEL_SEARCH_PAGE_SIZE,
  buildModelSearchUrl,
  groupModelOptions,
  parseModelSearchResponse,
  searchModels,
} from "../model-options";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("buildModelSearchUrl", () => {
  it("默认一页 50 条，空关键字不带 keyword", () => {
    expect(MODEL_SEARCH_PAGE_SIZE).toBe(50);
    expect(buildModelSearchUrl("")).toBe("/api/v1/models?page=1&pageSize=50");
  });
  it("关键字 trim + 编码 + 截断至 100 字符；pageSize 夹在 1..100", () => {
    expect(buildModelSearchUrl("  gpt 4 ")).toBe("/api/v1/models?page=1&pageSize=50&keyword=gpt+4");
    const long = buildModelSearchUrl("x".repeat(150));
    expect(new URL(long, "http://h").searchParams.get("keyword")).toHaveLength(100);
    expect(buildModelSearchUrl("a", 500)).toContain("pageSize=100");
  });
});

describe("parseModelSearchResponse", () => {
  it("解析 items + total，缺厂商归「其他」，非法行跳过", () => {
    const parsed = parseModelSearchResponse({
      code: 0,
      data: {
        items: [
          { id: "m1", name: "GPT-4o", vendor: "OpenAI", slug: "gpt-4o" },
          { id: "m2", name: "Qwen", vendor: "", slug: null },
          { id: 3, name: "bad" },
        ],
        pagination: { total: 120 },
      },
    });
    expect(parsed).toEqual({
      items: [
        { id: "m1", name: "GPT-4o", vendor: "OpenAI", slug: "gpt-4o" },
        { id: "m2", name: "Qwen", vendor: "其他", slug: null },
      ],
      total: 120,
    });
  });
  it("code≠0 / 无 items → null（按失败处理）", () => {
    expect(parseModelSearchResponse({ code: 50000, data: null })).toBeNull();
    expect(parseModelSearchResponse({ code: 0, data: {} })).toBeNull();
    expect(parseModelSearchResponse(null)).toBeNull();
  });
});

describe("searchModels（失败≠空）", () => {
  it("200 且 0 条 → ok:true 空列表", async () => {
    const f = vi.fn(async () => jsonResponse(200, { code: 0, data: { items: [], pagination: { total: 0 } } }));
    expect(await searchModels("zzz", undefined, f as unknown as typeof fetch)).toEqual({ ok: true, items: [], total: 0 });
  });
  it("500 → ok:false 带服务端 message", async () => {
    const f = vi.fn(async () => jsonResponse(500, { code: 50000, message: "服务异常", data: null }));
    expect(await searchModels("", undefined, f as unknown as typeof fetch)).toEqual({ ok: false, message: "服务异常" });
  });
  it("断网 → ok:false 网络异常", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const res = await searchModels("", undefined, f as unknown as typeof fetch);
    expect(res.ok).toBe(false);
  });
  it("AbortError 透传（晚到请求由调用方丢弃）", async () => {
    const f = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    await expect(searchModels("", undefined, f as unknown as typeof fetch)).rejects.toThrow("aborted");
  });
});

describe("groupModelOptions", () => {
  it("按厂商分组，保持首次出现序", () => {
    const groups = groupModelOptions([
      { id: "1", name: "a", vendor: "B", slug: null },
      { id: "2", name: "b", vendor: "A", slug: null },
      { id: "3", name: "c", vendor: "B", slug: null },
    ]);
    expect(groups.map((g) => [g.vendor, g.items.map((i) => i.id)])).toEqual([
      ["B", ["1", "3"]],
      ["A", ["2"]],
    ]);
  });
});

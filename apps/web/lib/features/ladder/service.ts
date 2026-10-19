import { LADDER_CACHE_VERSION } from "@aidean/shared";
import { compileFormula } from "../ranking/formula-parser";
import { getRedis, type RedisLike } from "../../db/redis";
import { LADDER_LOAD_WINDOW_PCT_DEFAULT } from "./config";
import { ladderRepository } from "./repository";
import type {
  GetRankingResult,
  LadderDeps,
  LadderRankEntry,
  LadderRankingData,
  LadderTypeValue,
  MatrixItem,
  MatrixQuery,
} from "./types";

/**
 * ladder 天梯图域 service（Task L.3.2 / M-LADDER T2.2 排行化）：
 * 本域对外唯一入口，读穿缓存与排行构建编排。
 *
 * 数据流（DESIGN.md §一）：
 *   query → filterHash 键 ladder:matrix:v3:{type}:{hash12} → Redis GET
 *     HIT  → JSON.parse 直返（hit=true）
 *     MISS → repository 平铺行 → filters 过滤 → sort 解析 → 排行构建 → SETEX(TTL 3600s) 回写
 *   REDIS_URL 缺失 / 连接失败 → getRedis() null 化降级 → DB 直查（hit=false）
 */

/** 缓存 TTL（秒），与 DESIGN.md §三 SETEX 3600 一致 */
export const LADDER_CACHE_TTL_SECONDS = 3600;

/**
 * TASK-097（review-ext12 D5）：缓存 TTL 对齐到下一个价格边界（优惠开始/结束），上限仍为 LADDER_CACHE_TTL_SECONDS。
 * 边界查询失败或仓储未实现（测试桩）→ 退回固定 TTL，不阻断出榜。
 */
export function ttlUntilBoundary(boundary: Date | null, now: Date, max = LADDER_CACHE_TTL_SECONDS): number {
  if (!boundary) return max;
  const secs = Math.ceil((boundary.getTime() - now.getTime()) / 1000);
  return Math.max(1, Math.min(max, secs));
}

/** SCAN 批大小：禁 KEYS 全扫，游标增量遍历防阻塞 */
const SCAN_BATCH = 100;

/** 缓存键前缀（失效 SCAN 的 MATCH 模式也锚定于此） */
const CACHE_KEY_PREFIX = `ladder:matrix:${LADDER_CACHE_VERSION}`;

// ==================== 稳定序列化与 hash12 ====================

/**
 * simple-stable-stringify 自实现：对象键名字典序排序后递归序列化，
 * 保证「同参数 ⇒ 同指纹」（普通 JSON.stringify 受键插入顺序影响）。
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** murmur3 x86_32（公开散列族，DESIGN.md §三指定的近似口径：双种子拼 hex 截断，替代无依赖的 murmur3x64） */
function murmur3_32(input: string, seed: number): number {
  const C1 = 0xcc9e2d51;
  const C2 = 0x1b873593;
  const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

  let h = seed >>> 0;
  let i = 0;
  while (i + 4 <= input.length) {
    let k =
      input.charCodeAt(i) |
      (input.charCodeAt(i + 1) << 8) |
      (input.charCodeAt(i + 2) << 16) |
      (input.charCodeAt(i + 3) << 24);
    k = Math.imul(k, C1);
    k = rotl(k, 15);
    k = Math.imul(k, C2);
    h ^= k;
    h = rotl(h, 13);
    h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
    i += 4;
  }

  // 尾段：保留完整 code unit 参与（不做 0xff 掩码，保证非 ASCII 输入的区分度）
  const rem = input.length - i;
  if (rem > 0) {
    let k1 = 0;
    if (rem === 3) k1 ^= input.charCodeAt(i + 2) << 16;
    if (rem >= 2) k1 ^= input.charCodeAt(i + 1) << 8;
    k1 ^= input.charCodeAt(i);
    k1 = Math.imul(k1, C1);
    k1 = rotl(k1, 15);
    k1 = Math.imul(k1, C2);
    h ^= k1;
  }

  h ^= input.length;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** hash12：双种子 murmur3 拼 hex 截 12 位十六进制字符 */
function hash12(text: string): string {
  const h1 = murmur3_32(text, 0);
  const h2 = murmur3_32(text, 0x9747b28c);
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`.slice(0, 12);
}

// ==================== 过滤 / 排序 ====================

function toBool(value: boolean | string | undefined): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return null;
}

/** 单值或数组归一为非空字符串数组；未启用返回 null（Task L.4.1 多选通道，单值入参行为不变） */
function toList(value: string | string[] | undefined): string[] | null {
  if (value === undefined) return null;
  const raw = Array.isArray(value) ? value : [value];
  const list = raw
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return list.length > 0 ? list : null;
}

/** 大小写不敏感的「任一命中」匹配（兼容旧单值精确匹配语义） */
function matchAny(actual: string | null, expected: string[]): boolean {
  if (!actual) return false;
  return expected.some((item) => item.toUpperCase() === actual.toUpperCase());
}

/** updatedWithin 值 → 发布时间窗下限（ms）；30d/90d/180d/365d/730d，未知值视为不过滤 */
const UPDATED_WITHIN_DAYS: Record<string, number> = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
  "730d": 730,
};

/**
 * v1.9：标签组「开源/闭源」为真实过滤标签——多选任一命中（OR）：
 * 仅选开源 → isOpenSource=true；仅选闭源 → false；同选/未选 → 回退旧 isOpenSource 参数（URL 回放兼容）。
 */
function resolveOpenSource(filters: MatrixQuery["filters"]): boolean | null {
  const tags = toList(filters?.tags);
  if (tags) {
    const open = tags.includes("开源");
    const closed = tags.includes("闭源");
    if (open !== closed) return open;
  }
  return toBool(filters?.isOpenSource);
}

/**
 * 筛选应用点：modelType/protocol 大小写不敏感、多选任一命中；
 * isOpenSource 三态（null=不过滤，来源=标签组开源/闭源推导或旧参数，见 resolveOpenSource）；
 * updatedWithin 按 publishedAt 时间窗过滤（v1.9 多选并集：取最早下限=任一窗口命中）；
 * benchmark 服务端透传不过滤；stations 行天然被模型专属筛选排除。
 */
function applyFilters(items: MatrixItem[], filters: MatrixQuery["filters"]): MatrixItem[] {
  const openSource = resolveOpenSource(filters);
  const modelTypes = toList(filters?.modelType);
  const protocols = toList(filters?.protocol);
  const withinRaw = filters?.updatedWithin;
  const withinList = Array.isArray(withinRaw) ? withinRaw : typeof withinRaw === "string" ? [withinRaw] : [];
  const withinDays = withinList
    .map((v) => UPDATED_WITHIN_DAYS[v.trim()])
    .filter((days): days is number => typeof days === "number");
  // 多选并集：窗口并集=任一命中=最早下限（最大天数）
  const cutoff = withinDays.length ? Date.now() - Math.max(...withinDays) * 86_400_000 : null;
  // 注意 openSource=false（闭源）是有效过滤态，不能以真值判断代替三态判断（否则闭源筛选失效）
  if (openSource === null && !modelTypes && !protocols && cutoff === null) return items;
  return items.filter((it) => {
    if (openSource !== null && it.isOpenSource !== openSource) return false;
    if (modelTypes && !matchAny(it.modelType, modelTypes)) return false;
    if (protocols && !matchAny(it.protocol, protocols)) return false;
    if (cutoff !== null) {
      // 时间窗：publishedAt 缺失或早于下限均排除
      if (!it.publishedAt) return false;
      if (Date.parse(it.publishedAt) < cutoff) return false;
    }
    return true;
  });
}

interface SortSpec {
  /** 数值键提取（null 恒沉底，不受方向影响） */
  value: (item: MatrixItem) => number | null;
  dir: "asc" | "desc";
}

/**
 * sort 键解析：
 * - 未指定/default → type 缺省键（models=composite desc；stations=rating(composite) desc）
 * - shared 枚举别名 scoreDesc/priceAsc/priceDesc/name 归一到扩展键语义；
 *   price 按 priceInput 升序即最廉价优先（priceDesc 反向）；latency 仅 stations 有值（models 恒 null 沉底）。
 * - custom → formula-parser 白名单求值 vars={score,priceInput,contextLength}，非法公式抛 FormulaError 冒泡。
 */
function resolveSortSpec(query: MatrixQuery): SortSpec {
  const byComposite: SortSpec = { value: (it) => it.score.composite, dir: "desc" };
  const acc = new Map<string, SortSpec>([
    ["default", byComposite],
    ["composite", byComposite],
    ["scoreDesc", byComposite],
    [
      "contextLength",
      { value: (it) => it.contextLength ?? null, dir: "desc" },
    ],
    ["price", { value: (it) => it.price.priceInput ?? null, dir: "asc" }],
    ["priceAsc", { value: (it) => it.price.priceInput ?? null, dir: "asc" }],
    ["priceDesc", { value: (it) => it.price.priceInput ?? null, dir: "desc" }],
    ["latency", { value: (it) => it.avgLatency ?? null, dir: "asc" }],
    ["name", { value: () => null, dir: "asc" }], // 名字序走 tie-break 分支
  ]);

  if (query.sort === "custom") {
    const expr = query.customFormula ?? "";
    // 编译一次复用；vars 映射：score=compositeScore、priceInput=当前价、contextLength=上下文长度（缺省补 0）
    const compiled = compileFormula(expr);
    return {
      value: (it) =>
        compiled({ score: it.score.composite, priceInput: it.price.priceInput ?? 0, contextLength: it.contextLength ?? 0 }),
      dir: "desc",
    };
  }
  return acc.get(query.sort ?? "default") ?? byComposite;
}

// ==================== 矩阵构建 ====================

function buildComparator(spec: SortSpec, orderMul: number): (a: MatrixItem, b: MatrixItem) => number {
  return (a, b) => {
    const va = spec.value(a);
    const vb = spec.value(b);
    if (va === null && vb === null) return nameCompare(a, b);
    if (va === null) return 1; // null 沉底（双端一致，不做反向）
    if (vb === null) return -1;
    if (va !== vb) return va < vb ? orderMul : -orderMul;
    // 主键并列 → composite desc → modelName asc 兜底，保证确定性输出（缓存一致性前提）
    if (a.score.composite !== b.score.composite) return b.score.composite - a.score.composite;
    return a.modelName.localeCompare(b.modelName, "zh-Hans-CN");
  };
}

function nameCompare(a: MatrixItem, b: MatrixItem): number {
  return a.modelName.localeCompare(b.modelName, "zh-Hans-CN");
}

// ==================== 排行构建（M-LADDER T2.2） ====================

/**
 * buildRanking 纯函数（快科技式连续排行，替代原 5 分档矩阵构建）：
 * 1. rank：恒按综合分降序的同分并列名次（competition ranking 1,2,2,4），
 *    与当前展示排序解耦——用户按价格/名称排序时 rank 列仍呈现分数名次；
 * 2. entries 顺序：当前排序键全序（comparator 决定，含 null 沉底与名称兜底）；
 * 3. 同分判定：compositeScore 完全相等（61.25 与 61.25 并列，61.25 与 61.5 不并列）。
 */
function buildRanking(items: MatrixItem[], type: LadderTypeValue, spec: SortSpec): LadderRankingData {
  const comparator = buildComparator(spec, spec.dir === "asc" ? -1 : 1);

  const byScoreDesc = [...items].sort(
    (a, b) =>
      b.score.composite - a.score.composite || a.modelName.localeCompare(b.modelName, "zh-Hans-CN")
  );
  const rankByModelId = new Map<string, number>();
  let lastScore: number | null = null;
  let lastRank = 0;
  for (const [i, it] of byScoreDesc.entries()) {
    if (lastScore !== null && it.score.composite === lastScore) {
      rankByModelId.set(it.modelId, lastRank);
    } else {
      lastRank = i + 1;
      lastScore = it.score.composite;
      rankByModelId.set(it.modelId, lastRank);
    }
  }

  const entries: LadderRankEntry[] = [...items]
    .sort(comparator)
    .map((it) => ({ ...it, rank: rankByModelId.get(it.modelId) ?? 0 }));

  return { type, entries, updatedAt: new Date().toISOString() };
}

// ==================== 对外入口 ====================

/** 参与缓存指纹的字段子集（viewMode 等呈现参数不入键：数据无关呈现）；分页参数入键（v1.9：每页独立缓存）；分带参数入键（R-83 T3：每带独立缓存） */
function fingerprintOf(query: MatrixQuery): string {
  return stableStringify({
    type: query.type,
    sort: query.sort ?? null,
    customFormula: query.customFormula ?? null,
    filters: query.filters ?? null,
    offset: query.offset ?? null,
    limit: query.limit ?? null,
    bandIndex: query.bandIndex ?? null,
    bandHeight: query.bandHeight ?? null,
  });
}

/**
 * R-83 T3 分数带过滤（上拉加载更多的服务端实现）：
 * band i 覆盖综合分 [max(0, 100-(i+1)*h), 100-i*h]，顶带（i=0）含 100 分满分、
 * 带间边界归高带（75.00 属顶带 [75,100]，不属于 [50,75)），与「滑到 75 分线加载下一带」的
 * 用户口径一致。返回过滤后条目与分带元数据；未启用（bandIndex 缺省）原样返回。
 */
function applyBandSlice(
  built: LadderRankingData,
  bandIndex: number | undefined,
  bandHeight: number | undefined
): LadderRankingData {
  if (bandIndex === undefined || bandIndex < 0) return built;
  // fallback 引用后台默认常量（与 config.ts 单一真源），此前硬编码 25 已随默认档位调整收敛
  const height = bandHeight && bandHeight > 0 ? Math.floor(bandHeight) : LADDER_LOAD_WINDOW_PCT_DEFAULT;
  const gte = Math.max(0, 100 - (bandIndex + 1) * height);
  const lte = 100 - bandIndex * height;
  const entries = built.entries.filter((e) =>
    e.score.composite >= gte && (bandIndex === 0 ? e.score.composite <= lte : e.score.composite < lte)
  );
  return {
    ...built,
    entries,
    band: { index: bandIndex, height, gte, hasMore: gte > 0 },
  };
}

function buildCacheKey(type: LadderTypeValue, fingerprint: string): string {
  return `${CACHE_KEY_PREFIX}:${type}:${hash12(fingerprint)}`;
}

async function loadItems(query: MatrixQuery, repo: NonNullable<LadderDeps["repository"]>): Promise<MatrixItem[]> {
  return query.type === "stations"
    ? repo.getStationsForMatrix()
    : repo.getModelsForMatrix();
}

export const ladderService = {
  /**
   * 读穿缓存主入口：
   * cache 显式传 null 表示跳过缓存直查（测试注入/降级模拟）；
   * 未传时生产路径取 getRedis()（REDIS_URL 缺失 → null → 直查分支）。
   * HIT 且负载形状可解析时 hit=true；解析失败视为 MISS 重建。
   */
  async getRanking(query: MatrixQuery, deps?: LadderDeps): Promise<GetRankingResult> {
    const repo = deps?.repository ?? ladderRepository;
    const cache: RedisLike | null = deps && "cache" in deps && deps.cache !== undefined ? deps.cache : getRedis();
    const fingerprint = fingerprintOf(query);
    const key = buildCacheKey(query.type, fingerprint);

    if (cache) {
      try {
        const raw = await cache.get(key);
        if (raw !== null && raw !== undefined) {
          const parsed = JSON.parse(raw) as LadderRankingData | null;
          if (parsed && Array.isArray(parsed.entries)) {
            return { data: parsed, hit: true };
          }
        }
      } catch {
        /* 缓存读取失败按 MISS 处理，不让缓存故障阻断出榜 */
      }
    }

    const items = applyFilters(await loadItems(query, repo), query.filters);
    const built = buildRanking(items, query.type, resolveSortSpec(query));

    // R-83 T3 分数带分窗：bandIndex 提供时取代 offset/limit 切片（整带返回 + 分带元数据）
    const data: LadderRankingData =
      query.bandIndex !== undefined
        ? applyBandSlice(built, query.bandIndex, query.bandHeight)
        : // v1.9 分页：rank/排序已在上一步全量确定，此处仅做窗口切片（缺省=全量，兼容旧消费方）
          (() => {
            const offset = query.offset && query.offset > 0 ? Math.floor(query.offset) : 0;
            const limit = query.limit && query.limit > 0 ? Math.floor(query.limit) : null;
            return limit === null
              ? built
              : { ...built, entries: built.entries.slice(offset, offset + limit) };
          })();

    if (cache) {
      try {
        let ttl = LADDER_CACHE_TTL_SECONDS;
        if (query.type === "models" && typeof repo.getNextPriceBoundary === "function") {
          const now = new Date();
          try {
            ttl = ttlUntilBoundary(await repo.getNextPriceBoundary(undefined, now), now);
          } catch {
            /* 边界查询失败 → 固定 TTL 兜底 */
          }
        }
        await cache.set(key, JSON.stringify(data), "EX", ttl);
      } catch {
        /* 回写失败容忍：下次请求照常走 MISS 重算 */
      }
    }

    return { data, hit: false };
  },

  /**
   * 批量失效天梯矩阵缓存：SCAN(MATCH ladder:matrix:*, COUNT 100) 游标循环收集后逐批 UNLINK；
   * 无缓存实例时静默 no-op（直查分支本就无缓存）。
   */
  async invalidateLadderCache(deps?: Pick<LadderDeps, "cache">): Promise<void> {
    const cache: RedisLike | null = deps?.cache !== undefined ? deps.cache : getRedis();
    if (!cache) return;
    try {
      const victimKeys: string[] = [];
      let cursor = "0";
      do {
        const [next, batch] = await cache.scan(cursor, "MATCH", `${CACHE_KEY_PREFIX}:*`, "COUNT", SCAN_BATCH);
        cursor = next;
        victimKeys.push(...batch);
      } while (cursor !== "0");
      for (const key of victimKeys) {
        await cache.unlink(key);
      }
    } catch {
      /* 失效失败静默：TTL 3600s 兜底过期 */
    }
  },
} as const;

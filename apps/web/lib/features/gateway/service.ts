/**
 * gateway 网关域 service（Task G.2.2）：路由链构造与免费额度记账。
 *
 * 职责边界（调用编排随 G.3，本文件不发起上游请求、不操作钱包）：
 *  - buildRouteChain 纯函数：请求模型链首 → 等级映射(1/2/3/4)与优先级(1~99)合并取优去重 → free 兜底（额度未耗尽）
 *  - periodStartOf 纯函数：周期起点口径与 user 域 nextResetAt 对齐（本地零点；WEEK 周一首；MONTH 月首）
 *  - gatewayService.resolveRouteChain：编排 repository 三读 + free 额度核验，产出带模型详情的候选链
 *  - gatewayService.recordFreeUsage：FREE_QUOTA 路径用量 UPSERT 记账（G.3 调用成功后按实 tokens 记）
 *
 * 错误语义：请求模型无法解析为可用候选 → 30002 GATEWAY_NO_ROUTE（链空）。
 */
import {
  calcCharge,
  BILLING_PATH_VALUES,
  DEFAULT_MAX_TOKENS,
  detectGatewayFormat,
  FREE_FALLBACK_PRIORITY,
  GATEWAY_IDEMPOTENCY_PREFIX,
  channelEnumToGatewayFormat,
  maskApiKey,
  normalizeUsage,
  PRIORITY_MAX,
  PRIORITY_MIN,
  TIER_PRIORITY,
  TOKEN_ESTIMATE_DIVISOR,
  UpstreamResponseSchema,
  fenToYuan,
  validateUsageWindow,
  type BillingPathValue,
  type CustomChannelUpsert,
  type CustomChannelPatch,
  type CustomChannelView,
  type GatewayChat,
  type GatewayFormat,
  type TierKey,
  type UsageBreakdownQuery,
  type UsageBreakdownRow,
  type UsageBreakdownView,
  type UsageLogView,
  type UsagePage,
  type UsageQuery,
  type UsageStatsDailyPoint,
  type UsageStatsModelRow,
  type UsageStatsQuery,
  type UsageStatsView,
} from "@aidean/shared";

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import { prisma } from "../../db/prisma";
import { billingService } from "../billing/service";
import { decryptSecret, encryptSecret } from "../apikey/crypto";
import { callUpstream, callUpstreamAggregated, callUpstreamStream, isPassthroughSafe, toClientResponse, toUpstreamBody } from "./adapters";
import { channelServesModel, pickChannel } from "./channel-pick";
import { gatewayRepository, type RouteConfigRow } from "./repository";

// ==================== 纯函数：路由链 ====================

/** 候选来源：链首请求 / 等级映射 / 自定义优先级 / free 兜底 */
export type RouteSource = "REQUESTED" | "TIER" | "PRIORITY" | "FREE";

/** 路由候选（priority 仅作展示与日志；顺序即数组序；FREE 候选携带额度周期供成功后记账） */
export interface RouteCandidate {
  modelId: string;
  priority: number;
  source: RouteSource;
  freeCycle?: "DAY" | "WEEK" | "MONTH";
}

/** 链首哨兵优先级：恒小于任何可配置值，保证请求模型恒排第一 */
const REQUESTED_PRIORITY = -1;

/**
 * 构造降级候选链（纯函数，不改入参）：
 *  1) 请求模型恒为链首（用户显式请求最优先）；
 *  2) 等级映射 tierLevel → TIER_PRIORITY（OPUS/Sonnet/Fable/Haiku = 1/2/3/4）入候选；
 *  3) 自定义优先级（enabled 且 1~99）入候选；同一模型与等级映射合并取优（priority 数值小者胜）；
 *  4) free 池中额度未耗尽且未在链中的模型追加尾部（FREE_FALLBACK_PRIORITY=100）；额度耗尽出链。
 * 输出按 priority 升序（链首 -1 恒第一；free 100 恒尾部），同 priority 保持插入序（稳定排序）。
 */
export function buildRouteChain(
  config: RouteConfigRow,
  requestedModelId: string,
  freeAvailable: ReadonlySet<string>
): RouteCandidate[] {
  const byId = new Map<string, { priority: number; source: RouteSource; freeCycle?: "DAY" | "WEEK" | "MONTH" }>();

  // 1) 链首
  byId.set(requestedModelId, { priority: REQUESTED_PRIORITY, source: "REQUESTED" });

  // 2) 等级映射（合并取优：已有更优者胜）
  for (const t of config.tierMappings) {
    const p = TIER_PRIORITY[t.tierLevel as TierKey];
    const cur = byId.get(t.modelId);
    if (!cur || cur.priority > p) byId.set(t.modelId, { priority: p, source: "TIER" });
  }

  // 3) 自定义优先级（范围守卫 + enabled 守卫）
  for (const row of config.priorities) {
    if (!row.enabled) continue;
    if (row.priority < PRIORITY_MIN || row.priority > PRIORITY_MAX) continue;
    const cur = byId.get(row.modelId);
    if (!cur || cur.priority > row.priority) byId.set(row.modelId, { priority: row.priority, source: "PRIORITY" });
  }

  // 4) free 兜底：额度未耗尽且未在链中（去重）
  for (const f of config.free) {
    if (!freeAvailable.has(f.modelId)) continue;
    if (byId.has(f.modelId)) continue;
    byId.set(f.modelId, { priority: FREE_FALLBACK_PRIORITY, source: "FREE", freeCycle: f.refreshCycle });
  }

  return Array.from(byId.entries())
    .map(([modelId, v]) => ({ modelId, ...v }))
    .sort((a, b) => a.priority - b.priority);
}

// ==================== 纯函数：周期起点 ====================

/** 周期起点（本地零点）：DAY=当天零点；WEEK=本周一零点；MONTH=本月 1 日零点 */
export function periodStartOf(cycle: "DAY" | "WEEK" | "MONTH", now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (cycle === "WEEK") {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 周一为首（周日减 6 天）
  } else if (cycle === "MONTH") {
    d.setDate(1);
  }
  return d;
}

// ==================== service 编排 ====================

/** 候选链元素（带模型详情；model 形状即 repository.findModelByCode 的 select） */
export interface RouteCandidateWithModel extends RouteCandidate {
  model: NonNullable<Awaited<ReturnType<typeof gatewayRepository.findModelByCode>>>;
}

export const gatewayService = {
  /**
   * 解析路由链（G.2.2）：请求模型解析 → 配置三读 → free 额度核验 → buildRouteChain → 模型详情补全。
   * 请求模型不存在/下架 → 30002（链空语义）。
   */
  async resolveRouteChain(
    userId: string,
    requestedCode: string,
    now: Date = new Date()
  ): Promise<{ chain: RouteCandidateWithModel[]; requestedModelId: string }> {
    const requested = await gatewayRepository.findModelByCode(prismaClient(), requestedCode, now);
    if (!requested) throw new ApiError(ERROR_CODES.GATEWAY_NO_ROUTE, "无可用路由");

    const config = await gatewayRepository.loadRouteConfig(prismaClient(), userId);

    // free 额度核验：当期用量 < 配额 → 可用（并行查询）
    const freeAvailable = new Set<string>();
    await Promise.all(
      config.free.map(async (f) => {
        const used = await gatewayRepository.getQuotaUsed(
          prismaClient(),
          userId,
          f.modelId,
          periodStartOf(f.refreshCycle, now)
        );
        if (used < f.quotaTokens) freeAvailable.add(f.modelId);
      })
    );

    const chain = buildRouteChain(config, requested.id, freeAvailable);

    // 模型详情补全（保持链序；链首已查过，缺则回填）
    const modelMap = await gatewayRepository.findModelsByIds(prismaClient(), chain.map((c) => c.modelId), now);
    if (!modelMap.has(requested.id)) modelMap.set(requested.id, requested);

    const withModel: RouteCandidateWithModel[] = [];
    for (const c of chain) {
      const m = modelMap.get(c.modelId);
      if (m) withModel.push({ ...c, model: m });
    }
    return { chain: withModel, requestedModelId: requested.id };
  },

  /** 免费额度记账（billingPath=FREE_QUOTA）：当期 UPSERT 累加（G.3 在 FREE_QUOTA 调用成功后按实 tokens 调用） */
  async recordFreeUsage(
    userId: string,
    modelId: string,
    cycle: "DAY" | "WEEK" | "MONTH",
    tokensDelta: number,
    now: Date = new Date()
  ): Promise<void> {
    await gatewayRepository.addQuotaUsed(prismaClient(), userId, modelId, periodStartOf(cycle, now), tokensDelta);
  },

  // ==================== 自定义渠道编排（G.4 路由面） ====================

  /** 渠道行 → 公开视图（apiKey 恒掩码不回显明文/密文；format 收敛小写契约） */
  toChannelView(row: {
    id: string;
    name: string;
    baseUrl: string;
    format: string;
    isActive: boolean;
    keyMasked: string;
    createdAt: Date;
    models?: string[];
    priority?: number;
    groupName?: string | null;
    weight?: number;
  }): CustomChannelView {
    return {
      id: row.id,
      name: row.name,
      baseUrl: row.baseUrl,
      format: channelEnumToGatewayFormat(row.format),
      isActive: row.isActive,
      apiKeyMasked: row.keyMasked,
      createdAt: row.createdAt.toISOString(),
      ...(row.models !== undefined ? { models: row.models } : {}),
      ...(row.priority !== undefined ? { priority: row.priority } : {}),
      ...(row.groupName !== undefined ? { groupName: row.groupName } : {}),
      ...(row.weight !== undefined ? { weight: row.weight } : {}),
    };
  },

  async listChannels(userId: string): Promise<CustomChannelView[]> {
    type ChannelRow = Awaited<ReturnType<typeof gatewayRepository.listCustomChannels>>[number];
    const rows = await gatewayRepository.listCustomChannels(prismaClient(), userId);
    return rows.map((r: ChannelRow) => this.toChannelView(r));
  },

  /** 新建/更新渠道；同 id 校验归属（本人）；返回掩码视图。T3：明文 apiKey 经 AES-256-GCM 加密落 keyCipher，脱敏 keyMasked 冗余落库 */
  async saveChannel(userId: string, input: CustomChannelUpsert, id?: string): Promise<CustomChannelView> {
    if (id) {
      const existing = await gatewayRepository.findCustomChannel(prismaClient(), userId, id);
      if (!existing) throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道不存在或无权操作");
    }
    let row;
    try {
      row = await gatewayRepository.upsertCustomChannel(
        prismaClient(),
        userId,
        {
          name: input.name,
          baseUrl: input.baseUrl,
          keyCipher: encryptSecret(input.apiKey),
          keyMasked: maskApiKey(input.apiKey),
          format: input.format,
          ...(input.models !== undefined ? { models: input.models } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.groupName !== undefined ? { groupName: input.groupName } : {}),
          ...(input.weight !== undefined ? { weight: input.weight } : {}),
        },
        id
      );
    } catch (err) {
      // (user_id, name) 唯一约束：同名人渠道重复创建 → 40000（原未捕获 P2002 致 50000）
      if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道名称已存在");
      }
      throw err;
    }
    return this.toChannelView(row);
  },

  /** 删除本人渠道；0 行视为不存在 → 40000 */
  async removeChannel(userId: string, id: string): Promise<void> {
    const count = await gatewayRepository.deleteCustomChannel(prismaClient(), userId, id);
    if (count === 0) throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道不存在或无权操作");
  },

  /**
   * 渠道部分更新（PATCH）：校验归属后仅更新传入字段；apiKey 缺省=不换密钥。
   * 改名/改 URL/启停无需重填 Key（修控制台问题 3）。同名人冲突 → 40000。
   */
  async patchChannel(userId: string, id: string, input: CustomChannelPatch): Promise<CustomChannelView> {
    const existing = await gatewayRepository.findCustomChannel(prismaClient(), userId, id);
    if (!existing) throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道不存在或无权操作");
    try {
      const row = await gatewayRepository.patchCustomChannel(prismaClient(), userId, id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
        ...(input.format !== undefined ? { format: input.format } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.apiKey !== undefined
          ? { keyCipher: encryptSecret(input.apiKey), keyMasked: maskApiKey(input.apiKey) }
          : {}),
        ...(input.models !== undefined ? { models: input.models } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.groupName !== undefined ? { groupName: input.groupName } : {}),
        ...(input.weight !== undefined ? { weight: input.weight } : {}),
      });
      return this.toChannelView(row);
    } catch (err) {
      if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道名称已存在");
      }
      if (err && typeof err === "object" && (err as { code?: string }).code === "P2025") {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道不存在或无权操作");
      }
      throw err;
    }
  },

  // ==================== 用量明细分页（G.4 路由面） ====================

  /** usage_logs 行 → 公开视图（金额 BigInt 分 → 元字符串；仅暴露计费事实） */
  toUsageView(row: {
    id: string;
    model: string;
    station?: { name: string; displayName: string } | null;
    promptTokens: number;
    completionTokens: number;
    quotaMinor: bigint;
    billingPath: string;
    latencyMs: number | null;
    statusCode: number | null;
    createdAt: Date;
  }): UsageLogView {
    return {
      id: row.id,
      model: row.model,
      stationName: row.station?.displayName ?? row.station?.name ?? null,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
      quotaYuan: fenToYuan(row.quotaMinor),
      billingPath: (["PLATFORM", "UPSTREAM", "PACKAGE", "FREE_PROXY", "FREE_QUOTA"] as const).includes(
        row.billingPath as "PLATFORM"
      )
        ? (row.billingPath as UsageLogView["billingPath"])
        : "PLATFORM",
      latencyMs: row.latencyMs,
      statusCode: row.statusCode,
      createdAt: row.createdAt.toISOString(),
    };
  },

  async listUsagePage(userId: string, query: UsageQuery): Promise<UsagePage> {
    type UsageRow = Awaited<ReturnType<typeof gatewayRepository.listUsageLogs>>["rows"][number];
    const { rows, total } = await gatewayRepository.listUsageLogs(prismaClient(), userId, {
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      model: query.model,
      billingPath: query.billingPath,
    });
    return {
      items: rows.map((r: UsageRow) => this.toUsageView(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  },

  /**
   * 用量统计聚合（WF-21 / AT-21.2，P5 报表读侧）：
   * 只读 usage_daily_stats 日表（@@index([userId, day])），禁止扫 usage_logs 明细大表；
   * range 服务端硬上限（7d/30d/90d）或自定义日期窗口（dateFrom+dateTo，≤92 天），日期序列零填充，金额服务端一次分→元。
   */
  async getUsageStats(userId: string, query: UsageStatsQuery): Promise<UsageStatsView> {
    // 自定义日期窗口优先（问题 4：指定日期查看）；range 作为预设兜底
    if (query.dateFrom && query.dateTo) {
      const win = validateUsageWindow(query.dateFrom, query.dateTo);
      if (!win.ok) throw new ApiError(ERROR_CODES.BAD_REQUEST, win.message ?? "日期区间非法");
      const start = new Date(`${query.dateFrom}T00:00:00`);
      const end = new Date(`${query.dateTo}T23:59:59.999`);
      const rows = await gatewayRepository.listDailyStats(prismaClient(), userId, { from: start, to: end });
      return buildUsageStatsWindow(rows, query.dateFrom, query.dateTo);
    }
    const days = USAGE_STATS_RANGE_DAYS[query.range];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    const rows = await gatewayRepository.listDailyStats(prismaClient(), userId, {
      from: start,
      to: end,
    });
    return buildUsageStats(rows, query.range, end);
  },

  /**
   * 消耗多维明细（问题 4：渠道×模型×计费路径）：走 usage_logs 有界 groupBy（区间硬上限 ≤92 天）。
   * 来源解析：stationId→站点展示名 / channelId→自定义渠道名 / 其余→平台（PLATFORM/PACKAGE/FREE_QUOTA 等无独立来源）。
   */
  async getUsageBreakdown(userId: string, query: UsageBreakdownQuery): Promise<UsageBreakdownView> {
    let start: Date;
    let end: Date;
    if (query.dateFrom && query.dateTo) {
      const win = validateUsageWindow(query.dateFrom, query.dateTo);
      if (!win.ok) throw new ApiError(ERROR_CODES.BAD_REQUEST, win.message ?? "日期区间非法");
      start = new Date(`${query.dateFrom}T00:00:00`);
      end = new Date(`${query.dateTo}T23:59:59.999`);
    } else {
      const days = USAGE_STATS_RANGE_DAYS[query.range];
      end = new Date();
      end.setHours(23, 59, 59, 999);
      start = new Date(end);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
    }
    const groups = await gatewayRepository.groupUsageBySource(prismaClient(), userId, { from: start, to: end });
    const stationIds = [...new Set(groups.map((g) => g.stationId).filter((v): v is string => !!v))];
    const channelIds = [...new Set(groups.map((g) => g.channelId).filter((v): v is string => !!v))];
    const [stationNames, channelNames] = await Promise.all([
      gatewayRepository.findStationNamesByIds(prismaClient(), stationIds),
      gatewayRepository.findChannelNamesByIds(prismaClient(), userId, channelIds),
    ]);
    return buildUsageBreakdown(groups, {
      from: start,
      to: end,
      stationNames,
      channelNames,
    });
  },
};

// ==================== 纯函数：用量统计聚合（WF-21 / P5） ====================

/** range → 天数（服务端硬上限） */
export const USAGE_STATS_RANGE_DAYS: Record<UsageStatsQuery["range"], number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** usage_daily_stats 行投影（聚合入参；与表字段对齐，金额保持 BigInt 分） */
export interface UsageDailyStatRow {
  day: Date;
  model: string;
  requestCount: number;
  quotaMinor: bigint;
  promptTokens: number;
  completionTokens: number;
}

/**
 * 日表行 → 统计核心（私有：零填充日序列 + 模型 TopN + 汇总，可测）。
 * 按本地零点生成 [start,end] 完整日期键并零填充；越界行防御性跳过（查询已按 from/to 过滤，此处兜底）。
 */
function assembleStats(
  rows: UsageDailyStatRow[],
  start: Date,
  end: Date
): { summary: UsageStatsView["summary"]; daily: UsageStatsDailyPoint[]; models: UsageStatsModelRow[]; from: string; to: string } {
  const dayKeyOf = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  interface Bucket {
    requestCount: number;
    tokens: number;
    quotaMinor: bigint;
  }
  const dayMap = new Map<string, Bucket>();
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endTs = end.getTime();
  while (cursor.getTime() <= endTs) {
    dayMap.set(dayKeyOf(cursor), { requestCount: 0, tokens: 0, quotaMinor: 0n });
    cursor.setDate(cursor.getDate() + 1);
  }

  const modelMap = new Map<string, Bucket>();
  for (const row of rows) {
    const key = dayKeyOf(new Date(row.day));
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    const tokens = row.promptTokens + row.completionTokens;
    bucket.requestCount += row.requestCount;
    bucket.tokens += tokens;
    bucket.quotaMinor += row.quotaMinor;
    const m = modelMap.get(row.model) ?? { requestCount: 0, tokens: 0, quotaMinor: 0n };
    m.requestCount += row.requestCount;
    m.tokens += tokens;
    m.quotaMinor += row.quotaMinor;
    modelMap.set(row.model, m);
  }

  let totalRequests = 0;
  let totalTokens = 0;
  let totalQuotaMinor = 0n;
  const daily: UsageStatsDailyPoint[] = [];
  for (const [day, b] of dayMap) {
    totalRequests += b.requestCount;
    totalTokens += b.tokens;
    totalQuotaMinor += b.quotaMinor;
    daily.push({
      day,
      requestCount: b.requestCount,
      tokens: b.tokens,
      quotaYuan: fenToYuan(b.quotaMinor),
    });
  }
  daily.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  const models: UsageStatsModelRow[] = [...modelMap.entries()]
    .map(([model, m]) => ({
      model,
      requestCount: m.requestCount,
      tokens: m.tokens,
      quotaYuan: fenToYuan(m.quotaMinor),
    }))
    .sort((a, b) => b.tokens - a.tokens || b.requestCount - a.requestCount)
    .slice(0, 10);

  return {
    summary: { totalRequests, totalTokens, totalQuotaYuan: fenToYuan(totalQuotaMinor) },
    daily,
    models,
    from: dayKeyOf(start),
    to: dayKeyOf(end),
  };
}

/**
 * 日表行 → 统计视图（纯函数，可测；AT-21.2）：预设 range 模式（零填充、TopN=10、越界防御）。
 */
export function buildUsageStats(
  rows: UsageDailyStatRow[],
  range: UsageStatsQuery["range"],
  today: Date = new Date()
): UsageStatsView {
  const days = USAGE_STATS_RANGE_DAYS[range];
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const core = assembleStats(rows, start, end);
  return { range, from: core.from, to: core.to, summary: core.summary, daily: core.daily, models: core.models };
}

/**
 * 日表行 → 统计视图（自定义日期窗口，闭区间 [dateFrom,dateTo]，YYYY-MM-DD 本地零点）。
 * 与 buildUsageStats 同口径，仅窗口由显式日期给定（range 字段缺省）。
 */
export function buildUsageStatsWindow(rows: UsageDailyStatRow[], dateFrom: string, dateTo: string): UsageStatsView {
  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  const core = assembleStats(rows, start, end);
  return { from: core.from, to: core.to, summary: core.summary, daily: core.daily, models: core.models };
}

/** usage_logs groupBy 原始行（与 repository.groupUsageBySource 输出对齐；金额 BigInt 分） */
export interface UsageBreakdownGroupRow {
  stationId: string | null;
  channelId: string | null;
  model: string;
  billingPath: string;
  _count: number;
  _sum: { promptTokens: number | null; completionTokens: number | null; quotaMinor: bigint };
}

/** YYYY-MM-DD 本地零点键（与日表口径一致） */
function breakdownDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * groupBy 行 → 消耗多维矩阵视图（纯函数，可测）。
 * 来源优先级：channelId（自定义渠道）> stationId（上游站点）> 平台；billingPath 枚举越界防御性回落 PLATFORM。
 */
export function buildUsageBreakdown(
  groups: UsageBreakdownGroupRow[],
  ctx: { from: Date; to: Date; stationNames: Map<string, string>; channelNames: Map<string, string> }
): UsageBreakdownView {
  const rows: UsageBreakdownRow[] = groups.map((g) => {
    let sourceType: UsageBreakdownRow["sourceType"];
    let source: string;
    if (g.channelId) {
      sourceType = "channel";
      source = ctx.channelNames.get(g.channelId) ?? `渠道 ${g.channelId.slice(0, 8)}`;
    } else if (g.stationId) {
      sourceType = "station";
      source = ctx.stationNames.get(g.stationId) ?? `站点 ${g.stationId.slice(0, 8)}`;
    } else {
      sourceType = "platform";
      source = "平台";
    }
    const bp = BILLING_PATH_VALUES.includes(g.billingPath as BillingPathValue)
      ? (g.billingPath as BillingPathValue)
      : "PLATFORM";
    return {
      sourceType,
      source,
      model: g.model,
      billingPath: bp,
      requestCount: g._count,
      tokens: (g._sum.promptTokens ?? 0) + (g._sum.completionTokens ?? 0),
      quotaYuan: fenToYuan(g._sum.quotaMinor ?? 0n),
    };
  });

  let totalRequests = 0;
  let totalTokens = 0;
  let totalQuotaMinor = 0n;
  for (const g of groups) {
    totalRequests += g._count;
    totalTokens += (g._sum.promptTokens ?? 0) + (g._sum.completionTokens ?? 0);
    totalQuotaMinor += g._sum.quotaMinor ?? 0n;
  }

  // 稳定排序：tokens 降序 → requestCount 降序 → source → model（使矩阵展示可预期）
  rows.sort(
    (a, b) =>
      b.tokens - a.tokens ||
      b.requestCount - a.requestCount ||
      a.source.localeCompare(b.source) ||
      a.model.localeCompare(b.model)
  );

  return {
    from: breakdownDayKey(ctx.from),
    to: breakdownDayKey(ctx.to),
    summary: { totalRequests, totalTokens, totalQuotaYuan: fenToYuan(totalQuotaMinor) },
    rows,
  };
}

// ==================== 纯函数：Key 加权选择 / 预扣估算（G.3.2） ====================

/** 按权重选择 Key（注入随机源保证可测）；空列表或全零权重 → null */
export function pickKeyWeighted<T extends { id: string; weight: number }>(
  keys: T[],
  rng: () => number = Math.random
): T | null {
  if (keys.length === 0) return null;
  const total = keys.reduce((s, k) => s + Math.max(0, k.weight), 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const k of keys) {
    r -= Math.max(0, k.weight);
    if (r < 0) return k;
  }
  return keys[keys.length - 1];
}

/**
 * 预扣估算（高估原则，保证实际消耗 ≤ 预扣额）：
 * 输入 = Σ messages.content（含顶层 system）字符 → token 估算；
 * ASCII ≈ 1/4 token/字符，非 ASCII（CJK/emoji 等多字节）按 1 token/字符加权
 * ——CJK 实际约 0.6~1+ token/字，沿用 chars/4 会严重低估致预扣失守；
 * 输出 = body.max_tokens ?? DEFAULT_MAX_TOKENS，再 clamp 至模型 maxOutputTokens。
 * 无当期价 → 0n（调用方最小预扣 1 分兜底；计费捕获时同样按 0 价 void）。
 */
/** 非 ASCII 字符的 token 估算权重（相对 ASCII 的 1/4） */
const WIDE_CHAR_TOKEN_WEIGHT = 4;

function estimatePromptTokens(parts: string[]): number {
  let ascii = 0;
  let wide = 0;
  for (const text of parts) {
    for (let i = 0; i < text.length; i++) {
      // UTF-16 code unit：ASCII 1 unit ≈ 1/4 token；CJK/代理对逐 unit 计 1 token（代理对 2 unit ≥ 实际 1~2 token，仍属高估）
      if (text.charCodeAt(i) < 128) ascii++;
      else wide++;
    }
  }
  return Math.ceil((ascii + WIDE_CHAR_TOKEN_WEIGHT * wide) / TOKEN_ESTIMATE_DIVISOR);
}

/** 流式尾帧 usage 缺失时的估算兜底（规格 §2.3.1.1）：输入按请求文本估算 */
function estimateStreamPromptTokens(body: GatewayChat): number {
  const parts: string[] = body.messages.map((m) => m.content);
  if ("system" in body && typeof body.system === "string") parts.push(body.system);
  return estimatePromptTokens(parts);
}

/** 流式尾帧 usage 缺失时的估算兜底：输出按 max_tokens（clamp 模型上限）估算 */
function estimateStreamCompletionTokens(
  model: { maxOutputTokens: number | null },
  body: GatewayChat
): number {
  const cap = "max_tokens" in body && typeof body.max_tokens === "number" ? body.max_tokens : DEFAULT_MAX_TOKENS;
  return model.maxOutputTokens ? Math.min(cap, model.maxOutputTokens) : cap;
}

export function estimatePrepayMinor(
  model: {
    maxOutputTokens: number | null;
    prices: { priceInput: unknown; priceOutput: unknown; billingCurrency: string; isFree?: boolean }[];
  },
  body: GatewayChat,
  rule: { markupRate: unknown; tokenMultiplier: unknown } | null
): bigint {
  const price = model.prices[0];
  if (!price) return 0n;
  const markup = Number(rule?.markupRate ?? 1);
  const multiplier = Number(rule?.tokenMultiplier ?? 1);

  const parts: string[] = body.messages.map((m) => m.content);
  if ("system" in body && typeof body.system === "string") parts.push(body.system);
  const promptEst = estimatePromptTokens(parts);
  const completionCap =
    "max_tokens" in body && typeof body.max_tokens === "number" ? body.max_tokens : DEFAULT_MAX_TOKENS;
  const completionEst = model.maxOutputTokens ? Math.min(completionCap, model.maxOutputTokens) : completionCap;

  const inputMinor = calcCharge({
    pricePerMillionToken: Number(price.priceInput),
    tokens: promptEst,
    markupRate: markup,
    tokenMultiplier: multiplier,
  });
  const outputMinor = calcCharge({
    pricePerMillionToken: Number(price.priceOutput),
    tokens: completionEst,
    markupRate: markup,
    tokenMultiplier: multiplier,
  });
  return inputMinor + outputMinor;
}

/** 上游响应 usage 归一（宽松：缺失/形状异常按 0/0，不因计费字段异常丢弃成功响应；cached/reasoning 缺省 0） */
function parseUpstreamUsage(json: unknown): {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
} {
  const obj = (json && typeof json === "object" ? json : null) as Record<string, unknown> | null;
  // gemini 原生：usageMetadata（promptTokenCount/candidatesTokenCount/thoughtsTokenCount/cachedContentTokenCount）
  const um = obj?.usageMetadata as Record<string, unknown> | undefined;
  if (um) {
    return {
      promptTokens: Number(um.promptTokenCount ?? 0) || 0,
      completionTokens: Number(um.candidatesTokenCount ?? 0) || 0,
      cachedTokens: Number(um.cachedContentTokenCount ?? 0) || 0,
      reasoningTokens: Number(um.thoughtsTokenCount ?? 0) || 0,
    };
  }
  try {
    const parsed = UpstreamResponseSchema.parse(json);
    const usage = parsed.usage ? normalizeUsage(parsed.usage) : { promptTokens: 0, completionTokens: 0 };
    return {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens ?? 0,
      reasoningTokens: usage.reasoningTokens ?? 0,
    };
  } catch {
    // 兑底：openai/anthropic 命名之外的形状（如 responses usage：input_tokens/output_tokens）直接读 obj.usage
    const u = obj?.usage as Record<string, unknown> | undefined;
    if (u) {
      return {
        promptTokens: Number(u.prompt_tokens ?? u.input_tokens ?? 0) || 0,
        completionTokens: Number(u.completion_tokens ?? u.output_tokens ?? 0) || 0,
        cachedTokens: 0,
        reasoningTokens: 0,
      };
    }
    return { promptTokens: 0, completionTokens: 0, cachedTokens: 0, reasoningTokens: 0 };
  }
}

/** 用量日汇总沉淀（WP-BE02）：成功调用统一走此入口，day=本地零点（与 free 周期口径一致） */
async function recordDailyStat(
  userId: string,
  model: string,
  usage: { promptTokens: number; completionTokens: number },
  quotaMinor: bigint,
  now: Date
): Promise<void> {
  await gatewayRepository
    .upsertDailyStat(prismaClient(), {
      day: periodStartOf("DAY", now),
      userId,
      model,
      quotaMinor,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
    })
    .catch(() => undefined); // 沉淀失败不阻断主链路（报表层可由明细重建）
}

// ==================== 调用编排（G.3.2）：渠道 → 路由链 → 预扣/捕获 → usage_log ====================

/** 站点上游格式：protocols 含 anthropic → Anthropic 客户端，否则 OpenAI（云服务站主流兼容缺省） */
export function upstreamFormatOfStation(protocols: string[] | null | undefined): GatewayFormat {
  return (protocols ?? []).some((p) => p.toLowerCase() === "anthropic") ? "anthropic" : "openai";
}

export type UsageBillingPathKey = "PLATFORM" | "UPSTREAM" | "PACKAGE" | "FREE_PROXY" | "FREE_QUOTA";

/** 成功调用元数据（响应体外暴露的计费/链路事实） */
export interface GatewayChatMeta {
  requestId: string;
  modelId: string | null;
  stationId: string | null;
  channelId: string | null;
  billingPath: UsageBillingPathKey;
  promptTokens: number;
  completionTokens: number;
  quotaMinor: bigint;
  latencyMs: number;
  statusCode: number;
}

export interface GatewayChatResult {
  /** 非流式：上游归一 JSON；流式透传：预构造 Response（SSE 字节流直通） */
  response: Record<string, unknown> | Response;
  meta: GatewayChatMeta;
}

/**
 * 流式透传计量器（规格 v0.2 §3）：边透传边从 SSE 字节流中提取尾帧 usage 与已产出字符量。
 * - OpenAI：data 帧含 usage（include_usage 末帧）/ delta.content 增量；
 * - Anthropic：message_start(message.usage.input_tokens) / content_block_delta(delta.text) /
 *   message_delta(usage.output_tokens 累计)；
 * - 解析容错与聚合版同口径：不可解析帧跳过（透传面字节保真，账面仅依赖尾帧 usage 与产出计量）。
 */
function createStreamMeter(format: GatewayFormat) {
  let text = "";
  let usage: {
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    reasoningTokens: number;
  } | null = null;
  let buffer = "";

  function absorbOpenAI(chunk: Record<string, unknown>): void {
    const choices = Array.isArray(chunk.choices) ? chunk.choices : [];
    const first = (choices[0] ?? {}) as { delta?: { content?: unknown } };
    if (typeof first.delta?.content === "string") text += first.delta.content;
    const u = chunk.usage as
      | {
          prompt_tokens?: unknown;
          completion_tokens?: unknown;
          prompt_tokens_details?: { cached_tokens?: unknown } | null;
          prompt_cache_hit_tokens?: unknown;
          completion_tokens_details?: { reasoning_tokens?: unknown } | null;
        }
      | undefined;
    if (u) {
      usage = {
        promptTokens: Number(u.prompt_tokens ?? 0),
        completionTokens: Number(u.completion_tokens ?? 0),
        cachedTokens: Number(u.prompt_tokens_details?.cached_tokens ?? u.prompt_cache_hit_tokens ?? 0),
        reasoningTokens: Number(u.completion_tokens_details?.reasoning_tokens ?? 0),
      };
    }
  }

  function absorbAnthropic(chunk: Record<string, unknown>): void {
    const type = chunk.type as string | undefined;
    const delta = chunk.delta as { text?: unknown; output_tokens?: unknown } | undefined;
    const message = chunk.message as
      | { usage?: { input_tokens?: unknown; output_tokens?: unknown; cache_read_input_tokens?: unknown } }
      | undefined;
    const usageRaw = chunk.usage as { output_tokens?: unknown; cache_read_input_tokens?: unknown } | undefined;
    if (type === "content_block_delta" && typeof delta?.text === "string") {
      text += delta.text;
    } else if (type === "message_start" && message?.usage) {
      usage = {
        promptTokens: Number(message.usage.input_tokens ?? 0),
        completionTokens: Number(message.usage.output_tokens ?? 0),
        cachedTokens: Number(message.usage.cache_read_input_tokens ?? 0),
        reasoningTokens: 0,
      };
    } else if (type === "message_delta" && usageRaw) {
      const prev = usage ?? { promptTokens: 0, completionTokens: 0, cachedTokens: 0, reasoningTokens: 0 };
      usage = {
        promptTokens: prev.promptTokens,
        completionTokens: Number(usageRaw.output_tokens ?? 0),
        cachedTokens: prev.cachedTokens || Number(usageRaw.cache_read_input_tokens ?? 0),
        reasoningTokens: prev.reasoningTokens,
      };
    }
  }

  /** 单行吸收（data: 帧解析 → OpenAI/Anthropic 分派）；push 与 settle flush 共用 */
  function absorbLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) return;
    const payload = trimmed.slice(6);
    if (payload === "[DONE]") return;
    try {
      const chunk = JSON.parse(payload) as Record<string, unknown>;
      if (format === "openai") absorbOpenAI(chunk);
      else absorbAnthropic(chunk);
    } catch {
      /* 不可解析帧跳过（透传保真；账面走尾帧/产出兜底） */
    }
  }

  return {
    /** 逐解码块吸收（SSE 行协议，半行留缓冲） */
    push(bytes: Uint8Array): void {
      buffer += new TextDecoder().decode(bytes, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        absorbLine(line);
      }
    },

    /** 读流结束（含断连）后取计量结果：先 flush 残留半行，usage 优先，缺失按已产出字符高估估算 */
    settle(): {
      promptTokens: number;
      completionTokens: number;
      cachedTokens: number;
      reasoningTokens: number;
      usageKnown: boolean;
    } {
      // flush：末片 data 帧（如尾帧 usage）可能不带 \n 滞留 buffer——漏解析即 usage 判 null
      // 走 ESTIMATED 虚高估算，与 callUpstreamAggregated 循环外 flush 同类缺陷，settle 前必补一次
      if (buffer.trim().startsWith("data: ")) {
        absorbLine(buffer.trim());
        buffer = "";
      }
      if (usage) return { ...usage, usageKnown: true };
      const wideTokens = text.length; // 已产出内容按 1 token/char 高估（与预扣加权口径同向）
      return { promptTokens: 0, completionTokens: wideTokens, cachedTokens: 0, reasoningTokens: 0, usageKnown: false };
    },
  };
}

/** 流式透传开关（L2-1 启用，规格 v0.2 §2）：默认启用 SSE 透传——
 * stream=true 时 PLATFORM 路径走 callUpstreamStream 直通客户端（首字节 CAPTURING，
 * 边透传边计量），而非 callUpstreamAggregated 服务端攒流归一 JSON。
 * 显式关闭：`AIDEAN_GATEWAY_STREAM_PASSTHROUGH=0`（聚合回退，调试/兼容场景）。
 * 测试经 process.env 注入覆盖。 */
export const PASSTHROUGH_ENABLED = process.env.AIDEAN_GATEWAY_STREAM_PASSTHROUGH !== "0";

interface PassthroughContext {
  userId: string;
  body: GatewayChat;
  clientFormat: GatewayFormat;
  upstreamFormat: GatewayFormat;
  requestId: string;
  holdKey: string;
  /** 本代计费路径（PLATFORM=预扣捕获；FREE_QUOTA/PACKAGE=免扣写用量） */
  billingPath: UsageBillingPathKey;
  /** 本代零扣费（免费额度/套餐/评估豁免/归一价为 0 的免费模型）：不预扣、不捕获 */
  chargeless?: boolean;
  /** 命中站点 id（usage_log 站点归因；仅平台路由链产生，渠道代理不进入透传） */
  stationId: string | null;
  cand: {
    modelId: string;
    freeCycle?: "DAY" | "WEEK" | "MONTH";
    /** 当期价（计费/估算兜底依据，即 RouteCandidateWithModel.model 的 prices 投影） */
    model: { maxOutputTokens: number | null; prices: { priceInput: unknown; priceOutput: unknown; billingCurrency: string; isFree?: boolean }[] };
  };
  rule: { markupRate: unknown; tokenMultiplier: unknown } | null;
  stream: Awaited<ReturnType<typeof callUpstreamStream>>;
  t0: number;
  now: Date;
}

/**
 * 流式透传编排（规格 v0.2 §3，R-S1/R-S2 关闭路径）：
 *  1) 请求模型不可免费候选时按预扣冻结（编排层已在 dispatch 前完成）；
 *  2) 首字节到达即 CAPTURING（`:stream-final` 幂等键标记本代为长窗口，TTL 懒清理跳过）；
 *  3) 边透传边计量（createStreamMeter：尾帧 usage / 已产出字符）；
 *  4) 流正常结束 → 终态化：usage 实扣（缺失按已产出估算），不足 1 分 void；
 *  5) 客户端断连（AbortError）→ 仍按已产出 capture（半截白嫖封死），不留 AUTHORIZED 孤儿。
 * usage_log 终态一条（isStream=true）；HTTP 响应头先行，账面异步终态化（对账面 finalize 兜底）。
 */
async function executeChatPassthrough(ctx: PassthroughContext): Promise<GatewayChatResult> {
  const { body, upstreamFormat, requestId, holdKey, billingPath, stationId, cand, rule, stream, t0, now } = ctx;
  const meter = createStreamMeter(upstreamFormat);
  // 首字节即置长窗口标记（`:stream-final` 独立 hold 请求 ID 承载窗口语义；
  // BalanceHold.status 枚举扩展属 prisma 域变更，二期随管理者流程落库后此处改写状态位。
  // 1 分兜底冻结在该标记 hold 终态化时全额 void，不动主账面）
  await billingService.hold(ctx.userId, `${holdKey}:stream-final`, 1n, now).catch(() => undefined);

  const headers: Record<string, string> = {
    "content-type": stream.contentType,
    "cache-control": "no-store",
    "x-request-id": requestId,
    "x-aidean-billing-path": billingPath,
    "x-aidean-model-id": cand.modelId,
    "x-aidean-stream": "passthrough",
  };

  // usage_log 占位行：requestId 幂等锚点（终态计量由 settle 经 finalizeStreamUsageLog 回填）
  await gatewayRepository.insertUsageLog(prismaClient(), {
    requestId,
    userId: ctx.userId,
    modelId: cand.modelId,
    stationId,
    channelId: null,
    model: body.model,
    promptTokens: 0,
    completionTokens: 0,
    quotaMinor: 0n,
    billingPath,
    latencyMs: Date.now() - t0,
    statusCode: stream.status,
    isStream: true,
    error: null,
  });

  const settle = async (aborted: boolean): Promise<void> => {
    const usage = meter.settle();
    let quotaMinor = 0n;
    if (billingPath === "PLATFORM" && !ctx.chargeless) {
      const price = cand.model.prices[0];
      if (price) {
        const markup = Number(rule?.markupRate ?? 1);
        const multiplier = Number(rule?.tokenMultiplier ?? 1);
        quotaMinor =
          calcCharge({
            pricePerMillionToken: Number(price.priceInput),
            tokens: usage.promptTokens,
            markupRate: markup,
            tokenMultiplier: multiplier,
          }) +
          calcCharge({
            pricePerMillionToken: Number(price.priceOutput),
            tokens: usage.completionTokens,
            markupRate: markup,
            tokenMultiplier: multiplier,
          });
      }
      if (quotaMinor > 0n) {
        await billingService.captureHold(holdKey, quotaMinor);
      } else {
        await billingService.voidHold(holdKey);
      }
    }
    if (billingPath === "FREE_QUOTA" && cand.freeCycle) {
      // FREE 候选按已产出 tokens 记账（聚合版口径一致，缺失 usage 时不虚增输入侧）
      await gatewayService.recordFreeUsage(
        ctx.userId,
        cand.modelId,
        cand.freeCycle,
        usage.promptTokens + usage.completionTokens,
        now
      );
    }
    // usage_log 终态回填（finalize 审计位：OK/ESTIMATED/ABORTED）+ 日汇总沉淀
    await gatewayRepository
      .finalizeStreamUsageLog(prismaClient(), {
        requestId,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        cachedTokens: usage.cachedTokens,
        reasoningTokens: usage.reasoningTokens,
        quotaMinor,
        aborted,
        usageKnown: usage.usageKnown,
      })
      .catch(() => undefined);
    await recordDailyStat(ctx.userId, body.model, usage, quotaMinor, now);
    // 长窗口标记 hold 全额解冻（1 分兜底冻结，不动主账面）
    await billingService.voidHold(`${holdKey}:stream-final`).catch(() => undefined);
  };

  const bodyStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const reader = stream.body.getReader();
      try {
        const { done, value } = await reader.read();
        if (done) {
          await settle(false);
          controller.close();
          return;
        }
        meter.push(value);
        controller.enqueue(value);
      } catch (err) {
        // 客户端断连 / 上游中断：仍终态化（已产出量 capture），不留孤儿 hold（规格红线 ③）
        await settle(true).catch(() => undefined);
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
    async cancel() {
      await settle(true).catch(() => undefined);
    },
  });

  return {
    response: new Response(bodyStream, { status: 200, headers }),
    meta: {
      requestId,
      modelId: cand.modelId,
      stationId: null,
      channelId: null,
      billingPath,
      promptTokens: 0,
      completionTokens: 0,
      quotaMinor: 0n,
      latencyMs: Date.now() - t0,
      statusCode: stream.status,
    },
  };
}

/**
 * 统一调用编排（G.3.2）：
 *  1) requestId 查重：已使用 → 40000（防重放重复计费；重试请换新幂等键）；
 *  2) stream=true → 聚合语义（callUpstreamAggregated 攒流，usage_log isStream=true；规格 v0.1）；
 *  3) 自定义渠道（isActive）优先：FREE_PROXY 不扣费，失败续平台路径；
 *  4) 路由链逐候选：站点（rating 序）× Key（加权挑选）；UPSTREAM 站实装（GW-KEY-01）：用户有有效自有 Key →
 *     直调上游、不扣平台余额、仍写 usage_logs（billingPath=UPSTREAM）；无 Key/失败 → 既有降级序续行；
 *     生效套餐覆盖站点 → PACKAGE 直连（免扣仍写用量）；
 *     PLATFORM 站高估预扣（40001 → 移除付费候选，free 兜底续行）→ 上游 2xx 按实捕获（0 消耗 void），
 *     失败 void + Key 失败计数，换 Key / 换站 / 换候选续降级；
 *  5) FREE 候选成功后额度记账（FREE_QUOTA）；
 *  6) 终态 usage_logs 一条（requestId 幂等 upsert 兜底并发双写）；全链失败 30003。
 *
 * 并发同 requestId 双写：hold 幂等（同 key 返回既有冻结）+ capture 幂等保证账面只扣一次；
 * 上游可能被调用两次（透传网关不做上游侧幂等），MVP 接受。
 */
export const gatewayOrchestrator = {
  async executeChat(
    userId: string,
    body: GatewayChat,
    requestId: string,
    now: Date = new Date(),
    opts?: { billingExempt?: boolean }
  ): Promise<GatewayChatResult> {
    // 流式透传（L2-1 启用，规格 v0.2）：stream=true 时默认走 SSE 透传——
    // FREE_PROXY 渠道与 PLATFORM 路径均经 callUpstreamStream 直通客户端（首字节即 CAPTURING，
    // 边透传边计量，流终态化 capture/void），客户端逐字增量渲染。
    // 透传开关 PASSTHROUGH_ENABLED 默认 true；显式 AIDEAN_GATEWAY_STREAM_PASSTHROUGH=0 可回退聚合模式
    // （callUpstreamAggregated 服务端攒流归一 JSON，客户端单次渲染——调试/兼容场景）。
    // UPSTREAM 分支（用户自有 Key）暂不支持流式，stream=true 跳过续降级。
    const existing = await gatewayRepository.getUsageLogByRequestId(prismaClient(), requestId);
    if (existing) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "requestId 已使用：请更换幂等键后重试");
    }
    const clientFormat = detectGatewayFormat(body);
    const startedAt = Date.now();
    let attemptSeq = 0;
    let lastError: string | undefined;
    let lastPath: UsageBillingPathKey | undefined;

    // ---- 3) 自定义渠道优先（FREE_PROXY：不扣余额，费用用户自理） ----
    // N4（丙）：模型匹配 + 优先级 + 加权分摊（解释 A：单请求单渠道，失败级联）。
    // 仅「适配请求模型」的渠道进入候选（models 空=适配全部，向后兼容）；同级按 weight 加权抽签，
    // 失败后剔除该渠道在同优先级内重抽，再降优先级，耗尽后走平台路由链。
    const channels = await gatewayRepository.listCustomChannels(prismaClient(), userId, true);
    const modelCandidates = channels
      .filter((ch) => channelServesModel(body.model, ch.models))
      .map((ch) => ({ id: ch.id, priority: ch.priority, weight: ch.weight }));
    const failedChannelIds: string[] = [];
    while (modelCandidates.length > 0) {
      const chosen = pickChannel(modelCandidates, { excludeIds: failedChannelIds });
      if (!chosen) break;
      const ch = channels.find((c) => c.id === chosen.id)!;
      const t0 = Date.now();
      try {
        const upstreamFormat: GatewayFormat = channelEnumToGatewayFormat(ch.format);
        // L2-1：FREE_PROXY 渠道流式透传——stream=true 且透传开关开启时走 callUpstreamStream
        // 直通客户端（SSE 字节保真），复用 executeChatPassthrough 终态化计量（FREE_PROXY 路径
        // quotaMinor 恒 0，仅写 usage_log isStream=true + 日汇总）
        if (body.stream === true && PASSTHROUGH_ENABLED && isPassthroughSafe(clientFormat, upstreamFormat)) {
          const stream = await callUpstreamStream({
            baseUrl: ch.baseUrl,
            apiKey: decryptSecret(ch.keyCipher),
            format: upstreamFormat,
            body: toUpstreamBody(clientFormat, upstreamFormat, body),
          });
          return await executeChatPassthrough({
            userId,
            body,
            clientFormat,
            upstreamFormat,
            requestId,
            holdKey: `${GATEWAY_IDEMPOTENCY_PREFIX}${requestId}:ch${ch.id}`,
            billingPath: "FREE_PROXY",
            stationId: null,
            cand: { modelId: "", model: { maxOutputTokens: null, prices: [] } },
            rule: null,
            stream,
            t0,
            now,
          });
        }
        // 跨格式流式（如 gemini/openai-responses 上游 + openai/anthropic 客户端）：SSE 字节不兼容透传，
        // 改走聚合（服务端攒流为上游原生 JSON，再经 toClientResponse 按 upstreamFormat 回转客户端）。
        const aggregateCross = body.stream === true && PASSTHROUGH_ENABLED && !isPassthroughSafe(clientFormat, upstreamFormat);
        const res = aggregateCross
          ? await callUpstreamAggregated({
              baseUrl: ch.baseUrl,
              apiKey: decryptSecret(ch.keyCipher),
              format: upstreamFormat,
              body: toUpstreamBody(clientFormat, upstreamFormat, body),
            })
          : await callUpstream({
              baseUrl: ch.baseUrl,
              apiKey: decryptSecret(ch.keyCipher),
              format: upstreamFormat,
              body: toUpstreamBody(clientFormat, upstreamFormat, body),
            });
        const usage = parseUpstreamUsage(res.json);
        await gatewayRepository.insertUsageLog(prismaClient(), {
          requestId,
          userId,
          modelId: null,
          stationId: null,
          channelId: ch.id,
          model: body.model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          cachedTokens: usage.cachedTokens,
          reasoningTokens: usage.reasoningTokens,
          quotaMinor: 0n,
          billingPath: "FREE_PROXY",
          latencyMs: Date.now() - t0,
          statusCode: res.status,
          isStream: false,
          error: null,
        });
        await recordDailyStat(userId, body.model, usage, 0n, now);
        return {
          response: toClientResponse(clientFormat, upstreamFormat, res.json),
          meta: {
            requestId,
            modelId: null,
            stationId: null,
            channelId: ch.id,
            billingPath: "FREE_PROXY",
            ...usage,
            quotaMinor: 0n,
            latencyMs: Date.now() - t0,
            statusCode: res.status,
          },
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        lastPath = "FREE_PROXY";
        failedChannelIds.push(ch.id);
      }
    }

    // ---- 4) 路由链逐候选 ----
    const { chain } = await gatewayService.resolveRouteChain(userId, body.model, now);
    // WP-BE02 五态：读取用户生效套餐覆盖面（ACTIVE 且未过期；stationId=null 平台通用套餐覆盖全部站点）
    const packages = await gatewayRepository.listActivePackageStations(prismaClient(), userId, now);
    let skipPaid = false; // 40001 后移除付费候选，free 兜底继续

    for (let ci = 0; ci < chain.length; ci++) {
      const cand = chain[ci];
      const isFree = cand.source === "FREE";
      if (skipPaid && !isFree) continue;

      const stations = await gatewayRepository.listCallableStations(prismaClient(), cand.model.nameDisplay);
      for (let si = 0; si < stations.length; si++) {
        if (skipPaid && !isFree) break;
        const station = stations[si];
        const rule = await gatewayRepository.getBillingRule(prismaClient(), station.id);
        // GW-KEY-01 P4：UPSTREAM 模式 = 用户自有 Key 上游计费（需求 §3.6，原 MVP 跳过已实装）。
        // 命中：解密自有 Key 直调上游（复用超时/30004 归一），不 hold/capture（不扣平台余额），
        // 写 usage_logs（billingPath=UPSTREAM）+ 日汇总；失败/无 Key → lastError/lastPath 记录后
        // continue，按既有"换站→降级"序续行，全链败仍 30003。
        // 流式：UPSTREAM 分支（用户自有 Key）暂不支持流式透传——自有 Key 的 SSE 直通涉及
        // 透传计量与 Key 失败计数的交互复杂度，stream=true 跳过本候选续降级（L2-1 已为
        // FREE_PROXY + PLATFORM 路径启用流式；UPSTREAM 流式属三期）。
        if (rule?.billingMode === "UPSTREAM") {
          if (body.stream === true) {
            lastError = "UPSTREAM 站暂不支持流式直连（二期），已跳过该候选";
            lastPath = "UPSTREAM";
            continue;
          }
          const userKey = await gatewayRepository.findActiveStationUserKey(prismaClient(), userId, station.id);
          if (userKey) {
            const t0 = Date.now();
            const upstreamFormat = upstreamFormatOfStation(station.protocols);
            try {
              const res = await callUpstream({
                baseUrl: station.baseUrl as string,
                apiKey: decryptSecret(userKey.keyCipher),
                format: upstreamFormat,
                body: toUpstreamBody(clientFormat, upstreamFormat, body),
                policy: { allowPrivate: true }, // 站点系管理端/seed 可信录入（含 e2e mock 回环站）
              });
              const usage = parseUpstreamUsage(res.json);
              await gatewayRepository.insertUsageLog(prismaClient(), {
                requestId,
                userId,
                modelId: cand.modelId,
                stationId: station.id,
                channelId: null,
                model: body.model,
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                cachedTokens: usage.cachedTokens,
                reasoningTokens: usage.reasoningTokens,
                quotaMinor: 0n,
                billingPath: "UPSTREAM",
                latencyMs: Date.now() - t0,
                statusCode: res.status,
                isStream: false,
                error: null,
              });
              await recordDailyStat(userId, body.model, usage, 0n, now);
              return {
                response: toClientResponse(clientFormat, upstreamFormat, res.json),
                meta: {
                  requestId,
                  modelId: cand.modelId,
                  stationId: station.id,
                  channelId: null,
                  billingPath: "UPSTREAM",
                  ...usage,
                  quotaMinor: 0n,
                  latencyMs: Date.now() - t0,
                  statusCode: res.status,
                },
              };
            } catch (err) {
              // 用户自有 Key 无平台 Key 池冷却机制（不 markKeyFailure）；记失败后按既有降级序续行
              lastError = err instanceof Error ? err.message : String(err);
              lastPath = "UPSTREAM";
            }
          }
          continue; // 无有效自有 Key / 调用失败 → 既有"换站→降级"序续行
        }

        // WP-BE02 五态：生效套餐覆盖本站（或平台通用套餐）→ PACKAGE 直连，免扣仍写用量
        const isPackage = !isFree && (packages.platformWide || packages.stations.includes(station.id));
        const billingPath: UsageBillingPathKey = isFree ? "FREE_QUOTA" : isPackage ? "PACKAGE" : "PLATFORM";
        // billingExempt（#26 仲裁定论 2026-09-17）：评估域调用网关时自身已 hold/capture
        // eval:<id> 总额（¥2/模型 × N），网关 PLATFORM 路径不再 hold/capture——用户只见一笔
        // 评估费，需求 §3.3「对比测评按次从余额扣费（¥2/模型/次）」的产品语义由评估域独占落地。
        // usage_log 仍写（可观测性：tokens/station/latency 归因），quotaMinor 恒 0。
        // TASK-048：PLATFORM 计费只认归一后的生效价（CNY / 每百万 Token）。
        //   无价或不可归一（未知币种/单位、跨币种缺当日汇率）→ skip-candidate（R9-01：绝不按 0 放行），降级链续行；
        //   归一价输入输出均为 0 → 免费模型（U-23）：跳过余额校验与预扣，零扣费仍写用量。
        const effPrice = cand.model.prices[0];
        const priceFree = effPrice?.isFree === true;
        const chargeless = isFree || isPackage || opts?.billingExempt === true || priceFree;
        if (!chargeless && !effPrice) {
          lastError = "price_unavailable";
          lastPath = billingPath;
          break;
        }

        const triedAt = new Date();
        const keys = await gatewayRepository.listAvailableKeys(prismaClient(), station.id, triedAt);
        let remaining = keys;
        while (remaining.length > 0) {
          const key = pickKeyWeighted(remaining);
          if (!key) break;
          const t0 = Date.now();
          const upstreamFormat = upstreamFormatOfStation(station.protocols);
          const holdKey = `${GATEWAY_IDEMPOTENCY_PREFIX}${requestId}:a${attemptSeq++}`;

          let holdPlaced = false;
          if (!chargeless) {
            const estimate = estimatePrepayMinor(cand.model, body, rule);
            try {
              await billingService.hold(userId, holdKey, estimate === 0n ? 1n : estimate, triedAt);
              holdPlaced = true;
            } catch (err) {
              if (err instanceof ApiError && err.code === ERROR_CODES.INSUFFICIENT_BALANCE) {
                skipPaid = true;
                break;
              }
              throw err;
            }
          }

          try {
            // 流式分派（规格 v0.1 聚合 MVP / v0.2 二期透传）：
            // stream=true → callUpstreamStream 直通客户端（首字节 CAPTURING，流终态化）；
            // 聚合路径保留为 passthroughEnabled=false 的回退开关（渠道/站点兼容性收敛后默认切换）。
            const aggregate = body.stream === true && !PASSTHROUGH_ENABLED;
            const passthrough = body.stream === true && PASSTHROUGH_ENABLED;
            if (passthrough) {
              const stream = await callUpstreamStream({
                baseUrl: station.baseUrl as string,
                apiKey: key.keyValue,
                format: upstreamFormat,
                body: toUpstreamBody(clientFormat, upstreamFormat, body),
                policy: { allowPrivate: true }, // 站点系管理端/seed 可信录入
              });
              return await executeChatPassthrough({
                userId,
                body,
                clientFormat,
                upstreamFormat,
                requestId,
                holdKey,
                billingPath,
                chargeless,
                stationId: station.id,
                cand,
                rule,
                stream,
                t0,
                now,
              });
            }
            const res = aggregate
              ? await callUpstreamAggregated({
                  baseUrl: station.baseUrl as string,
                  apiKey: key.keyValue,
                  format: upstreamFormat,
                  body: toUpstreamBody(clientFormat, upstreamFormat, body),
                  policy: { allowPrivate: true }, // 站点系管理端/seed 可信录入
                })
              : await callUpstream({
                  baseUrl: station.baseUrl as string,
                  apiKey: key.keyValue,
                  format: upstreamFormat,
                  body: toUpstreamBody(clientFormat, upstreamFormat, body),
                  policy: { allowPrivate: true }, // 站点系管理端/seed 可信录入
                });
            // 尾帧 usage 缺失（规格 §2.3.1.1）→ 按估算 tokens 保守记账，防流式系统性漏记
            const usage =
              res.json && typeof res.json === "object" && "usage" in res.json
                ? parseUpstreamUsage(res.json)
                : {
                    promptTokens: estimateStreamPromptTokens(body),
                    completionTokens: estimateStreamCompletionTokens(cand.model, body),
                    cachedTokens: 0,
                    reasoningTokens: 0,
                  };

            // 计费捕获：PLATFORM 按实 tokens × (单价 × 加价率 × 倍率)；FREE_QUOTA/billingExempt 零扣费
            let quotaMinor = 0n;
            if (billingPath === "PLATFORM" && !chargeless) {
              const price = cand.model.prices[0];
              if (price) {
                const markup = Number(rule?.markupRate ?? 1);
                const multiplier = Number(rule?.tokenMultiplier ?? 1);
                quotaMinor =
                  calcCharge({
                    pricePerMillionToken: Number(price.priceInput),
                    tokens: usage.promptTokens,
                    markupRate: markup,
                    tokenMultiplier: multiplier,
                  }) +
                  calcCharge({
                    pricePerMillionToken: Number(price.priceOutput),
                    tokens: usage.completionTokens,
                    markupRate: markup,
                    tokenMultiplier: multiplier,
                  });
              }
              if (quotaMinor > 0n) {
                await billingService.captureHold(holdKey, quotaMinor);
              } else {
                await billingService.voidHold(holdKey); // 零消耗：全额解冻，无流水
              }
            }

            await gatewayRepository.markKeySuccess(prismaClient(), key.id);
            if (isFree && cand.freeCycle) {
              await gatewayService.recordFreeUsage(
                userId,
                cand.modelId,
                cand.freeCycle,
                usage.promptTokens + usage.completionTokens,
                now
              );
            }

            await gatewayRepository.insertUsageLog(prismaClient(), {
              requestId,
              userId,
              modelId: cand.modelId,
              stationId: station.id,
              channelId: null,
              model: body.model,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              cachedTokens: usage.cachedTokens,
              reasoningTokens: usage.reasoningTokens,
              quotaMinor,
              billingPath,
              latencyMs: Date.now() - t0,
              statusCode: res.status,
              isStream: aggregate,
              error: null,
            });
            await recordDailyStat(userId, body.model, usage, quotaMinor, now);
            return {
              response: toClientResponse(clientFormat, upstreamFormat, res.json),
              meta: {
                requestId,
                modelId: cand.modelId,
                stationId: station.id,
                channelId: null,
                billingPath,
                ...usage,
                quotaMinor,
                latencyMs: Date.now() - t0,
                statusCode: res.status,
              },
            };
          } catch (err) {
            // 失败处置：释放预扣 + Key 失败计数 + 续降级
            if (holdPlaced) {
              try {
                await billingService.voidHold(holdKey);
              } catch {
                /* 释放失败不掩盖原始错误 */
              }
            }
            if (err instanceof ApiError && err.code === ERROR_CODES.UPSTREAM_ERROR) {
              await gatewayRepository.markKeyFailure(prismaClient(), key.id, triedAt);
              lastError = err.message;
              lastPath = billingPath;
              continue; // 换下一 Key
            }
            throw err; // 非上游错误（账本/编程异常）直接上抛
          } finally {
            remaining = remaining.filter((k: { id: string }) => k.id !== key.id);
          }
        }
      }
    }

    // ---- 5) 全链失败 30003 ----
    const message = lastError ?? "无可用路由";
    const path: UsageBillingPathKey = lastPath ?? "PLATFORM";
    await gatewayRepository.insertUsageLog(prismaClient(), {
      requestId,
      userId,
      modelId: chain[0]?.modelId ?? null,
      stationId: null,
      channelId: null,
      model: body.model,
      promptTokens: 0,
      completionTokens: 0,
      quotaMinor: 0n,
      billingPath: path,
      latencyMs: Date.now() - startedAt,
      statusCode: null,
      isStream: false,
      error: message,
    });
    throw new ApiError(ERROR_CODES.GATEWAY_ALL_FAILED, `网关全部候选失败: ${message}`);
  },
};

/** repository 调用统一传入单例（默认参数已是 prisma，这里显式传入以保持依赖可见性） */
function prismaClient() {
  return prisma;
}

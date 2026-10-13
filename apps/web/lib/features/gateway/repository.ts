import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { gatewayFormatToChannelEnum, KEY_COOLDOWN_MINUTES, KEY_FAILURE_THRESHOLD, type GatewayFormat } from "@aidean/shared";

/**
 * gateway 网关域 repository（Task G.2.1）：网关域全部数据访问。
 * 纯查询/写入组装，不承载路由与计费决策（service 职责）；
 * 金额口径沿用 billing（BigInt 分），周期起点口径沿用 user（本地零点）。
 */

export type GatewayClient = PrismaClient;

export interface RouteConfigRow {
  tierMappings: { tierLevel: "OPUS" | "SONNET" | "FABLE" | "HAIKU"; modelId: string }[];
  priorities: { modelId: string; priority: number; enabled: boolean }[];
  free: { modelId: string; quotaTokens: number; refreshCycle: "DAY" | "WEEK" | "MONTH" }[];
}

export const gatewayRepository = {
  /** 用户账户等级（free 配额按账户等级取系统定义行） */
  async getAccountTier(client: GatewayClient = prisma, userId: string): Promise<"NORMAL" | "PRO" | "MAX"> {
    const user = await client.user.findUnique({ where: { id: userId }, select: { tier: true } });
    if (!user) throw new Error(`用户不存在:${userId}`);
    return user.tier as "NORMAL" | "PRO" | "MAX";
  },

  /** 路由配置三读：等级映射 / 优先级 / free 配额（按账户等级） */
  async loadRouteConfig(client: GatewayClient = prisma, userId: string): Promise<RouteConfigRow> {
    const [tierMappings, priorities, tier] = await Promise.all([
      client.userTierMapping.findMany({
        where: { userId },
        select: { tierLevel: true, modelId: true },
      }),
      client.userModelPriority.findMany({
        where: { userId },
        select: { modelId: true, priority: true, enabled: true },
      }),
      client.user.findUnique({ where: { id: userId }, select: { tier: true } }),
    ]);
    const free = await client.userFreeQuota.findMany({
      where: { tier: tier?.tier ?? "NORMAL" },
      select: { modelId: true, quotaTokens: true, refreshCycle: true },
    });
    return {
      tierMappings: tierMappings.map((t: { tierLevel: string; modelId: string }) => ({ tierLevel: t.tierLevel as RouteConfigRow["tierMappings"][number]["tierLevel"], modelId: t.modelId })),
      priorities: priorities.map((p: { modelId: string; priority: number; enabled: boolean }) => ({ modelId: p.modelId, priority: p.priority, enabled: p.enabled })),
      free: free.map((f: { modelId: string; quotaTokens: number; refreshCycle: string }) => ({
        modelId: f.modelId,
        quotaTokens: f.quotaTokens,
        refreshCycle: f.refreshCycle as RouteConfigRow["free"][number]["refreshCycle"],
      })),
    };
  },

  /** 当期 free 用量（periodStart 为该周期起点；无行视为 0） */
  async getQuotaUsed(client: GatewayClient = prisma, userId: string, modelId: string, periodStart: Date): Promise<number> {
    const row = await client.userQuotaUsage.findUnique({
      where: { userId_modelId_periodStart: { userId, modelId, periodStart } },
      select: { used: true },
    });
    return row?.used ?? 0;
  },

  /** 当期 free 用量原子累加（无行则建；唯一键兜底并发首建） */
  async addQuotaUsed(
    client: GatewayClient = prisma,
    userId: string,
    modelId: string,
    periodStart: Date,
    tokensDelta: number
  ): Promise<void> {
    await client.userQuotaUsage.upsert({
      where: { userId_modelId_periodStart: { userId, modelId, periodStart } },
      create: { userId, modelId, periodStart, used: tokensDelta },
      update: { used: { increment: tokensDelta } },
    });
  },

  /** 入口 model 串解析：modelCode 唯一或 slug；取当前价（计费/预扣依据） */
  async findModelByCode(client: GatewayClient = prisma, code: string) {
    return client.aiModel.findFirst({
      where: { OR: [{ modelCode: code }, { slug: code }], deletedAt: null, status: "ACTIVE", isActive: true },
      select: {
        id: true,
        modelCode: true,
        nameDisplay: true,
        maxOutputTokens: true,
        prices: {
          where: { isCurrent: true },
          take: 1,
          orderBy: { effectiveFrom: "desc" },
          select: { priceInput: true, priceOutput: true, billingCurrency: true },
        },
      },
    });
  },

  /** 批量按 id 取模型（路由链候选解析，保持入参顺序） */
  async findModelsByIds(client: GatewayClient = prisma, ids: string[]) {
    if (ids.length === 0) return new Map<string, Awaited<ReturnType<typeof gatewayRepository.findModelByCode>>>();
    const rows = await client.aiModel.findMany({
      where: { id: { in: ids }, deletedAt: null, status: "ACTIVE", isActive: true },
      select: {
        id: true,
        modelCode: true,
        nameDisplay: true,
        maxOutputTokens: true,
        prices: {
          where: { isCurrent: true },
          take: 1,
          orderBy: { effectiveFrom: "desc" },
          select: { priceInput: true, priceOutput: true, billingCurrency: true },
        },
      },
    });
    return new Map(rows.map((r) => [r.id, r]));
  },

  /** 服务某模型且可直连调用的站点（baseUrl 非空；rating 降序） */
  async listCallableStations(client: GatewayClient = prisma, modelNameDisplay: string) {
    return client.aPIStation.findMany({
      where: { deletedAt: null, baseUrl: { not: null }, models: { has: modelNameDisplay } },
      orderBy: { rating: "desc" },
      select: { id: true, name: true, displayName: true, baseUrl: true, protocols: true },
    });
  },

  /** 站点计费规则（每站一条；缺省视为 PLATFORM/1.0/1.0 由 service 兜底） */
  async getBillingRule(client: GatewayClient = prisma, stationId: string) {
    return client.stationBillingRule.findUnique({ where: { stationId } });
  },

  /**
   * 用户生效套餐覆盖面（WP-BE02 PACKAGE 直连）：ACTIVE 且未过期的套餐订单 → Package.stationId；
   * stationId=null（平台通用套餐）覆盖全部站点。返回站点 id 集合与平台通用标记。
   */
  async listActivePackageStations(client: GatewayClient = prisma, userId: string, now: Date) {
    const orders = await client.packageOrder.findMany({
      where: {
        userId,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { package: { select: { stationId: true } } },
    });
    let platformWide = false;
    const stations = new Set<string>();
    for (const o of orders) {
      const sid = o.package?.stationId ?? null;
      if (sid === null) platformWide = true;
      else stations.add(sid);
    }
    return { stations: Array.from(stations), platformWide };
  },

  /**
   * 可用 Key：ACTIVE，或冷却到期的 COOLDOWN（到期自动恢复参与分流，WP-BE02 验收③）；
   * DISABLED 永不参与；未到期 COOLDOWN（cooldownUntil > now）排除。
   */
  async listAvailableKeys(client: GatewayClient = prisma, stationId: string, now: Date) {
    return client.stationKey.findMany({
      where: {
        stationId,
        status: { in: ["ACTIVE", "COOLDOWN"] },
        OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }],
      },
    });
  },

  /** Key 失败计数；达阈值转 COOLDOWN 并设冷却期 */
  async markKeyFailure(client: GatewayClient = prisma, keyId: string, now: Date = new Date()): Promise<void> {
    const row = await client.stationKey.update({
      where: { id: keyId },
      data: { failureCount: { increment: 1 } },
      select: { failureCount: true },
    });
    if (row.failureCount >= KEY_FAILURE_THRESHOLD) {
      const until = new Date(now.getTime() + KEY_COOLDOWN_MINUTES * 60_000);
      await client.stationKey.update({
        where: { id: keyId },
        data: { status: "COOLDOWN", cooldownUntil: until },
      });
    }
  },

  /** Key 调用成功：清零失败计数；冷却恢复后的首次成功复位 ACTIVE 并清冷却（摘除/恢复闭环） */
  async markKeySuccess(client: GatewayClient = prisma, keyId: string): Promise<void> {
    await client.stationKey.update({
      where: { id: keyId },
      data: { failureCount: 0, lastUsedAt: new Date(), status: "ACTIVE", cooldownUntil: null },
    });
  },

  // ==================== 自定义渠道（FREE_PROXY 供给） ====================

  async listCustomChannels(client: GatewayClient = prisma, userId: string, onlyActive = false) {
    return client.customChannel.findMany({
      where: { userId, ...(onlyActive ? { isActive: true } : {}) },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  },

  async findCustomChannel(client: GatewayClient = prisma, userId: string, id: string) {
    return client.customChannel.findFirst({ where: { id, userId } });
  },

  async upsertCustomChannel(
    client: GatewayClient = prisma,
    userId: string,
    data: {
      name: string;
      baseUrl: string;
      keyCipher: string;
      keyMasked: string;
      format: GatewayFormat;
      models?: string[];
      priority?: number;
      groupName?: string | null;
      weight?: number;
    },
    id?: string
  ) {
    const payload = {
      ...data,
      format: gatewayFormatToChannelEnum(data.format),
    };
    if (id) {
      return client.customChannel.update({ where: { id, userId }, data: payload });
    }
    return client.customChannel.create({ data: { ...payload, userId } });
  },

  async deleteCustomChannel(client: GatewayClient = prisma, userId: string, id: string): Promise<number> {
    const res = await client.customChannel.deleteMany({ where: { id, userId } });
    return res.count;
  },

  /**
   * 渠道部分更新（PATCH）：仅改传入字段；apiKey 留空则不动 keyCipher/keyMasked（改名/改 URL/启停免重填密钥）。
   * 返回更新前校验由 service 层做（归属）；未命中行由 Prisma 抛 P2025 → service 归 40000。
   */
  async patchCustomChannel(
    client: GatewayClient = prisma,
    userId: string,
    id: string,
    data: Partial<{
      name: string;
      baseUrl: string;
      format: GatewayFormat;
      isActive: boolean;
      keyCipher: string;
      keyMasked: string;
      models?: string[];
      priority?: number;
      groupName?: string | null;
      weight?: number;
    }>
  ) {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.baseUrl !== undefined) payload.baseUrl = data.baseUrl;
    if (data.format !== undefined) payload.format = gatewayFormatToChannelEnum(data.format);
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    if (data.keyCipher !== undefined) payload.keyCipher = data.keyCipher;
    if (data.keyMasked !== undefined) payload.keyMasked = data.keyMasked;
    if (data.models !== undefined) payload.models = data.models;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.groupName !== undefined) payload.groupName = data.groupName;
    if (data.weight !== undefined) payload.weight = data.weight;
    return client.customChannel.update({ where: { id, userId }, data: payload });
  },

  // ==================== StationUserKey（GW-KEY-01 P4：UPSTREAM 计费路径） ====================

  /** 用户在该站的有效自有 Key（UPSTREAM 候选凭据）；返回密文行，由编排层在调上游前解密 */
  async findActiveStationUserKey(client: GatewayClient = prisma, userId: string, stationId: string) {
    return client.stationUserKey.findFirst({
      where: { userId, stationId, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
  },

  // ==================== usage_logs ====================

  /** requestId 查重（executeChat 幂等入口：已使用即拒绝，防重放重复计费） */
  async getUsageLogByRequestId(client: GatewayClient = prisma, requestId: string) {
    return client.usageLog.findUnique({ where: { requestId }, select: { id: true, requestId: true } });
  },

  /** 幂等落库：requestId 冲突时返回已有行（不重复计费痕迹） */
  async insertUsageLog(
    client: GatewayClient = prisma,
    data: {
      requestId: string;
      userId: string;
      modelId: string | null;
      stationId: string | null;
      channelId: string | null;
      model: string;
      promptTokens: number;
      completionTokens: number;
      cachedTokens?: number;
      reasoningTokens?: number;
      quotaMinor: bigint;
      billingPath: "PLATFORM" | "UPSTREAM" | "PACKAGE" | "FREE_PROXY" | "FREE_QUOTA";
      latencyMs: number | null;
      statusCode: number | null;
      isStream: boolean;
      error: string | null;
    }
  ) {
    return client.usageLog.upsert({
      where: { requestId: data.requestId },
      create: {
        ...data,
        cachedTokens: data.cachedTokens ?? 0,
        reasoningTokens: data.reasoningTokens ?? 0,
      },
      update: {},
    });
  },

  /**
   * 用量日汇总沉淀（WP-BE02）：usage_log 成功落库后同步累加当日聚合行。
   * 唯一键 (day, userId, model)；幂等累加（requestCount+1 / 各量 increment）。
   * day 口径与 free 额度周期一致（本地零点）。
   */
  async upsertDailyStat(
    client: GatewayClient = prisma,
    input: {
      day: Date;
      userId: string;
      model: string;
      quotaMinor: bigint;
      promptTokens: number;
      completionTokens: number;
    }
  ): Promise<void> {
    await client.usageDailyStat.upsert({
      where: { day_userId_model: { day: input.day, userId: input.userId, model: input.model } },
      create: {
        day: input.day,
        userId: input.userId,
        model: input.model,
        requestCount: 1,
        quotaMinor: input.quotaMinor,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
      },
      update: {
        requestCount: { increment: 1 },
        quotaMinor: { increment: input.quotaMinor },
        promptTokens: { increment: input.promptTokens },
        completionTokens: { increment: input.completionTokens },
      },
    });
  },

  /**
   * 流式透传终态化（规格 v0.2 §4）：流结束时回填计量结果与元数据。
   * 幂等锚点仍为 requestId（唯一）；finalize 状态写入 metadata JSON
   * （UsageLog 表无独立列，避免 schema 变更：'OK'=实扣 / 'ESTIMATED'=估算兜底 / 'ABORTED'=断连按已产出）。
   */
  async finalizeStreamUsageLog(
    client: GatewayClient = prisma,
    input: {
      requestId: string;
      promptTokens: number;
      completionTokens: number;
      cachedTokens: number;
      reasoningTokens: number;
      quotaMinor: bigint;
      aborted: boolean;
      usageKnown: boolean;
    }
  ): Promise<void> {
    const finalize = input.aborted ? "ABORTED" : input.usageKnown ? "OK" : "ESTIMATED";
    await client.usageLog.update({
      where: { requestId: input.requestId },
      data: {
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        cachedTokens: input.cachedTokens,
        reasoningTokens: input.reasoningTokens,
        quotaMinor: input.quotaMinor,
        metadata: { finalize },
      },
    });
  },

  /** 本人用量分页（时间倒序） */
  async listUsageLogs(
    client: GatewayClient = prisma,
    userId: string,
    input: { skip: number; take: number; model?: string; billingPath?: string }
  ) {
    const where = {
      userId,
      ...(input.model ? { model: input.model } : {}),
      ...(input.billingPath ? { billingPath: input.billingPath as never } : {}),
    };
    const [rows, total] = await Promise.all([
      client.usageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: input.skip,
        take: input.take,
        include: { station: { select: { name: true, displayName: true } } },
      }),
      client.usageLog.count({ where }),
    ]);
    return { rows, total };
  },

  /**
   * 日汇总读侧（WF-21 / AT-21.2，P5 报表）：
   * 只查 usage_daily_stats（命中 @@index([userId, day])），区间 [from, to] 闭集，
   * 禁止回扫 usage_logs 明细大表（schema 注记：聚合查询走 usage_daily_stats）。
   */
  async listDailyStats(
    client: GatewayClient = prisma,
    userId: string,
    input: { from: Date; to: Date }
  ) {
    return client.usageDailyStat.findMany({
      where: { userId, day: { gte: input.from, lte: input.to } },
      orderBy: { day: "asc" },
    });
  },

  /**
   * 消耗多维明细（问题 4：渠道×模型×计费路径）：usage_logs 有界 groupBy（[userId,createdAt] 索引 + from/to 收敛）。
   * 日汇总表无 station/channel/billingPath 维，故只能走明细；区间由上层硬上限（≤92 天）保证有界。
   * 原始 group 行返回，来源名解析（stationId→displayName / channelId→channel.name）在 service 完成。
   */
  async groupUsageBySource(
    client: GatewayClient = prisma,
    userId: string,
    input: { from: Date; to: Date }
  ): Promise<
    Array<{
      stationId: string | null;
      channelId: string | null;
      model: string;
      billingPath: string;
      _count: number;
      _sum: { promptTokens: number | null; completionTokens: number | null; quotaMinor: bigint };
    }>
  > {
    return client.usageLog.groupBy({
      by: ["stationId", "channelId", "model", "billingPath"],
      where: { userId, createdAt: { gte: input.from, lte: input.to } },
      _count: true,
      _sum: { promptTokens: true, completionTokens: true, quotaMinor: true },
    }) as never;
  },

  /** 批量取站点展示名（id→displayName/name）；用于 breakdown 来源解析 */
  async findStationNamesByIds(client: GatewayClient = prisma, ids: string[]) {
    if (ids.length === 0) return new Map<string, string>();
    const rows = await client.aPIStation.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, displayName: true },
    });
    return new Map(rows.map((r) => [r.id, r.displayName ?? r.name]));
  },

  /** 批量取自定义渠道名（id→name，限本人，防越权泄露他人渠道名） */
  async findChannelNamesByIds(client: GatewayClient = prisma, userId: string, ids: string[]) {
    if (ids.length === 0) return new Map<string, string>();
    const rows = await client.customChannel.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  },
} as const;

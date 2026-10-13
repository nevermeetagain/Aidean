/**
 * API 渠道聚合（乙 · 后端统一）。
 *
 * 背景：此前「API 渠道」面板靠前端本地拼装 `/user/station-keys`（自有 Key）与 `/user/custom-channels`
 * （自定义渠道）两路请求，字段口径、权限边界重复实现，加载时序耦合。
 * 本模块把两类渠道合并为**单一后端契约** `/api/v1/user/channels`，前端一次请求即可渲染。
 *
 * 设计原则：
 * - **数据库为唯一事实源**：不合成 `catalog:<code>` 伪行（未落库的平台在渠道列表不出现）；
 *   用户在选择目录项后经 POST 落库，列表自然出现，读侧零逻辑。
 * - **数据隔离**：`requireUserApi` + `where: { userId }` 双保险，仅本人可见。
 * - **UPSTREAM 口径**：station 行仅取「未软删 + 计费模式 UPSTREAM」的站点（与
 *   `listUpstreamStations` 同过滤），避免后台改计费模式或软删站点后，历史自有 Key 仍作为脏渠道外漏。
 * - **脱敏**：`apiKeyMasked` 为 `key_mask` 冗余列，明文/密文永不出 service 层。
 * - **形状统一**：station 行无 `priority/groupName/weight`（可选字段缺省不返回）；
 *   custom 行无 `stationId`。前端按 `kind` 分派渲染，不做类型推断。
 * - **排序**：custom 按 `priority asc, createdAt asc`（与 FREE_PROXY 分发口径一致）；
 *   station 按 `createdAt desc`；结果 **custom 在前、station 在后**（面板分组语义）。
 */
import { prisma } from "../../db/prisma";
import { channelEnumToGatewayFormat, type GatewayFormat } from "@aidean/shared";

/** 渠道来源类别（前端按此分派渲染分支） */
export type ApiChannelKind = "station" | "custom";

/** 协议接入体裁（与上游协议单一真源 GATEWAY_FORMATS 对齐，四值） */
export type ApiChannelFormat = GatewayFormat;

/** API 渠道聚合视图（脱敏，永不包含明文/密文） */
export interface ApiChannelView {
  kind: ApiChannelKind;
  /** 行 id（station=station_user_keys.id；custom=custom_channels.id） */
  id: string;
  /** 展示名（station=api_stations.displayName；custom=user 自填 name） */
  name: string;
  baseUrl: string | null;
  format: ApiChannelFormat;
  /** 适用模型白名单；空数组 = 不限模型（与 channelServesModel 空数组=全模型口径一致） */
  models: string[];
  isActive: boolean;
  apiKeyMasked: string;
  createdAt: string;
  /** kind=station 专属：api_stations 真实 UUID */
  stationId?: string;
  /** kind=custom 专属：优先级（数值越小越优先） */
  priority?: number;
  /** kind=custom 专属：可选分组标签（仅展示，不参与排序） */
  groupName?: string | null;
  /** kind=custom 专属：同优先级组内加权分摊系数 */
  weight?: number;
}

/** 单次读两表并归一；数据库为唯一事实源，不做任何伪行合成 */
export async function listApiChannels(userId: string): Promise<ApiChannelView[]> {
  const [stationKeys, customChannels] = await Promise.all([
    prisma.stationUserKey.findMany({
      // station 侧仅取未软删且计费模式为 UPSTREAM 的站点（与 listUpstreamStations 口径一致）：
      // 防止后台改计费模式 / 软删站点后，历史自有 Key 仍作为脏渠道出现在聚合列表。
      where: {
        userId,
        station: {
          deletedAt: null,
          billingRule: { billingMode: "UPSTREAM" },
        },
      },
      select: {
        id: true,
        stationId: true,
        name: true,
        keyMasked: true,
        isActive: true,
        createdAt: true,
        station: {
          select: {
            displayName: true,
            baseUrl: true,
            protocols: true,
            models: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customChannel.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        keyMasked: true,
        format: true,
        models: true,
        priority: true,
        groupName: true,
        weight: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const stations: ApiChannelView[] = stationKeys.map((r) => ({
    kind: "station",
    id: r.id,
    name: r.station?.displayName ?? r.name ?? r.stationId,
    baseUrl: r.station?.baseUrl ?? null,
    format: stationFormatOf(r.station?.protocols),
    models: r.station?.models ?? [],
    isActive: r.isActive,
    apiKeyMasked: r.keyMasked,
    createdAt: r.createdAt.toISOString(),
    stationId: r.stationId,
  }));

  const customs: ApiChannelView[] = customChannels.map((r) => ({
    kind: "custom",
    id: r.id,
    name: r.name,
    baseUrl: r.baseUrl,
    format: toFormat(r.format),
    models: r.models,
    isActive: r.isActive,
    apiKeyMasked: r.keyMasked,
    createdAt: r.createdAt.toISOString(),
    priority: r.priority,
    groupName: r.groupName,
    weight: r.weight,
  }));

  // custom 在前（含优先级语义），station 在后
  return [...customs, ...stations];
}

/** 站点格式：protocols 含 anthropic → Anthropic，否则 OpenAI（与网关 upstreamFormatOfStation 同口径） */
function stationFormatOf(protocols: string[] | null | undefined): ApiChannelFormat {
  return (protocols ?? []).some((p) => p.toLowerCase() === "anthropic") ? "anthropic" : "openai";
}

/** CustomChannel ChannelFormat enum → wire 契约（与网关 toChannelView 同口径，四值） */
function toFormat(f: { toString(): string } | string | null | undefined): ApiChannelFormat {
  const raw = typeof f === "string" ? f : f?.toString?.() ?? "";
  return channelEnumToGatewayFormat(raw);
}
/**
 * user 用户域 service：读侧四查 + 配置写编排（Task A.2.1/A.2.2）。
 *
 * 纯函数导出（可测）：tierLabelOf / injectFreeRow / nextResetAt / groupQuotasByCycle。
 * 命名空间注记：任务文档述及 ModelFreeQuota/resetCycle/isActive，
 * schema 实况为 UserFreeQuota/refreshCycle 且无 isActive 列，以实况为准。
 */
import {
  FREE_FALLBACK_PRIORITY,
  MODEL_TIER_ORDER,
  fenToYuan,
  type ModelTier,
  type PrioritiesPut,
  type TierMappingsPut,
} from "@aidean/shared";

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import { userRepository, type AccountTierKey, type TierLevelKey } from "./repository";

/** 当期已用量读取（与 gateway FREE_QUOTA 记账同一 periodStart 本地零点口径）；repository 薄委托 */
function periodStartOf(cycle: "DAY" | "WEEK" | "MONTH", now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (cycle === "WEEK") {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 周一为首
  } else if (cycle === "MONTH") {
    d.setDate(1);
  }
  return d;
}

type Tier = AccountTierKey;

// 等级全名单源化（AT-20.1.1 / WF-20）：映射真源迁至 ./tier.ts。
// 保留既有导出名（TIER_LABELS/tierLabelOf）以维持 service 消费面与单测兼容；
// 模块内部引用走本地委托。
import { tierFullLabelOf } from "./tier";

export { TIER_FULL_LABEL as TIER_LABELS } from "./tier";

/** 账户等级 → 中文展示名（单源委托） */
export const tierLabelOf = tierFullLabelOf;

/** free 只读行注入后的优先级条目形状 */
export interface PriorityItem {
  modelId: string;
  modelName: string;
  priority: number;
  autoLoaded?: boolean;
  readOnly?: boolean;
}

/** 注入 free 只读行至队尾（纯函数，不改入参）：系统 free 模型池恒在、自动加载、不可写 */
export function injectFreeRow(rows: PriorityItem[]): PriorityItem[] {
  return [
    ...rows,
    {
      modelId: "__free__",
      modelName: "系统 free 模型池",
      priority: FREE_FALLBACK_PRIORITY,
      autoLoaded: true,
      readOnly: true,
    },
  ];
}

/** 等级映射分组视图条目 */
export interface TierMappingItem {
  modelId: string;
  modelName: string;
}

/** 四档分组 + free 说明区（GET tier-mappings 响应体） */
export interface TierMappingsView {
  tiers: Record<ModelTier, TierMappingItem[]>;
  free: { freeNote: string };
}

/** 按固定四档顺序分组映射行；空档保留空数组（档序单一来源：MODEL_TIER_ORDER） */
export function groupTierMappings(
  rows: Array<{ tierLevel: TierLevelKey; modelId: string; model: { nameDisplay: string } }>
): TierMappingsView["tiers"] {
  const tiers = {} as TierMappingsView["tiers"];
  for (const key of MODEL_TIER_ORDER) tiers[key] = [];
  for (const row of rows) {
    tiers[row.tierLevel].push({ modelId: row.modelId, modelName: row.model.nameDisplay });
  }
  return tiers;
}

/** 免费额度周期 → 下次重置时刻（ISO 字符串）。纯函数：now 可注入便于测试。 */
export function nextResetAt(cycle: "DAY" | "WEEK" | "MONTH", now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (cycle === "DAY") {
    d.setDate(d.getDate() + 1);
  } else if (cycle === "WEEK") {
    // 下周一：周一当天算 7 天后，其余补齐到下一个周一
    const delta = ((8 - d.getDay()) % 7) || 7;
    d.setDate(d.getDate() + delta);
  } else {
    // 下月 1 日：显式换算避免 setMonth 进位歧义（如 1/31 → 3 月）
    const y = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
    const m = d.getMonth() === 11 ? 0 : d.getMonth() + 1;
    d.setFullYear(y, m, 1);
  }
  return d.toISOString();
}

/** 按 resetCycle 三键分组（键恒齐全）；入参条目原样进对应桶 */
export function groupQuotasByCycle<T extends { resetCycle: "DAY" | "WEEK" | "MONTH" }>(
  items: T[]
): Record<"DAY" | "WEEK" | "MONTH", T[]> {
  const grouped: Record<"DAY" | "WEEK" | "MONTH", T[]> = { DAY: [], WEEK: [], MONTH: [] };
  for (const item of items) {
    grouped[item.resetCycle].push(item);
  }
  return grouped;
}

/** 同一 modelId 出现在两个档的守卫消息（tier-mappings PUT） */
const DUPLICATED_TIER_MESSAGE = "同一模型不可绑定多个等级";

function assertNoCrossTierDuplicate(items: TierMappingsPut): void {
  const seen = new Map<string, TierLevelKey>();
  for (const item of items) {
    const prev = seen.get(item.modelId);
    if (prev && prev !== item.tier) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, DUPLICATED_TIER_MESSAGE);
    }
    seen.set(item.modelId, item.tier);
  }
}

export interface QuotaUsageView {
  modelId: string;
  modelName: string;
  totalQuotaTokens: number;
  quotaTokens: number;
  usedTokens: number;
  resetCycle: "DAY" | "WEEK" | "MONTH";
  nextResetAt: string;
}

export const userService = {
  /** 用户资料视图：tier 中文名 + 钱包分转元（无钱包视作 0.00） */
  async getProfile(userId: string) {
    const row = await userRepository.findProfile(userId);
    if (!row) throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "会话无效或已过期");
    return {
      id: row.id,
      email: row.email,
      nickname: row.nickname,
      tier: row.tier,
      tierLabel: tierLabelOf(row.tier),
      balanceYuan: fenToYuan(row.wallet?.balanceMinor ?? BigInt(0)),
    };
  },

  /** 优先级全量（priority 升序），尾行恒注入 free 只读行 */
  async listPriorities(userId: string): Promise<PriorityItem[]> {
    const rows = await userRepository.listPriorities(userId);
    return injectFreeRow(
      rows.map((r) => ({ modelId: r.modelId, modelName: r.model.nameDisplay, priority: r.priority }))
    );
  },

  /** 四档分组视图 + free 只读说明区 */
  async listTierMappings(userId: string): Promise<TierMappingsView> {
    const rows = await userRepository.listTierMappings(userId);
    return {
      tiers: groupTierMappings(rows),
      free: {
        freeNote: "Free 模型池由系统配置并自动加载（优先级固定为最低档），此处仅作说明，不可绑定或修改。",
      },
    };
  },

  /** 免费额度用量视图：按账户 tier 取生效配置，usedTokens 读 user_quota_usages 当期实况（gateway FREE_QUOTA 记账同口径） */
  async quotaUsage(userId: string): Promise<QuotaUsageView[]> {
    const user = await userRepository.findUserTier(userId);
    if (!user) throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "会话无效或已过期");
    const quotas = await userRepository.listFreeQuotasByTier(user.tier);
    return Promise.all(
      quotas.map(async (q) => {
        const used = await userRepository.getQuotaUsed(userId, q.modelId, periodStartOf(q.refreshCycle));
        return {
          modelId: q.modelId,
          modelName: q.model.nameDisplay,
          totalQuotaTokens: Number(q.quotaTokens),
          quotaTokens: Number(q.quotaTokens),
          usedTokens: used,
          resetCycle: q.refreshCycle,
          nextResetAt: nextResetAt(q.refreshCycle),
        };
      })
    );
  },

  /** 优先级整组覆盖保存（schema 校验已在 route 完成）；返回写入条数 */
  async savePriorities(userId: string, items: PrioritiesPut): Promise<number> {
    return userRepository.replacePriorities(userId, items);
  },

  /** 等级映射整组覆盖保存；跨档同模型守卫先于事务；返回写入条数 */
  async saveTierMappings(userId: string, items: TierMappingsPut): Promise<number> {
    assertNoCrossTierDuplicate(items);
    return userRepository.replaceTierMappings(
      userId,
      items.map((item) => ({ tierLevel: item.tier as TierLevelKey, modelId: item.modelId }))
    );
  },
};

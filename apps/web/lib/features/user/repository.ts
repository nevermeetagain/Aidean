/**
 * user 用户域 repository：数据访问薄封装；仅 service 可调用（Task A.2.1/A.2.2）。
 *
 * schema 实况对齐注记：
 * - 免费额度表为 UserFreeQuota（user_free_quotas），周期字段名 refreshCycle，
 *   无 isActive 列 —— 过滤条件仅按 tier；
 * - UserModelPriority/UserTierMapping.modelId 为 String 外键指向 AiModel.id(uuid)，
 *   关联取 AiModel.nameDisplay 作展示名。
 */
import { prisma } from "../../db/prisma";

/** 档位键与 Prisma ModelTierLevel 枚举对齐 */
export type TierLevelKey = "OPUS" | "SONNET" | "FABLE" | "HAIKU";
/** 账户等级键与 Prisma AccountTier 枚举对齐 */
export type AccountTierKey = "NORMAL" | "PRO" | "MAX";

export interface ProfileRow {
  id: string;
  email: string;
  nickname: string | null;
  tier: AccountTierKey;
  wallet: { balanceMinor: bigint } | null;
}

export interface PriorityRow {
  modelId: string;
  priority: number;
  model: { nameDisplay: string };
}

export interface TierMappingRow {
  tierLevel: TierLevelKey;
  modelId: string;
  model: { nameDisplay: string };
}

export interface FreeQuotaRow {
  modelId: string;
  quotaTokens: number;
  refreshCycle: "DAY" | "WEEK" | "MONTH";
  model: { nameDisplay: string };
}

export const userRepository = {
  /** 用户资料 + 钱包余额（一次查询）；无行返回 null */
  async findProfile(userId: string): Promise<ProfileRow | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        tier: true,
        wallet: { select: { balanceMinor: true } },
      },
    });
  },

  /** 仅取账户等级（quotaUsage 按 tier 过滤免费额度用） */
  async findUserTier(userId: string): Promise<{ tier: AccountTierKey } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
  },

  /** 用户模型优先级全量（priority 升序） */
  async listPriorities(userId: string): Promise<PriorityRow[]> {
    return prisma.userModelPriority.findMany({
      where: { userId },
      orderBy: { priority: "asc" },
      select: { modelId: true, priority: true, model: { select: { nameDisplay: true } } },
    });
  },

  /** 用户等级映射全量 */
  async listTierMappings(userId: string): Promise<TierMappingRow[]> {
    return prisma.userTierMapping.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { tierLevel: true, modelId: true, model: { select: { nameDisplay: true } } },
    });
  },

  /** 该等级生效中的免费额度配置（含模型展示名） */
  async listFreeQuotasByTier(tier: AccountTierKey): Promise<FreeQuotaRow[]> {
    return prisma.userFreeQuota.findMany({
      where: { tier },
      select: {
        modelId: true,
        quotaTokens: true,
        refreshCycle: true,
        model: { select: { nameDisplay: true } },
      },
    });
  },

  /** 当期已用量（periodStart=该周期本地零点；无行视为 0——与 gateway FREE_QUOTA 记账同键口径） */
  async getQuotaUsed(userId: string, modelId: string, periodStart: Date): Promise<number> {
    const row = await prisma.userQuotaUsage.findUnique({
      where: { userId_modelId_periodStart: { userId, modelId, periodStart } },
      select: { used: true },
    });
    return row?.used ?? 0;
  },

  /**
   * 优先级整组覆盖 UPSERT：事务内 deleteMany(userId) + createMany 全量重建。
   * 返回写入条数（createMany.count）。
   */
  async replacePriorities(
    userId: string,
    items: Array<{ modelId: string; priority: number }>
  ): Promise<number> {
    return prisma.$transaction(async (tx) => {
      await tx.userModelPriority.deleteMany({ where: { userId } });
      if (items.length === 0) return 0;
      const res = await tx.userModelPriority.createMany({
        data: items.map((item) => ({
          userId,
          modelId: item.modelId,
          priority: item.priority,
        })),
      });
      return res.count;
    });
  },

  /**
   * 等级映射整组覆盖 UPSERT：事务内 deleteMany(userId) + createMany 全量重建。
   * 返回写入条数（createMany.count）。
   */
  async replaceTierMappings(
    userId: string,
    items: Array<{ tierLevel: TierLevelKey; modelId: string }>
  ): Promise<number> {
    return prisma.$transaction(async (tx) => {
      await tx.userTierMapping.deleteMany({ where: { userId } });
      if (items.length === 0) return 0;
      const res = await tx.userTierMapping.createMany({
        data: items.map((item) => ({
          userId,
          tierLevel: item.tierLevel,
          modelId: item.modelId,
        })),
      });
      return res.count;
    });
  },
};

/**
 * auth 认证域 repository：数据访问薄封装；仅 service 可调用。
 * （Task A.1.2：注册事务 users+wallets 同建 / 登录按 email 查询）
 * （M-SSO P0.3~P0.5：RefreshToken 持久化/轮换检测/整链撤销/tokenVersion/登录锁定计数）
 */
import { prisma } from "../../db/prisma";

/** Prisma User 行的业务最小投影（避免向下游泄露 password 哈希以外的内部列） */
export interface AuthUserRow {
  id: string;
  email: string;
  nickname: string | null;
  tier: "NORMAL" | "PRO" | "MAX";
  status: string;
  password: string;
  /** M-SSO P0.4：全端失效代际（签发写入 ver claim，验签时比对） */
  tokenVersion: number;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

/** 不含敏感列的用户投影（userinfo/轮换回填用） */
export type AuthUserProfileRow = Omit<AuthUserRow, "password" | "failedLoginAttempts" | "lockedUntil">;

const USER_SELECT = {
  id: true,
  email: true,
  nickname: true,
  tier: true,
  status: true,
  password: true,
  tokenVersion: true,
  failedLoginAttempts: true,
  lockedUntil: true,
} as const;

const PROFILE_SELECT = {
  id: true,
  email: true,
  nickname: true,
  tier: true,
  status: true,
  tokenVersion: true,
} as const;

/** P2002 唯一约束冲突的鸭子类型判定（兼容测试桩注入的最小错误形状） */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export interface RefreshTokenRow {
  jti: string;
  userId: string;
  clientId: string | null;
  chainId: string;
}

export type ConsumeRefreshResult =
  | { kind: "ok"; record: RefreshTokenRow }
  | { kind: "invalid" }
  | { kind: "revoked" }
  /** 轮换检测命中：旧值复用 = 重放攻击，整链已撤销，调用方必须拒绝并告警 */
  | { kind: "replayed" };

export const authRepository = {
  async findUserByEmail(email: string): Promise<AuthUserRow | null> {
    return prisma.user.findUnique({ where: { email }, select: USER_SELECT });
  },

  async findUserById(id: string): Promise<AuthUserProfileRow | null> {
    return prisma.user.findUnique({ where: { id }, select: PROFILE_SELECT });
  },

  /** T120-19 改密前置：按 id 取含哈希的凭据行（仅 service 内比对，不外泄） */
  async findUserCredentialById(id: string): Promise<AuthUserRow | null> {
    return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  },

  /**
   * T120-19 改密事务（同一事务三步）：更新哈希 → token_version += 1 → 吊销该用户全部未吊销 refresh。
   * 返回新代际后的 profile 行（供为当前设备签发新令牌对）。
   */
  async changePasswordAndRevokeAll(userId: string, passwordHash: string): Promise<AuthUserProfileRow> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { password: passwordHash, tokenVersion: { increment: 1 } },
        select: PROFILE_SELECT,
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return user;
    });
  },

  /**
   * 注册事务：users(tier=NORMAL) + wallets(balanceMinor=0n) 同建；
   * email unique 冲突(P2002)由调用方映射为 ApiError(10002)。
   */
  async registerWithWallet(input: {
    email: string;
    passwordHash: string;
    nickname: string;
  }): Promise<{ user: AuthUserProfileRow }> {
    const user = await prisma.$transaction(async (tx) => {
      try {
        const created = await tx.user.create({
          data: {
            email: input.email,
            password: input.passwordHash,
            nickname: input.nickname,
            tier: "NORMAL",
          },
          select: PROFILE_SELECT,
        });
        // 钱包同建：余额最小单位（分）BigInt 置零
        await tx.wallet.create({
          data: { userId: created.id, balanceMinor: 0n },
        });
        return created;
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new Error("P2002_EMAIL_DUPLICATED");
        }
        throw err;
      }
    });
    return { user };
  },

  /** 判断上一步事务错误是否为 email 冲突标记（service 层转换为 10002） */
  isEmailDuplicatedMarker(err: unknown): boolean {
    return err instanceof Error && err.message === "P2002_EMAIL_DUPLICATED";
  },

  // ==================== M-SSO P0.3：refresh 持久化与轮换链 ====================

  /** 落库新 refresh 代（登录/注册首代 chainId=jti；轮换代 chainId 继承、rotatedFrom=旧 jti） */
  async createRefreshTokenRecord(input: {
    jti: string;
    userId: string;
    clientId: string | null;
    chainId: string;
    rotatedFrom: string | null;
    expiresAt: Date;
    userAgent: string | null;
    ip: string | null;
  }): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        jti: input.jti,
        userId: input.userId,
        clientId: input.clientId,
        chainId: input.chainId,
        rotatedFrom: input.rotatedFrom,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
        ip: input.ip,
      },
    });
  },

  /**
   * 消费 refresh（轮换第一步）。语义：
   * - jti 不存在/已过期 → invalid；
   * - revokedAt 非空 → revoked（链已被登出/改密/重放检测撤销）；
   * - rotatedAt 非空 → **重放**（已轮换的旧值被复用）→ 整链 revoke 后返回 replayed；
   * - 正常 → 标记 rotatedAt=now（本代消费）→ ok（携带链锚点供续代落库）。
   */
  async consumeRefreshToken(jti: string, now: Date): Promise<ConsumeRefreshResult> {
    const row = await prisma.refreshToken.findUnique({ where: { jti } });
    if (!row || row.expiresAt <= now) {
      return { kind: "invalid" };
    }
    if (row.revokedAt) {
      return { kind: "revoked" };
    }
    if (row.rotatedAt) {
      await authRepository.revokeRefreshChain(row.chainId);
      // ADR-0003 L4.5：重放=攻击信号，结构化告警日志（与 A-T20 auth-guard 同约定），
      // 供日志侧采集告警；整链撤销已同步发生，重放者与合法用户同时下线。
      console.error(
        JSON.stringify({
          tag: "auth-security",
          event: "refresh_replay",
          jti: row.jti,
          userId: row.userId,
          clientId: row.clientId,
          chainId: row.chainId,
        })
      );
      return { kind: "replayed" };
    }
    await prisma.refreshToken.update({ where: { jti }, data: { rotatedAt: now } });
    return {
      kind: "ok",
      record: { jti: row.jti, userId: row.userId, clientId: row.clientId, chainId: row.chainId },
    };
  },

  /** 整链撤销：同 chainId 的所有未撤销代全部 revokedAt=now（含当前活跃代） */
  async revokeRefreshChain(chainId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { chainId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** 按 jti 撤销其所在链（登出口径的便捷封装：jti → chainId → 整链） */
  async revokeRefreshChainByJti(jti: string): Promise<void> {
    const row = await prisma.refreshToken.findUnique({
      where: { jti },
      select: { chainId: true },
    });
    if (row) {
      await authRepository.revokeRefreshChain(row.chainId);
    }
  },

  /** 链元数据（M-SSO-FOLLOWUP back-channel：登出时定位链与签发方 client） */
  async findRefreshTokenMetaByJti(
    jti: string
  ): Promise<{ chainId: string; clientId: string | null; userId: string } | null> {
    return prisma.refreshToken.findUnique({
      where: { jti },
      select: { chainId: true, clientId: true, userId: true },
    });
  },

  /**
   * 用户全部活跃链（ADR-0003 L4.1 back-channel 广播：主站自身登出时，
   * 向该用户所有仍活跃的 SSO 产品链逐条通知销毁本地会话）。
   * 仅返回未撤销未过期链的 (chainId, clientId, userId) 去重集合。
   */
  async findActiveRefreshChainsOfUser(
    userId: string
  ): Promise<Array<{ chainId: string; clientId: string | null; userId: string }>> {
    const rows = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { chainId: true, clientId: true, userId: true },
      distinct: ["chainId"],
    });
    return rows;
  },

  /** 全端撤销：该用户所有 client 的全部活跃 refresh 链（登出/改密/封号口径） */
  async revokeAllRefreshTokensOfUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** 清理已过期记录（防表膨胀；可由后续定时任务周期调用） */
  async purgeExpiredRefreshTokens(now: Date): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { expiresAt: lt(now) } });
  },

  // ==================== M-SSO P0.4：tokenVersion ====================

  /** 全端失效：ver++ 后，携带旧 ver 的 access/refresh 一律拒绝（改密/封号口径） */
  async bumpTokenVersion(userId: string): Promise<number> {
    const row = await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    return row.tokenVersion;
  },

  // ==================== M-SSO P0.5：登录锁定计数 ====================

  /** 登录成功：计数清零/解锁 + 统计回填 */
  async registerLoginSuccess(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });
  },

  /** 邮箱验证码通道：核验通过后补记 emailVerified（幂等，登录方案 M4 E-S3） */
  async markEmailVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  },

  /** 登录失败：attempts+1；达到阈值锁定 N 分钟并清零计数（窗口期满重新累计） */
  async registerLoginFailure(userId: string, maxAttempts: number, lockMinutes: number): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true },
    });
    if (!user) return;
    const attempts = user.failedLoginAttempts + 1;
    if (attempts >= maxAttempts) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000),
        },
      });
      return;
    }
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts },
    });
  },
};

/** 局部辅助：lt 过滤（避免测试桩依赖 Prisma 命名空间） */
function lt(date: Date): { lt: Date } {
  return { lt: date };
}

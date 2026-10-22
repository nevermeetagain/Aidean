/**
 * auth 认证域 service：注册/登录业务编排（Task A.1.2 / M-SSO P0.4~P0.5 升级）。
 *
 * 约定：
 * - 入参载荷统一走 @aidean/shared 的 RegisterSchema/LoginSchema safeParse；
 * - 密码哈希 @node-rs/bcrypt（原生）cost=12（password.ts 单源，性能轮由 bcryptjs 迁入）；
 * - 登录「用户不存在」与「密码错误」统一 10003 防枚举；
 * - email 已被注册 → 10002；
 * - M-SSO P0.5：连续失败达阈值锁定（lockedUntil）+ 成功清零计数；
 *   锁定判定在凭据核验**之后**（user 不存在时无锁定字段可查，防枚举语义不破坏）；
 * - 登录/注册返回 tokenVersion（M-SSO P0.4）：签发令牌写入 ver claim 的比对锚点。
 */
import { LoginSchema, RegisterSchema } from "@aidean/shared";

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import {
  getLoginMaxFailedAttempts,
  LOGIN_LOCK_MINUTES,
} from "./constants";
import { authRepository } from "./repository";
import { hashPassword, verifyPassword, SALT_ROUNDS } from "./password";

export interface AuthProfile {
  id: string;
  email: string;
  nickname: string | null;
  tier: "NORMAL" | "PRO" | "MAX";
  /** 签发令牌时写入 ver claim（改密/封号 ver++ 后旧令牌全拒） */
  tokenVersion: number;
}

/** bcrypt 计算成本：安全基线 cost>=10，取中上值（实现与常量单源于 ./password） */
export { SALT_ROUNDS } from "./password";

/** Zod SafeParseError 的最小结构投影（不直接耦合 shared 内部 zod 版本） */
interface ParseFailure {
  error: { issues: Array<{ path: PropertyKey[]; message: string }> };
}

export function toProfile(row: {
  id: string;
  email: string;
  nickname: string | null;
  tier: AuthProfile["tier"];
  tokenVersion: number;
}): AuthProfile {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    tier: row.tier,
    tokenVersion: row.tokenVersion,
  };
}

function firstIssueMessage(failure: ParseFailure): string {
  const issue = failure.error.issues[0];
  return issue ? `${issue.path.join(".") || "payload"} ${issue.message}` : "参数非法";
}

export const authService = {
  async register(rawPayload: unknown): Promise<AuthProfile> {
    const parsed = RegisterSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, firstIssueMessage(parsed as unknown as ParseFailure));
    }
    const passwordHash = await hashPassword(parsed.data.password, SALT_ROUNDS);
    try {
      const { user } = await authRepository.registerWithWallet({
        email: parsed.data.email,
        passwordHash,
        nickname: parsed.data.nickname,
      });
      return toProfile(user);
    } catch (err) {
      if (authRepository.isEmailDuplicatedMarker(err)) {
        throw new ApiError(ERROR_CODES.EMAIL_DUPLICATED, "邮箱已被注册");
      }
      throw err;
    }
  },

  async login(rawPayload: unknown): Promise<AuthProfile> {
    const parsed = LoginSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, firstIssueMessage(parsed as unknown as ParseFailure));
    }
    const user = await authRepository.findUserByEmail(parsed.data.email);
    // 防枚举：用户不存在与密码错误同一码同一文案
    if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
      if (user) {
        // M-SSO P0.5：失败计数与达到阈值后的锁定（阈值读 systemConfig，60s 缓存回退 5）
        await authRepository.registerLoginFailure(
          user.id,
          await getLoginMaxFailedAttempts(),
          LOGIN_LOCK_MINUTES
        );
      }
      // UX-18：面向用户的主流文案（契约 §4 10003 语义「账号或密码错误」；防枚举同码同文案不变）
      throw new ApiError(ERROR_CODES.INVALID_CREDENTIALS, "邮箱或密码错误");
    }
    // 凭据核验通过后才检查账号状态与锁定窗口（不破坏防枚举语义）
    if (user.status !== "ACTIVE") {
      throw new ApiError(ERROR_CODES.ACCOUNT_DISABLED, "账号已被禁用或锁定");
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiError(ERROR_CODES.ACCOUNT_DISABLED, "账号已被禁用或锁定");
    }
    await authRepository.registerLoginSuccess(user.id);
    return toProfile(user);
  },
};

/**
 * 邮箱验证码通道（登录方案实施手册 M4：E-S2/E-S3，2026-09-17）。
 *
 * 产品口径（用户定版）：验证码即注册即登录——未注册邮箱核验通过后自动建号，
 * 与邮箱密码账号同属 User 表、同一 JWT 签发链路；子平台经 SSO 免注册复用。
 *
 * 设计：
 * - 发送：IP 10/分钟（route 层）+ 同邮箱 60s/次 + 每日 10 封
 *   （Redis 固定窗口，fail-open 与登录限流同口径）；
 * - 存储：6 位码 SHA-256 哈希存 `ec:{email}` TTL 300s，不落明文；
 * - 校验：失败计数 `rl:ec:fail:{email}` 达 5 次锁 15 分钟（先查锁再取码，锁定不消费）；
 *   命中成功才 GETDEL 一次性消费（错码保留重试机会，直至锁门）；timingSafeEqual 恒时比较；
 *   错误文案统一「验证码错误或已过期」防枚举（不暴露账号是否存在）；
 * - 注册：未注册邮箱核验通过 → registerWithWallet（随机占位密码阻断密码登录直至用户自设）
 *   + nickname 取邮箱前缀（≤20 字符）+ emailVerified=true；
 * - SMTP 未配置：dev 验证码仅服务端日志（测试/开发兜底）；生产抛 50000 拒绝。
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import { EmailCodeRequestSchema, EmailCodeVerifySchema } from "@aidean/shared";
import { hashPassword } from "./password";

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import { getRedis } from "../../db/redis";
import { checkFixedWindow } from "../../rate-limit";
import { authRepository } from "./repository";
import { SALT_ROUNDS, toProfile, type AuthProfile } from "./service";
import { sendCodeMail } from "./mailer";

/** 验证码有效期（秒） */
export const EMAIL_CODE_TTL_SECONDS = 300;
/** 同邮箱重发间隔（秒） */
export const EMAIL_CODE_RESEND_WINDOW_SECONDS = 60;
/** 同邮箱每日发送上限 */
export const EMAIL_CODE_DAILY_LIMIT = 10;
/** 校验失败锁定阈值 */
export const EMAIL_CODE_MAX_FAILS = 5;
/** 校验失败锁定窗口（秒） */
export const EMAIL_CODE_FAIL_LOCK_SECONDS = 15 * 60;

const CODE_KEY_PREFIX = "ec:";
const FAIL_KEY_PREFIX = "rl:ec:fail:";

function codeHashHex(code: string): Buffer {
  return createHash("sha256").update(code, "utf8").digest();
}

export const emailCodeService = {
  /** E-S2：发送验证码（限流 → 生成 → 哈希落 Redis → 异步语义发信） */
  async request(raw: unknown): Promise<void> {
    const parsed = EmailCodeRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "邮箱格式不正确");
    }
    const email = parsed.data.email.trim().toLowerCase();
    const redis = getRedis();
    if (redis) {
      const resend = await checkFixedWindow(
        `rl:ec:send:${email}`,
        1,
        EMAIL_CODE_RESEND_WINDOW_SECONDS
      );
      if (!resend.allowed) {
        throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "发送过于频繁，请 60 秒后再试");
      }
      // 每日窗口按 UTC 日期分桶（跨时区仅影响窗口边界，不影响安全性）
      const dayUtc = new Date().toISOString().slice(0, 10);
      const daily = await checkFixedWindow(
        `rl:ec:daily:${email}:${dayUtc}`,
        EMAIL_CODE_DAILY_LIMIT,
        86400
      );
      if (!daily.allowed) {
        throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "今日发送次数已达上限，请明日再试");
      }
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    if (redis) {
      await redis.set(
        `${CODE_KEY_PREFIX}${email}`,
        codeHashHex(code).toString("hex"),
        "EX",
        EMAIL_CODE_TTL_SECONDS
      );
    }
    const delivered = await sendCodeMail(email, code);
    if (!delivered && process.env.NODE_ENV === "production") {
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "邮件通道未配置，请联系管理员");
    }
  },

  /** E-S3：核验验证码 → 登录或注册（返回与密码登录同构的 AuthProfile） */
  async verify(raw: unknown): Promise<AuthProfile> {
    const parsed = EmailCodeVerifySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "邮箱或验证码格式不正确");
    }
    const email = parsed.data.email.trim().toLowerCase();
    const redis = getRedis();
    const codeKey = `${CODE_KEY_PREFIX}${email}`;
    const failKey = `${FAIL_KEY_PREFIX}${email}`;
    const invalid = () => new ApiError(ERROR_CODES.INVALID_CREDENTIALS, "验证码错误或已过期");
    const failAndThrow = async (): Promise<never> => {
      if (redis) {
        const fails = await redis.incr(failKey);
        if (fails === 1) await redis.expire(failKey, EMAIL_CODE_FAIL_LOCK_SECONDS);
      }
      throw invalid();
    };

    if (redis) {
      const fails = await redis.get(failKey);
      if (fails !== null && Number(fails) >= EMAIL_CODE_MAX_FAILS) {
        throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "验证码错误次数过多，请 15 分钟后再试");
      }
    }
    const storedHex = redis ? await redis.get(codeKey) : null;
    if (!storedHex) {
      await failAndThrow();
    }
    const expected = Buffer.from(storedHex as string, "hex");
    const actual = codeHashHex(parsed.data.code);
    const isMatch = expected.length === actual.length && timingSafeEqual(actual, expected);
    if (!isMatch) {
      // 错码保留（不消费）：给用户重试机会，由失败计数锁门
      await failAndThrow();
    }
    if (redis) {
      await redis.getdel(codeKey);
      await redis.unlink(failKey);
    }

    const user = await authRepository.findUserByEmail(email);
    if (user) {
      if (user.status !== "ACTIVE" || (user.lockedUntil && user.lockedUntil > new Date())) {
        throw new ApiError(ERROR_CODES.ACCOUNT_DISABLED, "账号已被禁用或锁定");
      }
      await authRepository.registerLoginSuccess(user.id);
      await authRepository.markEmailVerified(user.id);
      return toProfile(user);
    }
    // 未注册邮箱：验证码即注册（随机占位密码阻断密码登录；昵称默认取邮箱前缀）
    const placeholderPassword = randomBytes(24).toString("base64url");
    const { user: created } = await authRepository.registerWithWallet({
      email,
      passwordHash: await hashPassword(placeholderPassword),
      nickname: email.split("@")[0]?.slice(0, 20) || "用户",
    });
    await authRepository.markEmailVerified(created.id);
    return toProfile(created);
  },
};

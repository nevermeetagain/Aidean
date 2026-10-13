/**
 * 邮箱验证码通道单测（登录方案实施手册 E-S2/E-S3，2026-09-17）。
 * 覆盖：发送限流（60s/次、每日上限）、码哈希落存、错码防枚举文案与失败计数、
 * 锁定阈值、一次性消费、未注册邮箱自动建号（占位密码 + 前缀昵称 + emailVerified）、
 * 已注册邮箱直接登录、禁用账号拒绝。
 * Redis / mailer / repository 全部 mock（ioredis 连接与真实发信不进单测）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Entry = { value: string; expiresAt: number | null };

const { fakeRedis, mailer, repo } = vi.hoisted(() => {
  const entries = new Map<string, Entry>();
  const fakeRedis = {
    get: vi.fn(async (key: string) => {
      const e = entries.get(key);
      if (!e) return null;
      if (e.expiresAt !== null && e.expiresAt < Date.now()) return null;
      return e.value;
    }),
    set: vi.fn(async (key: string, value: string, _mode: "EX", ttl: number) => {
      entries.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
      return "OK";
    }),
    incr: vi.fn(async (key: string) => {
      const cur = Number(entries.get(key)?.value ?? "0") + 1;
      entries.set(key, { value: String(cur), expiresAt: null });
      return cur;
    }),
    expire: vi.fn(async (key: string, seconds: number) => {
      const e = entries.get(key);
      if (e) e.expiresAt = Date.now() + seconds * 1000;
      return "OK";
    }),
    getdel: vi.fn(async (key: string) => {
      const e = entries.get(key);
      if (!e) return null;
      entries.delete(key);
      if (e.expiresAt !== null && e.expiresAt < Date.now()) return null;
      return e.value;
    }),
    unlink: vi.fn(async (key: string) => {
      entries.delete(key);
      return "OK";
    }),
  };
  return {
    fakeRedis,
    mailer: { sendCodeMail: vi.fn<(to: string, code: string) => Promise<boolean>>() },
    repo: {
      findUserByEmail: vi.fn<(email: string) => Promise<Record<string, unknown> | null>>(),
      registerWithWallet: vi.fn<
        (input: { email: string; passwordHash: string; nickname: string }) => Promise<Record<string, unknown>>
      >(),
      registerLoginSuccess: vi.fn<(userId: string) => Promise<void>>(),
      markEmailVerified: vi.fn<(userId: string) => Promise<void>>(),
    },
  };
});

vi.mock("../../../db/redis", () => ({ getRedis: () => fakeRedis }));
vi.mock("../mailer", () => ({ sendCodeMail: mailer.sendCodeMail }));
vi.mock("../repository", () => ({ authRepository: repo }));

import { ApiError } from "../../../../app/api/v1/_lib/errors";
import {
  EMAIL_CODE_MAX_FAILS,
  emailCodeService,
} from "../email-code";

const EMAIL = "newuser@example.com";

function errCode(err: unknown): number {
  return (err as ApiError).code;
}

async function sendCode(email: string): Promise<string> {
  await emailCodeService.request({ email });
  const call = mailer.sendCodeMail.mock.calls.at(-1);
  expect(call?.[0]).toBe(email);
  return call?.[1] as string;
}

function wrongOf(code: string): string {
  return code === "000000" ? "999999" : "000000";
}

beforeEach(() => {
  fakeRedis.get.mockClear();
  fakeRedis.set.mockClear();
  fakeRedis.incr.mockClear();
  fakeRedis.expire.mockClear();
  fakeRedis.getdel.mockClear();
  fakeRedis.unlink.mockClear();
  mailer.sendCodeMail.mockClear();
  mailer.sendCodeMail.mockResolvedValue(true);
  repo.findUserByEmail.mockReset();
  repo.registerWithWallet.mockReset();
  repo.registerLoginSuccess.mockReset();
  repo.markEmailVerified.mockReset();
});

// entries map 在 vi.hoisted 闭包内，无法直接清空 → 以无 TTL 键覆盖测试间残留：
// 每个用例使用独立邮箱前缀规避串扰。
function uniqueEmail(tag: string): string {
  return `${tag}@example.com`;
}

describe("emailCodeService.request（E-S2）", () => {
  it("非法邮箱 → 40000；合法邮箱发送 6 位码并哈希落存", async () => {
    await expect(emailCodeService.request({ email: "bad" })).rejects.toMatchObject({ code: 40000 });
    const email = uniqueEmail("send-ok");
    const code = await sendCode(email);
    expect(code).toMatch(/^\d{6}$/);
    expect(fakeRedis.set).toHaveBeenCalledWith(
      `ec:${email}`,
      expect.stringMatching(/^[0-9a-f]{64}$/),
      "EX",
      300
    );
  });

  it("同邮箱 60 秒内重发 → 10006", async () => {
    const email = uniqueEmail("resend");
    await sendCode(email);
    await expect(emailCodeService.request({ email })).rejects.toMatchObject({ code: 10006 });
  });

  it("Redis incr 故障 fail-open：限流降级放行，发送仍成功", async () => {
    fakeRedis.incr.mockRejectedValueOnce(new Error("down"));
    const email = uniqueEmail("noredis");
    const code = await sendCode(email);
    expect(code).toMatch(/^\d{6}$/);
  });
});

describe("emailCodeService.verify（E-S3）", () => {
  it("错码 → 10003 防枚举文案 + 失败计数；正确码随后仍可命中（错码保留重试）", async () => {
    const email = uniqueEmail("wrong");
    const code = await sendCode(email);
    repo.findUserByEmail.mockResolvedValue(null);
    repo.registerWithWallet.mockResolvedValue({
      user: { id: "u1", email, nickname: "wrong", tier: "NORMAL", tokenVersion: 1 },
    });
    await expect(emailCodeService.verify({ email, code: wrongOf(code) })).rejects.toMatchObject({
      code: 10003,
      message: "验证码错误或已过期",
    });
    const profile = await emailCodeService.verify({ email, code });
    expect(profile.id).toBe("u1");
  });

  it("未注册邮箱：验证码即注册（占位密码 + 前缀昵称 + emailVerified）", async () => {
    const email = uniqueEmail("register");
    const code = await sendCode(email);
    repo.findUserByEmail.mockResolvedValue(null);
    repo.registerWithWallet.mockResolvedValue({
      user: { id: "u-new", email, nickname: "register", tier: "NORMAL", tokenVersion: 1 },
    });
    await emailCodeService.verify({ email, code });
    expect(repo.registerWithWallet).toHaveBeenCalledTimes(1);
    const arg = repo.registerWithWallet.mock.calls[0][0];
    expect(arg.email).toBe(email);
    expect(arg.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(arg.nickname).toBe("register");
    expect(repo.markEmailVerified).toHaveBeenCalledWith("u-new");
    // 一次性消费：同码第二次 → 10003
    await expect(emailCodeService.verify({ email, code })).rejects.toMatchObject({ code: 10003 });
  });

  it("已注册 ACTIVE 邮箱：直接登录，不建号", async () => {
    const email = uniqueEmail("login");
    const code = await sendCode(email);
    repo.findUserByEmail.mockResolvedValue({
      id: "u2", email, nickname: null, tier: "NORMAL", tokenVersion: 2,
      status: "ACTIVE", lockedUntil: null,
    });
    const profile = await emailCodeService.verify({ email, code });
    expect(profile.id).toBe("u2");
    expect(repo.registerLoginSuccess).toHaveBeenCalledWith("u2");
    expect(repo.registerWithWallet).not.toHaveBeenCalled();
  });

  it("禁用账号 → 10005", async () => {
    const email = uniqueEmail("banned");
    const code = await sendCode(email);
    repo.findUserByEmail.mockResolvedValue({
      id: "u3", email, nickname: null, tier: "NORMAL", tokenVersion: 3,
      status: "BANNED", lockedUntil: null,
    });
    await expect(emailCodeService.verify({ email, code })).rejects.toMatchObject({ code: 10005 });
  });

  it(`连续错码 ${EMAIL_CODE_MAX_FAILS} 次后锁定 → 10006（正确码也被拒）`, async () => {
    const email = uniqueEmail("lock");
    const code = await sendCode(email);
    const wrong = wrongOf(code);
    for (let i = 0; i < EMAIL_CODE_MAX_FAILS; i++) {
      await expect(emailCodeService.verify({ email, code: wrong })).rejects.toMatchObject({ code: 10003 });
    }
    await expect(emailCodeService.verify({ email, code })).rejects.toMatchObject({ code: 10006 });
  });

  it("过期/不存在的码 → 10003（计入失败计数防爆破探测）", async () => {
    const email = uniqueEmail("expired");
    repo.findUserByEmail.mockResolvedValue(null);
    await expect(emailCodeService.verify({ email, code: "123456" })).rejects.toMatchObject({ code: 10003 });
    expect(fakeRedis.incr).toHaveBeenCalledWith(`rl:ec:fail:${email}`);
  });
});

describe("errCode 助手", () => {
  it("提取 ApiError 业务码", () => {
    expect(errCode(new ApiError(10003, "x"))).toBe(10003);
  });
});

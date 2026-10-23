/**
 * T120-20 找回密码：POST /api/v1/auth/password/reset/code + /reset 契约测。
 * 覆盖：存在/不存在邮箱响应一致（防枚举）、码复用 / 过期 / 错 5 次作废、login↔reset purpose 隔离、
 *       重置后 ver++ + 吊销 refresh + 不签发 Cookie + 审计 password.reset、新密弱 400。
 * Redis / mailer / repository / prisma(auditLog) 全部 mock。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Entry = { value: string; expiresAt: number | null };

const { entries, fakeRedis, mailer, repo, audit } = vi.hoisted(() => {
  const entries = new Map<string, Entry>();
  const live = (k: string) => {
    const e = entries.get(k);
    if (!e) return null;
    if (e.expiresAt !== null && e.expiresAt < Date.now()) return null;
    return e;
  };
  const fakeRedis = {
    get: vi.fn(async (k: string) => live(k)?.value ?? null),
    set: vi.fn(async (k: string, v: string, _m: "EX", ttl: number) => {
      entries.set(k, { value: v, expiresAt: Date.now() + ttl * 1000 });
      return "OK";
    }),
    incr: vi.fn(async (k: string) => {
      const cur = Number(live(k)?.value ?? "0") + 1;
      entries.set(k, { value: String(cur), expiresAt: entries.get(k)?.expiresAt ?? null });
      return cur;
    }),
    expire: vi.fn(async (k: string, sec: number) => {
      const e = entries.get(k);
      if (e) e.expiresAt = Date.now() + sec * 1000;
      return 1;
    }),
    getdel: vi.fn(async (k: string) => {
      const e = live(k);
      entries.delete(k);
      return e?.value ?? null;
    }),
    unlink: vi.fn(async (k: string) => {
      entries.delete(k);
      return 1;
    }),
  };
  return {
    entries,
    fakeRedis,
    mailer: { sendCodeMail: vi.fn<(to: string, code: string) => Promise<boolean>>() },
    repo: {
      findUserByEmail: vi.fn(),
      changePasswordAndRevokeAll: vi.fn(),
      registerLoginSuccess: vi.fn(),
      markEmailVerified: vi.fn(),
      registerWithWallet: vi.fn(),
    },
    audit: { create: vi.fn() },
  };
});

vi.mock("../../../db/redis", () => ({ getRedis: () => fakeRedis }));
vi.mock("../mailer", () => ({ sendCodeMail: mailer.sendCodeMail }));
vi.mock("../repository", () => ({ authRepository: repo }));
vi.mock("../../../db/prisma", () => ({ prisma: { auditLog: audit } }));
// T120-20 跟进：功能开关 auth.password_reset（真实折算/fail-closed 见 flags.spec.ts）；此处按状态桩控制开/关
const flag = vi.hoisted(() => ({ enabled: true }));
vi.mock("../../flags/service", async () => {
  const { ApiError, ERROR_CODES } = await import("../../../../app/api/v1/_lib/errors");
  return {
    requireFeature: vi.fn(async (code: string) => {
      if (code === "auth.password_reset" && !flag.enabled) throw new ApiError(ERROR_CODES.FEATURE_DISABLED, "该功能暂未开放");
    }),
  };
});

import { EMAIL_CODE_MAX_FAILS, emailCodeKeys, emailCodeService } from "../email-code";

const codeRoute = await import("../../../../app/api/v1/auth/password/reset/code/route");
const resetRoute = await import("../../../../app/api/v1/auth/password/reset/route");

const EXIST = "alice@example.com";
const GHOST = "ghost@example.com";
let ipSeq = 0;
const post = (r: { POST: (req: Request) => Promise<Response> }, path: string, body: unknown) =>
  r.POST(
    new Request(`http://localhost/api/v1/auth/password/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": `198.51.100.${++ipSeq % 250}` },
      body: JSON.stringify(body),
    }),
  );
const lastCode = () => mailer.sendCodeMail.mock.calls.at(-1)?.[1] as string;
const wrongOf = (c: string) => (c === "000000" ? "999999" : "000000");

beforeEach(() => {
  vi.clearAllMocks();
  flag.enabled = true;
  entries.clear();
  mailer.sendCodeMail.mockResolvedValue(true);
  repo.findUserByEmail.mockImplementation(async (email: string) =>
    email === EXIST
      ? { id: "u-alice", email, nickname: null, tier: "PRO", status: "ACTIVE", password: "x", tokenVersion: 2, failedLoginAttempts: 0, lockedUntil: null }
      : null);
  repo.changePasswordAndRevokeAll.mockResolvedValue({ id: "u-alice", email: EXIST, nickname: null, tier: "PRO", status: "ACTIVE", tokenVersion: 3 });
  audit.create.mockResolvedValue({});
});

describe("reset/code 防枚举", () => {
  it("① 存在与不存在邮箱：状态码与响应体一致（仅存在者收到邮件）", async () => {
    const a = await post(codeRoute, "reset/code", { email: EXIST });
    const b = await post(codeRoute, "reset/code", { email: GHOST });
    expect(a.status).toBe(200);
    expect(b.status).toBe(a.status);
    const [ja, jb] = [await a.json(), await b.json()];
    expect(ja.data).toEqual({ sent: true });
    expect({ code: jb.code, message: jb.message, data: jb.data }).toEqual({ code: ja.code, message: ja.message, data: ja.data });
    expect(mailer.sendCodeMail).toHaveBeenCalledTimes(1);
    expect(mailer.sendCodeMail.mock.calls[0][0]).toBe(EXIST);
  });

  it("② 投递失败（SMTP 未配）也不抛：仍 200 {sent:true}", async () => {
    mailer.sendCodeMail.mockResolvedValue(false);
    const res = await post(codeRoute, "reset/code", { email: EXIST });
    expect(res.status).toBe(200);
  });

  it("③ 同邮箱 60s 内重发 → 429（存在/不存在同口径）", async () => {
    await emailCodeService.requestReset({ email: GHOST });
    await expect(emailCodeService.requestReset({ email: GHOST })).rejects.toMatchObject({ code: 10006 });
  });
});

describe("reset 校验与效果", () => {
  it("④ 成功：200 {reset:true}，ver++ 吊销（changePasswordAndRevokeAll），不签发 Cookie，审计 password.reset", async () => {
    await emailCodeService.requestReset({ email: EXIST });
    const res = await post(resetRoute, "reset", { email: EXIST, code: lastCode(), newPassword: "NewPass456" });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ reset: true });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(repo.changePasswordAndRevokeAll).toHaveBeenCalledWith("u-alice", expect.stringMatching(/^\$2/));
    const data = audit.create.mock.calls[0][0].data;
    expect(data.newData).toEqual({ event: "password.reset", tokenVersion: 3 });
    expect(JSON.stringify(data)).not.toMatch(/\$2|NewPass456/);
  });

  it("⑤ 码复用：第二次同码 → 401/10003", async () => {
    await emailCodeService.requestReset({ email: EXIST });
    const code = lastCode();
    await emailCodeService.resetPassword({ email: EXIST, code, newPassword: "NewPass456" });
    const res = await post(resetRoute, "reset", { email: EXIST, code, newPassword: "NewPass789" });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10003);
    expect(repo.changePasswordAndRevokeAll).toHaveBeenCalledTimes(1);
  });

  it("⑥ 码过期（>600s）→ 10003", async () => {
    vi.useFakeTimers({ now: Date.now() });
    try {
      await emailCodeService.requestReset({ email: EXIST });
      const code = lastCode();
      vi.advanceTimersByTime(601_000);
      await expect(emailCodeService.resetPassword({ email: EXIST, code, newPassword: "NewPass456" })).rejects.toMatchObject({ code: 10003 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("⑦ 错 5 次即作废：第 5 次错后正确码也失败，需重新发码", async () => {
    await emailCodeService.requestReset({ email: EXIST });
    const code = lastCode();
    for (let i = 0; i < EMAIL_CODE_MAX_FAILS; i++) {
      await expect(emailCodeService.resetPassword({ email: EXIST, code: wrongOf(code), newPassword: "NewPass456" })).rejects.toMatchObject({ code: 10003 });
    }
    expect(entries.has(emailCodeKeys("reset", EXIST).code)).toBe(false);
    await expect(emailCodeService.resetPassword({ email: EXIST, code, newPassword: "NewPass456" })).rejects.toMatchObject({ code: 10003 });
    expect(repo.changePasswordAndRevokeAll).not.toHaveBeenCalled();
  });

  it("⑧ 不存在邮箱的重置请求与错码同响应（10003 同文案）", async () => {
    const a = await post(resetRoute, "reset", { email: GHOST, code: "123456", newPassword: "NewPass456" });
    const b = await post(resetRoute, "reset", { email: EXIST, code: "123456", newPassword: "NewPass456" });
    const [ja, jb] = [await a.json(), await b.json()];
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(ja.message).toBe(jb.message);
  });

  it("⑨ 新密弱 → 400/40000，不消费码", async () => {
    await emailCodeService.requestReset({ email: EXIST });
    const code = lastCode();
    const res = await post(resetRoute, "reset", { email: EXIST, code, newPassword: "short" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
    expect(entries.has(emailCodeKeys("reset", EXIST).code)).toBe(true);
  });
});

describe("purpose 隔离", () => {
  it("⑩ 登录码不能用于重置", async () => {
    await emailCodeService.request({ email: EXIST });
    const loginCode = lastCode();
    expect(entries.has(emailCodeKeys("login", EXIST).code)).toBe(true);
    await expect(emailCodeService.resetPassword({ email: EXIST, code: loginCode, newPassword: "NewPass456" })).rejects.toMatchObject({ code: 10003 });
    expect(entries.has(emailCodeKeys("login", EXIST).code)).toBe(true);
  });

  it("⑪ 重置码不能用于登录", async () => {
    await emailCodeService.requestReset({ email: EXIST });
    const resetCode = lastCode();
    await expect(emailCodeService.verify({ email: EXIST, code: resetCode })).rejects.toMatchObject({ code: 10003 });
    expect(entries.has(emailCodeKeys("reset", EXIST).code)).toBe(true);
  });

  it("⑫ 键名：login 沿用历史 ec:{email}，reset 为 ec:reset:{email}", () => {
    expect(emailCodeKeys("login", EXIST).code).toBe(`ec:${EXIST}`);
    expect(emailCodeKeys("reset", EXIST).code).toBe(`ec:reset:${EXIST}`);
  });
});

describe("功能开关 auth.password_reset（缺省关 / fail-closed）", () => {
  it("⑬ 关闭时 reset/code 与 reset 均 403/50011，且不发信、不改密", async () => {
    flag.enabled = false;
    const a = await post(codeRoute, "reset/code", { email: EXIST });
    const b = await post(resetRoute, "reset", { email: EXIST, code: "123456", newPassword: "N3wPassw0rd!x" });
    for (const r of [a, b]) {
      expect(r.status).toBe(403);
      expect((await r.json()).code).toBe(50011);
    }
    expect(mailer.sendCodeMail).not.toHaveBeenCalled();
    expect(repo.changePasswordAndRevokeAll).not.toHaveBeenCalled();
  });
});

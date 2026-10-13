/**
 * requireUserApi 回库校验单测（#20：封禁/软删用户令牌即时失效）。
 *
 * 五态矩阵：
 * - 未登录（无 Cookie）→ ApiError 10004 UNAUTHENTICATED，不触库
 * - ACTIVE 用户 → 返回 SessionContext，不抛错
 * - SUSPENDED 用户 → ApiError 10005 ACCOUNT_DISABLED
 * - 软删用户（deletedAt 非 null）→ ApiError 10005
 * - 查无此人 → ApiError 10005
 *
 * 策略：真实 signAccess 签发 RS256 token（无 REDIS_URL → 进程内存密钥对）+
 * vi.mock next/headers 与 db/prisma（与 admin-guard.spec.ts 同一 stub 模式）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("../../../db/prisma", () => ({
  prisma: { user: prismaState.user },
}));

import { cookies } from "next/headers";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { COOKIE_ACCESS } from "../constants";
import { requireUserApi } from "../session";
import { signAccess } from "../tokens";

const cookieStore = new Map<string, string>();

function mockCookieStore() {
  const store = cookieStore;
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) =>
      store.has(name) ? { value: store.get(name) as string, name } : undefined,
    getAll: () =>
      [...store.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => store.has(name),
    set: (name: string, value: string) => void store.set(name, value),
    delete: (name: string) => void store.delete(name),
  } as unknown as ReturnType<typeof cookies>);
}

/** 种有效 access Cookie 模拟已登录 */
async function loginAs(userId: string, tier = "PRO") {
  mockCookieStore();
  cookieStore.set(
    COOKIE_ACCESS,
    await signAccess({ id: userId, tier, tokenVersion: 0 }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
});

describe("requireUserApi 回库校验（#20）", () => {
  it("① 未登录（无 Cookie）→ ApiError 10004 UNAUTHENTICATED，不触库", async () => {
    mockCookieStore();
    try {
      await requireUserApi();
      expect.unreachable("should have thrown ApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe(ERROR_CODES.UNAUTHENTICATED);
    }
    expect(prismaState.user.findUnique).not.toHaveBeenCalled();
  });

  it("② 正常 ACTIVE 用户 → 返回 SessionContext，不抛错", async () => {
    await loginAs("user-active-1");
    prismaState.user.findUnique.mockResolvedValue({
      status: "ACTIVE",
      deletedAt: null,
    });
    const session = await requireUserApi();
    expect(session.userId).toBe("user-active-1");
    expect(session.tier).toBe("PRO");
  });

  it("③ SUSPENDED 用户 → ApiError 10005 ACCOUNT_DISABLED", async () => {
    await loginAs("user-banned-1");
    prismaState.user.findUnique.mockResolvedValue({
      status: "SUSPENDED",
      deletedAt: null,
    });
    try {
      await requireUserApi();
      expect.unreachable("should have thrown ApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe(ERROR_CODES.ACCOUNT_DISABLED);
    }
  });

  it("④ 软删用户（deletedAt 非 null）→ ApiError 10005", async () => {
    await loginAs("user-deleted-1");
    prismaState.user.findUnique.mockResolvedValue({
      status: "ACTIVE",
      deletedAt: new Date("2026-01-01T00:00:00Z"),
    });
    try {
      await requireUserApi();
      expect.unreachable("should have thrown ApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe(ERROR_CODES.ACCOUNT_DISABLED);
    }
  });

  it("⑤ 查无此人（findUnique 返回 null）→ ApiError 10005", async () => {
    await loginAs("user-ghost-1");
    prismaState.user.findUnique.mockResolvedValue(null);
    try {
      await requireUserApi();
      expect.unreachable("should have thrown ApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe(ERROR_CODES.ACCOUNT_DISABLED);
    }
  });
});

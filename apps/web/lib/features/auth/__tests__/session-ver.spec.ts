/**
 * T120-18 会话版本即时吊销：requireUserApi / requireAdminApi 在既有单次回库中比对 claims.ver 与 users.token_version。
 * 策略同 session-guard / admin-guard：真实 signAccess（进程内存 RS256）+ vi.mock next/headers、db/prisma、permissions。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
const permsState = vi.hoisted(() => ({ getAdminPermissions: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("../../../db/prisma", () => ({ prisma: { user: prismaState.user } }));
vi.mock("../permissions", () => ({
  getAdminPermissions: permsState.getAdminPermissions,
  hasPermission: (p: { wildcard: boolean; codes: string[] }, code: string) => p.wildcard || p.codes.includes(code),
}));

import { cookies } from "next/headers";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { COOKIE_ACCESS } from "../constants";
import { requireAdminApi, requireUserApi } from "../session";
import { signAccess } from "../tokens";

const store = new Map<string, string>();
async function loginAs(userId: string, ver: number) {
  vi.mocked(cookies).mockReturnValue({
    get: (n: string) => (store.has(n) ? { name: n, value: store.get(n) as string } : undefined),
  } as unknown as ReturnType<typeof cookies>);
  store.set(COOKIE_ACCESS, await signAccess({ id: userId, tier: "PRO", tokenVersion: ver }));
}
async function codeOf(p: Promise<unknown>): Promise<number | "ok"> {
  try {
    await p;
    return "ok";
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    return (e as ApiError).code;
  }
}
const active = (tokenVersion: number) => ({ status: "ACTIVE", deletedAt: null, tokenVersion });
const staff = { isStaff: true, wildcard: false, codes: ["admin.users.read"] };

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  permsState.getAdminPermissions.mockResolvedValue(staff);
});

describe("requireUserApi × tokenVersion", () => {
  it("① ver 相等 → 放行，返回不含 ver 的 SessionContext", async () => {
    await loginAs("u1", 3);
    prismaState.user.findUnique.mockResolvedValue(active(3));
    await expect(requireUserApi()).resolves.toEqual({ userId: "u1", tier: "PRO" });
  });

  it("② 库内版本已自增（改密 / 重置）→ 10004 UNAUTHENTICATED", async () => {
    await loginAs("u1", 3);
    prismaState.user.findUnique.mockResolvedValue(active(4));
    expect(await codeOf(requireUserApi())).toBe(ERROR_CODES.UNAUTHENTICATED);
  });

  it("③ 封禁（status=SUSPENDED 且 ver++）→ 旧令牌下一请求 10004（HTTP 401），而非 10005", async () => {
    await loginAs("u1", 0);
    prismaState.user.findUnique.mockResolvedValue({ status: "SUSPENDED", deletedAt: null, tokenVersion: 1 });
    expect(await codeOf(requireUserApi())).toBe(ERROR_CODES.UNAUTHENTICATED);
  });

  it("④ 用户已删除（查无此行）→ 10005；软删但版本未变 → 10005", async () => {
    await loginAs("u1", 0);
    prismaState.user.findUnique.mockResolvedValue(null);
    expect(await codeOf(requireUserApi())).toBe(ERROR_CODES.ACCOUNT_DISABLED);
    prismaState.user.findUnique.mockResolvedValue({ status: "SUSPENDED", deletedAt: new Date(), tokenVersion: 0 });
    expect(await codeOf(requireUserApi())).toBe(ERROR_CODES.ACCOUNT_DISABLED);
  });

  it("⑤ 无新增往返：恰 1 次 findUnique，投影含 tokenVersion", async () => {
    await loginAs("u1", 2);
    prismaState.user.findUnique.mockResolvedValue(active(2));
    await requireUserApi();
    expect(prismaState.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaState.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { status: true, deletedAt: true, tokenVersion: true },
    });
  });
});

describe("requireAdminApi × tokenVersion", () => {
  it("⑥ admin 路径 ver 相等 → 放行", async () => {
    await loginAs("a1", 5);
    prismaState.user.findUnique.mockResolvedValue(active(5));
    await expect(requireAdminApi("admin.users.read")).resolves.toEqual({ userId: "a1", tier: "PRO" });
  });

  it("⑦ admin 路径 ver 不等 → 10004，且不再解析权限（不进入 getAdminPermissions）", async () => {
    await loginAs("a1", 5);
    prismaState.user.findUnique.mockResolvedValue(active(6));
    expect(await codeOf(requireAdminApi())).toBe(ERROR_CODES.UNAUTHENTICATED);
    expect(permsState.getAdminPermissions).not.toHaveBeenCalled();
  });

  it("⑧ admin 路径无新增往返：用户行仍恰 1 次 findUnique", async () => {
    await loginAs("a1", 1);
    prismaState.user.findUnique.mockResolvedValue(active(1));
    await requireAdminApi();
    expect(prismaState.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it("⑨ 未登录仍为 10004 且不触库", async () => {
    vi.mocked(cookies).mockReturnValue({ get: () => undefined } as unknown as ReturnType<typeof cookies>);
    expect(await codeOf(requireAdminApi())).toBe(ERROR_CODES.UNAUTHENTICATED);
    expect(prismaState.user.findUnique).not.toHaveBeenCalled();
  });
});

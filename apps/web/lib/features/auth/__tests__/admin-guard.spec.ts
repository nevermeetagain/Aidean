/**
 * requireAdminApi 守卫矩阵单测（v1.9 后台门禁取证；#20 回库校验；S3.3 RBAC 接口级权限）。
 *
 * S3.3 后的分层：
 * - 有效性复核（status/deletedAt）走 requireAdminApi 内单次 findUnique（每次新鲜，封禁即时失效）。
 * - 入场总闸 isStaff / 逐接口权限码判定委托 `permissions.getAdminPermissions` + `hasPermission`。
 *   本测试 mock `../permissions`（把 DB+unstable_cache 的 getAdminPermissions 换成可控桩），
 *   hasPermission 以内联真实等价（wildcard || codes.includes）实现，确保判定逻辑被真正覆盖。
 *
 * 矩阵：
 * - 未登录 → 10004「请先登录」（不触库）；
 * - 查无此人/软删/非 ACTIVE → 10005「账号已被禁用或删除」（有效性先拦）；
 * - isStaff=false（USER 且无角色分配）→ 10008「需要管理员权限」；
 * - isStaff=true（ADMIN/SUPER_ADMIN/MODERATOR 或持有分配）→ 放行透传 SessionContext（S3 起 MODERATOR 可入场，
 *   对应 spec REMOVED R-2「二元角色判定」→ 接口级 RBAC）；
 * - 传入权限码且未持有（非通配）→ 10008「权限不足」；持有或通配 → 放行。
 * 策略：真实 session/tokens/keys（无 REDIS_URL → 进程内存 RS256 对）+ vi.mock next/headers、db/prisma、permissions。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

const permsState = vi.hoisted(() => ({
  getAdminPermissions: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("../../../db/prisma", () => ({
  prisma: { user: prismaState.user },
}));

// mock 权限解析层：getAdminPermissions（含 DB + unstable_cache）替换为桩；hasPermission 保留真实等价实现。
vi.mock("../permissions", () => ({
  getAdminPermissions: permsState.getAdminPermissions,
  hasPermission: (perms: { wildcard: boolean; codes: string[] }, code: string) =>
    perms.wildcard || perms.codes.includes(code),
}));

import { cookies } from "next/headers";

import { ApiError } from "../../../../app/api/v1/_lib/errors";
import { COOKIE_ACCESS } from "../constants";
import { requireAdminApi } from "../session";
import { signAccess } from "../tokens";

const cookieStore = new Map<string, string>();

function mockCookieStore() {
  const store = cookieStore;
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) => (store.has(name) ? { value: store.get(name) as string, name } : undefined),
    getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => store.has(name),
    set: (name: string, value: string) => void store.set(name, value),
    delete: (name: string) => void store.delete(name),
  } as unknown as ReturnType<typeof cookies>);
}

/** 种有效 access Cookie 模拟已登录（tokenVersion 与 role 复核无关） */
async function loginAs(userId: string, tier = "PRO") {
  mockCookieStore();
  cookieStore.set(COOKIE_ACCESS, await signAccess({ id: userId, tier, tokenVersion: 0 }));
}

/** 有效性桩：status=ACTIVE 未软删（让控制流走到权限判定）。 */
function validUser() {
  prismaState.user.findUnique.mockResolvedValue({ status: "ACTIVE", deletedAt: null });
}

/** 权限桩：给定 isStaff / wildcard / codes。 */
function perms(p: Partial<{ wildcard: boolean; codes: string[]; isStaff: boolean }>) {
  permsState.getAdminPermissions.mockResolvedValue({
    wildcard: false,
    codes: [],
    isStaff: false,
    ...p,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
});

describe("requireAdminApi 四态矩阵", () => {
  it("① 未登录（无 Cookie）→ ApiError 10004「请先登录」（withApi 映射 HTTP 401），不触库", async () => {
    mockCookieStore();
    try {
      await requireAdminApi();
      expect.unreachable("should have thrown ApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe(10004);
      expect((err as ApiError).message).toBe("请先登录");
    }
    expect(prismaState.user.findUnique).not.toHaveBeenCalled();
    expect(permsState.getAdminPermissions).not.toHaveBeenCalled();
  });

  it("② 普通用户 USER（isStaff=false）→ ApiError 10008「需要管理员权限」（HTTP 403）", async () => {
    await loginAs("u-user");
    validUser();
    perms({ isStaff: false });
    await expect(requireAdminApi()).rejects.toMatchObject({
      name: "ApiError",
      code: 10008,
      message: "需要管理员权限",
    });
    expect(permsState.getAdminPermissions).toHaveBeenCalledWith("u-user");
  });

  it("③ ADMIN → 放行透传 SessionContext；有效性单次 findUnique 复核 status+deletedAt", async () => {
    await loginAs("u-admin");
    validUser();
    perms({ isStaff: true, codes: ["admin.users.read"] });
    const session = await requireAdminApi();
    expect(session).toEqual({ userId: "u-admin", tier: "PRO" });
    expect(prismaState.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaState.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u-admin" },
      select: { status: true, deletedAt: true },
    });
  });

  it("④ SUPER_ADMIN → 放行透传 SessionContext（通配）", async () => {
    await loginAs("u-root", "MAX");
    validUser();
    perms({ isStaff: true, wildcard: true });
    const session = await requireAdminApi();
    expect(session).toEqual({ userId: "u-root", tier: "MAX" });
  });

  it("④b MODERATOR（isStaff=true，S3 起放开入场）→ 无参调用放行", async () => {
    await loginAs("u-mod");
    validUser();
    perms({ isStaff: true, codes: ["admin.news.read", "admin.news.write"] });
    const session = await requireAdminApi();
    expect(session).toEqual({ userId: "u-mod", tier: "PRO" });
  });
});

describe("requireAdminApi 分支边界（有效性先拦）", () => {
  it("⑤ 会话有效但查无此人（findUnique null）→ 10005", async () => {
    await loginAs("u-ghost");
    prismaState.user.findUnique.mockResolvedValue(null);
    await expect(requireAdminApi()).rejects.toMatchObject({ code: 10005 });
    expect(permsState.getAdminPermissions).not.toHaveBeenCalled();
  });

  it("⑥ 软删用户（deletedAt 非空）→ 10005（有效性先拦）", async () => {
    await loginAs("u-deleted");
    prismaState.user.findUnique.mockResolvedValue({ status: "ACTIVE", deletedAt: new Date() });
    await expect(requireAdminApi()).rejects.toMatchObject({ code: 10005 });
  });

  it("⑦ 封禁管理员（status=SUSPENDED）→ 10005（封禁=全端失效）", async () => {
    await loginAs("u-banned-admin");
    prismaState.user.findUnique.mockResolvedValue({ status: "SUSPENDED", deletedAt: null });
    await expect(requireAdminApi()).rejects.toMatchObject({ code: 10005 });
  });

  it("⑧ 非 ACTIVE（status=INACTIVE）→ 10005", async () => {
    await loginAs("u-inactive");
    prismaState.user.findUnique.mockResolvedValue({ status: "INACTIVE", deletedAt: null });
    await expect(requireAdminApi()).rejects.toMatchObject({ code: 10005 });
  });
});

describe("requireAdminApi 逐接口权限码（S3.3 A2）", () => {
  it("⑨ 持有目标权限码 → 放行", async () => {
    await loginAs("u-mod");
    validUser();
    perms({ isStaff: true, codes: ["admin.news.read"] });
    const session = await requireAdminApi("admin.news.read");
    expect(session).toEqual({ userId: "u-mod", tier: "PRO" });
  });

  it("⑩ 未持有目标权限码（非通配）→ 10008「权限不足」", async () => {
    await loginAs("u-mod");
    validUser();
    perms({ isStaff: true, codes: ["admin.news.read"] });
    await expect(requireAdminApi("admin.orders.read")).rejects.toMatchObject({
      code: 10008,
      message: "权限不足",
    });
  });

  it("⑪ SUPER_ADMIN 通配 → 任意权限码放行", async () => {
    await loginAs("u-root", "MAX");
    validUser();
    perms({ isStaff: true, wildcard: true, codes: [] });
    const session = await requireAdminApi("admin.roles.write");
    expect(session).toEqual({ userId: "u-root", tier: "MAX" });
  });

  it("⑫ 有参但非 isStaff → 入场总闸先拦 10008「需要管理员权限」（先于权限码判定）", async () => {
    await loginAs("u-none");
    validUser();
    perms({ isStaff: false });
    await expect(requireAdminApi("admin.news.read")).rejects.toMatchObject({
      code: 10008,
      message: "需要管理员权限",
    });
  });
});

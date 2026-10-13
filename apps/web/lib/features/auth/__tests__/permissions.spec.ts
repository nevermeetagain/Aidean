/**
 * S3.2 权限解析单测（restructure-admin-nav-rbac-cms · A2）：
 * 覆盖 loadAdminPermissions 的核心口径——
 * - 查无此人 → 全 false；
 * - User.role=SUPER_ADMIN → 通配；
 * - 角色分配含 SUPER_ADMIN → 通配（且通配码 `*` 不落入 codes）；
 * - 多角色权限并集去重；
 * - MODERATOR 枚举（无分配）→ isStaff 放行入场、codes 空；
 * - USER 枚举但持有任一角色分配 → isStaff 放行（B2 关系表为准）。
 * 策略：mock next/cache（unstable_cache 降级为恒等，避开 Next 运行时）+ mock db/prisma（注入 findUnique 桩）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("../../../db/prisma", () => ({ prisma: { user: prismaState.user } }));

import { loadAdminPermissions, hasPermission } from "../permissions";

/** 构造 user 行（role 枚举 + roleAssignments 关系）。 */
function userRow(role: string, assignments: Array<{ code: string; perms: string[] }>) {
  return {
    role,
    roleAssignments: assignments.map((a) => ({
      role: {
        code: a.code,
        permissions: a.perms.map((code) => ({ permission: { code } })),
      },
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadAdminPermissions", () => {
  it("查无此人 → wildcard/codes/isStaff 全 false", async () => {
    prismaState.user.findUnique.mockResolvedValue(null);
    expect(await loadAdminPermissions("u-ghost")).toEqual({
      wildcard: false,
      codes: [],
      isStaff: false,
    });
  });

  it("User.role=SUPER_ADMIN → 通配、isStaff", async () => {
    prismaState.user.findUnique.mockResolvedValue(userRow("SUPER_ADMIN", []));
    const p = await loadAdminPermissions("u-root");
    expect(p.wildcard).toBe(true);
    expect(p.isStaff).toBe(true);
  });

  it("角色分配含 SUPER_ADMIN → 通配；`*` 通配码不落 codes", async () => {
    prismaState.user.findUnique.mockResolvedValue(
      userRow("USER", [{ code: "SUPER_ADMIN", perms: ["*"] }]),
    );
    const p = await loadAdminPermissions("u-x");
    expect(p.wildcard).toBe(true);
    expect(p.codes).not.toContain("*");
    expect(p.codes).toEqual([]);
  });

  it("多角色权限并集去重", async () => {
    prismaState.user.findUnique.mockResolvedValue(
      userRow("USER", [
        { code: "ops", perms: ["admin.news.read", "admin.news.write"] },
        { code: "content", perms: ["admin.news.read", "admin.announcements.read"] },
      ]),
    );
    const p = await loadAdminPermissions("u-multi");
    expect(p.isStaff).toBe(true);
    expect(new Set(p.codes)).toEqual(
      new Set(["admin.news.read", "admin.news.write", "admin.announcements.read"]),
    );
    expect(p.codes).toHaveLength(3); // 去重
  });

  it("MODERATOR 枚举（无分配）→ isStaff 放行入场、codes 空、非通配", async () => {
    prismaState.user.findUnique.mockResolvedValue(userRow("MODERATOR", []));
    const p = await loadAdminPermissions("u-mod");
    expect(p.isStaff).toBe(true);
    expect(p.wildcard).toBe(false);
    expect(p.codes).toEqual([]);
  });

  it("ADMIN 枚举 + ADMIN 系统角色分配 → codes 含运营码、非通配", async () => {
    prismaState.user.findUnique.mockResolvedValue(
      userRow("ADMIN", [{ code: "ADMIN", perms: ["admin.users.read", "admin.configs.write"] }]),
    );
    const p = await loadAdminPermissions("u-admin");
    expect(p.wildcard).toBe(false); // ADMIN 非通配
    expect(p.isStaff).toBe(true);
    expect(p.codes).toContain("admin.users.read");
    expect(p.codes).toContain("admin.configs.write");
  });
});

describe("hasPermission", () => {
  it("通配命中任意码", () => {
    expect(hasPermission({ wildcard: true, codes: [], isStaff: true }, "admin.roles.write")).toBe(true);
  });
  it("非通配：码在集合内 true，否则 false", () => {
    const p = { wildcard: false, codes: ["admin.news.read"], isStaff: true };
    expect(hasPermission(p, "admin.news.read")).toBe(true);
    expect(hasPermission(p, "admin.orders.read")).toBe(false);
  });
});

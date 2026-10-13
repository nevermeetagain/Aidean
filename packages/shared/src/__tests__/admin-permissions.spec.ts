// S9.1.1 RBAC 注册表快照测（finalize-admin-ia-and-ops-gaps · B2）：
// 锁定「报表域」注册与系统角色权限集口径——纯数据断言，无需 DB/Next 运行时。
// 关注点：reports 域已登记；SUPER_ADMIN 通配、ADMIN 含 reports.read、MODERATOR 完全不含 reports.*（隐收入）。
import { describe, expect, it } from "vitest";
import {
  ADMIN_DOMAINS,
  ADMIN_DOMAIN_KEYS,
  ALL_PERMISSION_CODES,
  SYSTEM_ROLES,
  PERMISSION_WILDCARD,
} from "../permissions";

const role = (code: string) => SYSTEM_ROLES.find((r) => r.code === code);

describe("ADMIN_DOMAINS · reports 域登记（S9.1.1）", () => {
  it("reports 域已入册，标注为报表统计", () => {
    expect(ADMIN_DOMAIN_KEYS).toContain("reports");
    expect(ADMIN_DOMAINS.reports).toBe("报表统计");
  });
  it("权限原子含 admin.reports.read / admin.reports.write", () => {
    expect(ALL_PERMISSION_CODES).toContain("admin.reports.read");
    expect(ALL_PERMISSION_CODES).toContain("admin.reports.write");
  });
});

describe("SYSTEM_ROLES · reports 权限分级（S9.1.1 B2）", () => {
  it("SUPER_ADMIN 持通配（自然覆盖 reports）", () => {
    expect(role("SUPER_ADMIN")?.permissions).toEqual([PERMISSION_WILDCARD]);
  });

  it("ADMIN 含 admin.reports.read（运营可看报表），且不含 roles 域", () => {
    const perms = role("ADMIN")?.permissions ?? [];
    expect(perms).toContain("admin.reports.read");
    expect(perms.some((c) => c.startsWith("admin.roles."))).toBe(false);
  });

  it("MODERATOR 完全不含任何 reports.* 码（隐收入金额，越权不可见）", () => {
    const perms = role("MODERATOR")?.permissions ?? [];
    expect(perms).not.toContain("admin.reports.read");
    expect(perms).not.toContain("admin.reports.write");
    expect(perms.some((c) => c.startsWith("admin.reports."))).toBe(false);
  });

  it("MODERATOR 仍保留其余全域只读（wallets/news 等 read 不受 reports 排除影响）", () => {
    const perms = role("MODERATOR")?.permissions ?? [];
    expect(perms).toContain("admin.wallets.read");
    expect(perms).toContain("admin.news.read");
    // 且仍不含 roles 域
    expect(perms.some((c) => c.startsWith("admin.roles."))).toBe(false);
  });
});

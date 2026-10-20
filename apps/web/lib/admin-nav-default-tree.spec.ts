import { describe, expect, it } from "vitest";
import { buildAdminNav, filterNavByPerms } from "./admin-navigation-core";
import {
  SECTIONS,
  OVERVIEW,
  EXPECTED_HREFS,
  ALL_MENU_CODES,
  toNavRows,
} from "./admin-nav-default-tree";

// 旧两级 seed 的全部 ADMIN href（迁移后必须「只增不减」，一个都不能丢）
const LEGACY_HREFS = [
  "/admin",
  "/admin/users", "/admin/models", "/admin/prices", "/admin/vendors", "/admin/providers",
  "/admin/products", "/admin/api-stations", "/admin/news", "/admin/announcements",
  "/admin/evaluations", "/admin/tier-mappings", "/admin/free-quotas", "/admin/benchmarks",
  "/admin/sync", "/admin/scripts", "/admin/discovery", "/admin/intelligence",
  "/admin/protocols", "/admin/capabilities", "/admin/logs",
  "/admin/wallets", "/admin/orders", "/admin/partner-keys", "/admin/packages",
  "/admin/redemptions", "/admin/configs", "/admin/oidc-clients", "/admin/menus",
  "/admin/roles", "/admin/audit-logs",
];

describe("admin-nav-default-tree（S2.1 出厂三级 7 板块默认树）", () => {
  it("板块数 = 7，概览独立", () => {
    expect(SECTIONS).toHaveLength(7);
    expect(SECTIONS.map((s) => s.name)).toEqual([
      "数据报表", "模型与采集", "用户与权限", "交易与财务", "渠道与子平台", "内容运营", "站点与系统",
    ]);
    expect(OVERVIEW.href).toBe("/admin");
  });

  it("buildAdminNav(toNavRows()) 得 7 板块三级树，叶总数 = 33", () => {
    const nav = buildAdminNav(toNavRows());
    expect(nav.overview?.href).toBe("/admin");
    expect(nav.groups).toHaveLength(7);
    // 所有叶经 sections（分组→叶三级），直接 leaves 应为空
    const leavesViaSections = nav.groups.flatMap((g) => (g.sections ?? []).flatMap((s) => s.children ?? []));
    const directLeaves = nav.groups.flatMap((g) => g.leaves);
    expect(directLeaves).toHaveLength(0);
    expect(leavesViaSections).toHaveLength(33);
    // 每个板块都至少有一个分组
    for (const g of nav.groups) expect((g.sections ?? []).length).toBeGreaterThan(0);
  });

  it("href 唯一且既有 31 入口零缺失（只增不减）", () => {
    const dup = EXPECTED_HREFS.filter((h, i) => EXPECTED_HREFS.indexOf(h) !== i);
    expect(dup).toEqual([]);
    for (const legacy of LEGACY_HREFS) expect(EXPECTED_HREFS).toContain(legacy);
    // 较旧集合新增：/admin/reports、/admin/feature-flags（S2 功能开关）、/admin/monitoring（TASK-094 监控入口）
    expect(EXPECTED_HREFS).toContain("/admin/reports");
    expect(EXPECTED_HREFS).toContain("/admin/feature-flags");
    expect(EXPECTED_HREFS).toContain("/admin/monitoring");
    expect(EXPECTED_HREFS.length).toBe(LEGACY_HREFS.length + 3);
  });

  it("menuCode 全局唯一（板块/分组/叶/概览无重名）", () => {
    const dup = ALL_MENU_CODES.filter((c, i) => ALL_MENU_CODES.indexOf(c) !== i);
    expect(dup).toEqual([]);
  });

  it("关键叶保留权限门槛（reports/logs/prices/oidc/menus/roles/feature-flags/monitoring）", () => {
    const permsBy = new Map<string, string[] | undefined>();
    for (const s of SECTIONS) for (const g of s.groups) for (const l of g.leaves) permsBy.set(l.href, l.perms);
    expect(permsBy.get("/admin/reports")).toEqual(["admin.reports.read"]);
    expect(permsBy.get("/admin/logs")).toEqual(["admin.logs.read"]);
    expect(permsBy.get("/admin/prices")).toEqual(["admin.models.read"]);
    expect(permsBy.get("/admin/oidc-clients")).toEqual(["admin.configs.read"]);
    expect(permsBy.get("/admin/feature-flags")).toEqual(["admin.configs.read"]);
    expect(permsBy.get("/admin/menus")).toEqual(["admin.menus.read"]);
    expect(permsBy.get("/admin/roles")).toEqual(["admin.roles.read"]);
    expect(permsBy.get("/admin/monitoring")).toEqual(["admin.sync.read"]);
  });

 it("仅 isStaff（无额外权限码）：设门槛叶隐藏、未设门槛叶可见；全部门槛的分组整组剪除", () => {
    const nav = buildAdminNav(toNavRows());
    const out = filterNavByPerms(nav, { wildcard: false, codes: [] });
    const visibleHrefs = new Set(
      out.groups.flatMap((g) => [
        ...g.leaves.map((l) => l.href),
        ...(g.sections ?? []).flatMap((s) => (s.children ?? []).map((c) => c.href)),
      ]),
    );
    // 设权限门槛的叶隐藏
    for (const gated of ["/admin/reports", "/admin/logs", "/admin/prices", "/admin/oidc-clients", "/admin/feature-flags", "/admin/menus", "/admin/roles", "/admin/monitoring"]) {
      expect(visibleHrefs.has(gated)).toBe(false);
    }
    // 未设门槛的叶对所有 isStaff 可见
    for (const open of ["/admin/users", "/admin/models", "/admin/intelligence", "/admin/audit-logs", "/admin/configs"]) {
      expect(visibleHrefs.has(open)).toBe(true);
    }
    // 「权限」分组（roles+menus 全设门槛）被整组剪除 → 用户与权限板块仅剩「用户」分组
    const access = out.groups.find((g) => g.label === "用户与权限");
    expect(access?.sections?.map((s) => s.label)).toEqual(["用户"]);
  });

  it("SUPER_ADMIN 通配 → 7 板块全可见", () => {
    const out = filterNavByPerms(buildAdminNav(toNavRows()), { wildcard: true, codes: [] });
    expect(out.groups).toHaveLength(7);
  });
});

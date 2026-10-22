import { describe, expect, it } from "vitest";
import { buildAdminNav, filterNavByPerms, DEFAULT_ADMIN_NAV, type NavRow, type AdminNavVM } from "./admin-navigation-core";

const row = (p: Partial<NavRow> & Pick<NavRow, "menuCode" | "name" | "level">): NavRow => ({
  path: null,
  icon: null,
  parentCode: null,
  isDropdown: false,
  sortOrder: 0,
  ...p,
});

describe("admin-navigation-core.buildAdminNav（S2.3 侧边栏建树纯逻辑）", () => {
  it("识别 overview：level1 & !isDropdown & path=/admin", () => {
    const nav = buildAdminNav([row({ menuCode: "adm_overview", name: "概览", level: 1, path: "/admin" })]);
    expect(nav.overview).toEqual({ label: "概览", href: "/admin", iconPath: null });
    expect(nav.groups).toEqual([]);
  });

  it("isDropdown 的 level1 才成组；子项按 parentCode 归属", () => {
    const nav = buildAdminNav([
      row({ menuCode: "g1", name: "组一", level: 1, isDropdown: true }),
      row({ menuCode: "c1", name: "叶子", level: 2, parentCode: "g1", path: "/admin/x" }),
      row({ menuCode: "c2", name: "游离", level: 2, parentCode: "nope", path: "/admin/y" }),
    ]);
    expect(nav.groups).toHaveLength(1);
    expect(nav.groups[0].label).toBe("组一");
    expect(nav.groups[0].leaves.map((l) => l.href)).toEqual(["/admin/x"]);
  });

  it("无 path 的子项被跳过（不可导航）", () => {
    const nav = buildAdminNav([
      row({ menuCode: "g1", name: "组", level: 1, isDropdown: true }),
      row({ menuCode: "c1", name: "有", level: 2, parentCode: "g1", path: "/admin/a" }),
      row({ menuCode: "c2", name: "无", level: 2, parentCode: "g1", path: null }),
    ]);
    expect(nav.groups[0].leaves.map((l) => l.label)).toEqual(["有"]);
  });

  it("分组与子项均按 sortOrder 升序", () => {
    const nav = buildAdminNav([
      row({ menuCode: "g2", name: "后组", level: 1, isDropdown: true, sortOrder: 5 }),
      row({ menuCode: "g1", name: "前组", level: 1, isDropdown: true, sortOrder: 1 }),
      row({ menuCode: "b", name: "乙", level: 2, parentCode: "g1", path: "/admin/b", sortOrder: 2 }),
      row({ menuCode: "a", name: "甲", level: 2, parentCode: "g1", path: "/admin/a", sortOrder: 1 }),
    ]);
    expect(nav.groups.map((g) => g.label)).toEqual(["前组", "后组"]);
    expect(nav.groups[0].leaves.map((l) => l.label)).toEqual(["甲", "乙"]);
  });

 it("icon 透传为 iconPath", () => {
    const nav = buildAdminNav([
      row({ menuCode: "adm_overview", name: "概览", level: 1, path: "/admin", icon: "M3 12h4" }),
    ]);
    expect(nav.overview?.iconPath).toBe("M3 12h4");
  });

  it("三级：level3 归入 level2 小节的 sections.children；level2 无子则为直接叶", () => {
    const nav = buildAdminNav([
      row({ menuCode: "g1", name: "交易与财务", level: 1, isDropdown: true }),
      row({ menuCode: "s1", name: "定价", level: 2, parentCode: "g1", path: null }),
      row({ menuCode: "s1a", name: "定价规则", level: 3, parentCode: "s1", path: "/admin/prices" }),
      row({ menuCode: "s1b", name: "价格历史", level: 3, parentCode: "s1", path: "/admin/price-history" }),
      row({ menuCode: "dl", name: "订单", level: 2, parentCode: "g1", path: "/admin/orders" }),
    ]);
    expect(nav.groups[0].leaves.map((l) => l.href)).toEqual(["/admin/orders"]);
    expect(nav.groups[0].sections).toHaveLength(1);
    expect(nav.groups[0].sections![0].label).toBe("定价");
    expect(nav.groups[0].sections![0].href).toBeUndefined();
    expect(nav.groups[0].sections![0].children?.map((l) => l.href)).toEqual(["/admin/prices", "/admin/price-history"]);
  });

  it("三级小节自身可带 href（level2 可跳转且有子）", () => {
    const nav = buildAdminNav([
      row({ menuCode: "g1", name: "组", level: 1, isDropdown: true }),
      row({ menuCode: "s1", name: "小节", level: 2, parentCode: "g1", path: "/admin/s1" }),
      row({ menuCode: "s1a", name: "子", level: 3, parentCode: "s1", path: "/admin/s1a" }),
    ]);
    expect(nav.groups[0].leaves).toHaveLength(0);
    expect(nav.groups[0].sections![0].href).toBe("/admin/s1");
    expect(nav.groups[0].sections![0].children?.map((l) => l.href)).toEqual(["/admin/s1a"]);
  });

  it("旧两级行不产生 sections 键（向后兼容）", () => {
    const nav = buildAdminNav([
      row({ menuCode: "g1", name: "组", level: 1, isDropdown: true }),
      row({ menuCode: "c1", name: "叶", level: 2, parentCode: "g1", path: "/admin/c1" }),
    ]);
    expect(nav.groups[0].sections).toBeUndefined();
    expect(nav.groups[0].leaves.map((l) => l.href)).toEqual(["/admin/c1"]);
  });

  it("DEFAULT_ADMIN_NAV = 7 板块三级树（32 叶经 sections，与 seed 同构；UX-26 裁定 8 合并兼容矩阵 33→32）", () => {
    expect(DEFAULT_ADMIN_NAV.overview?.href).toBe("/admin");
    expect(DEFAULT_ADMIN_NAV.groups).toHaveLength(7);
    const viaSections = DEFAULT_ADMIN_NAV.groups.flatMap((g) => (g.sections ?? []).flatMap((s) => s.children ?? []));
    expect(viaSections).toHaveLength(32);
    // 所有 href 唯一
    const hrefs = DEFAULT_ADMIN_NAV.groups
      .flatMap((g) => [...g.leaves, ...(g.sections ?? []).flatMap((s) => s.children ?? [])])
      .map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("admin-navigation-core.filterNavByPerms（S3.5 侧栏按权限剪枝）", () => {
  const nav: AdminNavVM = {
    overview: { label: "概览", href: "/admin", iconPath: null },
    groups: [
      {
        label: "运营",
        leaves: [
          { label: "用户", href: "/admin/users", iconPath: null },
          { label: "角色", href: "/admin/roles", iconPath: null, requiredPermissions: ["admin.roles.read"] },
        ],
      },
      {
        label: "系统",
        leaves: [{ label: "菜单", href: "/admin/menus", iconPath: null, requiredPermissions: ["admin.menus.read"] }],
      },
    ],
  };

  it("wildcard（SUPER_ADMIN）→ 全部保留", () => {
    const out = filterNavByPerms(nav, { wildcard: true, codes: [] });
    expect(out.groups.map((g) => g.label)).toEqual(["运营", "系统"]);
    expect(out.groups[0].leaves.map((l) => l.href)).toEqual(["/admin/users", "/admin/roles"]);
  });

  it("无权限门槛的叶恒保留；有门槛未持有则剪除；空组丢弃", () => {
    // 仅持有 users.read（无 roles/menus）
    const out = filterNavByPerms(nav, { wildcard: false, codes: ["admin.users.read"] });
    expect(out.groups.map((g) => g.label)).toEqual(["运营"]);
    expect(out.groups[0].leaves.map((l) => l.href)).toEqual(["/admin/users"]);
    // overview 不受影响
    expect(out.overview?.href).toBe("/admin");
  });

  it("持有 ALL 门槛才可见（AND 语义）", () => {
    const multi: AdminNavVM = {
      overview: null,
      groups: [{ label: "g", leaves: [{ label: "x", href: "/admin/x", iconPath: null, requiredPermissions: ["admin.a.read", "admin.b.read"] }] }],
    };
    expect(filterNavByPerms(multi, { wildcard: false, codes: ["admin.a.read"] }).groups).toHaveLength(0);
    expect(filterNavByPerms(multi, { wildcard: false, codes: ["admin.a.read", "admin.b.read"] }).groups[0].leaves).toHaveLength(1);
  });

  it("三级 sections 按权限剪枝；仅剩可见小节时组仍保留", () => {
    const nav3: AdminNavVM = {
      overview: null,
      groups: [
        { label: "交易与财务", leaves: [], sections: [{ label: "定价", iconPath: null, children: [
          { label: "可读", href: "/admin/prices", iconPath: null, requiredPermissions: ["admin.prices.read"] },
          { label: "不可读", href: "/admin/secret", iconPath: null, requiredPermissions: ["admin.secret.read"] },
        ] }] },
        { label: "空组", leaves: [], sections: [{ label: "小节", iconPath: null, children: [{ label: "x", href: "/admin/x", iconPath: null, requiredPermissions: ["admin.nope.read"] }] }] },
      ],
    };
    const out = filterNavByPerms(nav3, { wildcard: false, codes: ["admin.prices.read"] });
    expect(out.groups.map((g) => g.label)).toEqual(["交易与财务"]);
    expect(out.groups[0].sections).toHaveLength(1);
    expect(out.groups[0].sections![0].children?.map((l) => l.href)).toEqual(["/admin/prices"]);
  });
});

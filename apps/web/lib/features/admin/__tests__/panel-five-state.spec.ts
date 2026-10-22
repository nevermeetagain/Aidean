/**
 * B11-05 · L1：五态外壳推广的三个代表面板（Providers / AuditLogs / FreeQuotas）。
 *
 * 每个 loader 4 条，共 12 条（照 docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-03/handoff.md §四模板）：
 * ① 首屏静态渲染为 loading 且根 testid 携带 data-state；② 500 信封 → error 可重试（**不落 empty**）；
 * ③ 断网（fetch reject）→ error；④ 403 → forbidden；200 空列表 → empty。
 *
 * node 环境 + renderToStaticMarkup，无 testing-library（E10-09：组件测试只能落 lib/**）。
 * Dialog 内含 useEffect，vitest 下 @aidean/ui 会解析到包内独立 react 副本而抛 null dispatcher，
 * 故仅以替身替换 Dialog（照 lib/monitoring/__tests__/model-detail-ui.spec.ts 口径），
 * Button/Table/Input 等 forwardRef 无 hooks 的组件保持真实实现。
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@aidean/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aidean/ui")>();
  return { ...actual, Dialog: () => null };
});

import { toPanelResource } from "../../../admin/panel-resource";
import {
  loadProviders,
  ProvidersManager,
  PROVIDERS_LIST_URL,
  type ProvidersListData,
} from "../../../../components/admin/ProvidersManager";
import {
  AUDIT_LIST_URL,
  loadAuditLogs,
  AuditLogsTable,
  type AuditListData,
} from "../../../../components/admin/AuditLogsTable";
import {
  FREE_QUOTAS_LIST_URL,
  loadFreeQuotas,
  FreeQuotasManager,
  type FreeQuotasListData,
} from "../../../../components/admin/FreeQuotasManager";
import {
  ANNOUNCEMENTS_LIST_URL,
  AnnouncementManager,
  loadAnnouncements,
  type AnnouncementsListData,
} from "../../../../components/admin/AnnouncementManager";
import {
  API_STATIONS_LIST_URL,
  ApiStationManager,
  loadApiStations,
  type ApiStationsListData,
} from "../../../../components/admin/ApiStationManager";
import { ModelsTable } from "../../../../components/admin/ModelsTable";
import { LogsBoard } from "../../../../components/admin/LogsBoard";
import { AdminMobileNav } from "../../../../components/admin/AdminMobileNav";
import { AdminPageTabs, resolveAdminTab } from "../../../../components/admin/AdminPageTabs";
import {
  buildListQuery,
  parsePageParam,
  pickAllowed,
  pickParam,
  replaceUrlQuery,
} from "../../../../components/admin/url-query";
import { AUDIT_ACTION_VALUES, AUDIT_TABLE_LABEL, AUDIT_TABLE_VALUES } from "../../../../components/admin/audit-labels";
import { readFileSync } from "fs";
import { join } from "path";

/** 失败注入：stub 全局 fetch，返回指定状态码与信封体 */
const stub = (status: number, body: string, ct = "application/json") =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": ct } })));

/** 各面板外壳的 isEmpty 口径（与组件内 usePanelResource 一致：items 为空才算空） */
const isProvidersEmpty = (d: ProvidersListData) => d.items.length === 0;
const isAuditEmpty = (d: AuditListData) => d.items.length === 0;
const isFreeQuotasEmpty = (d: FreeQuotasListData) => d.items.length === 0;

afterEach(() => vi.unstubAllGlobals());

describe("ProvidersManager 五态（admin-providers）", () => {
  it("首屏 loading：根 testid + data-state=loading + -loading 子态", () => {
    const html = renderToStaticMarkup(createElement(ProvidersManager));
    expect(html).toContain('data-testid="admin-providers"');
    expect(html).toContain('data-state="loading"');
    expect(html).toContain('data-testid="admin-providers-loading"');
  });

  it("500 信封 → error 可重试，且不落 empty；首屏 URL 与改造前一致", async () => {
    stub(500, JSON.stringify({ code: 50000, message: "内部错误", data: null }));
    const res = await loadProviders();
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(PROVIDERS_LIST_URL);
    expect(toPanelResource(res, isProvidersEmpty)).toMatchObject({
      status: "error",
      httpStatus: 500,
      retryable: true,
      message: "内部错误",
    });
  });

  it("断网（fetch reject）→ error 可重试", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(toPanelResource(await loadProviders(), isProvidersEmpty)).toMatchObject({
      status: "error",
      httpStatus: 0,
      retryable: true,
    });
  });

  it("403 → forbidden；200 items 空 → empty", async () => {
    stub(403, JSON.stringify({ code: 10008, message: "无权限", data: null }));
    expect(toPanelResource(await loadProviders(), isProvidersEmpty).status).toBe("forbidden");
    stub(200, JSON.stringify({ code: 0, message: "ok", data: { items: [], total: 0 } }));
    expect(toPanelResource(await loadProviders(), isProvidersEmpty).status).toBe("empty");
  });
});

describe("AuditLogsTable 五态（admin-audit-logs）", () => {
  it("首屏 loading：根 testid + data-state=loading + -loading 子态", () => {
    const html = renderToStaticMarkup(createElement(AuditLogsTable));
    expect(html).toContain('data-testid="admin-audit-logs"');
    expect(html).toContain('data-state="loading"');
    expect(html).toContain('data-testid="admin-audit-logs-loading"');
  });

  it("500 信封 → error 可重试，且不落 empty；首屏 URL 与改造前一致", async () => {
    stub(500, JSON.stringify({ code: 50000, message: "内部错误", data: null }));
    const res = await loadAuditLogs();
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(AUDIT_LIST_URL);
    expect(toPanelResource(res, isAuditEmpty)).toMatchObject({
      status: "error",
      httpStatus: 500,
      retryable: true,
      message: "内部错误",
    });
  });

  it("断网（fetch reject）→ error 可重试", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(toPanelResource(await loadAuditLogs(), isAuditEmpty)).toMatchObject({
      status: "error",
      httpStatus: 0,
      retryable: true,
    });
  });

  it("403 → forbidden；200 items 空 → empty", async () => {
    stub(403, JSON.stringify({ code: 10008, message: "无权限", data: null }));
    expect(toPanelResource(await loadAuditLogs(), isAuditEmpty).status).toBe("forbidden");
    stub(200, JSON.stringify({ code: 0, message: "ok", data: { items: [], total: 0 } }));
    expect(toPanelResource(await loadAuditLogs(), isAuditEmpty).status).toBe("empty");
  });
});

describe("FreeQuotasManager 五态（admin-free-quotas）", () => {
  it("首屏 loading：根 testid + data-state=loading + -loading 子态", () => {
    const html = renderToStaticMarkup(createElement(FreeQuotasManager));
    expect(html).toContain('data-testid="admin-free-quotas"');
    expect(html).toContain('data-state="loading"');
    expect(html).toContain('data-testid="admin-free-quotas-loading"');
  });

  it("500 信封 → error 可重试，且不落 empty；首屏 URL 与改造前一致", async () => {
    stub(500, JSON.stringify({ code: 50000, message: "内部错误", data: null }));
    const res = await loadFreeQuotas();
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(FREE_QUOTAS_LIST_URL);
    expect(toPanelResource(res, isFreeQuotasEmpty)).toMatchObject({
      status: "error",
      httpStatus: 500,
      retryable: true,
      message: "内部错误",
    });
  });

  it("断网（fetch reject）→ error 可重试", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(toPanelResource(await loadFreeQuotas(), isFreeQuotasEmpty)).toMatchObject({
      status: "error",
      httpStatus: 0,
      retryable: true,
    });
  });

  it("403 → forbidden；200 items 空 → empty", async () => {
    stub(403, JSON.stringify({ code: 10008, message: "无权限", data: null }));
    expect(toPanelResource(await loadFreeQuotas(), isFreeQuotasEmpty).status).toBe("forbidden");
    stub(200, JSON.stringify({ code: 0, message: "ok", data: { items: [], total: 0 } }));
    expect(toPanelResource(await loadFreeQuotas(), isFreeQuotasEmpty).status).toBe("empty");
  });
});

// ==================== UX-01 批次 C（管理端）补充 ====================

const isAnnEmpty = (d: AnnouncementsListData) => d.items.length === 0;
const isStationsEmpty = (d: ApiStationsListData) => d.items.length === 0;

describe("UX-04 AnnouncementManager 五态（admin-announcements）", () => {
  it("首屏 loading，且不再预渲染「暂无公告」", () => {
    const html = renderToStaticMarkup(createElement(AnnouncementManager));
    expect(html).toContain('data-testid="admin-announcements"');
    expect(html).toContain('data-state="loading"');
    expect(html).not.toContain("暂无公告");
  });

  it("首屏 URL 与改造前一致；断网 / 500 → error 可重试（不落 empty）", async () => {
    expect(ANNOUNCEMENTS_LIST_URL).toBe("/api/v1/admin/announcements?page=1&pageSize=20");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const res = await loadAnnouncements();
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(ANNOUNCEMENTS_LIST_URL);
    expect(toPanelResource(res, isAnnEmpty)).toMatchObject({ status: "error", retryable: true });
    stub(500, JSON.stringify({ code: 50000, message: "内部错误", data: null }));
    expect(toPanelResource(await loadAnnouncements(), isAnnEmpty).status).toBe("error");
    stub(200, JSON.stringify({ code: 0, message: "ok", data: { items: [], total: 0 } }));
    expect(toPanelResource(await loadAnnouncements(), isAnnEmpty).status).toBe("empty");
  });
});

describe("UX-04 ApiStationManager 五态（admin-api-stations）", () => {
  it("首屏 loading，且不再预渲染「暂无 API 站点」", () => {
    const html = renderToStaticMarkup(createElement(ApiStationManager));
    expect(html).toContain('data-testid="admin-api-stations"');
    expect(html).toContain('data-state="loading"');
    expect(html).not.toContain("暂无 API 站点");
  });

  it("首屏 URL 与改造前一致；断网 → error；403 → forbidden", async () => {
    expect(API_STATIONS_LIST_URL).toBe("/api/v1/admin/api-stations?page=1&pageSize=20");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(toPanelResource(await loadApiStations(), isStationsEmpty)).toMatchObject({ status: "error", retryable: true });
    stub(403, JSON.stringify({ code: 10008, message: "无权限", data: null }));
    expect(toPanelResource(await loadApiStations(), isStationsEmpty).status).toBe("forbidden");
  });
});

describe("UX-23 url-query 工具", () => {
  it("parsePageParam：非法/缺省回落 1", () => {
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam(undefined)).toBe(1);
  });

  it("pickParam / pickAllowed：数组取首项，白名单外回落空串", () => {
    expect(pickParam({ q: ["gpt", "x"] }, "q")).toBe("gpt");
    expect(pickParam(new URLSearchParams("tab=protocol"), "tab")).toBe("protocol");
    expect(pickParam(undefined, "q")).toBe("");
    expect(pickAllowed("ai_models", AUDIT_TABLE_VALUES)).toBe("ai_models");
    expect(pickAllowed("drop_table", AUDIT_TABLE_VALUES)).toBe("");
    expect(pickAllowed("9", AUDIT_ACTION_VALUES)).toBe("");
  });

  it("buildListQuery：默认值（page=1 / 空串）不入 URL", () => {
    expect(buildListQuery({ page: 1, q: "" })).toBe("");
    expect(buildListQuery({ page: 2, q: "gpt 4o" })).toBe("page=2&q=gpt+4o");
    expect(buildListQuery({ page: 1, tableName: "users", action: "2" })).toBe("tableName=users&action=2");
  });

  it("replaceUrlQuery：保留无关参数、删除本列表旧参数、replaceState 不新增历史", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "http://x/admin/models?tab=a&page=3&q=old", pathname: "/admin/models", search: "?tab=a&page=3&q=old", hash: "" },
      history: { state: null, replaceState },
    });
    replaceUrlQuery({ page: 1, q: "" }, ["page", "q"]);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/admin/models?tab=a");
    replaceState.mockClear();
    replaceUrlQuery({ page: 2, q: "claude" }, ["page", "q"]);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/admin/models?tab=a&page=2&q=claude");
  });

  it("node 环境（无 window）为 no-op", () => {
    expect(() => replaceUrlQuery({ page: 2 })).not.toThrow();
  });
});

describe("UX-22/23/25/27 ModelsTable", () => {
  const initialData = {
    models: [
      { id: "m1", modelCode: "gpt-4o", nameDisplay: "GPT-4o", vendorName: "OpenAI", visibility: "PUBLIC", isActive: true, isFeatured: false, sortOrder: 1 },
    ],
    total: 1,
  };

  it("行内有「编辑」入口；删除不再是实心危险按钮；主色走 var(--primary)", () => {
    const html = renderToStaticMarkup(createElement(ModelsTable, { initialData }));
    expect(html).toContain('aria-label="编辑 gpt-4o"');
    expect(html).toContain('aria-label="删除 gpt-4o"');
    expect(html).not.toContain("bg-[var(--danger)]");
    expect(html).not.toContain("accent-indigo");
    expect(html).toContain("accent-[var(--primary)]");
  });

  it("URL 初值（?page= / ?q=）回填到搜索框", () => {
    const html = renderToStaticMarkup(createElement(ModelsTable, { initialData, initialPage: 2, initialQuery: "gpt" }));
    expect(html).toContain('value="gpt"');
  });
});

describe("UX-23/27 AuditLogsTable 中文业务名 + URL 初值", () => {
  it("筛选项展示中文（值仍为原始 tableName / action 码）", () => {
    const html = renderToStaticMarkup(createElement(AuditLogsTable));
    expect(html).toContain('<option value="ai_models">模型</option>');
    expect(html).toContain('<option value="2">修改</option>');
    expect(html).not.toContain(">INSERT<");
    expect(html).not.toContain(">ai_models<");
    expect(html).toContain('aria-label="按数据对象筛选"');
    expect(html).toContain('aria-label="按操作类型筛选"');
    expect(Object.keys(AUDIT_TABLE_LABEL)).toEqual(AUDIT_TABLE_VALUES);
  });

  it("initialTable / initialAction 回填为选中项", () => {
    const html = renderToStaticMarkup(createElement(AuditLogsTable, { initialTable: "users", initialAction: "3" }));
    expect(html).toMatch(/<option value="users" selected="">用户<\/option>/);
    expect(html).toMatch(/<option value="3" selected="">删除<\/option>/);
  });
});

describe("UX-26 裁定 3 LogsBoard 去掉审计 Tab", () => {
  it("Tab 仅剩 网关调用 / 采集同步 / 脚本执行 / 安全事件", () => {
    const html = renderToStaticMarkup(createElement(LogsBoard));
    expect(html).not.toMatch(/role="tab"[^>]*>审计</);
    for (const label of ["网关调用", "采集同步", "脚本执行", "安全事件"]) expect(html).toContain(label);
    expect(html).toContain('aria-label="开始日期"');
    expect(html).toContain('aria-label="结束日期"');
  });
});

describe("UX-26 裁定 7/8 AdminPageTabs（?tab= 深链）", () => {
  const TABS = [
    { key: "capability", label: "能力矩阵" },
    { key: "protocol", label: "协议矩阵" },
  ];
  it("resolveAdminTab：白名单外回落首个 Tab", () => {
    expect(resolveAdminTab("protocol", TABS)).toBe("protocol");
    expect(resolveAdminTab(["protocol"], TABS)).toBe("protocol");
    expect(resolveAdminTab("x", TABS)).toBe("capability");
    expect(resolveAdminTab(undefined, TABS)).toBe("capability");
  });
  it("每个 Tab 为 ?tab= 链接，当前项 aria-current=page", () => {
    const html = renderToStaticMarkup(
      createElement(AdminPageTabs, { basePath: "/admin/capabilities", tabs: TABS, current: "protocol", label: "兼容矩阵" }),
    );
    expect(html).toContain('href="/admin/capabilities?tab=capability"');
    expect(html).toMatch(/href="\/admin\/capabilities\?tab=protocol"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/admin\/capabilities\?tab=protocol"/);
  });
});

describe("UX-26 裁定 5/8 源码护栏", () => {
  const read = (rel: string) => readFileSync(join(__dirname, "../../../..", rel), "utf-8");
  it("用户详情抽屉不再直连调账 API，只给钱包页链接（钱包页调账保留）", () => {
    const users = read("components/admin/UsersTable.tsx");
    expect(users).not.toContain("/api/v1/admin/wallets/adjust");
    expect(users).toContain('href="/admin/wallets"');
    expect(read("components/admin/WalletsManager.tsx")).toContain("/api/v1/admin/wallets/adjust");
  });
  it("/admin/protocols 保留为重定向到兼容矩阵协议 Tab", () => {
    expect(read("app/(admin)/admin/protocols/page.tsx")).toContain('redirect("/admin/capabilities?tab=protocol")');
  });
});

describe("UX-28 AdminMobileNav 触控目标", () => {
  it("汉堡按钮 44×44（h-11 w-11）", () => {
    const html = renderToStaticMarkup(createElement(AdminMobileNav, { nav: { overview: null, groups: [] } as never }));
    expect(html).toMatch(/data-testid="admin-mobile-menu-toggle"[^>]*class="[^"]*h-11 w-11|class="[^"]*h-11 w-11[^"]*"[^>]*data-testid="admin-mobile-menu-toggle"/);
  });
});

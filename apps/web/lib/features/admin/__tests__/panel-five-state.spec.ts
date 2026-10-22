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

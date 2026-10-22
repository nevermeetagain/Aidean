/**
 * PanelState 五态外壳（B11-03 参考实现）：纯状态派生 + 静态渲染 + 失败 fetch 注入。
 * 组件测试只能落 lib/**（E10-09），交互（点击重试）以 onRetry 回调 + 端到端由 e2e 承担。
 */
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isEmptyList, panelTestIds, toPanelResource, type PanelResource } from "../panel-resource";
import { PanelState, type PanelStateProps } from "../../../components/admin/PanelState";
import { loadProtocols, ProtocolMatrix, PROTOCOL_LIST_URL } from "../../../components/admin/ProtocolMatrix";

type Rows = { rows: Array<{ id: string }> };
const empty = (d: Rows) => d.rows.length === 0;

/** PanelState 为无 hook 纯展示件：直接函数调用取得元素树，再静态渲染（规避 createElement 的 children 透传 lint） */
const render = (resource: PanelResource<Rows>, onRetry?: () => void) => {
  const props: PanelStateProps<Rows> = {
    testId: "admin-demo",
    resource,
    onRetry,
    emptyText: "暂无演示数据",
    children: (d: Rows) => createElement("span", { "data-testid": "rows" }, String(d.rows.length)),
  };
  return renderToStaticMarkup(PanelState(props) as ReactElement);
};

describe("toPanelResource（失败永不落 empty）", () => {
  it("ok + 有行 → ready；ok + 无行 / data=null → empty", () => {
    expect(toPanelResource({ ok: true, status: 200, data: { rows: [{ id: "1" }] }, message: null }, empty).status).toBe("ready");
    expect(toPanelResource({ ok: true, status: 200, data: { rows: [] }, message: null }, empty).status).toBe("empty");
    expect(toPanelResource<Rows>({ ok: true, status: 200, data: null, message: null }, empty).status).toBe("empty");
  });
  it("500 → error 可重试；0（网络）→ error 可重试；400 → error 不可重试", () => {
    const e500 = toPanelResource<Rows>({ ok: false, status: 500, data: null, message: "内部错误" }, empty);
    expect(e500).toEqual({ status: "error", message: "内部错误", httpStatus: 500, retryable: true });
    const e0 = toPanelResource<Rows>({ ok: false, status: 0, data: null, message: null }, empty);
    expect(e0.status === "error" && e0.retryable && e0.message).toBe("网络异常，请重试");
    const e400 = toPanelResource<Rows>({ ok: false, status: 400, data: null, message: "参数错误" }, empty);
    expect(e400.status === "error" && e400.retryable).toBe(false);
  });
  it("403 → forbidden（区别于 error）", () => {
    expect(toPanelResource<Rows>({ ok: false, status: 403, data: null, message: "无权限" }, empty)).toEqual({ status: "forbidden", message: "无权限" });
  });
  it("isEmptyList 兼容 数组 / rows / items", () => {
    expect(isEmptyList([])).toBe(true);
    expect(isEmptyList({ rows: [1] })).toBe(false);
    expect(isEmptyList({ items: [] })).toBe(true);
  });
  it("panelTestIds 命名规范", () => {
    expect(panelTestIds("admin-x")).toEqual({
      root: "admin-x", loading: "admin-x-loading", empty: "admin-x-empty", error: "admin-x-error",
      retry: "admin-x-retry", forbidden: "admin-x-forbidden", ready: "admin-x-ready",
    });
  });
});

describe("PanelState 静态渲染五态", () => {
  it("loading", () => {
    const html = render({ status: "loading" });
    expect(html).toContain('data-testid="admin-demo"');
    expect(html).toContain('data-state="loading"');
    expect(html).toContain('data-testid="admin-demo-loading"');
  });
  it("empty 与 error 文案/testid 可区分", () => {
    const e = render({ status: "empty" });
    expect(e).toContain('data-testid="admin-demo-empty"');
    expect(e).toContain("暂无演示数据");
    expect(e).not.toContain("admin-demo-error");
    const err = render({ status: "error", message: "内部错误", httpStatus: 500, retryable: true }, () => {});
    expect(err).toContain('data-testid="admin-demo-error"');
    expect(err).toContain('data-testid="admin-demo-retry"');
    expect(err).toContain("加载失败：内部错误");
    expect(err).not.toContain("暂无演示数据");
  });
  it("error 无 onRetry 或不可重试 → 不渲染重试按钮", () => {
    expect(render({ status: "error", message: "x", httpStatus: 500, retryable: true })).not.toContain("admin-demo-retry");
    expect(render({ status: "error", message: "x", httpStatus: 400, retryable: false }, () => {})).not.toContain("admin-demo-retry");
  });
  it("forbidden 不提供重试", () => {
    const html = render({ status: "forbidden", message: "无权限访问" }, () => {});
    expect(html).toContain('data-testid="admin-demo-forbidden"');
    expect(html).not.toContain("admin-demo-retry");
  });
  it("ready 渲染 children(data)", () => {
    const html = render({ status: "ready", data: { rows: [{ id: "1" }, { id: "2" }] } });
    expect(html).toContain('data-testid="admin-demo-ready"');
    expect(html).toContain('<span data-testid="rows">2</span>');
  });
});

describe("ProtocolMatrix 参考接入：注入失败 fetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (status: number, body: string, contentType = "application/json") =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": contentType } })));

  it("首屏 SSR 为 loading 态（根 testid=admin-protocols）", () => {
    const html = renderToStaticMarkup(createElement(ProtocolMatrix));
    expect(html).toContain('data-testid="admin-protocols"');
    expect(html).toContain('data-state="loading"');
  });

  it("500 信封 → error + 可重试（原实现此处渲染「暂无协议兼容数据」）", async () => {
    stubFetch(500, JSON.stringify({ code: 50000, message: "内部错误", data: null }));
    const res = await loadProtocols();
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(PROTOCOL_LIST_URL);
    const r = toPanelResource(res, (d) => d.rows.length === 0);
    expect(r).toMatchObject({ status: "error", httpStatus: 500, retryable: true });
  });

  it("405 空体（DEF-011-13 形态，非 JSON）→ error 而非 empty", async () => {
    stubFetch(405, "", "text/plain");
    const r = toPanelResource(await loadProtocols(), (d) => d.rows.length === 0);
    expect(r.status).toBe("error");
  });

  it("断网（fetch reject）→ error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const r = toPanelResource(await loadProtocols(), (d) => d.rows.length === 0);
    expect(r).toMatchObject({ status: "error", httpStatus: 0, retryable: true });
  });

  it("403 → forbidden；200 空 rows → empty；200 有行 → ready", async () => {
    stubFetch(403, JSON.stringify({ code: 10008, message: "无权限", data: null }));
    expect(toPanelResource(await loadProtocols(), (d) => d.rows.length === 0).status).toBe("forbidden");
    stubFetch(200, JSON.stringify({ code: 0, message: "ok", data: { rows: [], total: 0 } }));
    expect(toPanelResource(await loadProtocols(), (d) => d.rows.length === 0).status).toBe("empty");
    stubFetch(200, JSON.stringify({ code: 0, message: "ok", data: { rows: [{ id: "1" }], total: 1 } }));
    expect(toPanelResource(await loadProtocols(), (d) => d.rows.length === 0).status).toBe("ready");
  });
});

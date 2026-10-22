/**
 * B11-03b · G6：CapabilityMatrix 五态与取数口径（模板见 EVD-B11-03/handoff.md §四）。
 * node 环境 + renderToStaticMarkup，无 testing-library；交互由 e2e / 运行态冒烟承担。
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toPanelResource } from "../../../admin/panel-resource";
import {
  CAPABILITY_LIST_URL,
  CapabilityMatrix,
  buildCapabilityUrl,
  loadCapabilities,
} from "../../../../components/admin/CapabilityMatrix";

type Rows = { rows: Array<{ id: string }>; total: number };
const isEmpty = (d: Rows) => d.rows.length === 0;

const stub = (status: number, body: string, ct = "application/json") =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": ct } })));

afterEach(() => vi.unstubAllGlobals());

describe("CapabilityMatrix 五态", () => {
  it("首屏为 loading 态且带根 testid（外壳接管，不再自写 loading 分支）", () => {
    const html = renderToStaticMarkup(createElement(CapabilityMatrix));
    expect(html).toContain('data-testid="admin-capabilities"');
    expect(html).toContain('data-state="loading"');
  });

  it("500 信封 → error 可重试（不落 empty），首屏 URL 为 pageSize=50", async () => {
    stub(500, JSON.stringify({ code: 50000, message: "内部错误", data: null }));
    const res = await loadCapabilities();
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(CAPABILITY_LIST_URL);
    expect(CAPABILITY_LIST_URL).toContain("pageSize=50");
    expect(toPanelResource(res, isEmpty)).toMatchObject({ status: "error", httpStatus: 500, retryable: true });
  });

  it("断网（fetch reject）→ error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(toPanelResource(await loadCapabilities(), isEmpty).status).toBe("error");
  });

  it("403 → forbidden；200 空 → empty；200 有行 → ready", async () => {
    stub(403, JSON.stringify({ code: 10008, message: "无权限", data: null }));
    expect(toPanelResource(await loadCapabilities(), isEmpty).status).toBe("forbidden");
    stub(200, JSON.stringify({ code: 0, message: "ok", data: { rows: [], total: 0 } }));
    expect(toPanelResource(await loadCapabilities(), isEmpty).status).toBe("empty");
    stub(200, JSON.stringify({ code: 0, message: "ok", data: { rows: [{ id: "1" }], total: 1 } }));
    expect(toPanelResource(await loadCapabilities(), isEmpty).status).toBe("ready");
  });

  it("筛选与翻页只拼必要参数（空条件不污染 query）", () => {
    expect(buildCapabilityUrl()).toBe("/api/v1/admin/capabilities?page=1&pageSize=50");
    expect(buildCapabilityUrl(3, "benchmark")).toContain("page=3");
    expect(buildCapabilityUrl(2, "observed", "0001")).toBe(
      "/api/v1/admin/capabilities?page=2&pageSize=50&source=observed&modelId=0001",
    );
    stub(200, JSON.stringify({ code: 0, message: "ok", data: { rows: [{ id: "1" }], total: 1 } }));
    void loadCapabilities(undefined, 2, "official", "abc");
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(
      "/api/v1/admin/capabilities?page=2&pageSize=50&source=official&modelId=abc",
    );
  });
});

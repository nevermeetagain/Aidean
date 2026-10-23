// T120-26 PanelState 组件测（零 DOM：函数调用取元素树 + react-dom/server 静态渲染）
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PanelState, panelTestIds, type PanelResource, type PanelStateProps } from "../components/PanelState";

type Rows = { rows: string[] };
const props = (resource: PanelResource<Rows>, extra: Partial<PanelStateProps<Rows>> = {}): PanelStateProps<Rows> => ({
  testId: "demo",
  resource,
  children: (d) => <ul>{d.rows.map((r) => <li key={r}>{r}</li>)}</ul>,
  ...extra,
});
const html = (p: PanelStateProps<Rows>) => renderToStaticMarkup(PanelState(p) as ReactElement);

/** 在元素树中找到 data-testid=id 的节点（用于触发 onClick，不依赖 DOM） */
function find(node: unknown, id: string): ReactElement | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) { const f = find(n, id); if (f) return f; }
    return null;
  }
  const el = node as ReactElement<Record<string, unknown>>;
  if (el.props?.["data-testid"] === id) return el;
  return find(el.props?.children, id);
}

describe("PanelState 五态（T120-26）", () => {
  it("loading：根 data-state + 子态 testid + role=status + 默认文案", () => {
    const out = html(props({ status: "loading" }));
    expect(out).toContain('data-testid="demo"');
    expect(out).toContain('data-state="loading"');
    expect(out).toContain('data-testid="demo-loading"');
    expect(out).toContain('role="status"');
    expect(out).toContain("加载中...");
  });

  it("empty：默认「暂无数据」，文案与附加操作可注入", () => {
    expect(html(props({ status: "empty" }))).toContain("暂无数据");
    const out = html(props({ status: "empty" }, { emptyText: "暂无渠道", emptyAction: <button>新建</button> }));
    expect(out).toContain('data-testid="demo-empty"');
    expect(out).toContain("暂无渠道");
    expect(out).toContain("新建");
    expect(out).not.toContain("暂无数据");
  });

  it("error：前缀 + message，可重试时渲染重试按钮；文案可注入", () => {
    const err: PanelResource<Rows> = { status: "error", message: "内部错误", httpStatus: 500, retryable: true };
    const out = html(props(err, { onRetry: () => {} }));
    expect(out).toContain('data-testid="demo-error"');
    expect(out).toContain('role="alert"');
    expect(out).toContain("加载失败：内部错误");
    expect(out).toContain('data-testid="demo-retry"');
    expect(out).toContain("重试");
    const en = html(props(err, { onRetry: () => {}, errorPrefix: "Failed: ", retryText: "Retry" }));
    expect(en).toContain("Failed: 内部错误");
    expect(en).toContain("Retry");
  });

  it("error：无 onRetry 或 retryable=false 时不渲染重试", () => {
    expect(html(props({ status: "error", message: "x", httpStatus: 500, retryable: true }))).not.toContain("demo-retry");
    expect(html(props({ status: "error", message: "x", httpStatus: 400, retryable: false }, { onRetry: () => {} }))).not.toContain("demo-retry");
  });

  it("forbidden：缺省用 resource.message，可被 forbiddenText 覆盖，且无重试", () => {
    const res: PanelResource<Rows> = { status: "forbidden", message: "无权限访问该模块" };
    const out = html(props(res, { onRetry: () => {} }));
    expect(out).toContain('data-testid="demo-forbidden"');
    expect(out).toContain("无权限访问该模块");
    expect(out).not.toContain("demo-retry");
    expect(html(props(res, { forbiddenText: "需要管理员权限" }))).toContain("需要管理员权限");
  });

  it("ready：渲染 children(data)", () => {
    const out = html(props({ status: "ready", data: { rows: ["a", "b"] } }));
    expect(out).toContain('data-state="ready"');
    expect(out).toContain('data-testid="demo-ready"');
    expect(out).toContain("<li>a</li><li>b</li>");
  });

  it("retry 回调：点击重试按钮调用 onRetry 恰 1 次", () => {
    const onRetry = vi.fn();
    const tree = PanelState(props({ status: "error", message: "x", httpStatus: 503, retryable: true }, { onRetry }));
    const btn = find(tree, "demo-retry");
    expect(btn).not.toBeNull();
    (btn!.props as { onClick: () => void }).onClick();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("只用语义令牌：错误/禁止态不再出现 red-/amber- 原色类", () => {
    const err = html(props({ status: "error", message: "x", httpStatus: 500, retryable: false }));
    const fb = html(props({ status: "forbidden", message: "x" }));
    expect(err).toContain("bg-danger-soft");
    expect(fb).toContain("bg-warning-soft");
    expect(err + fb).not.toMatch(/\b(red|amber)-\d{2,3}\b/);
  });

  it("panelTestIds 命名规范", () => {
    expect(panelTestIds("admin-x")).toEqual({
      root: "admin-x", loading: "admin-x-loading", empty: "admin-x-empty", error: "admin-x-error",
      retry: "admin-x-retry", forbidden: "admin-x-forbidden", ready: "admin-x-ready",
    });
  });
});

/**
 * panel-resource — 后台面板五态的纯状态模型（B11-03 参考实现，B11-05 基线）。
 *
 * 五态：loading | empty | error | forbidden | ready（"data" 态在实现里命名为 ready）。
 * 判定规则（单一口径，PanelState 外壳与各面板共用）：
 *   - 信封 ok 且 isEmpty(data)=false → ready；ok 且 isEmpty(data)=true（或 data=null）→ empty
 *   - HTTP 403（10008 FORBIDDEN / 10005 / 10007 / 50011 均映射 403）→ forbidden（不提供重试：重试不会改变权限）
 *   - 其余失败（4xx/5xx/网络 status=0/非 JSON 体）→ error（retryable=true，status≠400 时）
 * 关键约束（DEF-011-03/05）：**任何失败都不得落为 empty**——"暂无数据"只代表请求成功且确实无行。
 * 纯函数、无 React 依赖，可在 node 环境单测与注入失败 fetch。
 */

/** 与 components/admin/adminFetch.ts EnvelopeResult 同形（此处结构化声明，避免 lib → "use client" 模块依赖）。 */
export interface EnvelopeLike<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string | null;
}

export type PanelStatus = "loading" | "empty" | "error" | "forbidden" | "ready";

export type PanelResource<T> =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string; httpStatus: number; retryable: boolean }
  | { status: "forbidden"; message: string }
  | { status: "ready"; data: T };

export const PANEL_LOADING: PanelResource<never> = { status: "loading" };

export function toPanelResource<T>(res: EnvelopeLike<T>, isEmpty: (data: T) => boolean): PanelResource<T> {
  if (res.ok) {
    if (res.data == null || isEmpty(res.data)) return { status: "empty" };
    return { status: "ready", data: res.data };
  }
  if (res.status === 403) {
    return { status: "forbidden", message: res.message ?? "无权限访问该模块" };
  }
  return {
    status: "error",
    message: res.message ?? (res.status ? `请求失败（${res.status}）` : "网络异常，请重试"),
    httpStatus: res.status,
    // 400 为参数类错误，原样重试无意义；其余（含 0 网络失败 / 5xx / 429）允许重试
    retryable: res.status !== 400,
  };
}

/** 通用 isEmpty：数组 / { rows } / { items } 三种列表形状。 */
export function isEmptyList(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  if (data && typeof data === "object") {
    const o = data as { rows?: unknown; items?: unknown };
    if (Array.isArray(o.rows)) return o.rows.length === 0;
    if (Array.isArray(o.items)) return o.items.length === 0;
  }
  return false;
}

/** testid 命名规范：`<prefix>` 为面板根（携带 data-state），子态为 `<prefix>-<state>`，重试按钮 `<prefix>-retry`。 */
export function panelTestIds(prefix: string) {
  return {
    root: prefix,
    loading: `${prefix}-loading`,
    empty: `${prefix}-empty`,
    error: `${prefix}-error`,
    retry: `${prefix}-retry`,
    forbidden: `${prefix}-forbidden`,
    ready: `${prefix}-ready`,
  } as const;
}

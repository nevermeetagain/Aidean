"use client";

/**
 * PanelState — 后台面板五态外壳（loading / empty / error+retry / forbidden / ready）。
 * B11-03 参考实现（首个接入：ProtocolMatrix）；B11-05 推广基线。
 *
 * 用法（详见 docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-03/handoff.md）：
 *   const { resource, reload } = usePanelResource(
 *     (signal) => adminFetch<{ rows: Row[] }>("/api/v1/admin/xxx", { signal }),
 *     (d) => d.rows.length === 0,
 *   );
 *   <PanelState testId="admin-xxx" resource={resource} onRetry={reload} emptyText="暂无 xxx">
 *     {(data) => <XxxTable rows={data.rows} />}
 *   </PanelState>
 *
 * testid：根 `<testId>`（data-state=当前态），子态 `<testId>-loading|empty|error|forbidden|ready`，重试 `<testId>-retry`。
 * 状态判定唯一口径：lib/admin/panel-resource.ts toPanelResource（失败永不落 empty）。
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@aidean/ui";
import { createLoadGuard } from "../../lib/admin/load-guard";
import {
  PANEL_LOADING,
  panelTestIds,
  toPanelResource,
  type EnvelopeLike,
  type PanelResource,
} from "../../lib/admin/panel-resource";

export interface PanelStateProps<T> {
  /** testid 前缀（kebab-case，建议 `admin-<模块>`） */
  testId: string;
  resource: PanelResource<T>;
  /** 错误态重试；未提供则不渲染重试按钮 */
  onRetry?: () => void;
  emptyText?: ReactNode;
  /** 空态附加操作（如「新建」按钮） */
  emptyAction?: ReactNode;
  loadingText?: ReactNode;
  forbiddenText?: ReactNode;
  children: (data: T) => ReactNode;
  className?: string;
}

const muted = "rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500";

export function PanelState<T>({
  testId,
  resource,
  onRetry,
  emptyText = "暂无数据",
  emptyAction,
  loadingText = "加载中...",
  forbiddenText,
  children,
  className,
}: PanelStateProps<T>) {
  const ids = panelTestIds(testId);
  let body: ReactNode;
  switch (resource.status) {
    case "loading":
      body = (
        <div data-testid={ids.loading} role="status" aria-live="polite" className={muted}>
          {loadingText}
        </div>
      );
      break;
    case "empty":
      body = (
        <div data-testid={ids.empty} className={muted}>
          <p>{emptyText}</p>
          {emptyAction ? <div className="mt-3">{emptyAction}</div> : null}
        </div>
      );
      break;
    case "forbidden":
      body = (
        <div data-testid={ids.forbidden} role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
          {forbiddenText ?? resource.message}
        </div>
      );
      break;
    case "error":
      body = (
        <div data-testid={ids.error} role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          <p>加载失败：{resource.message}</p>
          {onRetry && resource.retryable ? (
            <Button data-testid={ids.retry} variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              重试
            </Button>
          ) : null}
        </div>
      );
      break;
    case "ready":
      body = <div data-testid={ids.ready}>{children(resource.data)}</div>;
      break;
  }
  return (
    <div data-testid={ids.root} data-state={resource.status} className={className}>
      {body}
    </div>
  );
}

/**
 * usePanelResource — 拉取 + 五态派生 + 晚到响应丢弃（load-guard）+ reload。
 * reload 进入 loading；refresh（静默）保持当前内容直至新结果到达，供写操作后刷新使用。
 */
export function usePanelResource<T>(
  loader: (signal: AbortSignal) => Promise<EnvelopeLike<T>>,
  isEmpty: (data: T) => boolean,
) {
  const [resource, setResource] = useState<PanelResource<T>>(PANEL_LOADING);
  const guard = useRef(createLoadGuard());
  const loaderRef = useRef(loader);
  const emptyRef = useRef(isEmpty);
  loaderRef.current = loader;
  emptyRef.current = isEmpty;

  const run = useCallback(async (silent: boolean) => {
    const ticket = guard.current.begin();
    if (!silent) setResource(PANEL_LOADING);
    const res = await loaderRef.current(ticket.signal);
    if (!ticket.isCurrent()) return;
    setResource(toPanelResource(res, emptyRef.current));
  }, []);

  useEffect(() => {
    const g = guard.current;
    void run(false);
    return () => g.abort();
  }, [run]);

  const reload = useCallback(() => void run(false), [run]);
  const refresh = useCallback(() => void run(true), [run]);
  return { resource, reload, refresh, setResource };
}

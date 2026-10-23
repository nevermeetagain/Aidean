// PanelState — 面板五态外壳（loading / empty / error+retry / forbidden / ready）。T120-26 自 apps/web/components/admin 抽取。
// 纯展示组件，零业务逻辑、零数据获取：状态由调用方的 PanelResource 决定（web 侧判定唯一口径 lib/admin/panel-resource.ts toPanelResource）。
// 文案全部经 props 注入，默认中文；颜色只用 ADR-0013 语义令牌。
// testid：根 `<testId>`（data-state=当前态），子态 `<testId>-loading|empty|error|forbidden|ready`，重试 `<testId>-retry`。
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { cn } from "../lib/cn";

export type PanelStatus = "loading" | "empty" | "error" | "forbidden" | "ready";

/** 与 apps/web/lib/admin/panel-resource.ts PanelResource 结构等价（结构化类型，互相可赋值） */
export type PanelResource<T> =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string; httpStatus: number; retryable: boolean }
  | { status: "forbidden"; message: string }
  | { status: "ready"; data: T };

/** testid 命名规范（与 apps/web/lib/admin/panel-resource.ts panelTestIds 同值） */
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

export interface PanelStateProps<T> {
  /** testid 前缀（kebab-case，后台建议 `admin-<模块>`） */
  testId: string;
  resource: PanelResource<T>;
  /** 错误态重试；未提供或 resource.retryable=false 时不渲染重试按钮 */
  onRetry?: () => void;
  emptyText?: ReactNode;
  /** 空态附加操作（如「新建」按钮） */
  emptyAction?: ReactNode;
  loadingText?: ReactNode;
  /** 缺省使用 resource.message */
  forbiddenText?: ReactNode;
  /** 错误文案前缀，后接 resource.message */
  errorPrefix?: ReactNode;
  retryText?: ReactNode;
  children: (data: T) => ReactNode;
  className?: string;
}

const neutral = "rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-fg-muted";

export function PanelState<T>({
  testId,
  resource,
  onRetry,
  emptyText = "暂无数据",
  emptyAction,
  loadingText = "加载中...",
  forbiddenText,
  errorPrefix = "加载失败：",
  retryText = "重试",
  children,
  className,
}: PanelStateProps<T>) {
  const ids = panelTestIds(testId);
  let body: ReactNode;
  switch (resource.status) {
    case "loading":
      body = (
        <div data-testid={ids.loading} role="status" aria-live="polite" className={neutral}>
          {loadingText}
        </div>
      );
      break;
    case "empty":
      body = (
        <div data-testid={ids.empty} className={neutral}>
          <p>{emptyText}</p>
          {emptyAction ? <div className="mt-3">{emptyAction}</div> : null}
        </div>
      );
      break;
    case "forbidden":
      body = (
        <div data-testid={ids.forbidden} role="alert" className="rounded-md border border-warning/30 bg-warning-soft px-4 py-6 text-center text-sm text-warning">
          {forbiddenText ?? resource.message}
        </div>
      );
      break;
    case "error":
      body = (
        <div data-testid={ids.error} role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-6 text-center text-sm text-danger">
          <p>
            {errorPrefix}
            {resource.message}
          </p>
          {onRetry && resource.retryable ? (
            <Button data-testid={ids.retry} variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              {retryText}
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
    <div data-testid={ids.root} data-state={resource.status} className={cn(className)}>
      {body}
    </div>
  );
}

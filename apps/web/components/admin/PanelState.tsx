"use client";

/**
 * PanelState — 后台面板五态外壳（loading / empty / error+retry / forbidden / ready）。展示组件自 T120-26 起位于 @aidean/ui。
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
import { useCallback, useEffect, useRef, useState } from "react";
import { createLoadGuard } from "../../lib/admin/load-guard";
import { PANEL_LOADING, toPanelResource, type EnvelopeLike, type PanelResource } from "../../lib/admin/panel-resource";

// T120-26：展示外壳迁入 @aidean/ui，本文件重导出，调用点 0 改动。数据获取 hook 依赖 web 侧判定口径，留在本文件。
export { PanelState, type PanelStateProps } from "@aidean/ui";

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

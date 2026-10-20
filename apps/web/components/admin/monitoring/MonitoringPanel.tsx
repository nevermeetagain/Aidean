"use client";

/**
 * MonitoringPanel — /admin/monitoring 客户端编排（TASK-064）。
 *
 * 五态优先级（MONITORING_UX_STATES.adminMonitoring）：
 *   !canRead 或 401/403 → forbidden；首载未齐 → loading；
 *   源/变更首载失败 → error；源与变更都为空 → empty；否则 ready。
 * 手动运行：POST 返回 202 后每 5s 拉一次源列表，lastRunAt 相对基线变化即结束，
 * 最多 12 次（60s）；超时不改状态，仅提示稍后刷新。启停走 PATCH 并以返回 DTO 就地替换。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@aidean/ui";
import type { CatalogChangeEvent, MonitoringSource } from "@aidean/shared";

import { adminFetch } from "../adminFetch";
import { ChangeFeed, type ChangeKind } from "./ChangeFeed";
import { SourceTable } from "./SourceTable";

const PAGE_SIZE = 10;
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 12;

interface SourceListData {
  items: MonitoringSource[];
}

interface ChangeListData {
  items: CatalogChangeEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type ViewState = "loading" | "forbidden" | "error" | "empty" | "ready";

type NoticeTone = "info" | "ok" | "warn" | "error";

const NOTICE_CLASS: Record<NoticeTone, string> = {
  info: "border-sky-200 bg-sky-50/70 text-sky-800",
  ok: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
  warn: "border-amber-200 bg-amber-50/70 text-amber-800",
  error: "border-red-200 bg-red-50/70 text-red-800",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface MonitoringPanelProps {
  canRead: boolean;
  canWrite: boolean;
}

export function MonitoringPanel({ canRead, canWrite }: MonitoringPanelProps) {
  const [sources, setSources] = useState<MonitoringSource[]>([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [sourcesBusy, setSourcesBusy] = useState(false);

  const [changes, setChanges] = useState<ChangeListData>({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 });
  const [changesLoaded, setChangesLoaded] = useState(false);
  const [changesLoading, setChangesLoading] = useState(false);
  const [changesError, setChangesError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [kindFilter, setKindFilter] = useState<ChangeKind | "">("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [denied, setDenied] = useState(false);
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);

  const pollToken = useRef(0);

  const notify = useCallback((tone: NoticeTone, text: string) => {
    setNotice({ tone, text });
  }, []);

  const loadSources = useCallback(async (opts?: { silent?: boolean }): Promise<MonitoringSource[] | null> => {
    if (!opts?.silent) setSourcesBusy(true);
    const res = await adminFetch<SourceListData>("/api/v1/admin/monitoring/sources");
    if (!opts?.silent) setSourcesBusy(false);
    if (!res.ok || !res.data) {
      if (res.status === 401 || res.status === 403) {
        setDenied(true);
      } else if (!opts?.silent) {
        setSourcesError(res.message ?? "加载失败");
      }
      if (!opts?.silent) setSourcesLoaded(true);
      return null;
    }
    setSources(res.data.items);
    setSourcesError(null);
    setSourcesLoaded(true);
    return res.data.items;
  }, []);

  const loadChanges = useCallback(
    async (targetPage: number, kind: ChangeKind | "", sourceKey: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setChangesLoading(true);
      const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) });
      if (kind) params.set("kind", kind);
      if (sourceKey) params.set("sourceKey", sourceKey);
      const res = await adminFetch<ChangeListData>(`/api/v1/admin/monitoring/changes?${params.toString()}`);
      if (!opts?.silent) setChangesLoading(false);
      if (!res.ok || !res.data) {
        const msg = res.message ?? "加载失败";
        // 过滤后的空结果不算错误；仅请求失败时记录，避免把选项变化误判为整页错误
        setChangesError(msg);
        setChangesLoaded(true);
        return;
      }
      setChanges(res.data);
      setChangesError(null);
      setChangesLoaded(true);
    },
    [],
  );

  useEffect(() => {
    if (!canRead) return;
    void loadSources();
  }, [canRead, loadSources]);

  useEffect(() => {
    if (!canRead) return;
    void loadChanges(page, kindFilter, sourceFilter);
  }, [canRead, loadChanges, page, kindFilter, sourceFilter]);

  // 卸载时作废轮询令牌，避免 setState after unmount
  useEffect(
    () => () => {
      pollToken.current += 1;
    },
    [],
  );

  const reloadAll = () => {
    setSourcesLoaded(false);
    setChangesLoaded(false);
    setSourcesError(null);
    setChangesError(null);
    setDenied(false);
    void loadSources();
    void loadChanges(1, kindFilter, sourceFilter);
    setPage(1);
  };

  const toggleEnabled = async (row: MonitoringSource, enabled: boolean) => {
    setTogglingKeys((prev) => new Set(prev).add(row.key));
    const res = await adminFetch<MonitoringSource>(`/api/v1/admin/monitoring/sources/${row.key}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
    setTogglingKeys((prev) => {
      const next = new Set(prev);
      next.delete(row.key);
      return next;
    });
    if (!res.ok || !res.data) {
      notify("error", `${row.label} ${enabled ? "启用" : "停用"}失败：${res.message ?? "未知错误"}`);
      return;
    }
    const updated = res.data;
    setSources((prev) => prev.map((s) => (s.key === updated.key ? updated : s)));
    notify("ok", `${updated.label} 已${updated.enabled ? "启用" : "停用"}`);
  };

  const pollLastRun = async (key: string, label: string, baseline: string | null) => {
    const token = ++pollToken.current;
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      if (pollToken.current !== token) return;
      const items = await loadSources({ silent: true });
      if (pollToken.current !== token) return;
      const next = items?.find((s) => s.key === key);
      if (!next || next.lastRunAt === baseline) continue;
      setRunningKey(null);
      if (next.lastStatus === "ok") {
        notify("ok", `${label} 采集完成：${next.lastCount ?? 0} 条`);
      } else if (next.lastStatus === "partial") {
        notify("warn", `${label} 部分成功：${next.lastCount ?? 0} 条；${next.lastError ?? "部分条目失败"}`);
      } else {
        notify("error", `${label} 采集失败：${next.lastError ?? next.lastStatus}`);
      }
      void loadChanges(1, kindFilter, sourceFilter, { silent: true });
      setPage(1);
      return;
    }
    if (pollToken.current !== token) return;
    setRunningKey(null);
    notify("warn", "已等待 60s 仍未看到新的运行记录；调度器可能排队中，可稍后刷新查看。");
  };

  const runSource = async (row: MonitoringSource) => {
    if (runningKey) return;
    setRunningKey(row.key);
    setNotice(null);
    const res = await adminFetch<{ accepted: true; sourceKey: string; lockTtlSeconds: number }>(
      `/api/v1/admin/monitoring/sources/${row.key}/run`,
      { method: "POST" },
    );
    if (!res.ok) {
      setRunningKey(null);
      notify("error", res.status === 429 ? "该源正在运行（锁内），请稍后再试" : `触发失败：${res.message ?? "未知错误"}`);
      return;
    }
    notify("info", `已触发 ${row.label} 采集，每 5s 检查运行结果…`);
    await pollLastRun(row.key, row.label, row.lastRunAt);
  };

  const handleKindChange = (kind: ChangeKind | "") => {
    setKindFilter(kind);
    setPage(1);
  };

  const handleSourceChange = (key: string) => {
    setSourceFilter(key);
    setPage(1);
  };

  const viewState: ViewState = !canRead || denied
    ? "forbidden"
    : !sourcesLoaded || !changesLoaded
      ? "loading"
      : sourcesError || (changesError && changes.items.length === 0)
        ? "error"
        : sources.length === 0 && changes.items.length === 0
          ? "empty"
          : "ready";

  return (
    <div className="space-y-4">
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="monitoring-notice"
          className={`rounded-lg border px-3 py-2 text-xs ${NOTICE_CLASS[notice.tone]}`}
        >
          {notice.text}
        </div>
      ) : null}

      {viewState === "forbidden" ? (
        <div
          data-testid="monitoring-forbidden"
          className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-8 text-center text-sm text-amber-800"
        >
          无权限查看模型源监控
          <p className="mt-1 text-xs text-amber-700">需要 admin.sync.read 权限；请联系管理员分配角色。</p>
        </div>
      ) : null}

      {viewState === "loading" ? (
        <div
          data-testid="monitoring-loading"
          className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400"
        >
          <span className="inline-flex animate-pulse items-center gap-2">加载中…</span>
        </div>
      ) : null}

      {viewState === "error" ? (
        <div
          data-testid="monitoring-error"
          className="rounded-lg border border-red-200 bg-red-50/60 px-4 py-8 text-center text-sm text-red-700"
        >
          加载失败，可重试
          <p className="mt-1 text-xs text-red-600">{sourcesError ?? changesError ?? "未知错误"}</p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={reloadAll}>
              重试
            </Button>
          </div>
        </div>
      ) : null}

      {viewState === "empty" ? (
        <div
          data-testid="monitoring-empty"
          className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500"
        >
          尚未注册监控源或尚无变更
          <p className="mt-1 text-xs text-slate-400">调度器首次运行后，源状态与变更事件会出现在这里。</p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={reloadAll}>
              刷新
            </Button>
          </div>
        </div>
      ) : null}

      {viewState === "ready" ? (
        <div data-testid="monitoring-ready" className="space-y-6">
          <SourceTable
            rows={sources}
            canWrite={canWrite}
            busy={sourcesBusy}
            busyKeys={togglingKeys}
            runningKey={runningKey}
            onToggleEnabled={toggleEnabled}
            onRun={runSource}
            onRefresh={() => void loadSources()}
          />
          <ChangeFeed
            rows={changes.items}
            total={changes.total}
            page={changes.page}
            pageSize={changes.pageSize}
            totalPages={changes.totalPages}
            loading={changesLoading}
            error={changesError}
            kind={kindFilter}
            sourceKey={sourceFilter}
            sourceOptions={sources.map((s) => ({ key: s.key, label: s.label }))}
            onKindChange={handleKindChange}
            onSourceChange={handleSourceChange}
            onPageChange={setPage}
            onRetry={() => void loadChanges(page, kindFilter, sourceFilter)}
          />
        </div>
      ) : null}
    </div>
  );
}

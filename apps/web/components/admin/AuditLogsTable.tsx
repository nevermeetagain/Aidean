"use client";

/**
 * 审计日志查看器（T-2.3.4 + R-40 AdminDataTable 迁移）：
 * 分页 + tableName/action 过滤，只读展示。
 * 不暴露 actorIp/requestId 等敏感字段。
 * 行点击展开 oldData/newData 详情。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input } from "@aidean/ui";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { PanelState, usePanelResource } from "./PanelState";
import { panelTestIds } from "../../lib/admin/panel-resource";

export interface AuditLogRow {
  id: string;
  tableName: string;
  recordId: string;
  action: number;
  actionLabel: string;
  changedFields: string[];
  oldData: unknown;
  newData: unknown;
  actorId: string | null;
  createdAt: string;
}

const TABLE_OPTIONS = [
  "ai_models",
  "users",
  "benchmarks",
  "sync_batches",
  "wallets",
  "stations",
];

/** 列表数据形状（信封 data）；分页口径沿用 B11-11（page/pageSize=20 + tableName/action 过滤） */
export type AuditListData = { items: AuditLogRow[]; total: number };

/** 五态外壳 testid 前缀（B11-05） */
export const AUDIT_PANEL_PREFIX = "admin-audit-logs";

export const AUDIT_PAGE_SIZE = 20;

export function buildAuditUrl(page = 1, tableName = "", action = ""): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(AUDIT_PAGE_SIZE) });
  if (tableName) params.set("tableName", tableName);
  if (action) params.set("action", action);
  return `/api/v1/admin/audit-logs?${params}`;
}

/** 首屏地址（单测锁定 loader 无参调用的请求 URL，与改造前完全一致） */
export const AUDIT_LIST_URL = buildAuditUrl();

export const loadAuditLogs = (signal?: AbortSignal, page = 1, tableName = "", action = "") =>
  adminFetch<AuditListData>(buildAuditUrl(page, tableName, action), { signal });

export function AuditLogsTable() {
  const ids = panelTestIds(AUDIT_PANEL_PREFIX);
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  // 「查询」重复点击也要重取：nonce 计入签名，但不进 URL
  const [queryNonce, setQueryNonce] = useState(0);

  const loader = useCallback(
    (signal: AbortSignal) => loadAuditLogs(signal, page, tableFilter, actionFilter),
    [page, tableFilter, actionFilter],
  );
  const { resource, reload } = usePanelResource(loader, (d) => d.items.length === 0);

  // 筛选/翻页/主动查询才重新取数：以查询签名比对（StrictMode 下 effect 双跑也不会重复请求）
  const signature = `${tableFilter}|${actionFilter}|${page}|${queryNonce}`;
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    reload();
  }, [signature, reload]);

  const data = resource.status === "ready" ? resource.data : null;

  const columns: Column<AuditLogRow>[] = [
    {
      key: "createdAt",
      header: "时间",
      className: "px-3 py-2 text-xs text-slate-500",
      render: log => <span>{new Date(log.createdAt).toLocaleString('zh-CN')}</span>,
    },
    {
      key: "action",
      header: "操作",
      className: "px-3 py-2",
      render: log => (
        <span className={`rounded px-1.5 py-0.5 text-xs ${
          log.action === 1 ? 'bg-emerald-50 text-emerald-600' :
          log.action === 2 ? 'bg-amber-50 text-amber-600' :
          'bg-red-50 text-red-600'
        }`}>
          {log.actionLabel}
        </span>
      ),
    },
    {
      key: "tableName",
      header: "表",
      className: "px-3 py-2 text-xs font-mono text-slate-600",
      render: log => <span>{log.tableName}</span>,
    },
    {
      key: "recordId",
      header: "记录ID",
      className: "px-3 py-2 text-xs font-mono text-slate-400",
      render: log => <span>{log.recordId.slice(0, 8)}...</span>,
    },
    {
      key: "changedFields",
      header: "变更字段",
      className: "px-3 py-2 text-xs text-slate-500",
      render: log => <span>{log.changedFields.join(', ')}</span>,
    },
    {
      key: "actorId",
      header: "操作人",
      className: "px-3 py-2 text-xs text-slate-500",
      render: log => <span>{log.actorId?.slice(0, 8) ?? 'system'}</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQueryNonce((n) => n + 1);
        }}
      >
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">全部表</option>
          {TABLE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">全部操作</option>
          <option value="1">INSERT</option>
          <option value="2">UPDATE</option>
          <option value="3">DELETE</option>
        </select>
        <Button variant="primary" size="sm" type="submit">查询</Button>
        <span className="ml-auto text-xs text-slate-500">{data ? `共 ${data.total} 条日志` : null}</span>
      </form>

      <PanelState testId={ids.root} resource={resource} onRetry={reload} emptyText="暂无审计日志">
        {(d) => (
          <AdminDataTable
            columns={columns}
            rows={d.items}
            rowKey={log => log.id}
            rowTestId={(log) => `${ids.root}-row-${log.id}`}
            page={page}
            totalPages={Math.max(1, Math.ceil(d.total / AUDIT_PAGE_SIZE))}
            total={d.total}
            onPageChange={p => setPage(p)}
            expandedRowId={expanded}
            onRowClick={id => setExpanded(expanded === id ? null : id)}
            expandedRowRender={log => (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="mb-1 font-medium text-slate-600">变更前 (oldData)</div>
                  <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-slate-500">
                    {log.oldData ? JSON.stringify(log.oldData, null, 2) : 'null'}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 font-medium text-slate-600">变更后 (newData)</div>
                  <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-slate-500">
                    {log.newData ? JSON.stringify(log.newData, null, 2) : 'null'}
                  </pre>
                </div>
              </div>
            )}
          />
        )}
      </PanelState>
    </div>
  );
}

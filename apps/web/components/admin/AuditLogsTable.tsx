"use client";

/**
 * 审计日志查看器（T-2.3.4 + R-40 AdminDataTable 迁移）：
 * 分页 + tableName/action 过滤，只读展示。
 * 不暴露 actorIp/requestId 等敏感字段。
 * 行点击展开 oldData/newData 详情。
 * UX-23：page / tableName / action 回写 URL query（刷新保持，初值由 page.tsx 解析传入）。
 * UX-27：表名与操作类型对运营展示中文业务名（URL/API 仍用原始值，契约不变）。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input } from "@aidean/ui";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { PanelState, usePanelResource } from "./PanelState";
import { panelTestIds } from "../../lib/admin/panel-resource";
import { replaceUrlQuery } from "./url-query";
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ACTION_VALUES,
  AUDIT_QUERY_KEYS,
  AUDIT_TABLE_LABEL,
  AUDIT_TABLE_VALUES,
} from "./audit-labels";

export { AUDIT_ACTION_LABEL, AUDIT_ACTION_VALUES, AUDIT_TABLE_LABEL, AUDIT_TABLE_VALUES };

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

const TABLE_OPTIONS = AUDIT_TABLE_VALUES;

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

export function AuditLogsTable({
  initialPage = 1,
  initialTable = "",
  initialAction = "",
}: {
  initialPage?: number;
  initialTable?: string;
  initialAction?: string;
}) {
  const ids = panelTestIds(AUDIT_PANEL_PREFIX);
  const [page, setPage] = useState(initialPage);
  const [tableFilter, setTableFilter] = useState(initialTable);
  const [actionFilter, setActionFilter] = useState(initialAction);
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

  // UX-23：查询态回写地址栏（默认值不入 URL）
  useEffect(() => {
    replaceUrlQuery({ page, tableName: tableFilter, action: actionFilter }, AUDIT_QUERY_KEYS);
  }, [page, tableFilter, actionFilter]);

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
          log.action === 1 ? 'bg-emerald-50 text-emerald-700' :
          log.action === 2 ? 'bg-amber-50 text-amber-700' :
          'bg-red-50 text-red-700'
        }`}>
          {AUDIT_ACTION_LABEL[String(log.action)] ?? log.actionLabel}
        </span>
      ),
    },
    {
      key: "tableName",
      header: "数据对象",
      className: "px-3 py-2 text-xs text-slate-600",
      render: log => <span title={log.tableName}>{AUDIT_TABLE_LABEL[log.tableName] ?? log.tableName}</span>,
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
      render: log => <span>{log.actorId?.slice(0, 8) ?? '系统'}</span>,
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
        <select aria-label="按数据对象筛选"
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">全部数据对象</option>
          {TABLE_OPTIONS.map((t) => (
            <option key={t} value={t}>{AUDIT_TABLE_LABEL[t]}</option>
          ))}
        </select>
        <select aria-label="按操作类型筛选"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">全部操作</option>
          {AUDIT_ACTION_VALUES.map((a) => (
            <option key={a} value={a}>{AUDIT_ACTION_LABEL[a]}</option>
          ))}
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
                  <div className="mb-1 font-medium text-slate-600">变更前</div>
                  <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-slate-500">
                    {log.oldData ? JSON.stringify(log.oldData, null, 2) : 'null'}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 font-medium text-slate-600">变更后</div>
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

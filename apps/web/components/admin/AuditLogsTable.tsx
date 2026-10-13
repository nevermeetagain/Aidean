"use client";

/**
 * 审计日志查看器（T-2.3.4 + R-40 AdminDataTable 迁移）：
 * 分页 + tableName/action 过滤，只读展示。
 * 不暴露 actorIp/requestId 等敏感字段。
 * 行点击展开 oldData/newData 详情。
 */

import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@aidean/ui";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";

interface AuditLogRow {
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

export function AuditLogsTable() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async (p: number) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (tableFilter) params.set('tableName', tableFilter);
    if (actionFilter) params.set('action', actionFilter);
    setLoading(true);
    const res = await adminFetch<{ items: AuditLogRow[]; total: number }>(
      `/api/v1/admin/audit-logs?${params}`
    );
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setTotal(res.data.total);
    }
  }, [tableFilter, actionFilter]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
          void load(1);
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
        <span className="ml-auto text-xs text-slate-500">共 {total} 条日志</span>
      </form>

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={log => log.id}
        emptyText="暂无审计日志"
        busy={loading}
        page={page}
        totalPages={totalPages}
        total={total}
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
    </div>
  );
}

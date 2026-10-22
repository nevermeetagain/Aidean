"use client";

/**
 * LogsBoard — S5「日志中心」只读聚合看板（restructure-admin-nav-rbac-cms）。
 *
 * 五类记录分 Tab 呈现，全部只读（无新增/编辑/删除入口）：
 *  · 审计      —— 复用既有 AuditLogsTable（/admin/audit-logs API，admin.audit-logs.read）
 *  · 网关调用  —— /api/v1/admin/logs/usage（admin.logs.read）
 *  · 采集同步  —— 复用 /api/v1/admin/sync/batches（admin.sync.read）
 *  · 脚本执行  —— /api/v1/admin/logs/scripts（admin.logs.read）
 *  · 安全事件  —— /api/v1/admin/logs/security（admin.logs.read，TOKEN/CONSENT 双子视图）
 *
 * 设计：账本/记录类一律只读、分页封顶（pageSize=20），仅提供筛选，不提供删改（对齐决策⑤/铁律）。
 */

import { useCallback, useEffect, useState } from "react";
import { Button, Label, Select } from "@aidean/ui";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { AuditLogsTable } from "./AuditLogsTable";

const PAGE_SIZE = 20;

type TabKey = "audit" | "usage" | "sync" | "scripts" | "security";

const TABS: { key: TabKey; label: string }[] = [
  { key: "audit", label: "审计" },
  { key: "usage", label: "网关调用" },
  { key: "sync", label: "采集同步" },
  { key: "scripts", label: "脚本执行" },
  { key: "security", label: "安全事件" },
];

interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

/** 通用「按 page 拉取 + 分页态」逻辑，供各只读 Tab 复用。 */
function usePagedQuery<T>(buildUrl: (page: number) => string, deps: unknown[]) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await adminFetch<Paged<T>>(buildUrl(p));
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setTotal(res.data.total);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    void load(page);
  }, [load, page]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const reload = useCallback(() => {
    setPage(1);
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);
  return { rows, total, page, setPage, loading, totalPages, reload };
}

function ts(v: string) {
  return new Date(v).toLocaleString("zh-CN");
}

// ==================== 网关调用 Tab ====================

interface UsageRow {
  id: string;
  requestId: string;
  userEmail: string;
  model: string;
  provider: string | null;
  billingPath: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  quotaMinor: string;
  quotaYuan: string;
  latencyMs: number | null;
  statusCode: number | null;
  isStream: boolean;
  hasError: boolean;
  error: string | null;
  createdAt: string;
}

function UsageTab() {
  const [model, setModel] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const q = usePagedQuery<UsageRow>(
    (p) => {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (model) params.set("model", model);
      if (onlyErrors) params.set("onlyErrors", "true");
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return `/api/v1/admin/logs/usage?${params}`;
    },
    [model, onlyErrors, from, to],
  );

  const columns: Column<UsageRow>[] = [
    { key: "createdAt", header: "时间", render: (r) => <span>{ts(r.createdAt)}</span> },
    { key: "userEmail", header: "用户", render: (r) => <span className="text-xs">{r.userEmail}</span> },
    { key: "model", header: "模型", render: (r) => <span className="font-mono text-xs">{r.model}</span> },
    { key: "billingPath", header: "计费", render: (r) => <span className="text-xs">{r.billingPath}</span> },
    {
      key: "tokens",
      header: "Tokens",
      render: (r) => <span className="text-xs tabular-nums">{r.promptTokens + r.completionTokens}</span>,
    },
    { key: "quotaYuan", header: "费用(元)", render: (r) => <span className="text-xs tabular-nums">{r.quotaYuan}</span> },
    {
      key: "statusCode",
      header: "状态",
      render: (r) => (
        <span className={`rounded px-1.5 py-0.5 text-xs ${r.hasError ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
          {r.statusCode ?? (r.hasError ? "ERR" : "-")}
        </span>
      ),
    },
    { key: "latencyMs", header: "延迟", render: (r) => <span className="text-xs tabular-nums">{r.latencyMs != null ? `${r.latencyMs}ms` : "-"}</span> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="模型标识" className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm" />
        <span className="text-xs text-slate-400">至</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm" />
        <Label className="flex items-center gap-1 text-xs text-slate-600 font-normal">
          <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />仅错误
        </Label>
        <Button variant="primary" size="sm" onClick={q.reload}>查询</Button>
        <span className="ml-auto text-xs text-slate-500">共 {q.total} 条</span>
      </div>
      <AdminDataTable
        columns={columns}
        rows={q.rows}
        rowKey={(r) => r.id}
        emptyText="暂无网关调用记录"
        busy={q.loading}
        page={q.page}
        totalPages={q.totalPages}
        total={q.total}
        onPageChange={(p) => q.setPage(p)}
        expandedRowId={expanded}
        onRowClick={(id) => setExpanded(expanded === id ? null : id)}
        expandedRowRender={(r) => (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="mb-1 font-medium text-slate-600">请求标识</div>
              <div className="font-mono text-slate-500">{r.requestId}</div>
              <div className="mt-2 text-slate-500">
                prompt {r.promptTokens} · completion {r.completionTokens} · cached {r.cachedTokens} · reasoning {r.reasoningTokens}
              </div>
              <div className="text-slate-500">provider {r.provider ?? "-"} · {r.isStream ? "流式" : "非流式"} · quota {r.quotaMinor}（分）</div>
            </div>
            <div>
              <div className="mb-1 font-medium text-slate-600">错误信息</div>
              <pre className="max-h-40 overflow-auto rounded bg-white p-2 text-red-500">{r.error ?? "无"}</pre>
            </div>
          </div>
        )}
      />
    </div>
  );
}

// ==================== 采集同步 Tab ====================

interface SyncRow {
  id: string;
  batchCode: string;
  source: string | null;
  status: string;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  createdAt: string;
  _count?: { changeLogs: number };
}

function SyncTab() {
  const [status, setStatus] = useState("");
  const q = usePagedQuery<SyncRow>(
    (p) => {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      return `/api/v1/admin/sync/batches?${params}`;
    },
    [status],
  );

  const columns: Column<SyncRow>[] = [
    { key: "createdAt", header: "时间", render: (r) => <span>{ts(r.createdAt)}</span> },
    { key: "batchCode", header: "批次码", render: (r) => <span className="font-mono text-xs">{r.batchCode}</span> },
    { key: "source", header: "来源", render: (r) => <span className="text-xs">{r.source ?? "-"}</span> },
    {
      key: "status",
      header: "状态",
      render: (r) => (
        <span className={`rounded px-1.5 py-0.5 text-xs ${r.status === "completed" ? "bg-emerald-50 text-emerald-600" : r.status === "failed" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
          {r.status}
        </span>
      ),
    },
    { key: "totalRecords", header: "总数", render: (r) => <span className="tabular-nums">{r.totalRecords}</span> },
    { key: "successRecords", header: "成功", render: (r) => <span className="tabular-nums text-emerald-600">{r.successRecords}</span> },
    { key: "failedRecords", header: "失败", render: (r) => <span className="tabular-nums text-red-600">{r.failedRecords}</span> },
    { key: "changes", header: "变更", render: (r) => <span className="tabular-nums">{r._count?.changeLogs ?? 0}</span> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white">
          <option value="">全部状态</option>
          <option value="running">running</option>
          <option value="completed">completed</option>
          <option value="partial">partial</option>
          <option value="failed">failed</option>
        </Select>
        <Button variant="primary" size="sm" onClick={q.reload}>查询</Button>
        <span className="ml-auto text-xs text-slate-500">共 {q.total} 条</span>
      </div>
      <AdminDataTable
        columns={columns}
        rows={q.rows}
        rowKey={(r) => r.id}
        emptyText="暂无采集批次"
        busy={q.loading}
        page={q.page}
        totalPages={q.totalPages}
        total={q.total}
        onPageChange={(p) => q.setPage(p)}
      />
    </div>
  );
}

// ==================== 脚本执行 Tab ====================

interface ScriptRow {
  id: string;
  scriptId: string;
  scriptName: string;
  status: number;
  statusLabel: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorMsg: string | null;
  createdAt: string;
}

function ScriptsTab() {
  const [status, setStatus] = useState("");
  const q = usePagedQuery<ScriptRow>(
    (p) => {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      return `/api/v1/admin/logs/scripts?${params}`;
    },
    [status],
  );

  const columns: Column<ScriptRow>[] = [
    { key: "startedAt", header: "开始", render: (r) => <span>{ts(r.startedAt)}</span> },
    { key: "scriptName", header: "脚本", render: (r) => <span className="text-xs">{r.scriptName}</span> },
    {
      key: "statusLabel",
      header: "状态",
      render: (r) => (
        <span className={`rounded px-1.5 py-0.5 text-xs ${r.status === 1 ? "bg-emerald-50 text-emerald-600" : r.status === 2 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
          {r.statusLabel}
        </span>
      ),
    },
    { key: "durationMs", header: "耗时", render: (r) => <span className="text-xs tabular-nums">{r.durationMs != null ? `${r.durationMs}ms` : "-"}</span> },
    { key: "errorMsg", header: "错误", render: (r) => <span className="text-xs text-red-500">{r.errorMsg ? r.errorMsg.slice(0, 60) : "-"}</span> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white">
          <option value="">全部状态</option>
          <option value="0">执行中</option>
          <option value="1">成功</option>
          <option value="2">失败</option>
        </Select>
        <Button variant="primary" size="sm" onClick={q.reload}>查询</Button>
        <span className="ml-auto text-xs text-slate-500">共 {q.total} 条</span>
      </div>
      <AdminDataTable
        columns={columns}
        rows={q.rows}
        rowKey={(r) => r.id}
        emptyText="暂无脚本执行记录"
        busy={q.loading}
        page={q.page}
        totalPages={q.totalPages}
        total={q.total}
        onPageChange={(p) => q.setPage(p)}
      />
    </div>
  );
}

// ==================== 安全事件 Tab ====================

interface TokenRow {
  id: string;
  jtiPrefix: string;
  chainPrefix: string;
  clientId: string | null;
  userEmail: string;
  ip: string | null;
  userAgent: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface ConsentRow {
  id: string;
  userEmail: string;
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt: string;
}

function SecurityTab() {
  const [kind, setKind] = useState<"TOKEN" | "CONSENT">("TOKEN");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");
  const q = usePagedQuery<TokenRow | ConsentRow>(
    (p) => {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE), kind });
      if (userId) params.set("userId", userId);
      if (kind === "TOKEN" && status) params.set("status", status);
      return `/api/v1/admin/logs/security?${params}`;
    },
    [kind, userId, status],
  );

  const tokenColumns: Column<TokenRow>[] = [
    { key: "createdAt", header: "签发", render: (r) => <span>{ts(r.createdAt)}</span> },
    { key: "userEmail", header: "用户", render: (r) => <span className="text-xs">{r.userEmail}</span> },
    { key: "clientId", header: "签发方", render: (r) => <span className="font-mono text-xs">{r.clientId ?? "主站"}</span> },
    { key: "jtiPrefix", header: "jti", render: (r) => <span className="font-mono text-xs text-slate-400">{r.jtiPrefix}…</span> },
    {
      key: "status",
      header: "状态",
      render: (r) => (
        <span className={`rounded px-1.5 py-0.5 text-xs ${r.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : r.status === "EXPIRED" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-600"}`}>
          {r.status}
        </span>
      ),
    },
    { key: "ip", header: "IP", render: (r) => <span className="text-xs">{r.ip ?? "-"}</span> },
  ];

  const consentColumns: Column<ConsentRow>[] = [
    { key: "createdAt", header: "时间", render: (r) => <span>{ts(r.createdAt)}</span> },
    { key: "userEmail", header: "用户", render: (r) => <span className="text-xs">{r.userEmail}</span> },
    { key: "clientName", header: "接入方", render: (r) => <span className="text-xs">{r.clientName}</span> },
    { key: "clientId", header: "clientId", render: (r) => <span className="font-mono text-xs text-slate-400">{r.clientId}</span> },
    { key: "scopes", header: "授权范围", render: (r) => <span className="text-xs">{r.scopes.join(", ")}</span> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded border border-slate-200">
          <Button variant={kind === "TOKEN" ? "primary" : "ghost"} size="sm" onClick={() => setKind("TOKEN")}>刷新令牌</Button>
          <Button variant={kind === "CONSENT" ? "primary" : "ghost"} size="sm" onClick={() => setKind("CONSENT")}>授权同意</Button>
        </div>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="用户 ID（精确）" className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm" />
        {kind === "TOKEN" && (
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white">
            <option value="">全部状态</option>
            <option value="ACTIVE">有效</option>
            <option value="ROTATED">已轮换</option>
            <option value="REVOKED">已撤销</option>
            <option value="EXPIRED">已过期</option>
          </Select>
        )}
        <Button variant="primary" size="sm" onClick={q.reload}>查询</Button>
        <span className="ml-auto text-xs text-slate-500">共 {q.total} 条</span>
      </div>
      <AdminDataTable
        columns={(kind === "TOKEN" ? tokenColumns : consentColumns) as Column<unknown>[]}
        rows={q.rows as unknown[]}
        rowKey={(r) => (r as { id: string }).id}
        emptyText={kind === "TOKEN" ? "暂无刷新令牌记录" : "暂无授权同意记录"}
        busy={q.loading}
        page={q.page}
        totalPages={q.totalPages}
        total={q.total}
        onPageChange={(p) => q.setPage(p)}
      />
    </div>
  );
}

// ==================== 看板容器 ====================

export function LogsBoard() {
  const [tab, setTab] = useState<TabKey>("usage");
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="日志中心" className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            variant="ghost"
            onClick={() => setTab(t.key)}
            className={`-mb-px rounded-none border-b-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-transparent ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "audit" && <AuditLogsTable />}
        {tab === "usage" && <UsageTab />}
        {tab === "sync" && <SyncTab />}
        {tab === "scripts" && <ScriptsTab />}
        {tab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}

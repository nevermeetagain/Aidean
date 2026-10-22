"use client";

/**
 * HoldsPanel — 在途冻结款（BalanceHold）只读页签（S5 / M6 / G3）。
 *
 * 消费 GET /api/v1/admin/holds：status 过滤 + 创建时间范围（from/to）+ 分页。
 * 金额后端已 BigInt→string（分）并附 amountYuan 元口径，前端直显；capturedMinor 前端转元。
 * 只读，无写操作；释放/捕获资金由既有 billing capture/reverse 链在其它处置面完成，此处不新造资金逻辑。
 * UX 五态（§4⑥）：加载骨架（AdminDataTable busy）/ 错误脱敏（error 文案）/ 空态 / 成功；权限由后端逐接口强制。
 */

import { useState } from "react";
import { Badge, Input } from "@aidean/ui";
import { useAdminList } from "../../hooks/useAdminList";
import { AdminDataTable, type Column } from "./AdminDataTable";

interface HoldRow {
  id: string;
  userId: string;
  currency: string;
  amountMinor: string;
  amountYuan: string;
  capturedMinor: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface HoldsResponse {
  items: HoldRow[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  AUTHORIZED: "default",
  CAPTURED: "secondary",
  VOIDED: "destructive",
  EXPIRED: "secondary",
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部状态" },
  { value: "AUTHORIZED", label: "在途冻结" },
  { value: "CAPTURED", label: "已捕获" },
  { value: "VOIDED", label: "已作废" },
  { value: "EXPIRED", label: "已过期" },
];

function fenToYuanDisplay(fen: string): string {
  const n = Number(fen);
  return Number.isNaN(n) ? "0.00" : (n / 100).toFixed(2);
}

export function HoldsPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const pageSize = 20;

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { rows, total, loading, error } = useAdminList<HoldsResponse, HoldRow>({
    url: `/api/v1/admin/holds?${params.toString()}`,
    select: (data) => ({ rows: data.items ?? [], total: data.total }),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: Column<HoldRow>[] = [
    {
      key: "user",
      header: "用户",
      className: "px-3 py-2 text-slate-700",
      render: (r) => <span title={r.userId}>{r.userId.slice(0, 8)}…</span>,
    },
    {
      key: "amount",
      header: "冻结金额",
      className: "px-3 py-2 text-xs font-semibold text-slate-700",
      render: (r) => <span>¥{r.amountYuan} {r.currency}</span>,
    },
    {
      key: "captured",
      header: "已捕获",
      className: "px-3 py-2 text-xs text-slate-500",
      render: (r) => <span>¥{fenToYuanDisplay(r.capturedMinor)}</span>,
    },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: (r) => <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>,
    },
    {
      key: "createdAt",
      header: "创建时间",
      className: "px-3 py-2 text-xs text-slate-400",
      render: (r) => <span>{new Date(r.createdAt).toLocaleString("zh-CN")}</span>,
    },
    {
      key: "expiresAt",
      header: "过期时间",
      className: "px-3 py-2 text-xs text-slate-400",
      render: (r) => <span>{new Date(r.expiresAt).toLocaleString("zh-CN")}</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="按状态筛选"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          从
          <Input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="h-8 text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          至
          <Input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="h-8 text-xs"
          />
        </label>
        <span className="ml-auto text-xs text-slate-500">共 {total} 条冻结</span>
      </div>

      {error ? <div className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</div> : null}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        emptyText="暂无在途冻结款"
        busy={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}

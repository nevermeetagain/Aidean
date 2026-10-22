"use client";

/**
 * 钱包管理（R-10 修复 + R-31 AdminDataTable + R-32 Dialog/Button/Input）：
 * - 分页列表（status 过滤）
 * - 冻结/解冻钱包（PATCH /api/v1/admin/wallets）
 * - 余额调账（POST /api/v1/admin/wallets/adjust）
 * BigInt 余额由后端序列化为 string，前端显示时转 yuan。
 */

import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Badge, Dialog, Button, Input } from "@aidean/ui";

interface WalletRow {
  id: string;
  userId: string;
  balanceMinor: string;
  status: string;
  user?: { email: string; nickname: string | null } | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  FROZEN: "destructive",
  CLOSED: "secondary",
};

function fenToYuan(fen: string): string {
  const n = Number(fen);
  if (isNaN(n)) return "0.00";
  return (n / 100).toFixed(2);
}

export function WalletsManager() {
  const [rows, setRows] = useState<WalletRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<WalletRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  // 内联提示（替代原生 alert）：顶层状态 + 调账表单级错误
  const [message, setMessage] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async (p: number) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (statusFilter) params.set("status", statusFilter);
    setLoading(true);
    const res = await adminFetch<{ items: WalletRow[]; total: number }>(
      `/api/v1/admin/wallets?${params}`
    );
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setTotal(res.data.total);
    }
  }, [statusFilter]);

  useEffect(() => { void load(page); }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleFreeze(row: WalletRow, target: string) {
    const res = await adminFetch(`/api/v1/admin/wallets`, {
      method: "PATCH",
      body: JSON.stringify({ walletId: row.id, status: target }),
    });
    if (res.ok) {
      void load(page);
      setMessage(target === "FROZEN" ? "已冻结该钱包" : "已解冻该钱包");
    } else {
      setMessage(res.message ?? "操作失败");
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      setAdjustError("金额必须为非零数字");
      return;
    }
    const res = await adminFetch("/api/v1/admin/wallets/adjust", {
      method: "POST",
      body: JSON.stringify({
        walletId: adjustTarget.id,
        amountMinor: Math.round(amount * 100),
        note: adjustNote,
      }),
    });
    if (res.ok) {
      setAdjustTarget(null);
      setAdjustAmount("");
      setAdjustNote("");
      setAdjustError(null);
      void load(page);
      setMessage("调账完成");
    } else {
      setAdjustError(res.message ?? "调账失败");
    }
  }

  const columns: Column<WalletRow>[] = [
    {
      key: "user",
      header: "用户",
      className: "px-3 py-2 text-xs text-slate-600",
      render: row => <span>{row.user?.nickname ?? row.user?.email ?? row.userId.slice(0, 8)}</span>,
    },
    {
      key: "balance",
      header: "余额（¥）",
      className: "px-3 py-2 text-xs font-semibold text-slate-700",
      render: row => <span>¥{fenToYuan(row.balanceMinor)}</span>,
    },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: row => <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{row.status}</Badge>,
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: row => (
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => setAdjustTarget(row)}>调账</Button>
          {row.status === "ACTIVE" ? (
            <Button variant="danger" size="sm" onClick={() => handleFreeze(row, "FROZEN")}>冻结</Button>
          ) : row.status === "FROZEN" ? (
            <Button variant="outline" size="sm" onClick={() => handleFreeze(row, "ACTIVE")}>解冻</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select aria-label="按状态筛选" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm">
          <option value="">全部状态</option>
          <option value="ACTIVE">活跃</option>
          <option value="FROZEN">冻结</option>
          <option value="CLOSED">已关闭</option>
        </select>
        <Button variant="primary" size="sm" onClick={() => { setPage(1); void load(1); }}>查询</Button>
        <span className="ml-auto text-xs text-slate-500">共 {total} 个钱包</span>
      </div>

      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={row => row.id}
        emptyText="暂无钱包数据"
        busy={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />

      {/* 余额调账 Dialog — R-32 @aidean/ui Dialog */}
      <Dialog
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title="余额调账"
        className="max-w-xs"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setAdjustTarget(null)}>取消</Button>
            <Button variant="primary" size="sm" onClick={(e) => void handleAdjust(e as unknown as React.FormEvent)}>确认调账</Button>
          </>
        }
      >
        <form onSubmit={handleAdjust} className="space-y-3">
          <p className="text-xs text-slate-500">用户: {adjustTarget?.user?.nickname ?? adjustTarget?.user?.email ?? adjustTarget?.userId.slice(0, 8)}</p>
          <p className="text-xs text-slate-500">当前余额: ¥{adjustTarget ? fenToYuan(adjustTarget.balanceMinor) : ""}</p>
          <Input
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder="金额（元，正数加/负数减）"
            type="number"
            step="0.01"
            required
          />
          <Input
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
            placeholder="备注（必填）"
            required
          />
          {adjustError ? <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{adjustError}</div> : null}
        </form>
      </Dialog>
    </div>
  );
}

"use client";

/**
 * OrdersManager — 订单/流水只读管理（R-17 修复 + R-40 AdminDataTable 迁移）。
 *
 * 三种类型切换：RECHARGE（充值）/ PACKAGE_ORDER（套餐）/ LEDGER（账本流水）
 * 仅读，无写操作。动态列定义按 type 切换。
 *
 * #35④ 打样：数据获取接入 useAdminList（loading 通道 + 晚到响应守卫），
 * 验证通过后其余 Manager 按此模式推广。
 */

import { useState } from "react";
import { Badge, Button, Dialog, Input } from "@aidean/ui";
import { useAdminList } from "../../hooks/useAdminList";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { adminFetch } from "./adminFetch";
import { ConfirmDialog } from "./ConfirmDialog";

type OrderType = "RECHARGE" | "PACKAGE_ORDER" | "LEDGER";

interface BaseRow {
  id: string;
  userEmail: string;
  status: string;
  createdAt: string;
}

interface RechargeRow extends BaseRow {
  totalYuan: string;
  payMethod: string;
  paidAt: string | null;
}

interface PackageRow extends BaseRow {
  packageTitle: string;
  redeemedAt: string;
  expiresAt: string | null;
}

interface LedgerRow extends BaseRow {
  direction: string;
  amountYuan: string;
  entryType: string;
}

interface OrdersResponse {
  type: string;
  orders?: RechargeRow[] | PackageRow[];
  entries?: LedgerRow[];
  total: number;
  page: number;
  pageSize: number;
}

const TYPE_TABS: { label: string; value: OrderType }[] = [
  { label: "充值订单", value: "RECHARGE" },
  { label: "套餐订单", value: "PACKAGE_ORDER" },
  { label: "账本流水", value: "LEDGER" },
];

type AnyRow = RechargeRow | PackageRow | LedgerRow;

/** 处置确认弹窗待执行项（S6 弹窗归一：CLOSE/FLAG 纯确认，REVERSE 需原因输入） */
interface PendingDispose {
  id: string;
  action: "CLOSE" | "FLAG" | "REVERSE";
  kind: "RECHARGE" | "PACKAGE";
}

export function OrdersManager({ canWrite = false }: { canWrite?: boolean }) {
  const [type, setType] = useState<OrderType>("RECHARGE");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // 处置确认弹窗态（S6：替代原生 confirm/prompt 对话框）
  const [pending, setPending] = useState<PendingDispose | null>(null);
  const [reason, setReason] = useState("");
  const pageSize = 20;

  const { rows, total, loading, error, reload } = useAdminList<OrdersResponse, AnyRow>({
    url: `/api/v1/admin/orders?type=${type}&page=${page}&pageSize=${pageSize}`,
    select: data => ({ rows: data.orders ?? data.entries ?? [], total: data.total }),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /**
   * 订单处置（S6.2 弹窗归一）：点按钮仅登记待确认项，实际 PATCH 在对话框确认后发起。
   * RECHARGE→/admin/recharge-orders/[id]；PACKAGE→/admin/package-orders/[id]。
   * CLOSE/FLAG 走 ConfirmDialog；REVERSE 涉资金走带原因输入的 Dialog（留空记「未填写」）。
   */
  function requestDispose(
    id: string,
    action: "CLOSE" | "FLAG" | "REVERSE",
    kind: "RECHARGE" | "PACKAGE"
  ) {
    setReason("");
    setPending({ id, action, kind });
  }

  async function runDispose() {
    if (!pending) return;
    const { id, action, kind } = pending;
    const base =
      kind === "RECHARGE" ? "/api/v1/admin/recharge-orders/" : "/api/v1/admin/package-orders/";
    const body =
      action === "REVERSE" ? { action, reason: reason.trim() || "未填写" } : { action };
    setBusy(true);
    setMsg(null);
    const res = await adminFetch(base + id, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setBusy(false);
    setPending(null);
    if (!res.ok) {
      setMsg(res.message ?? "处置失败");
      return;
    }
    setMsg("处置成功");
    reload();
  }

  // 动态列定义 — 按 type 切换
  const baseColumns: Column<AnyRow>[] = type === "RECHARGE"
    ? [
        { key: "userEmail", header: "用户", className: "px-3 py-2 text-slate-700", render: r => <span>{r.userEmail}</span> },
        { key: "totalYuan", header: "金额", className: "px-3 py-2 text-slate-600", render: r => <span>¥{(r as RechargeRow).totalYuan}</span> },
        { key: "payMethod", header: "支付方式", className: "px-3 py-2 text-slate-500", render: r => <span>{(r as RechargeRow).payMethod}</span> },
        { key: "status", header: "状态", className: "px-3 py-2", render: r => <Badge>{r.status}</Badge> },
        { key: "paidAt", header: "支付时间", className: "px-3 py-2 text-xs text-slate-400", render: r => <span>{(r as RechargeRow).paidAt ? new Date((r as RechargeRow).paidAt as string).toLocaleString("zh-CN") : "—"}</span> },
      ]
    : type === "PACKAGE_ORDER"
    ? [
        { key: "userEmail", header: "用户", className: "px-3 py-2 text-slate-700", render: r => <span>{r.userEmail}</span> },
        { key: "packageTitle", header: "套餐", className: "px-3 py-2 text-slate-600", render: r => <span>{(r as PackageRow).packageTitle}</span> },
        { key: "status", header: "状态", className: "px-3 py-2", render: r => <Badge>{r.status}</Badge> },
        { key: "redeemedAt", header: "兑换时间", className: "px-3 py-2 text-xs text-slate-400", render: r => <span>{(r as PackageRow).redeemedAt}</span> },
      ]
    : [
        { key: "userEmail", header: "用户", className: "px-3 py-2 text-slate-700", render: r => <span>{r.userEmail}</span> },
        { key: "direction", header: "方向", className: "px-3 py-2 text-slate-500", render: r => <span>{(r as LedgerRow).direction}</span> },
        { key: "amountYuan", header: "金额", className: "px-3 py-2 text-slate-600", render: r => <span>¥{(r as LedgerRow).amountYuan}</span> },
        { key: "entryType", header: "类型", className: "px-3 py-2 text-slate-500", render: r => <span>{(r as LedgerRow).entryType}</span> },
        { key: "status", header: "状态", className: "px-3 py-2", render: r => <Badge>{r.status}</Badge> },
      ];

  // 处置动作列（S6.2）：仅持 admin.orders.write 且非账本流水（LedgerEntry 不可变）时露出。
  const actionColumn: Column<AnyRow> = {
    key: "actions",
    header: "处置",
    className: "px-3 py-2",
    render: (r) => {
      const st = r.status;
      const actionable =
        (type === "RECHARGE" && (st === "PENDING" || st === "PAID")) ||
        (type === "PACKAGE_ORDER" && (st === "PENDING" || st === "ACTIVE"));
      if (!actionable) return <span className="text-xs text-slate-300">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {type === "RECHARGE" && st === "PENDING" && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => requestDispose(r.id, "CLOSE", "RECHARGE")}>关单</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => requestDispose(r.id, "FLAG", "RECHARGE")}>标异常</Button>
            </>
          )}
          {type === "RECHARGE" && st === "PAID" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => requestDispose(r.id, "REVERSE", "RECHARGE")}>冲正</Button>
          )}
          {type === "PACKAGE_ORDER" && (st === "PENDING" || st === "ACTIVE") && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => requestDispose(r.id, "CLOSE", "PACKAGE")}>关单</Button>
          )}
        </div>
      );
    },
  };
  const columns: Column<AnyRow>[] =
    canWrite && type !== "LEDGER" ? [...baseColumns, actionColumn] : baseColumns;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {TYPE_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={type === tab.value ? "primary" : "outline"}
            size="sm"
            onClick={() => { setType(tab.value); setPage(1); }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      {msg && <div className="rounded bg-sky-50 p-2 text-sm text-sky-700">{msg}</div>}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={r => r.id}
        emptyText="暂无数据"
        busy={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={p => setPage(p)}
      />

      {/* CLOSE / FLAG：纯二次确认（ConfirmDialog，替代原生确认框） */}
      <ConfirmDialog
        open={!!pending && pending.action !== "REVERSE"}
        title={pending?.action === "FLAG" ? "标记为异常" : "确认关单"}
        message={
          pending?.action === "FLAG"
            ? "确认标记为异常？该操作将记录审计。"
            : "确认关单？该操作将记录审计。"
        }
        confirmLabel="确认"
        variant="danger"
        onConfirm={() => void runDispose()}
        onCancel={() => setPending(null)}
      />

      {/* REVERSE：涉资金冲正，需填写原因入审计（带输入框 Dialog，替代原生输入框） */}
      <Dialog
        open={!!pending && pending.action === "REVERSE"}
        onClose={() => setPending(null)}
        title="冲正退款"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPending(null)}>取消</Button>
            <Button variant="danger" size="sm" onClick={() => void runDispose()}>确认冲正</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">冲正将反向撤销入账（退款），请填写原因（记入审计）：</p>
        <Input
          className="mt-3"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="冲正原因（留空记为「未填写」）"
        />
      </Dialog>
    </div>
  );
}

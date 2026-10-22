"use client";

/**
 * 套餐管理（SubTask 3.2.1 + R-31 AdminDataTable + R-32 Dialog/Button/Input + R-28 batch UI）：
 * 套餐列表（元分转换展示）+ 新建/编辑弹层 + 删除（有码引用时服务端仅停用并提示）
 * + 已兑换订单只读列表 + 批量操作。
 */
import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Dialog, Button, Input, Label, Select, Textarea } from "@aidean/ui";
import { ConfirmDialog } from "./ConfirmDialog";

interface PackageRow {
  id: string;
  title: string;
  description: string | null;
  priceMinor: string;
  durationHours: number | null;
  benefits: string[];
  status: string;
  sortOrder: number;
  redeemedCount: number;
}

interface OrderRow {
  id: string;
  userEmail: string;
  packageTitle: string;
  status: string;
  redeemedAt: string;
  expiresAt: string | null;
}

interface PackageForm {
  title: string;
  description: string;
  priceYuan: string;
  durationHours: string;
  benefitsText: string;
  status: "ACTIVE" | "DISABLED";
  sortOrder: number;
}

const emptyForm: PackageForm = {
  title: "",
  description: "",
  priceYuan: "",
  durationHours: "",
  benefitsText: "",
  status: "ACTIVE",
  sortOrder: 0,
};

function yuanToMinor(yuan: string): bigint | null {
  const n = Number(yuan);
  if (!Number.isFinite(n) || n < 0) return null;
  return BigInt(Math.round(n * 100));
}

function minorToYuanStr(minor: string): string {
  return (Number(minor) / 100).toFixed(2);
}

function parseBenefits(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

const orderStatusText: Record<string, string> = {
  ACTIVE: "生效中",
  EXPIRED: "已过期",
  DISABLED: "已停用",
};

export function PackagesManager() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<PackageRow | null>(null);

  // Batch selection state (R-28)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  function handleBatch(action: "activate" | "deactivate" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete") {
      setPendingDelete(true);
      return;
    }
    void executeBatch(action);
  }

  async function executeBatch(action: "activate" | "deactivate" | "delete") {
    if (selectedIds.size === 0) return;
    setBatchBusy(true);
    const res = await adminFetch<{ affected: number }>("/api/v1/admin/packages/batch", {
      method: "POST",
      body: JSON.stringify({ ids: [...selectedIds], action }),
    });
    setBatchBusy(false);
    if (res.ok) {
      setSelectedIds(new Set());
      setMessage(`批量${action} 完成: ${res.data?.affected ?? 0} 条受影响`);
      void load();
    } else {
      setMessage(res.message);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch<{ packages: PackageRow[]; orders: OrderRow[] }>("/api/v1/admin/packages");
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.packages);
      setOrders(res.data.orders);
      setMessage(null);
    } else {
      setMessage(res.message ?? "加载失败");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  }

  function openEdit(p: PackageRow) {
    setForm({
      title: p.title,
      description: p.description ?? "",
      priceYuan: minorToYuanStr(p.priceMinor),
      durationHours: p.durationHours !== null ? String(p.durationHours) : "",
      benefitsText: p.benefits.join("\n"),
      status: p.status === "DISABLED" ? "DISABLED" : "ACTIVE",
      sortOrder: p.sortOrder,
    });
    setEditing(p);
    setCreating(true);
  }

  async function submitForm() {
    const priceMinor = yuanToMinor(form.priceYuan);
    if (!form.title.trim()) {
      setMessage("套餐标题必填");
      return;
    }
    if (priceMinor === null) {
      setMessage("价格须为非负数字（元）");
      return;
    }
    const duration = form.durationHours.trim() === "" ? null : Number(form.durationHours);
    if (duration !== null && (!Number.isInteger(duration) || duration < 1)) {
      setMessage("有效期须为正整数小时，或留空表示不限时");
      return;
    }
    setBusy(true);
    const common = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priceMinor: String(priceMinor),
      durationHours: duration,
      benefits: parseBenefits(form.benefitsText),
      status: form.status,
      sortOrder: form.sortOrder,
    };
    const res = editing
      ? await adminFetch(`/api/v1/admin/packages/${editing.id}`, { method: "PATCH", body: JSON.stringify(common) })
      : await adminFetch("/api/v1/admin/packages", { method: "POST", body: JSON.stringify(common) });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "保存失败");
      return;
    }
    setMessage(editing ? "套餐已更新" : "套餐已创建");
    setCreating(false);
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await adminFetch<{ deleted: boolean; disabled: boolean }>(`/api/v1/admin/packages/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setMessage(res.message ?? "删除失败");
      return;
    }
    setMessage(res.data?.disabled ? "套餐已被兑换码引用，已改为停用（保留对账）" : "套餐已删除");
    await load();
  }

  // AdminDataTable 列定义 — 套餐列表
  const pkgColumns: Column<PackageRow>[] = [
    {
      key: "title",
      header: "套餐",
      className: "px-3 py-2",
      render: p => (
        <div>
          <div className="text-slate-800">{p.title}</div>
          <div className="max-w-64 truncate text-xs text-slate-500">{p.description ?? "—"}</div>
        </div>
      ),
    },
    { key: "price", header: "价格", className: "px-3 py-2 tabular-nums text-slate-700", render: p => <span>¥{minorToYuanStr(p.priceMinor)}</span> },
    { key: "duration", header: "有效期", className: "px-3 py-2 tabular-nums text-slate-500", render: p => <span>{p.durationHours ? `${p.durationHours} 小时` : "不限时"}</span> },
    { key: "benefits", header: "权益数", className: "px-3 py-2 tabular-nums text-slate-600", render: p => <span>{p.benefits.length}</span> },
    { key: "redeemed", header: "已兑换", className: "px-3 py-2 tabular-nums text-slate-600", render: p => <span>{p.redeemedCount}</span> },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: p => <span className={p.status === "ACTIVE" ? "font-medium text-emerald-600" : "text-slate-500"}>{p.status === "ACTIVE" ? "在售" : "停售"}</span>,
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: p => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(p)}>编辑</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>删除</Button>
        </div>
      ),
    },
  ];

  // AdminDataTable 列定义 — 订单列表（只读）
  const orderColumns: Column<OrderRow>[] = [
    { key: "userEmail", header: "用户", className: "px-3 py-2 text-slate-600", render: o => <span>{o.userEmail}</span> },
    { key: "packageTitle", header: "套餐", className: "px-3 py-2 text-slate-600", render: o => <span>{o.packageTitle}</span> },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: o => <span className={o.status === "ACTIVE" ? "font-medium text-emerald-600" : "text-slate-500"}>{orderStatusText[o.status] ?? o.status}</span>,
    },
    { key: "redeemedAt", header: "兑换时间", className: "px-3 py-2 text-xs tabular-nums text-slate-500", render: o => <span>{o.redeemedAt.slice(0, 19).replace("T", " ")}</span> },
    { key: "expiresAt", header: "到期时间", className: "px-3 py-2 text-xs tabular-nums text-slate-500", render: o => <span>{o.expiresAt ? o.expiresAt.slice(0, 19).replace("T", " ") : "—"}</span> },
  ];

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">共 {rows.length} 个套餐</span>
        <Button variant="primary" size="sm" onClick={openCreate}>新建套餐</Button>
      </div>

      {selectedIds.size > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-xs text-primary">已选 {selectedIds.size} 项</span>
          <Button variant="primary" size="sm" disabled={batchBusy} onClick={() => void handleBatch("activate")}>批量启用</Button>
          <Button variant="outline" size="sm" disabled={batchBusy} onClick={() => void handleBatch("deactivate")}>批量停用</Button>
          <Button variant="danger" size="sm" disabled={batchBusy} onClick={() => void handleBatch("delete")}>批量删除</Button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-500">取消选择</button>
        </div>
      ) : null}

      <AdminDataTable
        columns={pkgColumns}
        rows={rows}
        rowKey={p => p.id}
        emptyText="暂无套餐，点击右上角「新建套餐」"
        busy={busy || loading}
        selectable
        selectedIds={selectedIds}
        onToggleRow={id => {
          const next = new Set(selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIds(next);
        }}
        onToggleAll={() => {
          if (rows.every(r => selectedIds.has(r.id))) setSelectedIds(new Set());
          else setSelectedIds(new Set(rows.map(r => r.id)));
        }}
      />

      {/* 已兑换订单（只读） */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          已兑换订单（最近 50 条）
        </div>
        <AdminDataTable
          columns={orderColumns}
          rows={orders}
          rowKey={o => o.id}
          emptyText="暂无兑换订单"
          busy={loading}
        />
      </div>

      {/* 新建/编辑弹层 — R-32 @aidean/ui Dialog */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={editing ? "编辑套餐" : "新建套餐"}
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void submitForm()}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Label className="block text-xs font-medium text-slate-500">
            标题
            <Input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            描述（可选）
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full bg-white text-slate-800"
            />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            价格（元）
            <Input type="number" min={0} step="0.01" value={form.priceYuan} onChange={(e) => setForm({ ...form, priceYuan: e.target.value })} className="mt-1" />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            有效期（小时，留空为不限时）
            <Input type="number" min={1} value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} className="mt-1" />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            权益条目（每行一条，≤20 条）
            <Textarea
              rows={4}
              value={form.benefitsText}
              onChange={(e) => setForm({ ...form, benefitsText: e.target.value })}
              className="mt-1 w-full bg-white text-slate-800"
            />
          </Label>
          <div className="flex gap-4">
            <Label className="block text-xs font-medium text-slate-500">
              状态
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PackageForm["status"] })}
                className="mt-1 block w-32 bg-white text-slate-800"
              >
                <option value="ACTIVE">在售</option>
                <option value="DISABLED">停售</option>
              </Select>
            </Label>
            <Label className="block text-xs font-medium text-slate-500">
              排序（越小越前）
              <Input type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="mt-1 w-24" />
            </Label>
          </div>
        </div>
      </Dialog>

      {/* 删除确认 — R-32 @aidean/ui Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除套餐？"
        className="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => void confirmDelete()}>确认删除</Button>
          </>
        }
      >
        <p className="text-sm text-slate-500">
          将删除 <span className="font-medium text-slate-800">{deleteTarget?.title}</span>（¥{deleteTarget ? minorToYuanStr(deleteTarget.priceMinor) : ""}）。
          若已有兑换码引用，将自动改为停售以保留对账。
        </p>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete}
        title="确认批量删除"
        message={`确认批量操作 ${selectedIds.size} 项？`}
        onConfirm={() => { setPendingDelete(false); void executeBatch("delete"); }}
        onCancel={() => setPendingDelete(false)}
      />
    </div>
  );
}

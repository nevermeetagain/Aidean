"use client";

/**
 * 厂商管理（UX-26 展示名；SubTask 2.3.2 + R-31 AdminDataTable 接入）：
 * 列表（logo 位用 code 首字母徽标）+ 新建/编辑弹层表单
 * + 软删确认；priority 行内可改（PATCH）。删除仅软删（deletedAt 置位）。
 * 批量操作（R-28）。
 */
import { useCallback, useEffect, useState } from "react";
import { Dialog, Button, Input, Label } from "@aidean/ui";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

interface VendorRow {
  id: string;
  code: string;
  name: string;
  nameCn: string | null;
  country: string | null;
  priority: number;
  isActive: boolean;
  modelCount: number;
}

const emptyForm = { code: "", name: "", nameCn: "", priority: 50, isActive: true };

export function VendorsManager() {
  const [rows, setRows] = useState<VendorRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<VendorRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<VendorRow | null>(null);
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
    const res = await adminFetch<{ affected: number }>("/api/v1/admin/vendors/batch", {
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
    const res = await adminFetch<{ vendors: VendorRow[] }>("/api/v1/admin/vendors");
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.vendors);
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

  function openEdit(v: VendorRow) {
    setForm({ code: v.code, name: v.name, nameCn: v.nameCn ?? "", priority: v.priority, isActive: v.isActive });
    setEditing(v);
    setCreating(true);
  }

  async function submitForm() {
    if (!form.code.trim() || !form.name.trim()) {
      setMessage("code 与名称必填");
      return;
    }
    setBusy(true);
    const body = {
      ...(editing ? {} : { code: form.code.trim().toLowerCase() }),
      name: form.name.trim(),
      nameCn: form.nameCn.trim() || null,
      priority: Number.isInteger(form.priority) ? form.priority : 50,
      isActive: form.isActive,
    };
    const res = editing
      ? await adminFetch(`/api/v1/admin/vendors/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      : await adminFetch("/api/v1/admin/vendors", { method: "POST", body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "保存失败");
      return;
    }
    setMessage(editing ? "厂商已更新" : "厂商已创建");
    setCreating(false);
    await load();
  }

  async function toggleActive(v: VendorRow) {
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/vendors/${v.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !v.isActive }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "操作失败");
      return;
    }
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/vendors/${deleteTarget.id}`, { method: "DELETE" });
    setBusy(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setMessage(res.message ?? "删除失败");
      return;
    }
    setMessage("厂商已软删（列表不再展示，模型数据保留）");
    await load();
  }

  // AdminDataTable 列定义
  const columns: Column<VendorRow>[] = [
    {
      key: "name",
      header: "厂商",
      className: "px-3 py-2",
      render: v => (
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary"
          >
            {v.code.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div className="text-slate-800">{v.nameCn || v.name}</div>
            <div className="text-xs text-slate-500">{v.code}</div>
          </div>
        </div>
      ),
    },
    { key: "country", header: "国别", className: "px-3 py-2", render: v => <span className="text-slate-500">{v.country ?? "—"}</span> },
    {
      key: "priority",
      header: "优先级",
      className: "px-3 py-2",
      render: v => (
        <Input
          key={`${v.id}-${v.priority}`}
          type="number"
          min={1}
          max={99}
          defaultValue={v.priority}
          disabled={busy}
          onBlur={e => {
            const p = Number(e.target.value);
            if (Number.isInteger(p) && p >= 1 && p <= 99 && p !== v.priority) {
              void (async () => {
                setBusy(true);
                const res = await adminFetch(`/api/v1/admin/vendors/${v.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ priority: p }),
                });
                setBusy(false);
                if (!res.ok) setMessage(res.message ?? "保存失败");
                else await load();
              })();
            }
          }}
          aria-label={`${v.code} 优先级`}
          className="w-16 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs tabular-nums text-slate-700 shadow-[var(--shadow-sm)]"
        />
      ),
    },
    { key: "modelCount", header: "模型数", className: "px-3 py-2 tabular-nums text-slate-600", render: v => <span>{v.modelCount}</span> },
    {
      key: "isActive",
      header: "状态",
      className: "px-3 py-2",
      render: v => <span className={v.isActive ? "font-medium text-emerald-700" : "text-slate-500"}>{v.isActive ? "启用" : "停用"}</span>,
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: v => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-slate-600" onClick={() => openEdit(v)}>
            编辑
          </Button>
          <Button variant="outline" size="sm" className="text-slate-600" disabled={busy} onClick={() => void toggleActive(v)}>
            {v.isActive ? "停用" : "启用"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[var(--danger)]"
            onClick={() => setDeleteTarget(v)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">共 {rows.length} 家厂商</span>
        <Button variant="primary" onClick={openCreate}>
          新建厂商
        </Button>
      </div>

      {selectedIds.size > 0 ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-xs text-primary">已选 {selectedIds.size} 项</span>
          <Button size="sm" disabled={batchBusy} onClick={() => void handleBatch("activate")}>批量启用</Button>
          <Button variant="dark" size="sm" disabled={batchBusy} onClick={() => void handleBatch("deactivate")}>批量停用</Button>
          <Button variant="danger" size="sm" disabled={batchBusy} onClick={() => void handleBatch("delete")}>批量删除</Button>
          <Button variant="ghost" size="sm" className="ml-auto text-slate-500" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
        </div>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={v => v.id}
        emptyText="暂无厂商"
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


      {/* 新建/编辑弹层 — R-32 使用 @aidean/ui Dialog */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={editing ? "编辑厂商" : "新建厂商"}
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void submitForm()}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Label className="block text-xs font-medium text-slate-500">
            code（小写字母/数字/连字符{editing ? "，创建后不可改" : ""}）
            <Input
              type="text"
              value={form.code}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="mt-1"
            />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            名称
            <Input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            中文名（可选）
            <Input
              type="text"
              value={form.nameCn}
              onChange={(e) => setForm({ ...form, nameCn: e.target.value })}
              className="mt-1"
            />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            优先级（1-99，越小越优先）
            <Input
              type="number"
              min={1}
              max={99}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="mt-1"
            />
          </Label>
          <Label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            启用
          </Label>
        </div>
      </Dialog>

      {/* 软删确认 — R-32 使用 @aidean/ui Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除厂商？"
        className="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => void confirmDelete()}>确认删除</Button>
          </>
        }
      >
        <p className="text-sm text-slate-500">
          将软删 <span className="font-medium text-slate-800">{deleteTarget?.nameCn || deleteTarget?.name}</span>（{deleteTarget?.code}），
          其 {deleteTarget?.modelCount} 个模型数据保留，天梯图不再展示该厂商。
        </p>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete}
        title="确认批量删除"
        message={`确认批量删除 ${selectedIds.size} 个厂商？（软删）`}
        onConfirm={() => { setPendingDelete(false); void executeBatch("delete"); }}
        onCancel={() => setPendingDelete(false)}
      />
    </div>
  );
}

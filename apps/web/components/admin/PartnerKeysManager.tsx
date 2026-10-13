"use client";

/**
 * PartnerKeysManager — 卡商密钥管理（R-18 修复 + R-31 AdminDataTable 接入）。
 *
 * 功能：列表 + 新建（明文仅本次返回）+ 启停 + 批量操作。
 * 安全：不显示 keyHash；新建后的明文 key 仅展示一次，刷新后不可见。
 */

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input } from "@aidean/ui";
import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface KeysResponse {
  keys: KeyRow[];
}

interface CreateResponse {
  key: { id: string; name: string; prefix: string };
  apiKey: string;
}

export function PartnerKeysManager() {
  const [rows, setRows] = useState<KeyRow[]>([]);
  // #35③：初值 true——首帧不闪空态（load 挂载即置在途；表格 busy={busy} 已接）
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Batch selection state (R-28)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  function handleBatch(action: "disable" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete") {
      setPendingDelete(true);
      return;
    }
    void executeBatch(action);
  }

  async function executeBatch(action: "disable" | "delete") {
    if (selectedIds.size === 0) return;
    setBatchBusy(true);
    const res = await adminFetch<{ affected: number }>("/api/v1/admin/partner-keys/batch", {
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

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await adminFetch<KeysResponse>("/api/v1/admin/partner-keys");
    setBusy(false);
    if (res.ok && res.data) {
      setRows(res.data.keys);
    } else {
      setError(res.message);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    const res = await adminFetch<CreateResponse>("/api/v1/admin/partner-keys", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
    });
    setCreating(false);
    if (res.ok && res.data) {
      setNewKey(res.data.apiKey);
      setMessage(`密钥 ${res.data.key.name} 创建成功，请立即保存（仅本次显示）`);
      setName("");
      setShowCreate(false);
      void load();
    } else {
      setMessage(res.message);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await adminFetch(`/api/v1/admin/partner-keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setMessage(`已${!isActive ? "启用" : "停用"}密钥`);
      void load();
    } else {
      setMessage(res.message);
    }
  }

  // AdminDataTable 列定义
  const columns: Column<KeyRow>[] = [
    { key: "name", header: "名称", className: "px-3 py-2", render: k => <span className="text-slate-700">{k.name}</span> },
    { key: "prefix", header: "前缀", className: "px-3 py-2", render: k => <code className="text-xs text-slate-500">{k.prefix}...</code> },
    { key: "isActive", header: "状态", className: "px-3 py-2", render: k => <Badge>{k.isActive ? "启用" : "停用"}</Badge> },
    { key: "lastUsedAt", header: "最后使用", className: "px-3 py-2", render: k => <span className="text-xs text-slate-400">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("zh-CN") : "—"}</span> },
    { key: "createdAt", header: "创建时间", className: "px-3 py-2", render: k => <span className="text-xs text-slate-400">{new Date(k.createdAt).toLocaleString("zh-CN")}</span> },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: k => (
        <button
          onClick={() => toggleActive(k.id, k.isActive)}
          disabled={busy}
          className={`rounded px-2 py-1 text-xs ${k.isActive ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"} disabled:opacity-40`}
        >
          {k.isActive ? "停用" : "启用"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {message && <div className="rounded bg-primary/5 p-2 text-sm text-primary">{message}</div>}
      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</div>}

      {newKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-sm font-medium text-amber-800">⚠ 新密钥（仅本次显示，请立即保存）</div>
          <code className="mt-1 block break-all text-xs text-amber-900">{newKey}</code>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-amber-600">已保存，关闭</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">密钥列表（{rows.length}）</h2>
        <button onClick={() => setShowCreate(s => !s)} className="rounded bg-primary px-3 py-1.5 text-xs text-white">
          {showCreate ? "取消" : "新建密钥"}
        </button>
      </div>

      {showCreate && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="密钥名称（如：XX 卡商）"
            className="flex-1"
          />
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? "生成中..." : "生成"}
          </Button>
        </div>
      )}

      {selectedIds.size > 0 ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-xs text-primary">已选 {selectedIds.size} 项</span>
          <button onClick={() => void handleBatch("disable")} disabled={batchBusy} className="rounded bg-amber-500 px-2 py-1 text-xs text-white disabled:opacity-40">批量停用</button>
          <button onClick={() => void handleBatch("delete")} disabled={batchBusy} className="rounded bg-rose-600 px-2 py-1 text-xs text-white disabled:opacity-40">批量删除</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-500">取消选择</button>
        </div>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={k => k.id}
        emptyText="暂无密钥"
        busy={busy}
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

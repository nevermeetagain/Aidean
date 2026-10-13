"use client";

/**
 * TierMappingsManager — 用户模型等级映射管理（#18 L4）。
 *
 * 功能：分页列表（tier/user 过滤）+ 新建 + 删除。
 * 操作 UserTierMapping 表（OPUS/SONNET/FABLE/HAIKU 四档绑定）。
 */

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Dialog, Input } from "@aidean/ui";
import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

interface TierMappingRow {
  id: string;
  userId: string;
  tierLevel: string;
  modelId: string;
  model?: { nameDisplay: string; modelCode: string } | null;
  user?: { email: string; nickname: string | null } | null;
  createdAt: string;
}

const TIER_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  OPUS: "default",
  SONNET: "secondary",
  FABLE: "default",
  HAIKU: "secondary",
};

export function TierMappingsManager() {
  const [rows, setRows] = useState<TierMappingRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tierFilter, setTierFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ userId: "", tierLevel: "OPUS", modelId: "" });
  const [pendingDelete, setPendingDelete] = useState<TierMappingRow | null>(null);
  const pageSize = 20;

  const load = useCallback(async (p: number) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (tierFilter) params.set("tierLevel", tierFilter);
    setLoading(true);
    const res = await adminFetch<{ items: TierMappingRow[]; total: number }>(
      `/api/v1/admin/tier-mappings?${params}`
    );
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setTotal(res.data.total);
    } else {
      setError(res.message ?? "加载失败");
    }
  }, [tierFilter]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const res = await adminFetch<{ item: TierMappingRow }>("/api/v1/admin/tier-mappings", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setShowCreate(false);
      setForm({ userId: "", tierLevel: "OPUS", modelId: "" });
      load(1);
      setPage(1);
    } else {
      setError(res.message ?? "创建失败");
    }
  }

  async function handleDelete(row: TierMappingRow) {
    const res = await adminFetch(`/api/v1/admin/tier-mappings/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      setPendingDelete(null);
      load(page);
    } else {
      setError(res.message ?? "删除失败");
    }
  }

  const columns: Column<TierMappingRow>[] = [
    {
      key: "user",
      header: "用户",
      render: (r) => r.user?.email ?? r.userId.slice(0, 8),
    },
    {
      key: "tierLevel",
      header: "等级",
      render: (r) => <Badge variant={TIER_VARIANT[r.tierLevel] ?? "default"}>{r.tierLevel}</Badge>,
    },
    {
      key: "model",
      header: "模型",
      render: (r) => r.model?.nameDisplay ?? r.modelId.slice(0, 8),
    },
    {
      key: "createdAt",
      header: "创建时间",
      render: (r) => new Date(r.createdAt).toLocaleString("zh-CN"),
    },
    {
      key: "actions",
      header: "操作",
      render: (r) => (
        <Button variant="danger" size="sm" onClick={() => setPendingDelete(r)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-3">
        <Input
          placeholder="按等级过滤 (OPUS/SONNET/FABLE/HAIKU)"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value.toUpperCase())}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => { setPage(1); load(1); }}>
          查询
        </Button>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          新建映射
        </Button>
      </div>

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        busy={busy || loading}
        page={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        total={total}
        onPageChange={setPage}
      />

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="新建等级映射"
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
            <Button size="sm" disabled={busy || !form.userId || !form.modelId} onClick={handleCreate}>
              {busy ? "创建中…" : "创建"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">用户 ID</label>
            <Input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500">等级</label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.tierLevel}
              onChange={(e) => setForm({ ...form, tierLevel: e.target.value })}
            >
              <option value="OPUS">OPUS</option>
              <option value="SONNET">SONNET</option>
              <option value="FABLE">FABLE</option>
              <option value="HAIKU">HAIKU</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">模型 ID</label>
            <Input value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })} />
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        title="删除等级映射"
        message={`确认删除 ${pendingDelete?.tierLevel} → ${pendingDelete?.model?.nameDisplay ?? "模型"} 的映射？`}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

"use client";

/**
 * FreeQuotasManager — 免费额度配置管理（#18 L4）。
 *
 * 功能：分页列表（tier 过滤）+ 新建 + 编辑额度 + 删除。
 * 操作 UserFreeQuota 表（每个账户等级的免费模型 token 额度 + 刷新周期）。
 * 网关 FREE 路径消费此表——admin 配置后控制台自动加载。
 */

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Dialog, Input } from "@aidean/ui";
import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

interface FreeQuotaRow {
  id: string;
  tier: string;
  modelId: string;
  quotaTokens: number;
  refreshCycle: string;
  model?: { nameDisplay: string; modelCode: string } | null;
  createdAt: string;
}

const TIER_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  NORMAL: "secondary",
  PRO: "default",
  MAX: "destructive",
};

const CYCLE_LABEL: Record<string, string> = {
  DAY: "每日",
  WEEK: "每周",
  MONTH: "每月",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function FreeQuotasManager() {
  const [rows, setRows] = useState<FreeQuotaRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tierFilter, setTierFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<FreeQuotaRow | null>(null);
  const [editTokens, setEditTokens] = useState("");
  const [editCycle, setEditCycle] = useState("DAY");
  const [form, setForm] = useState({ tier: "NORMAL", modelId: "", quotaTokens: "", refreshCycle: "DAY" });
  const [pendingDelete, setPendingDelete] = useState<FreeQuotaRow | null>(null);
  const pageSize = 20;

  const load = useCallback(async (p: number) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (tierFilter) params.set("tier", tierFilter);
    setLoading(true);
    const res = await adminFetch<{ items: FreeQuotaRow[]; total: number }>(
      `/api/v1/admin/free-quotas?${params}`
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
    const res = await adminFetch<{ item: FreeQuotaRow }>("/api/v1/admin/free-quotas", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        quotaTokens: Number(form.quotaTokens),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setShowCreate(false);
      setForm({ tier: "NORMAL", modelId: "", quotaTokens: "", refreshCycle: "DAY" });
      load(1);
      setPage(1);
    } else {
      setError(res.message ?? "创建失败");
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    setBusy(true);
    setError(null);
    const res = await adminFetch<{ item: FreeQuotaRow }>(`/api/v1/admin/free-quotas/${editTarget.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        quotaTokens: Number(editTokens),
        refreshCycle: editCycle,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setEditTarget(null);
      load(page);
    } else {
      setError(res.message ?? "更新失败");
    }
  }

  async function handleDelete(row: FreeQuotaRow) {
    const res = await adminFetch(`/api/v1/admin/free-quotas/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      setPendingDelete(null);
      load(page);
    } else {
      setError(res.message ?? "删除失败");
    }
  }

  const columns: Column<FreeQuotaRow>[] = [
    {
      key: "tier",
      header: "账户等级",
      render: (r) => <Badge variant={TIER_VARIANT[r.tier] ?? "default"}>{r.tier}</Badge>,
    },
    {
      key: "model",
      header: "模型",
      render: (r) => r.model?.nameDisplay ?? r.modelId.slice(0, 8),
    },
    {
      key: "quotaTokens",
      header: "免费额度",
      render: (r) => `${formatTokens(r.quotaTokens)} tokens`,
    },
    {
      key: "refreshCycle",
      header: "刷新周期",
      render: (r) => CYCLE_LABEL[r.refreshCycle] ?? r.refreshCycle,
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditTarget(r);
              setEditTokens(String(r.quotaTokens));
              setEditCycle(r.refreshCycle);
            }}
          >
            编辑
          </Button>
          <Button variant="danger" size="sm" onClick={() => setPendingDelete(r)}>
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-3">
        <Input
          placeholder="按等级过滤 (NORMAL/PRO/MAX)"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value.toUpperCase())}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => { setPage(1); load(1); }}>
          查询
        </Button>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          新建额度
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
        title="新建免费额度"
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              size="sm"
              disabled={busy || !form.modelId || !form.quotaTokens}
              onClick={handleCreate}
            >
              {busy ? "创建中…" : "创建"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">账户等级</label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
            >
              <option value="NORMAL">NORMAL</option>
              <option value="PRO">PRO</option>
              <option value="MAX">MAX</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">模型 ID</label>
            <Input value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500">免费 token 额度</label>
            <Input
              type="number"
              value={form.quotaTokens}
              onChange={(e) => setForm({ ...form, quotaTokens: e.target.value })}
              placeholder="例如 100000"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">刷新周期</label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={form.refreshCycle}
              onChange={(e) => setForm({ ...form, refreshCycle: e.target.value })}
            >
              <option value="DAY">每日</option>
              <option value="WEEK">每周</option>
              <option value="MONTH">每月</option>
            </select>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`编辑额度 — ${editTarget?.model?.nameDisplay ?? "模型"}`}
        className="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>取消</Button>
            <Button size="sm" disabled={busy} onClick={handleEdit}>
              {busy ? "保存中…" : "保存"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">免费 token 额度</label>
            <Input
              type="number"
              value={editTokens}
              onChange={(e) => setEditTokens(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">刷新周期</label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={editCycle}
              onChange={(e) => setEditCycle(e.target.value)}
            >
              <option value="DAY">每日</option>
              <option value="WEEK">每周</option>
              <option value="MONTH">每月</option>
            </select>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        title="删除免费额度"
        message={`确认删除 ${pendingDelete?.tier} → ${pendingDelete?.model?.nameDisplay ?? "模型"} 的免费额度配置？`}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

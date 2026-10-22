"use client";

/**
 * TierMappingsManager — 用户模型等级映射管理（#18 L4）。
 *
 * 功能：分页列表（tier/user 过滤）+ 新建 + 删除。
 * 操作 UserTierMapping 表（OPUS/SONNET/FABLE/HAIKU 四档绑定）。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Dialog, Input } from "@aidean/ui";
import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { PanelState, usePanelResource } from "./PanelState";
import { panelTestIds } from "../../lib/admin/panel-resource";

export interface TierMappingRow {
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

/** 列表数据形状（信封 data） */
export type TierMappingsListData = { items: TierMappingRow[]; total: number };

/** 五态外壳 testid 前缀（B11-05） */
export const TIER_MAPPINGS_PANEL_PREFIX = "admin-tier-mappings";

export const TIER_MAPPINGS_PAGE_SIZE = 20;

export function buildTierMappingsUrl(page = 1, tierLevel = ""): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(TIER_MAPPINGS_PAGE_SIZE) });
  if (tierLevel) params.set("tierLevel", tierLevel);
  return `/api/v1/admin/tier-mappings?${params}`;
}

/** 首屏地址（单测锁定 loader 无参调用的请求 URL，与改造前完全一致） */
export const TIER_MAPPINGS_LIST_URL = buildTierMappingsUrl();

export const loadTierMappings = (signal?: AbortSignal, page = 1, tierLevel = "") =>
  adminFetch<TierMappingsListData>(buildTierMappingsUrl(page, tierLevel), { signal });

export function TierMappingsManager() {
  const ids = panelTestIds(TIER_MAPPINGS_PANEL_PREFIX);
  const [page, setPage] = useState(1);
  const [tierFilter, setTierFilter] = useState("");
  const [busy, setBusy] = useState(false);
  // 写操作反馈专用；列表取数失败由外壳 error 态承载
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ userId: "", tierLevel: "OPUS", modelId: "" });
  const [pendingDelete, setPendingDelete] = useState<TierMappingRow | null>(null);
  // 「查询」重复点击也要重取：nonce 计入签名，但不进 URL
  const [queryNonce, setQueryNonce] = useState(0);

  const loader = useCallback(
    (signal: AbortSignal) => loadTierMappings(signal, page, tierFilter),
    [page, tierFilter],
  );
  const { resource, reload, refresh } = usePanelResource(loader, (d) => d.items.length === 0);

  // 筛选/翻页/主动查询才重新取数：以查询签名比对（StrictMode 下 effect 双跑也不会重复请求）
  const signature = `${tierFilter}|${page}|${queryNonce}`;
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    reload();
  }, [signature, reload]);

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
      // 新建后回到首页：非首页交给签名重载，首页则静默刷新（避免一次操作发两请求）
      if (page === 1) refresh();
      else setPage(1);
    } else {
      setError(res.message ?? "创建失败");
    }
  }

  async function handleDelete(row: TierMappingRow) {
    const res = await adminFetch(`/api/v1/admin/tier-mappings/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      setPendingDelete(null);
      refresh();
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
        <Button variant="outline" size="sm" onClick={() => { setPage(1); setQueryNonce((n) => n + 1); }}>
          查询
        </Button>
        <Button size="sm" data-testid={`${ids.root}-create`} onClick={() => setShowCreate(true)}>
          新建映射
        </Button>
      </div>

      <PanelState testId={ids.root} resource={resource} onRetry={reload} emptyText="暂无等级映射">
        {(d) => (
          <AdminDataTable
            columns={columns}
            rows={d.items}
            rowKey={(r) => r.id}
            rowTestId={(r) => `${ids.root}-row-${r.id}`}
            busy={busy}
            page={page}
            totalPages={Math.max(1, Math.ceil(d.total / TIER_MAPPINGS_PAGE_SIZE))}
            total={d.total}
            onPageChange={setPage}
          />
        )}
      </PanelState>

      {showCreate ? (
      <Dialog
        open
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
            <select aria-label="等级"
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
      ) : null}

      {pendingDelete ? (
      <ConfirmDialog
        open
        title="删除等级映射"
        message={`确认删除 ${pendingDelete.tierLevel} → ${pendingDelete.model?.nameDisplay ?? "模型"} 的映射？`}
        onConfirm={() => handleDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
      ) : null}
    </div>
  );
}

"use client";

/**
 * PartnerKeysManager — 卡商密钥管理（R-18 修复 + R-31 AdminDataTable 接入）。
 *
 * 功能：列表 + 新建（明文仅本次返回）+ 启停 + 批量操作。
 * 安全：不显示 keyHash；新建后的明文 key 仅展示一次，刷新后不可见。
 */

import { useState } from "react";
import { Badge, Button, Input } from "@aidean/ui";
import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { PanelState, usePanelResource } from "./PanelState";
import { panelTestIds } from "../../lib/admin/panel-resource";

export interface KeyRow {
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

/** 五态外壳 testid 前缀（B11-05） */
export const PARTNER_KEYS_PANEL_PREFIX = "admin-partner-keys";

/** 首屏地址（单测锁定 loader 无参调用的请求 URL，与改造前完全一致） */
export const PARTNER_KEYS_LIST_URL = "/api/v1/admin/partner-keys";

export const loadPartnerKeys = (signal?: AbortSignal) =>
  adminFetch<KeysResponse>(PARTNER_KEYS_LIST_URL, { signal });

export function PartnerKeysManager() {
  const ids = panelTestIds(PARTNER_KEYS_PANEL_PREFIX);
  const [message, setMessage] = useState<string | null>(null);

  const { resource, reload, refresh } = usePanelResource(loadPartnerKeys, (d) => d.keys.length === 0);
  const data = resource.status === "ready" ? resource.data : null;

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
      refresh();
    } else {
      setMessage(res.message);
    }
  }

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

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
      refresh();
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
      refresh();
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
        <Button
          variant={k.isActive ? "dark" : "primary"}
          size="sm"
          onClick={() => toggleActive(k.id, k.isActive)}
          disabled={batchBusy}
        >
          {k.isActive ? "停用" : "启用"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {message && <div className="rounded bg-primary/5 p-2 text-sm text-primary">{message}</div>}

      {newKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-sm font-medium text-amber-800">⚠ 新密钥（仅本次显示，请立即保存）</div>
          <code className="mt-1 block break-all text-xs text-amber-900">{newKey}</code>
          <Button variant="ghost" size="sm" className="mt-2 text-amber-600" onClick={() => setNewKey(null)}>已保存，关闭</Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">密钥列表（{data ? data.keys.length : "—"}）</h2>
        <Button
          variant={showCreate ? "outline" : "primary"}
          size="sm"
          data-testid={`${ids.root}-create`}
          onClick={() => setShowCreate(s => !s)}
        >
          {showCreate ? "取消" : "新建密钥"}
        </Button>
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
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-xs text-primary">已选 {selectedIds.size} 项</span>
          <Button variant="dark" size="sm" disabled={batchBusy} onClick={() => void handleBatch("disable")}>批量停用</Button>
          <Button variant="danger" size="sm" disabled={batchBusy} onClick={() => void handleBatch("delete")}>批量删除</Button>
          <Button variant="ghost" size="sm" className="ml-auto text-slate-500" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
        </div>
      ) : null}

      <PanelState testId={ids.root} resource={resource} onRetry={reload} emptyText="暂无密钥">
        {(d) => (
          <AdminDataTable
            columns={columns}
            rows={d.keys}
            rowKey={k => k.id}
            rowTestId={k => `${ids.root}-row-${k.id}`}
            emptyText="暂无密钥"
            busy={batchBusy}
            selectable
            selectedIds={selectedIds}
            onToggleRow={id => {
              const next = new Set(selectedIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setSelectedIds(next);
            }}
            onToggleAll={() => {
              if (d.keys.every(r => selectedIds.has(r.id))) setSelectedIds(new Set());
              else setSelectedIds(new Set(d.keys.map(r => r.id)));
            }}
          />
        )}
      </PanelState>

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

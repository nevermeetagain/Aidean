"use client";

/**
 * 服务平台管理（UX-26 展示名；ModelProvider CRUD + ProviderModelOffering 管理）：
 * - 列表：code/name/rechargeRatio/priceCurrency/isActive/offerings 数
 * - 新建/编辑：AdminProviderCreateSchema/PatchSchema
 * - 软删确认 + 批量操作
 * - 点击行展开 offerings 管理子面板
 */
import { useState } from "react";
import { Dialog, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Label } from "@aidean/ui";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { PanelState, usePanelResource } from "./PanelState";
import { panelTestIds } from "../../lib/admin/panel-resource";

export interface ProviderRow {
  id: string;
  code: string;
  name: string;
  nameCn: string | null;
  rechargeRatio: string;
  priceCurrency: string;
  rechargeCurrency: string;
  isActive: boolean;
  sortOrder: number;
  _count?: { offerings: number };
}

interface OfferingRow {
  id: string;
  modelId: string;
  listedAt: string | null;
  defaultMultiplier: string;
  priceInput: string | null;
  priceOutput: string | null;
  priceCache: string | null;
  priceUnit: string;
  discountInputMin: string | null;
  discountInputMax: string | null;
  discountOutputMin: string | null;
  discountOutputMax: string | null;
  discountCacheMin: string | null;
  discountCacheMax: string | null;
  isActive: boolean;
  model: { id: string; modelCode: string; nameDisplay: string; vendor: { name: string } };
}

const emptyForm = {
  code: "",
  name: "",
  nameCn: "",
  rechargeRatio: "20",
  priceCurrency: "USD",
  rechargeCurrency: "CNY",
  isActive: true,
  sortOrder: 0,
};

/** 列表数据形状（信封 data） */
export type ProvidersListData = { items: ProviderRow[]; total: number };

/** 五态外壳 testid 前缀（B11-05）；根/子态/重试一律经 panelTestIds 生成，不手拼 */
export const PROVIDERS_PANEL_PREFIX = "admin-providers";

/** 首屏地址（单测锁定 loader 无参调用的请求 URL，与改造前完全一致） */
export const PROVIDERS_LIST_URL = "/api/v1/admin/providers?pageSize=50";

export const loadProviders = (signal?: AbortSignal) =>
  adminFetch<ProvidersListData>(PROVIDERS_LIST_URL, { signal });

export function ProvidersManager() {
  const ids = panelTestIds(PROVIDERS_PANEL_PREFIX);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ProviderRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProviderRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<OfferingRow[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);

  const { resource, reload, refresh } = usePanelResource(loadProviders, (d) => d.items.length === 0);

  async function loadOfferings(providerId: string) {
    setOfferingsLoading(true);
    const res = await adminFetch<{ items: OfferingRow[] }>(`/api/v1/admin/providers/${providerId}/offerings`);
    setOfferingsLoading(false);
    if (res.ok && res.data) {
      setOfferings(res.data.items);
    } else {
      setMessage(res.message);
    }
  }

  function handleCreate() {
    setEditing(null);
    setForm(emptyForm);
    setCreating(true);
  }

  function handleEdit(row: ProviderRow) {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      nameCn: row.nameCn ?? "",
      rechargeRatio: String(row.rechargeRatio),
      priceCurrency: row.priceCurrency,
      rechargeCurrency: row.rechargeCurrency,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    });
    setCreating(true);
  }

  async function submit() {
    setBusy(true);
    const payload = {
      code: form.code,
      name: form.name,
      nameCn: form.nameCn || null,
      rechargeRatio: Number(form.rechargeRatio),
      priceCurrency: form.priceCurrency,
      rechargeCurrency: form.rechargeCurrency,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };
    if (editing) {
      const { code: _, ...patch } = payload;
      void _;
      const res = await adminFetch(`/api/v1/admin/providers/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setBusy(false);
      if (res.ok) {
        setCreating(false);
        setMessage("已更新");
        refresh();
      } else {
        setMessage(res.message);
      }
    } else {
      const res = await adminFetch("/api/v1/admin/providers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setBusy(false);
      if (res.ok) {
        setCreating(false);
        setMessage("已创建");
        refresh();
      } else {
        setMessage(res.message);
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/providers/${deleteTarget.id}`, { method: "DELETE" });
    setBusy(false);
    setDeleteTarget(null);
    if (res.ok) {
      setMessage("已删除");
      refresh();
    } else {
      setMessage(res.message);
    }
  }

  async function executeBatch(action: "activate" | "deactivate" | "delete") {
    if (selectedIds.size === 0) return;
    setBatchBusy(true);
    const res = await adminFetch<{ updated: number }>("/api/v1/admin/providers/batch", {
      method: "POST",
      body: JSON.stringify({ ids: [...selectedIds], action }),
    });
    setBatchBusy(false);
    if (res.ok) {
      setSelectedIds(new Set());
      setMessage(`批量${action} 完成: ${res.data?.updated ?? 0} 条受影响`);
      refresh();
    } else {
      setMessage(res.message);
    }
  }

  function toggleExpand(providerId: string) {
    if (expandedProvider === providerId) {
      setExpandedProvider(null);
    } else {
      setExpandedProvider(providerId);
      void loadOfferings(providerId);
    }
  }

  const columns: Column<ProviderRow>[] = [
    { key: "code", header: "Code", render: (r) => (
      <Button variant="ghost" className="font-mono text-primary hover:underline" onClick={() => toggleExpand(r.id)}>
        {r.code}
      </Button>
    )},
    { key: "name", header: "名称", render: (r) => (
      <span>{r.name}{r.nameCn ? ` (${r.nameCn})` : ""}</span>
    )},
    { key: "rechargeRatio", header: "充值比例", render: (r) => (
      <span className="font-mono text-sm">
        1 {r.rechargeCurrency} = {r.rechargeRatio} {r.priceCurrency}
      </span>
    )},
    { key: "offerings", header: "挂载数", render: (r) => String(r._count?.offerings ?? 0) },
    { key: "isActive", header: "状态", render: (r) => (
      <span className={r.isActive ? "text-green-700" : "text-muted-foreground"}>
        {r.isActive ? "启用" : "停用"}
      </span>
    )},
    { key: "actions", header: "操作", render: (r: ProviderRow) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="text-primary hover:underline" onClick={() => handleEdit(r)}>编辑</Button>
        <Button variant="ghost" size="sm" className="text-[var(--danger)] hover:underline" onClick={() => setDeleteTarget(r)}>删除</Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:underline" onClick={() => toggleExpand(r.id)}>
          {expandedProvider === r.id ? "收起" : "挂载"}
        </Button>
      </div>
    )},
  ];

  return (
    <div>
      {message && (
        <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          {message}
          <Button variant="ghost" size="sm" className="ml-3 text-muted-foreground hover:underline" onClick={() => setMessage(null)}>关闭</Button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Button data-testid={`${ids.root}-create`} onClick={handleCreate}>新增服务平台</Button>
        {selectedIds.size > 0 && (
          <>
            <Button variant="outline" disabled={batchBusy} onClick={() => void executeBatch("activate")}>批量启用</Button>
            <Button variant="outline" disabled={batchBusy} onClick={() => void executeBatch("deactivate")}>批量停用</Button>
            <Button variant="outline" disabled={batchBusy} onClick={() => setPendingDelete(true)}>批量删除</Button>
          </>
        )}
      </div>

      <PanelState testId={ids.root} resource={resource} onRetry={reload} emptyText="暂无服务平台">
        {(data) => (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">共 {data.items.length} 条</p>
            <AdminDataTable
              rows={data.items}
              columns={columns}
              rowKey={(r: ProviderRow) => r.id}
              rowTestId={(r: ProviderRow) => `${ids.root}-row-${r.id}`}
              selectable
              selectedIds={selectedIds}
              onToggleRow={(id: string) => {
                const next = new Set(selectedIds);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                setSelectedIds(next);
              }}
              onToggleAll={() => {
                if (data.items.every(r => selectedIds.has(r.id))) setSelectedIds(new Set());
                else setSelectedIds(new Set(data.items.map(r => r.id)));
              }}
              expandedRowId={expandedProvider}
              expandedRowRender={() => (
            <div className="p-4">
              <h4 className="mb-3 text-sm font-semibold">模型挂载 (Offerings)</h4>
              {offeringsLoading ? (
                <p className="text-sm text-muted-foreground">加载中…</p>
              ) : offerings.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无挂载模型</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2 pr-4">模型</TableHead>
                      <TableHead className="py-2 pr-4">上线时间</TableHead>
                      <TableHead className="py-2 pr-4">倍率</TableHead>
                      <TableHead className="py-2 pr-4">标价(输入)</TableHead>
                      <TableHead className="py-2 pr-4">标价(输出)</TableHead>
                      <TableHead className="py-2 pr-4">折扣价(输入)</TableHead>
                      <TableHead className="py-2 pr-4">折扣价(输出)</TableHead>
                      <TableHead className="py-2 pr-4">折扣价(缓存)</TableHead>
                      <TableHead className="py-2 pr-4">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offerings.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="py-2 pr-4 font-mono text-xs">{o.model.modelCode}</TableCell>
                        <TableCell className="py-2 pr-4 text-xs">{o.listedAt ? new Date(o.listedAt).toISOString().slice(0, 10) : "—"}</TableCell>
                        <TableCell className="py-2 pr-4 font-mono text-xs">{o.defaultMultiplier}</TableCell>
                        <TableCell className="py-2 pr-4 font-mono text-xs">{o.priceInput ?? "—"}</TableCell>
                        <TableCell className="py-2 pr-4 font-mono text-xs">{o.priceOutput ?? "—"}</TableCell>
                        <TableCell className="py-2 pr-4 font-mono text-xs">
                          {o.discountInputMin ?? "—"}{o.discountInputMax && o.discountInputMax !== o.discountInputMin ? `~${o.discountInputMax}` : ""}
                        </TableCell>
                        <TableCell className="py-2 pr-4 font-mono text-xs">
                          {o.discountOutputMin ?? "—"}{o.discountOutputMax && o.discountOutputMax !== o.discountOutputMin ? `~${o.discountOutputMax}` : ""}
                        </TableCell>
                        <TableCell className="py-2 pr-4 font-mono text-xs">
                          {o.discountCacheMin ?? "—"}{o.discountCacheMax && o.discountCacheMax !== o.discountCacheMin ? `~${o.discountCacheMax}` : ""}
                        </TableCell>
                        <TableCell className="py-2 pr-4">{o.isActive ? "启用" : "停用"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
        )}
            />
          </div>
        )}
      </PanelState>

      {/* Create/Edit Dialog：条件挂载（同 B11-03b 口径，避免 Dialog 内 hooks 在 node 单测触发双 React 副本） */}
      {creating ? (
      <Dialog
        open
        onClose={() => setCreating(false)}
        title={editing ? "编辑服务平台" : "新增服务平台"}
        className="max-w-lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy || !form.code || !form.name} onClick={() => void submit()}>
              {busy ? "保存中…" : editing ? "保存" : "创建"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Code *</Label>
              <Input
                value={form.code}
                disabled={!!editing}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, code: e.target.value })}
                placeholder="siliconflow"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">小写字母/数字/连字符，创建后不可改</p>
            </div>
            <div>
              <Label className="text-sm font-medium">名称 *</Label>
              <Input
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                placeholder="SiliconFlow"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">中文名</Label>
              <Input
                value={form.nameCn}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, nameCn: e.target.value })}
                placeholder="硅基流动"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">充值比例 *</Label>
              <Input
                value={form.rechargeRatio}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, rechargeRatio: e.target.value })}
                placeholder="20 (1元=$20)"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">1 元 = N 外币（如 20 表示 1元=$20）</p>
            </div>
            <div>
              <Label className="text-sm font-medium">标价币种</Label>
              <Input
                value={form.priceCurrency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, priceCurrency: e.target.value })}
                placeholder="USD"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">充值币种</Label>
              <Input
                value={form.rechargeCurrency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, rechargeCurrency: e.target.value })}
                placeholder="CNY"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Label className="flex items-center gap-2 text-sm font-normal">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              启用
            </Label>
          </div>
        </div>
      </Dialog>
      ) : null}

      {/* Delete Confirm：同样条件挂载 */}
      {deleteTarget || pendingDelete ? (
      <ConfirmDialog
        open
        title="确认删除"
        message={pendingDelete
          ? `确定批量删除 ${selectedIds.size} 个服务平台？此操作为软删，可联系管理员恢复。`
          : `确定删除「${deleteTarget?.name}」？此操作为软删。`}
        onConfirm={() => {
          if (pendingDelete) {
            void executeBatch("delete");
            setPendingDelete(false);
          } else {
            void handleDelete();
          }
        }}
        onCancel={() => { setDeleteTarget(null); setPendingDelete(false); }}
      />
      ) : null}
    </div>
  );
}

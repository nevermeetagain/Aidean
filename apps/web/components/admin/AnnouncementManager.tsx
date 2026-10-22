"use client";

/**
 * 公告管理（R-51）：
 * - Announcement 列表（类型过滤/分页）
 * - 新建/编辑/删除/置顶/发布
 * - UX-04：列表区接入 B11-05 五态外壳（admin-announcements）：失败/断网落错误态 + 重试，不再显示「暂无公告」
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "./adminFetch";
import { PanelState, usePanelResource } from "./PanelState";
import { panelTestIds } from "../../lib/admin/panel-resource";
import { Badge, Button, Label, Select, Textarea } from "@aidean/ui";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

export interface AnnRow {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  expiredAt: string | null;
  viewCount: number;
  createdAt: string;
}

const ANN_BATCH_LABEL: Record<"delete" | "publish" | "unpublish" | "pin" | "unpin", string> = {
  delete: "批量删除",
  publish: "批量发布",
  unpublish: "批量撤回",
  pin: "批量置顶",
  unpin: "批量取消置顶",
};

const TYPE_LABELS: Record<string, string> = {
  system: "系统",
  maintenance: "维护",
  update: "更新",
  promotion: "推广",
};

/** 列表数据形状（信封 data） */
export type AnnouncementsListData = { items: AnnRow[]; total: number };

/** 五态外壳 testid 前缀（UX-04，同 B11-05 口径） */
export const ANNOUNCEMENTS_PANEL_PREFIX = "admin-announcements";

export const ANNOUNCEMENTS_PAGE_SIZE = 20;

export function buildAnnouncementsUrl(page = 1, type = ""): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(ANNOUNCEMENTS_PAGE_SIZE) });
  if (type) params.set("type", type);
  return `/api/v1/admin/announcements?${params}`;
}

/** 首屏地址（与改造前完全一致） */
export const ANNOUNCEMENTS_LIST_URL = buildAnnouncementsUrl();

export const loadAnnouncements = (signal?: AbortSignal, page = 1, type = "") =>
  adminFetch<AnnouncementsListData>(buildAnnouncementsUrl(page, type), { signal });

export function AnnouncementManager() {
  const ids = panelTestIds(ANNOUNCEMENTS_PANEL_PREFIX);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AnnRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  // 内联状态提示（替代原生 alert）
  const [message, setMessage] = useState<string | null>(null);
  // 「刷新」重复点击也要重取：nonce 计入签名
  const [queryNonce, setQueryNonce] = useState(0);

  const loader = useCallback(
    (signal: AbortSignal) => loadAnnouncements(signal, page, typeFilter),
    [page, typeFilter],
  );
  const { resource, reload, refresh } = usePanelResource(loader, (d) => d.items.length === 0);

  // 筛选/翻页/主动刷新才重新取数（签名比对，StrictMode 双跑不重复请求）
  const signature = `${typeFilter}|${page}|${queryNonce}`;
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    reload();
  }, [signature, reload]);

  const data = resource.status === "ready" ? resource.data : null;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PAGE_SIZE));

  function handleDelete(id: string) {
    setPendingDelete(id);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setPendingDelete(null);
    const res = await adminFetch(`/api/v1/admin/announcements/${id}`, { method: "DELETE" });
    if (res.ok) {
      refresh();
      setMessage("公告已删除");
    } else {
      setMessage(res.message ?? "操作失败");
    }
  }

  async function executeBatch(action: "delete" | "publish" | "unpublish" | "pin" | "unpin") {
    if (selectedIds.size === 0) return;
    setBatchBusy(true);
    const res = await adminFetch<{ affected: number }>("/api/v1/admin/announcements/batch", {
      method: "POST",
      body: JSON.stringify({ ids: [...selectedIds], action }),
    });
    setBatchBusy(false);
    if (res.ok) {
      setSelectedIds(new Set());
      refresh();
      setMessage(`${ANN_BATCH_LABEL[action]}完成：${res.data?.affected ?? 0} 条受影响`);
    } else {
      setMessage(res.message ?? "批量操作失败");
    }
  }

  async function togglePin(row: AnnRow) {
    const res = await adminFetch(`/api/v1/admin/announcements/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPinned: !row.isPinned }),
    });
    if (res.ok) refresh();
  }

  async function togglePublish(row: AnnRow) {
    const res = await adminFetch(`/api/v1/admin/announcements/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isPublished: !row.isPublished }),
    });
    if (res.ok) refresh();
  }

  const columns: Column<AnnRow>[] = [
    { key: "title", header: "标题", className: "px-3 py-2 text-sm font-medium text-slate-800", render: r => (
      <div className="flex items-center gap-2">
        {r.isPinned && <span className="text-xs text-amber-500">📌</span>}
        <span>{r.title}</span>
      </div>
    ) },
    { key: "type", header: "类型", className: "px-3 py-2", render: r => (
      <Badge variant="secondary">{TYPE_LABELS[r.type] ?? r.type}</Badge>
    ) },
    { key: "status", header: "状态", className: "px-3 py-2", render: r => (
      <div className="flex gap-1">
        <Badge variant={r.isPublished ? "default" : "secondary"}>{r.isPublished ? "已发布" : "草稿"}</Badge>
      </div>
    ) },
    { key: "views", header: "浏览", className: "px-3 py-2 text-xs text-slate-500", render: r => <span>{r.viewCount}</span> },
    { key: "createdAt", header: "创建时间", className: "px-3 py-2 text-xs text-slate-400", render: r => <span>{new Date(r.createdAt).toLocaleString("zh-CN")}</span> },
    { key: "actions", header: "操作", className: "px-3 py-2", render: r => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="text-primary hover:underline" onClick={() => setEditing(r)}>编辑</Button>
        <Button variant="ghost" size="sm" className="text-slate-500 hover:underline" onClick={() => togglePin(r)}>{r.isPinned ? "取消置顶" : "置顶"}</Button>
        <Button variant="ghost" size="sm" className="text-slate-500 hover:underline" onClick={() => togglePublish(r)}>{r.isPublished ? "撤回" : "发布"}</Button>
        <Button variant="ghost" size="sm" className="text-[var(--danger)] hover:underline" onClick={() => handleDelete(r.id)}>删除</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select aria-label="按类型筛选" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="bg-white">
          <option value="">全部类型</option>
          <option value="system">系统</option>
          <option value="maintenance">维护</option>
          <option value="update">更新</option>
          <option value="promotion">推广</option>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setPage(1); setQueryNonce((n) => n + 1); }}>刷新</Button>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)} className="ml-auto">
          {showCreate ? "取消" : "新建公告"}
        </Button>
        <span className="text-xs text-slate-500">{data ? `共 ${total} 条` : null}</span>
      </div>

      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      {showCreate && <AnnouncementForm onDone={() => { setShowCreate(false); refresh(); }} />}
      {editing && <AnnouncementForm existing={editing} onDone={() => { setEditing(null); refresh(); }} />}

      {selectedIds.size > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-xs text-primary">已选 {selectedIds.size} 项</span>
          <Button variant="primary" size="sm" onClick={() => executeBatch("publish")} disabled={batchBusy}>批量发布</Button>
          <Button variant="outline" size="sm" onClick={() => executeBatch("unpublish")} disabled={batchBusy}>批量撤回</Button>
          <Button variant="outline" size="sm" onClick={() => executeBatch("pin")} disabled={batchBusy}>批量置顶</Button>
          <Button variant="outline" size="sm" onClick={() => executeBatch("unpin")} disabled={batchBusy}>取消置顶</Button>
          <Button variant="outline" size="sm" className="text-[var(--danger)]" onClick={() => executeBatch("delete")} disabled={batchBusy}>批量删除</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
        </div>
      ) : null}

      <PanelState testId={ids.root} resource={resource} onRetry={reload} emptyText="暂无公告">
        {() => (
      <AdminDataTable
        selectable
        selectedIds={selectedIds}
        onToggleRow={id => {
          const next = new Set(selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIds(next);
        }}
        onToggleAll={() => {
          if (items.every(r => selectedIds.has(r.id))) setSelectedIds(new Set());
          else setSelectedIds(new Set(items.map(r => r.id)));
        }}
        columns={columns}
        rows={items}
        rowKey={r => r.id}
        emptyText="暂无公告"
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={p => setPage(p)}
        busy={batchBusy}
      />
        )}
      </PanelState>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="确认删除"
        message="确认删除此公告？此操作为软删除。"
        onConfirm={() => confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function AnnouncementForm({ existing, onDone }: { existing?: AnnRow; onDone: () => void }) {
  const [title, setTitle] = useState(existing?.title ?? "");
  // 编辑态必须回填 content：列表接口返回全字段；置空会导致 PATCH 携带空内容被校验拒绝（或覆盖原文）
  const [content, setContent] = useState(existing?.content ?? "");
  const [type, setType] = useState(existing?.type ?? "system");
  const [priority, setPriority] = useState(existing?.priority ?? 0);
  const [isPinned, setIsPinned] = useState(existing?.isPinned ?? false);
  const [isPublished, setIsPublished] = useState(existing?.isPublished ?? false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (existing) {
      const res = await adminFetch(`/api/v1/admin/announcements/${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content, type, priority, isPinned, isPublished }),
      });
      if (res.ok) onDone();
      else setError(res.message ?? "操作失败");
    } else {
      const res = await adminFetch("/api/v1/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title, content, type, priority, isPinned, isPublished }),
      });
      if (res.ok) onDone();
      else setError(res.message ?? "操作失败");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">标题 *</span>
          <input value={title} onChange={e => setTitle(e.target.value)} required className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        </Label>
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">类型</span>
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="system">系统</option>
            <option value="maintenance">维护</option>
            <option value="update">更新</option>
            <option value="promotion">推广</option>
          </Select>
        </Label>
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">优先级</span>
          <input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        </Label>
        <Label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">内容 * (Markdown)</span>
          <Textarea value={content} onChange={e => setContent(e.target.value)} required rows={5} className="font-mono" />
        </Label>
      </div>
      <div className="flex gap-4">
        <Label className="flex items-center gap-2 text-sm text-slate-600 font-normal">
          <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
          置顶
        </Label>
        <Label className="flex items-center gap-2 text-sm text-slate-600 font-normal">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
          发布
        </Label>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" type="submit">{existing ? "保存" : "创建"}</Button>
        <Button variant="outline" size="sm" type="button" onClick={onDone}>取消</Button>
      </div>
    </form>
  );
}

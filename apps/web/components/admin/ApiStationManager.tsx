"use client";

/**
 * API站点管理（R-49）：
 * - APIStation 列表（搜索/分页）+ 新建/编辑/删除
 * - 平台 Key 池管理（添加/状态切换/删除）
 * - 计费规则配置（markupRate / tokenMultiplier）
 * 使用 @aidean/ui 组件 + AdminDataTable。
 */

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge, Button, Label, Textarea } from "@aidean/ui";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

interface StationRow {
  id: string;
  name: string;
  nameCn: string | null;
  displayName: string;
  provider: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  _count?: { keys: number; packages: number };
  billingRule?: { billingMode: string; markupRate: string } | null;
  createdAt: string;
}

export function ApiStationManager() {
  const [stations, setStations] = useState<StationRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<StationRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // 内联状态提示（替代原生 alert）
  const [message, setMessage] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async (p: number) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    setLoading(true);
    const res = await adminFetch<{ items: StationRow[]; total: number }>(
      `/api/v1/admin/api-stations?${params}`
    );
    setLoading(false);
    if (res.ok && res.data) {
      setStations(res.data.items);
      setTotal(res.data.total);
    }
  }, [search]);

  useEffect(() => { void load(page); }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleDelete(id: string) {
    setPendingDelete(id);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setPendingDelete(null);
    const res = await adminFetch(`/api/v1/admin/api-stations/${id}`, { method: "DELETE" });
    if (res.ok) {
      void load(page);
      setMessage("API 站点已删除");
    } else {
      setMessage(res.message ?? "删除失败");
    }
  }

  const columns: Column<StationRow>[] = [
    { key: "name", header: "名称", className: "px-3 py-2 text-sm font-medium text-slate-800", render: s => (
      <div className="flex flex-col">
        <span>{s.name}</span>
        {s.nameCn && <span className="text-xs text-slate-400">{s.nameCn}</span>}
      </div>
    ) },
    { key: "displayName", header: "显示名", className: "px-3 py-2 text-sm text-slate-600", render: s => <span>{s.displayName}</span> },
    { key: "provider", header: "提供商", className: "px-3 py-2 text-xs text-slate-500", render: s => <span>{s.provider ?? "—"}</span> },
    { key: "keys", header: "Key数", className: "px-3 py-2 text-xs text-slate-600", render: s => <span>{s._count?.keys ?? 0}</span> },
    { key: "billing", header: "计费", className: "px-3 py-2 text-xs", render: s => (
      <Badge variant={s.billingRule ? "default" : "secondary"}>
        {s.billingRule?.billingMode ?? "默认"}
      </Badge>
    ) },
    { key: "verified", header: "状态", className: "px-3 py-2", render: s => (
      <div className="flex gap-1">
        {s.isVerified && <Badge variant="default">已验证</Badge>}
        {s.isFeatured && <Badge variant="secondary">推荐</Badge>}
        {!s.isVerified && !s.isFeatured && <span className="text-xs text-slate-400">—</span>}
      </div>
    ) },
    { key: "actions", header: "操作", className: "px-3 py-2", render: s => (
      <div className="flex gap-2">
        {/* 原「详情」链接指向不存在的 /admin/api-stations/[id] 页面（死链），改为行内编辑 */}
        <button onClick={() => setEditing(s)} className="text-xs text-primary hover:underline">编辑</button>
        <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">删除</button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); void load(1); } }}
          placeholder="搜索站点名称…"
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
        />
        <Button variant="outline" size="sm" onClick={() => { setPage(1); void load(1); }}>搜索</Button>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)} className="ml-auto">
          {showCreate ? "取消" : "新建站点"}
        </Button>
        <span className="text-xs text-slate-500">共 {total} 个站点</span>
      </div>

      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      {showCreate && <StationForm onDone={() => { setShowCreate(false); void load(page); }} />}
      {editing && <StationForm existing={editing} onDone={() => { setEditing(null); void load(page); }} />}

      <AdminDataTable
        columns={columns}
        rows={stations}
        rowKey={s => s.id}
        emptyText="暂无 API 站点"
        busy={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={p => setPage(p)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="确认删除"
        message="确认删除此 API 站点？此操作为软删除。"
        onConfirm={() => confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function StationForm({ existing, onDone }: { existing?: StationRow; onDone: () => void }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [provider, setProvider] = useState(existing?.provider ?? "");
  const [baseUrl, setBaseUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [baseUrlTouched, setBaseUrlTouched] = useState(false);

  // 编辑态：baseUrl 不在列表 select 载荷中稳妥回填，异步补拉一次详情
  useEffect(() => {
    if (!existing) return;
    let cancelled = false;
    void adminFetch<{ item: { baseUrl?: string | null; description?: string | null } }>(
      `/api/v1/admin/api-stations/${existing.id}`
    ).then(res => {
      if (cancelled || !res.ok || !res.data?.item) return;
      if (res.data.item.baseUrl) setBaseUrl(res.data.item.baseUrl);
      if (res.data.item.description) setDescription(res.data.item.description);
    });
    return () => { cancelled = true; };
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      name, displayName, provider: provider || undefined,
      baseUrl: baseUrl || undefined, description,
    };
    const res = existing
      ? await adminFetch(`/api/v1/admin/api-stations/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminFetch("/api/v1/admin/api-stations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    if (res.ok) {
      onDone();
    } else {
      setError(res.message ?? "操作失败");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">名称 *</span>
          <input value={name} onChange={e => setName(e.target.value)} required className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        </Label>
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">显示名 *</span>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} required className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        </Label>
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">提供商</span>
          <input value={provider} onChange={e => setProvider(e.target.value)} className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        </Label>
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Base URL</span>
          <input
            value={baseUrl}
            onChange={e => { setBaseUrl(e.target.value); setBaseUrlTouched(true); }}
            placeholder="https://api.example.com/v1"
            className="rounded border border-slate-200 px-3 py-1.5 text-sm"
          />
        </Label>
      </div>
      <Label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">描述</span>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
      </Label>
      {baseUrlTouched && baseUrl && !/^https?:\/\//.test(baseUrl) && (
        <p className="text-xs text-red-500">Base URL 须以 http(s):// 开头</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" type="submit">{existing ? "保存" : "创建"}</Button>
        <Button variant="outline" size="sm" type="button" onClick={onDone}>取消</Button>
      </div>
    </form>
  );
}

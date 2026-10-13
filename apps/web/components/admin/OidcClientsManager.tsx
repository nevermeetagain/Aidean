"use client";

/**
 * OIDC 客户端管理（S7.3 接入断链）：
 * 列出平台 SSO 应用（不展示 secret）+ 编辑元数据（名称/回调 URI/scope/登出 URI）+ 启停。
 * secret 由 seed/env 供用，后台不提供发放/轮换入口（避免密钥落盘/回显）。
 */
import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Dialog, Button, Input } from "@aidean/ui";

interface ClientRow {
  id: string;
  clientId: string;
  name: string;
  redirectUris: string[];
  logoutUri: string | null;
  scopes: string[];
  pkceRequired: boolean;
  firstParty: boolean;
  isActive: boolean;
  createdAt: string;
}

interface ClientForm {
  name: string;
  redirectUrisText: string;
  logoutUri: string;
  scopesText: string;
  isActive: boolean;
}

function toLines(arr: string[]): string {
  return arr.join("\n");
}
function fromLines(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function OidcClientsManager({ canWrite = false }: { canWrite?: boolean }) {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [form, setForm] = useState<ClientForm>({ name: "", redirectUrisText: "", logoutUri: "", scopesText: "", isActive: true });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch<{ clients: ClientRow[] }>("/api/v1/admin/oidc-clients");
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.clients);
      setMessage(null);
    } else {
      setMessage(res.message ?? "加载失败");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(c: ClientRow) {
    setForm({
      name: c.name,
      redirectUrisText: toLines(c.redirectUris),
      logoutUri: c.logoutUri ?? "",
      scopesText: toLines(c.scopes),
      isActive: c.isActive,
    });
    setEditing(c);
  }

  async function save() {
    const redirectUris = fromLines(form.redirectUrisText);
    const scopes = fromLines(form.scopesText);
    if (redirectUris.length === 0) {
      setMessage("至少一条回调 URI");
      return;
    }
    if (scopes.length === 0) {
      setMessage("至少一个 scope");
      return;
    }
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/oidc-clients/${editing?.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: form.name.trim(),
        redirectUris,
        scopes,
        logoutUri: form.logoutUri.trim() || null,
        isActive: form.isActive,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "保存失败");
      return;
    }
    setMessage("已保存");
    setEditing(null);
    await load();
  }

  async function toggleActive(c: ClientRow) {
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/oidc-clients/${c.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    setBusy(false);
    if (res.ok) {
      setMessage(c.isActive ? `已停用 ${c.clientId}` : `已启用 ${c.clientId}`);
      await load();
    } else {
      setMessage(res.message ?? "操作失败");
    }
  }

  const columns: Column<ClientRow>[] = [
    {
      key: "client",
      header: "客户端",
      className: "px-3 py-2",
      render: (c) => (
        <div>
          <div className="text-slate-800">{c.name}</div>
          <div className="text-xs text-slate-500">
            {c.clientId} · {c.firstParty ? "一方" : "第三方"} · {c.pkceRequired ? "PKCE" : "secret"}
          </div>
        </div>
      ),
    },
    { key: "scopes", header: "Scopes", className: "px-3 py-2 text-xs text-slate-600", render: (c) => <span>{c.scopes.join(", ")}</span> },
    { key: "cb", header: "回调数", className: "px-3 py-2 tabular-nums text-slate-600", render: (c) => <span>{c.redirectUris.length}</span> },
    { key: "status", header: "状态", className: "px-3 py-2", render: (c) => <span className={c.isActive ? "font-medium text-emerald-600" : "text-slate-500"}>{c.isActive ? "启用" : "停用"}</span> },
    ...(canWrite
      ? [{
          key: "actions",
          header: "操作",
          className: "px-3 py-2",
          render: (c: ClientRow) => (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(c)}>编辑</Button>
              <Button variant={c.isActive ? "danger" : "primary"} size="sm" onClick={() => void toggleActive(c)}>{c.isActive ? "停用" : "启用"}</Button>
            </div>
          ),
        } as Column<ClientRow>]
      : []),
  ];

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</p>
      ) : null}
      <div className="text-xs text-slate-500">共 {rows.length} 个 OIDC 客户端（secret 不经此界面发放/展示）</div>

      <AdminDataTable columns={columns} rows={rows} rowKey={(c) => c.id} emptyText="暂无 OIDC 客户端" busy={busy || loading} />

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`编辑客户端：${editing?.clientId ?? ""}`}
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-500">
            名称
            <Input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            回调 URI（每行一条）
            <textarea rows={3} value={form.redirectUrisText} onChange={(e) => setForm({ ...form, redirectUrisText: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[var(--accent)]" />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            登出回调 URI（可空）
            <Input type="text" value={form.logoutUri} onChange={(e) => setForm({ ...form, logoutUri: e.target.value })} className="mt-1" />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Scopes（每行一条）
            <textarea rows={3} value={form.scopesText} onChange={(e) => setForm({ ...form, scopesText: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[var(--accent)]" />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            启用（停用后该客户端即时不可登录）
          </label>
        </div>
      </Dialog>
    </div>
  );
}

"use client";

/**
 * 管理端「角色权限」面板（restructure-admin-nav-rbac-cms S3.5 · A2+B2）。
 * - 真源：Role/Permission/RolePermission（DB）；权限原子取自 @aidean/shared 注册表（ADMIN_DOMAINS × read/write）。
 * - 仅 SUPER_ADMIN 可达（后端 admin.roles.read/write 强制；本面板入口由侧栏 requiredPermissions 剪枝）。
 * - 系统角色：可改名称/描述与权限集（运行期临时调整，seed 会按注册表收敛覆盖）；SUPER_ADMIN 持通配 `*` 不落库，权限集只读展示。
 * - 自定义角色（isSystem=false）：可创建/编辑/删除；删除前后端护「系统角色禁删 / 有用户绑定禁删」。
 * - 写操作 revalidateTag("admin-auth") → 守卫与侧栏即时生效（界面提示重新登录以刷新菜单缓存）。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ADMIN_DOMAINS, ADMIN_DOMAIN_KEYS } from "@aidean/shared";
import { adminFetch } from "./adminFetch";
import { Badge, Button, Label } from "@aidean/ui";
import { ConfirmDialog } from "./ConfirmDialog";

interface RoleVM {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
  updatedAt: string;
}

const inputCls = "rounded border border-slate-200 px-2 py-1 text-sm";
const readCode = (d: string) => `admin.${d}.read`;
const writeCode = (d: string) => `admin.${d}.write`;
const SUPER_ADMIN_CODE = "SUPER_ADMIN";

export function RolesManager() {
  const [roles, setRoles] = useState<RoleVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RoleVM | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch<{ roles: RoleVM[] }>("/api/v1/admin/roles");
    setLoading(false);
    if (res.ok && res.data) setRoles(res.data.roles);
    else setMessage(res.message ?? "加载失败");
  }, []);

  useEffect(() => { void load(); }, [load]);

  const systemRoles = useMemo(() => roles.filter((r) => r.isSystem), [roles]);
  const customRoles = useMemo(() => roles.filter((r) => !r.isSystem), [roles]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const res = await adminFetch(`/api/v1/admin/roles/${pendingDelete.id}`, { method: "DELETE" });
    setPendingDelete(null);
    if (res.ok) { setMessage(`已删除角色「${pendingDelete.name}」`); await load(); }
    else setMessage(res.message ?? "删除失败");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void load()}>刷新</Button>
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => { setShowCreate((v) => !v); setEditingId(null); }}>
          {showCreate ? "取消" : "新建角色"}
        </Button>
      </div>

      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</p>
      ) : null}

      {showCreate && (
        <CreateRoleForm onDone={() => { setShowCreate(false); void load(); setMessage("角色已创建 · 重新登录后台生效"); }} />
      )}

      <p className="text-xs text-slate-400">
        共 {roles.length} 个角色（系统 {systemRoles.length} · 自定义 {customRoles.length}）。角色 code 为稳定键，创建后不可改。
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">加载中…</p>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => {
            const editing = editingId === role.id;
            const isSuper = role.code === SUPER_ADMIN_CODE;
            return (
              <div key={role.id} className="rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-800">{role.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">{role.code}</span>
                  {role.isSystem ? <Badge variant="secondary">系统内置</Badge> : <Badge variant="default">自定义</Badge>}
                  {isSuper ? <Badge variant="secondary">通配 *（全权）</Badge> : null}
                  <span className="text-xs text-slate-400">绑定 {role.userCount} 人</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => { setEditingId(editing ? null : role.id); setShowCreate(false); }}
                    >
                      {editing ? "收起" : "编辑"}
                    </button>
                    {!role.isSystem && (
                      <button className="text-xs text-red-500 hover:underline" onClick={() => setPendingDelete(role)}>删除</button>
                    )}
                  </div>
                </div>
                {role.description && <p className="px-3 py-1.5 text-xs text-slate-500">{role.description}</p>}
                {editing && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-3">
                    <RoleForm
                      role={role}
                      onDone={() => setEditingId(null)}
                      onSaved={async (okText) => { setEditingId(null); setMessage(`${okText} · 重新登录后台生效`); await load(); }}
                      onError={(m) => setMessage(m)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="确认删除角色"
        message={pendingDelete ? `确认删除自定义角色「${pendingDelete.name}」(${pendingDelete.code})？若仍绑定用户将被拒绝，请先在用户面板解绑。` : ""}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

/** 编辑既有角色：改名/描述 + 勾选权限集（覆盖式）。SUPER_ADMIN 权限集只读（通配不落库）。 */
function RoleForm({ role, onDone, onSaved, onError }: {
  role: RoleVM;
  onDone: () => void;
  onSaved: (okText: string) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [codes, setCodes] = useState<Set<string>>(() => new Set(role.permissions));
  const [busy, setBusy] = useState(false);
  const isSuper = role.code === SUPER_ADMIN_CODE;

  async function save() {
    setBusy(true);
    const body: Record<string, unknown> = { name: name.trim(), description: description.trim() || null };
    if (!isSuper) body.permissions = [...codes];
    const res = await adminFetch(`/api/v1/admin/roles/${role.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) onSaved("已保存");
    else onError(res.message ?? "保存失败");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Label className="flex flex-col gap-1 text-xs text-slate-500">名称
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Label>
        <Label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">描述
          <input className={`${inputCls} w-full`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </Label>
      </div>
      {isSuper ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
          超级管理员持有通配 `*`（解析层注入，不落权限表），权限集不可编辑。
        </p>
      ) : (
        <PermissionsGrid value={codes} onChange={setCodes} note={role.isSystem ? "系统角色：改动为运行期临时调整，重跑 seed 将按注册表收敛覆盖。" : undefined} />
      )}
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>保存</Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={onDone}>取消</Button>
      </div>
    </div>
  );
}

function CreateRoleForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [codes, setCodes] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setBusy(true);
    const res = await adminFetch("/api/v1/admin/roles", {
      method: "POST",
      body: JSON.stringify({ code: code.trim(), name: name.trim(), description: description.trim() || undefined, permissions: [...codes] }),
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError(res.message ?? "创建失败");
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Label className="flex flex-col gap-1 text-xs text-slate-500">编码（小写下划线，2-40）
          <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="finance_ops" />
        </Label>
        <Label className="flex flex-col gap-1 text-xs text-slate-500">名称
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="财务运营" />
        </Label>
        <Label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">描述
          <input className={`${inputCls} w-full`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </Label>
      </div>
      <PermissionsGrid value={codes} onChange={setCodes} />
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" disabled={busy || !code.trim() || !name.trim()} onClick={() => void submit()}>创建角色</Button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}

/** 按域 × {读,写} 勾选；全选 / 清空便捷。受控 Set<string>（权限码）。 */
function PermissionsGrid({ value, onChange, note }: {
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  note?: string;
}) {
  const toggle = (c: string) => {
    const next = new Set(value);
    if (next.has(c)) next.delete(c); else next.add(c);
    onChange(next);
  };
  const toggleDomain = (d: string) => {
    const rc = readCode(d); const wc = writeCode(d);
    const next = new Set(value);
    const hasAll = next.has(rc) && next.has(wc);
    if (hasAll) { next.delete(rc); next.delete(wc); } else { next.add(rc); next.add(wc); }
    onChange(next);
  };
  const allCodes = ADMIN_DOMAIN_KEYS.flatMap((d) => [readCode(d), writeCode(d)]);
  const selectAll = () => onChange(new Set(allCodes));
  const clearAll = () => onChange(new Set());

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600">权限集（{value.size}/{allCodes.length}）</span>
        <button type="button" className="text-xs text-primary hover:underline" onClick={selectAll}>全选</button>
        <button type="button" className="text-xs text-slate-500 hover:underline" onClick={clearAll}>清空</button>
      </div>
      {note ? <p className="text-[11px] text-amber-600">{note}</p> : null}
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {ADMIN_DOMAIN_KEYS.map((d) => {
          const rc = readCode(d); const wc = writeCode(d);
          return (
            <div key={d} className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-white px-2 py-1 text-xs">
              <button type="button" className="text-left text-slate-700 hover:text-primary" onClick={() => toggleDomain(d)} title="点击切换该域读写">
                {ADMIN_DOMAINS[d]}
              </button>
              <span className="flex items-center gap-3">
                <Label className="flex cursor-pointer items-center gap-1 font-normal">
                  <input type="checkbox" checked={value.has(rc)} onChange={() => toggle(rc)} />读
                </Label>
                <Label className="flex cursor-pointer items-center gap-1 font-normal">
                  <input type="checkbox" checked={value.has(wc)} onChange={() => toggle(wc)} />写
                </Label>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

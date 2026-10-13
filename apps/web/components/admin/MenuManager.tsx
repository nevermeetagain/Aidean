"use client";

/**
 * 管理端「可配置菜单」面板（restructure-admin-nav-rbac-cms S2.5）。
 * - 真源 NavigationMenu(scope=ADMIN)；侧边栏由 lib/admin-navigation.ts 读取（tag admin-nav）。
 * - 支持：自建一级分组、二级子项（选归属/排序/改名/改路径）、显隐、删除。
 * - 保存后后端 revalidateTag("admin-nav")；界面提示「重新登录后台生效」（用户决策：菜单变更重登刷新）。
 * - 保护：一级分组有子项时禁删（后端 40000）；隐藏某入口优先用「显示/隐藏」而非删除。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge, Button } from "@aidean/ui";
import { ConfirmDialog } from "./ConfirmDialog";

interface MenuRow {
  id: string;
  menuCode: string;
  name: string;
  nameEn: string | null;
  level: number;
  path: string | null;
  icon: string | null;
  parentCode: string | null;
  isDropdown: boolean;
  isVisible: boolean;
  isActive: boolean;
  sortOrder: number;
}

const inputCls = "rounded border border-slate-200 px-2 py-1 text-sm";

export function MenuManager() {
  const [items, setItems] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MenuRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [pendingApply, setPendingApply] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch<{ items: MenuRow[] }>("/api/v1/admin/menus");
    setLoading(false);
    if (res.ok && res.data) setItems(res.data.items);
    else setMessage(res.message ?? "加载失败");
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => items.filter((r) => r.level === 1), [items]);
  const leavesOf = useCallback(
    (code: string) => items.filter((r) => r.level === 2 && r.parentCode === code),
    [items],
  );

  async function mutate(id: string, body: Record<string, unknown>, okText: string) {
    const res = await adminFetch(`/api/v1/admin/menus/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    if (res.ok) { setMessage(`${okText} · 重新登录后台生效`); await load(); }
    else setMessage(res.message ?? "操作失败");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const res = await adminFetch(`/api/v1/admin/menus/${pendingDelete.id}`, { method: "DELETE" });
    setPendingDelete(null);
    if (res.ok) { setMessage("已删除 · 重新登录后台生效"); await load(); }
    else setMessage(res.message ?? "删除失败");
  }

  // S2.2：一键应用出厂默认三级 7 板块（URL 不变、只增不减；自定义多余入口停用）
  async function applyDefault() {
    setPendingApply(false);
    const res = await adminFetch<{ upserted: number; deactivated: number }>("/api/v1/admin/menus/apply-default", { method: "POST" });
    if (res.ok && res.data) { setMessage(`已应用默认 7 板块（写入 ${res.data.upserted} 项、停用旧项 ${res.data.deactivated}）· 重新登录后台生效`); await load(); }
    else setMessage(res.message ?? "应用失败");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void load()}>刷新</Button>
        <Button variant="outline" size="sm" onClick={() => setPendingApply(true)}>应用推荐分组（7 板块）</Button>
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => setShowCreateGroup((v) => !v)}>
          {showCreateGroup ? "取消" : "新建一级分组"}
        </Button>
      </div>

      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{message}</p>
      ) : null}

      {showCreateGroup && <CreateGroupForm onDone={() => { setShowCreateGroup(false); void load(); setMessage("分组已创建 · 重新登录后台生效"); }} />}

      <p className="text-xs text-slate-400">
        共 {groups.length} 个一级、{items.filter((r) => r.level === 2).length} 个子项。menuCode 为稳定键，创建后不可改。
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">加载中…</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const kids = leavesOf(g.menuCode);
            const editing = editingId === g.id;
            return (
              <div key={g.id} className="rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-800">{g.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">{g.menuCode}</span>
                  {!g.isVisible && <Badge variant="secondary">已隐藏</Badge>}
                  {!g.isDropdown && <Badge variant="secondary">独立一级</Badge>}
                  <div className="ml-auto flex items-center gap-2">
                    <button className="text-xs text-primary hover:underline" onClick={() => setEditingId(editing ? null : g.id)}>{editing ? "收起" : "编辑"}</button>
                    <button className="text-xs text-slate-500 hover:underline" onClick={() => void mutate(g.id, { isVisible: !g.isVisible }, g.isVisible ? "已隐藏" : "已显示")}>{g.isVisible ? "隐藏" : "显示"}</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => setPendingDelete(g)}>删除</button>
                  </div>
                </div>
                {editing && (
                  <div className="border-b border-slate-100 bg-slate-50/60 p-3">
                    <NodeForm row={g} groups={groups} onDone={() => { setEditingId(null); }} onMutate={(body, ok) => void mutate(g.id, body, ok)} />
                  </div>
                )}
                <div className="divide-y divide-slate-50">
                  {kids.map((leaf) => {
                    const lEditing = editingId === leaf.id;
                    return (
                      <div key={leaf.id} className="px-3 py-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="ml-3 text-sm text-slate-700">{leaf.name}</span>
                          <span className="font-mono text-[11px] text-slate-400">{leaf.path}</span>
                          {!leaf.isVisible && <Badge variant="secondary">已隐藏</Badge>}
                          <div className="ml-auto flex items-center gap-2">
                            <button className="text-xs text-primary hover:underline" onClick={() => setEditingId(lEditing ? null : leaf.id)}>{lEditing ? "收起" : "编辑"}</button>
                            <button className="text-xs text-slate-500 hover:underline" onClick={() => void mutate(leaf.id, { isVisible: !leaf.isVisible }, leaf.isVisible ? "已隐藏" : "已显示")}>{leaf.isVisible ? "隐藏" : "显示"}</button>
                            <button className="text-xs text-red-500 hover:underline" onClick={() => setPendingDelete(leaf)}>删除</button>
                          </div>
                        </div>
                        {lEditing && (
                          <div className="mt-2 rounded bg-slate-50/60 p-3">
                            <NodeForm row={leaf} groups={groups} onDone={() => { setEditingId(null); }} onMutate={(body, ok) => void mutate(leaf.id, body, ok)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {kids.length === 0 && <p className="px-6 py-2 text-xs text-slate-400">（无子项）</p>}
                </div>
                <div className="px-3 py-2">
                  <CreateLeafForm groupCode={g.menuCode} onDone={() => { void load(); setMessage("子项已创建 · 重新登录后台生效"); }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="确认删除菜单"
        message={pendingDelete ? `确认删除「${pendingDelete.name}」(${pendingDelete.menuCode})？一级分组若仍有子项将被拒绝。` : ""}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingApply}
        title="应用推荐分组（7 板块）"
        message="将出厂默认三级导航树（数据报表 / 模型与采集 / 用户与权限 / 交易与财务 / 渠道与子平台 / 内容运营 / 站点与系统）写入菜单：URL 不变、只增不减，你自定义的多余入口会被停用（非删除）。确认应用？"
        onConfirm={() => void applyDefault()}
        onCancel={() => setPendingApply(false)}
      />
    </div>
  );
}

/** 编辑既有节点：改名/排序/路径/归属（level1 不显示归属）。保存走 PATCH。 */
function NodeForm({ row, groups, onMutate, onDone }: {
  row: MenuRow;
  groups: MenuRow[];
  onMutate: (body: Record<string, unknown>, okText: string) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [path, setPath] = useState(row.path ?? "");
  const [sortOrder, setSortOrder] = useState(row.sortOrder);
  const [parentCode, setParentCode] = useState<string>(row.parentCode ?? "");

  function save() {
    const body: Record<string, unknown> = { name: name.trim(), sortOrder };
    if (row.level === 2) {
      if (path.trim()) body.path = path.trim();
      if (parentCode) body.parentCode = parentCode;
    }
    onMutate(body, "已保存");
    onDone();
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-slate-500">名称
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">排序
        <input type="number" className={`${inputCls} w-20`} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      {row.level === 2 && (
        <>
          <label className="flex flex-col gap-1 text-xs text-slate-500">路径
            <input className={`${inputCls} w-56`} value={path} onChange={(e) => setPath(e.target.value)} placeholder="/admin/xxx" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">归属分组
            <select className={inputCls} value={parentCode} onChange={(e) => setParentCode(e.target.value)}>
              {groups.filter((g) => g.menuCode !== row.menuCode && g.isDropdown).map((g) => (
                <option key={g.menuCode} value={g.menuCode}>{g.name}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <Button variant="primary" size="sm" onClick={save}>保存</Button>
    </div>
  );
}

function CreateGroupForm({ onDone }: { onDone: () => void }) {
  const [menuCode, setMenuCode] = useState("");
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(100);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const res = await adminFetch("/api/v1/admin/menus", {
      method: "POST",
      body: JSON.stringify({ menuCode: menuCode.trim(), name: name.trim(), level: 1, sortOrder }),
    });
    if (res.ok) onDone();
    else setError(res.message ?? "创建失败");
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-500">编码（小写下划线）
          <input className={inputCls} value={menuCode} onChange={(e) => setMenuCode(e.target.value)} placeholder="adm_grp_xxx" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">名称
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="新分组" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">排序
          <input type="number" className={`${inputCls} w-20`} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </label>
        <Button variant="primary" size="sm" onClick={() => void submit()}>创建分组</Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CreateLeafForm({ groupCode, onDone }: { groupCode: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [menuCode, setMenuCode] = useState("");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const res = await adminFetch("/api/v1/admin/menus", {
      method: "POST",
      body: JSON.stringify({ menuCode: menuCode.trim(), name: name.trim(), level: 2, parentCode: groupCode, path: path.trim(), sortOrder }),
    });
    if (res.ok) { setOpen(false); setMenuCode(""); setName(""); setPath(""); onDone(); }
    else setError(res.message ?? "创建失败");
  }

  if (!open) {
    return <button className="text-xs text-primary hover:underline" onClick={() => setOpen(true)}>+ 在此分组新建子项</button>;
  }
  return (
    <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-500">编码
          <input className={inputCls} value={menuCode} onChange={(e) => setMenuCode(e.target.value)} placeholder="adm_xxx" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">名称
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">路径
          <input className={`${inputCls} w-56`} value={path} onChange={(e) => setPath(e.target.value)} placeholder="/admin/xxx" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">排序
          <input type="number" className={`${inputCls} w-20`} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </label>
        <Button variant="primary" size="sm" onClick={() => void submit()}>创建子项</Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>取消</Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

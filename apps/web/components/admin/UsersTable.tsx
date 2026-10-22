"use client";

/**
 * 用户管理表格（SubTask 2.1.2 + 3.6.2 + R-31 AdminDataTable + R-32 Button）：
 * 分页/搜索/徽章化 tier 与 status；
 * 行操作：调 tier、封禁/解封、详情抽屉（余额只读；UX-26 裁定 5：调账入口仅保留在 /admin/wallets，抽屉内只给跳转链接，调账 API 不变）。
 * 操作成功后重拉当前页；错误行内提示。
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Button, Input, Label, Select } from "@aidean/ui";

interface UserRow {
  id: string;
  email: string;
  nickname: string | null;
  tier: string;
  status: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  balanceYuan: string;
  walletId: string | null;
}

import { TIER_ROW_CLS, TIER_SHORT_LABEL, tierShortLabelOf } from "../../lib/features/user/tier";

/** UX-27：系统角色对运营展示中文 */
const ROLE_LABEL: Record<string, string> = { GUEST: "访客", USER: "普通用户", ADMIN: "管理员", SUPER_ADMIN: "超级管理员", MODERATOR: "审核员" };

interface AssignableRole {
  code: string;
  name: string;
  isSystem: boolean;
}

/** S4 credentials 只读聚合视图类型（对齐 GET /admin/users/[id]/credentials §4①） */
type CredKind = "apiKey" | "stationKey" | "channel";
interface CredentialsVM {
  apiKeys: { id: string; masked: string; status: string; lastUsedAt: string | null }[];
  stationKeys: { id: string; stationName: string | null; masked: string; status: string }[];
  channels: { id: string; name: string; provider: string; enabled: boolean }[];
}
interface CredRow {
  id: string;
  kind: CredKind;
  masked: string;
  active: boolean;
  meta: string;
  label: string;
}

export function UsersTable({
  canAssignRoles = false,
  canRevokeCredentials = false,
}: {
  canAssignRoles?: boolean;
  canRevokeCredentials?: boolean;
}) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 首载/筛选请求在途时置 true：表格不闪「暂无用户」空态，计数显示「加载中…」
  const [loading, setLoading] = useState(true);
  const keepBannerRef = useRef(false);
  const [detail, setDetail] = useState<UserRow | null>(null);
  // 角色分配（S3.5，仅 SUPER_ADMIN 露出）
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
  const [allRoles, setAllRoles] = useState<AssignableRole[]>([]);
  const [roleCodes, setRoleCodes] = useState<Set<string>>(() => new Set());
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleMsg, setRoleMsg] = useState<string | null>(null);
  // S4 credentials 只读区（随详情抽屉打开拉取）
  const [cred, setCred] = useState<CredentialsVM | null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credBusy, setCredBusy] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<{ kind: CredKind; id: string; label: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const pageSize = 20;

  const load = useCallback(async (p: number, query: string) => {
    setLoading(true);
    const res = await adminFetch<{ users: UserRow[]; total: number }>(
      `/api/v1/admin/users?page=${p}&pageSize=${pageSize}${query ? `&q=${encodeURIComponent(query)}` : ""}`
    );
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.users);
      setTotal(res.data.total);
      if (!keepBannerRef.current) setMessage(null);
    } else {
      setMessage(res.message ?? "加载失败");
    }
  }, []);

  useEffect(() => {
    void load(page, search);
  }, [load, page, search]);

  // 打开详情抽屉即拉取该用户 credentials；关闭/切换重置吊销确认态。
  useEffect(() => {
    setPendingRevoke(null);
    setRevokeReason("");
    if (detail) void loadCredentials(detail.id);
    else setCred(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  async function patchUser(id: string, body: Record<string, unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    const res = await adminFetch(`/api/v1/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "操作失败");
      return false;
    }
    setMessage(done);
    await load(page, search);
    return true;
  }

  async function openRoleEditor(u: UserRow) {
    setRoleTarget(u);
    setRoleMsg(null);
    setRoleBusy(true);
    let rolesList = allRoles;
    if (rolesList.length === 0) {
      const r = await adminFetch<{ roles: AssignableRole[] }>("/api/v1/admin/roles");
      if (r.ok && r.data) {
        rolesList = r.data.roles.map((x) => ({ code: x.code, name: x.name, isSystem: x.isSystem }));
        setAllRoles(rolesList);
      }
    }
    const cur = await adminFetch<{ roleCodes: string[] }>(`/api/v1/admin/users/${u.id}/roles`);
    setRoleCodes(new Set(cur.ok && cur.data ? cur.data.roleCodes : []));
    if (!cur.ok) setRoleMsg(cur.message ?? "加载角色失败");
    setRoleBusy(false);
  }

  function toggleRoleCode(code: string) {
    setRoleCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function saveRoles() {
    if (!roleTarget) return;
    setRoleBusy(true);
    setRoleMsg(null);
    const res = await adminFetch(`/api/v1/admin/users/${roleTarget.id}/roles`, {
      method: "PATCH",
      body: JSON.stringify({ roleCodes: [...roleCodes] }),
    });
    setRoleBusy(false);
    if (res.ok) {
      setMessage(`已更新 ${roleTarget.email} 的角色分配`);
      setRoleTarget(null);
      await load(page, search);
    } else {
      setRoleMsg(res.message ?? "保存失败");
    }
  }

  async function loadCredentials(userId: string) {
    setCredLoading(true);
    setCredError(null);
    setCred(null);
    const res = await adminFetch<CredentialsVM>(`/api/v1/admin/users/${userId}/credentials`);
    setCredLoading(false);
    if (res.ok && res.data) setCred(res.data);
    else setCredError(res.message ?? "加载凭据失败");
  }

  function startRevoke(row: CredRow) {
    setPendingRevoke({ kind: row.kind, id: row.id, label: row.label });
    setRevokeReason("");
    setCredError(null);
  }

  async function submitRevoke() {
    if (!detail || !pendingRevoke) return;
    if (!revokeReason.trim()) {
      setCredError("吊销原因必填");
      return;
    }
    setCredBusy(true);
    const res = await adminFetch(`/api/v1/admin/users/${detail.id}/credentials/revoke`, {
      method: "POST",
      body: JSON.stringify({ kind: pendingRevoke.kind, id: pendingRevoke.id, reason: revokeReason.trim() }),
    });
    setCredBusy(false);
    if (!res.ok) {
      setCredError(res.message ?? "吊销失败");
      return;
    }
    setMessage(`已吊销：${pendingRevoke.label}`);
    setPendingRevoke(null);
    setRevokeReason("");
    await loadCredentials(detail.id);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: Column<UserRow>[] = [
    {
      key: "email",
      header: "邮箱 / 昵称",
      className: "px-3 py-2",
      render: u => (
        <div>
          <div className="text-slate-800">{u.email}</div>
          <div className="text-xs text-slate-400">{u.nickname ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "tier",
      header: "等级",
      className: "px-3 py-2",
      render: u => (
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TIER_ROW_CLS[u.tier as keyof typeof TIER_ROW_CLS] ?? TIER_ROW_CLS.NORMAL}`}>
          {tierShortLabelOf(u.tier)}
        </span>
      ),
    },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: u => (
        <span className={u.status === "ACTIVE" ? "font-medium text-emerald-600" : "font-medium text-rose-600"}>
          {u.status === "ACTIVE" ? "正常" : "已封禁"}
        </span>
      ),
    },
    { key: "role", header: "角色", className: "px-3 py-2 text-xs text-slate-500", render: u => <span>{u.role}</span> },
    { key: "balance", header: "余额", className: "px-3 py-2 tabular-nums text-slate-700", render: u => <span>¥{u.balanceYuan}</span> },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: u => (
        <div className="flex items-center gap-2">
          <Select size="sm"
            aria-label={`${u.email} 等级调整`}
            value={u.tier}
            disabled={busy}
            onChange={(e) => void patchUser(u.id, { tier: e.target.value }, "等级已调整")}
            className="bg-white text-slate-700 shadow-[var(--shadow-sm)]"
          >
            {Object.entries(TIER_SHORT_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          {u.status === "ACTIVE" ? (
            <Button variant="danger" size="sm" disabled={busy} onClick={() => void patchUser(u.id, { status: "SUSPENDED" }, "已封禁（旧令牌全部失效）")}>
              封禁
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void patchUser(u.id, { status: "ACTIVE" }, "已解封")}>
              解封
            </Button>
          )}
          {canAssignRoles && (
            <Button variant="outline" size="sm" onClick={() => void openRoleEditor(u)}>
              分配角色
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setDetail(u)}>
            详情
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {message && message.indexOf("加载中") < 0 ? (
        <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <Input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="按邮箱搜索"
          aria-label="按邮箱搜索"
          className="w-64"
        />
        <Button type="submit">
          搜索
        </Button>
        <span className="ml-auto text-xs text-slate-400">{loading ? "加载中…" : `共 ${total} 人`}</span>
      </form>

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={u => u.id}
        emptyText={search ? "未找到匹配用户" : "暂无用户"}
        busy={busy || loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />

      {/* 详情抽屉：余额只读（调账入口在 /admin/wallets） */}
      {detail ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setDetail(null)}>
          <aside
            role="dialog"
            aria-label={`用户详情 ${detail.email}`}
            className="h-full w-96 overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">用户详情</h2>
              <Button
                variant="ghost"
                size="sm"
                aria-label="关闭详情"
                onClick={() => setDetail(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </Button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">邮箱</dt><dd className="text-slate-800">{detail.email}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">昵称</dt><dd className="text-slate-800">{detail.nickname ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">等级 / 角色</dt><dd className="text-slate-800">{tierShortLabelOf(detail.tier)} · {ROLE_LABEL[detail.role] ?? detail.role}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">状态</dt><dd className="text-slate-800">{detail.status === "ACTIVE" ? "正常" : "已封禁"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">钱包余额（只读）</dt><dd className="tabular-nums font-medium text-slate-900">¥{detail.balanceYuan}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">注册时间</dt><dd className="text-slate-600">{detail.createdAt.slice(0, 19).replace("T", " ")}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">最近登录</dt><dd className="text-slate-600">{detail.lastLoginAt ? detail.lastLoginAt.slice(0, 19).replace("T", " ") : "—"}</dd></div>
            </dl>

            {/* UX-26 裁定 5：资金操作集中到钱包页，抽屉不再提供调账表单 */}
            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
              <p>余额调账请在「钱包管理」中操作（统一审计与幂等校验）。</p>
              <Link
                href="/admin/wallets"
                className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                data-testid="admin-user-detail-wallet-link"
              >
                去钱包页调账 →
              </Link>
            </div>

            {/* S4 密钥与渠道：只读脱敏列表 + 吊销（仅持 admin.users.write 露出入口） */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">密钥与渠道</h3>
              <p className="mt-1 text-xs text-slate-500">该用户全部凭据（脱敏，绝不明文）；可就地吊销，即时生效并留审计。</p>
              {credLoading ? (
                <p className="mt-2 text-xs text-slate-400">加载中…</p>
              ) : credError ? (
                <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600">{credError}</p>
              ) : cred ? (
                <div className="mt-3 space-y-3">
                  <CredList
                    title="API Key"
                    rows={cred.apiKeys.map((k) => ({
                      id: k.id,
                      kind: "apiKey",
                      masked: k.masked,
                      active: k.status === "ACTIVE",
                      meta: k.lastUsedAt ? `末用 ${k.lastUsedAt.slice(0, 10)}` : "从未使用",
                      label: `API Key ${k.masked}`,
                    }))}
                    canRevoke={canRevokeCredentials}
                    busy={credBusy}
                    onRevoke={startRevoke}
                  />
                  <CredList
                    title="站点密钥"
                    rows={cred.stationKeys.map((k) => ({
                      id: k.id,
                      kind: "stationKey",
                      masked: k.masked,
                      active: k.status === "ACTIVE",
                      meta: k.stationName ?? "",
                      label: `站点密钥${k.stationName ? `（${k.stationName}）` : ""}`,
                    }))}
                    canRevoke={canRevokeCredentials}
                    busy={credBusy}
                    onRevoke={startRevoke}
                  />
                  <CredList
                    title="自定义渠道"
                    rows={cred.channels.map((c) => ({
                      id: c.id,
                      kind: "channel",
                      masked: c.name,
                      active: c.enabled,
                      meta: c.provider,
                      label: `渠道 ${c.name}`,
                    }))}
                    canRevoke={canRevokeCredentials}
                    busy={credBusy}
                    onRevoke={startRevoke}
                  />
                  {cred.apiKeys.length + cred.stationKeys.length + cred.channels.length === 0 ? (
                    <p className="text-xs text-slate-400">该用户暂无任何凭据。</p>
                  ) : null}
                  {pendingRevoke ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                      确认为 {detail.email} 吊销「{pendingRevoke.label}」？停用即时生效、保留审计。
                      <Input
                        type="text"
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        maxLength={200}
                        placeholder="吊销原因（必填，≤200 字）"
                        aria-label="吊销原因"
                        className="mt-2 w-full bg-white text-slate-800"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button variant="danger" size="sm" disabled={credBusy} onClick={() => void submitRevoke()}>
                          确认吊销
                        </Button>
                        <Button variant="outline" size="sm" disabled={credBusy} onClick={() => { setPendingRevoke(null); setRevokeReason(""); }}>
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {roleTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRoleTarget(null)}>
          <div
            role="dialog"
            aria-label={`为 ${roleTarget.email} 分配角色`}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-slate-900">分配角色</h2>
            <p className="mt-1 text-xs text-slate-500">
              {roleTarget.email} · 遗留等级角色 <span className="font-mono">{roleTarget.role}</span>（只读）。勾选授予的角色，保存后即时生效。
            </p>
            {roleMsg ? <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600">{roleMsg}</p> : null}
            <div className="mt-3 space-y-1.5">
              {roleBusy && allRoles.length === 0 ? (
                <p className="text-sm text-slate-400">加载中…</p>
              ) : (
                allRoles.map((r) => (
                  <Label key={r.code} className="flex cursor-pointer items-center gap-2 rounded border border-slate-100 px-2 py-1.5 text-sm font-normal">
                    <input type="checkbox" checked={roleCodes.has(r.code)} disabled={roleBusy} onChange={() => toggleRoleCode(r.code)} />
                    <span className="text-slate-800">{r.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{r.code}</span>
                    {r.isSystem && <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">系统</span>}
                  </Label>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={roleBusy} onClick={() => setRoleTarget(null)}>取消</Button>
              <Button variant="primary" size="sm" disabled={roleBusy} onClick={() => void saveRoles()}>保存</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** S4 凭据分组列表（空组不渲染）；canRevoke=false 隐藏吊销入口（无权限态） */
function CredList({
  title,
  rows,
  canRevoke,
  busy,
  onRevoke,
}: {
  title: string;
  rows: CredRow[];
  canRevoke: boolean;
  busy: boolean;
  onRevoke: (row: CredRow) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-600">{title}（{rows.length}）</p>
      <ul className="mt-1 space-y-1">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1 text-xs">
            <span className="truncate font-mono text-slate-700" title={r.masked}>{r.masked}</span>
            <span className="flex shrink-0 items-center gap-2">
              {r.meta ? <span className="text-slate-400">{r.meta}</span> : null}
              <span className={r.active ? "text-emerald-600" : "text-slate-400"}>{r.active ? "有效" : "已停用"}</span>
              {canRevoke && r.active ? (
                <Button variant="ghost" size="sm" className="text-[var(--danger)] hover:underline" disabled={busy} onClick={() => onRevoke(r)}>
                  吊销
                </Button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

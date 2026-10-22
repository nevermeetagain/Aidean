"use client";

/**
 * 脚本调度管理（R-13 修复 + R-31 AdminDataTable + R-32 Dialog/Button + L2 自定义频率闭环）：
 * - 列表：名称/路径/调度/上次执行/下次执行
 * - 新建脚本（POST /api/v1/admin/scripts）
 * - 编辑频率/参数（PATCH /api/v1/admin/scripts/[id]）
 * - 启用/停用（PATCH isActive）
 * - 删除（软删，DELETE /api/v1/admin/scripts/[id]）
 * - 手动触发（POST /api/v1/admin/scripts/[id]/trigger）
 * - 查看执行历史（GET /api/v1/admin/scripts/[id]/executions）
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { PanelState, usePanelResource } from "./PanelState";
import { panelTestIds } from "../../lib/admin/panel-resource";
import { Badge, Button, Dialog, Input } from "@aidean/ui";

export interface ScriptRow {
  id: string;
  name: string;
  description: string | null;
  scriptPath: string;
  params: Record<string, unknown> | null;
  cronExpression: string | null;
  intervalDays: number | null;
  intervalCount: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  isActive: boolean;
  executionCount: number;
}

interface ExecutionRow {
  id: string;
  status: number;
  statusLabel: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorMsg: string | null;
}

interface Draft {
  name: string;
  description: string;
  scriptPath: string;
  cronExpression: string;
  intervalDays: string;
  paramsJson: string;
  isActive: boolean;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  scriptPath: "scripts/crawl/",
  cronExpression: "",
  intervalDays: "",
  paramsJson: "",
  isActive: true,
};

function draftFromRow(row: ScriptRow): Draft {
  return {
    name: row.name,
    description: row.description ?? "",
    scriptPath: row.scriptPath,
    cronExpression: row.cronExpression ?? "",
    intervalDays: row.intervalDays ? String(row.intervalDays) : "",
    paramsJson: row.params ? JSON.stringify(row.params) : "",
    isActive: row.isActive,
  };
}

/** 列表数据形状（信封 data） */
export type ScriptsListData = { items: ScriptRow[]; total: number };

/** 五态外壳 testid 前缀（B11-05） */
export const SCRIPTS_PANEL_PREFIX = "admin-scripts";

export const SCRIPTS_PAGE_SIZE = 20;

export function buildScriptsUrl(page = 1): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(SCRIPTS_PAGE_SIZE) });
  return `/api/v1/admin/scripts?${params}`;
}

/** 首屏地址（单测锁定 loader 无参调用的请求 URL，与改造前完全一致） */
export const SCRIPTS_LIST_URL = buildScriptsUrl();

export const loadScripts = (signal?: AbortSignal, page = 1) =>
  adminFetch<ScriptsListData>(buildScriptsUrl(page), { signal });

export function ScriptsManager() {
  const ids = panelTestIds(SCRIPTS_PANEL_PREFIX);
  const [loadingExec, setLoadingExec] = useState(false);
  const [page, setPage] = useState(1);
  const [execView, setExecView] = useState<ScriptRow | null>(null);
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [busy, setBusy] = useState(false);

  // 新建/编辑 Dialog 状态
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  // 内联状态提示（替代原生 alert）+ 删除确认（替代原生 confirm），对齐 Vendors/Evaluation 范式
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScriptRow | null>(null);

  const loader = useCallback((signal: AbortSignal) => loadScripts(signal, page), [page]);
  const { resource, reload, refresh } = usePanelResource(loader, (d) => d.items.length === 0);

  // 翻页才重新取数：以查询签名比对（StrictMode 下 effect 双跑也不会重复请求）
  const signature = `${page}`;
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    reload();
  }, [signature, reload]);

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(row: ScriptRow) {
    setEditingId(row.id);
    setDraft(draftFromRow(row));
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    // 解析 params JSON（空 → null；非法 → 报错不提交）
    let parsedParams: Record<string, unknown> | null = null;
    const paramsTrim = draft.paramsJson.trim();
    if (paramsTrim) {
      try {
        const maybe = JSON.parse(paramsTrim);
        if (maybe === null || typeof maybe !== "object" || Array.isArray(maybe)) {
          setFormError("params 必须是 JSON 对象，如 {\"source\":\"all\"}");
          return;
        }
        parsedParams = maybe as Record<string, unknown>;
      } catch {
        setFormError("params 不是合法 JSON");
        return;
      }
    }

    const intervalDaysNum = draft.intervalDays.trim() ? Number(draft.intervalDays) : null;
    if (intervalDaysNum !== null && (!Number.isFinite(intervalDaysNum) || intervalDaysNum <= 0)) {
      setFormError("间隔天数必须是正整数");
      return;
    }

    const payload = {
      name: draft.name,
      description: draft.description,
      scriptPath: draft.scriptPath,
      cronExpression: draft.cronExpression.trim() || null,
      intervalDays: intervalDaysNum,
      params: parsedParams,
      isActive: draft.isActive,
    };
    if (!payload.cronExpression && !payload.intervalDays) {
      setFormError("至少设置 cron 表达式或间隔天数之一");
      return;
    }

    setBusy(true);
    const res = editingId
      ? await adminFetch(`/api/v1/admin/scripts/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await adminFetch("/api/v1/admin/scripts", { method: "POST", body: JSON.stringify(payload) });
    setBusy(false);
    if (res.ok) {
      setFormOpen(false);
      refresh();
    } else {
      setFormError(res.message ?? "保存失败");
    }
  }

  async function handleTrigger(script: ScriptRow) {
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/scripts/${script.id}/trigger`, { method: "POST", body: "{}" });
    setBusy(false);
    if (res.ok) {
      refresh();
      setMessage(`已触发「${script.name}」`);
    } else {
      setMessage(res.message ?? "触发失败");
    }
  }

  async function handleToggle(script: ScriptRow) {
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/scripts/${script.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !script.isActive }),
    });
    setBusy(false);
    if (res.ok) { refresh(); setMessage(script.isActive ? `已停用「${script.name}」` : `已启用「${script.name}」`); }
    else setMessage(res.message ?? "操作失败");
  }

  function handleDelete(script: ScriptRow) {
    setPendingDelete(script);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const script = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/scripts/${script.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { refresh(); setMessage(`脚本「${script.name}」已删除（软删除，历史执行保留）`); }
    else setMessage(res.message ?? "删除失败");
  }

  async function viewHistory(script: ScriptRow) {
    setExecView(script);
    setLoadingExec(true);
    const res = await adminFetch<{ items: ExecutionRow[] }>(
      `/api/v1/admin/scripts/${script.id}/executions?pageSize=10`
    );
    setLoadingExec(false);
    if (res.ok && res.data) {
      setExecutions(res.data.items);
    }
  }

  const columns: Column<ScriptRow>[] = [
    {
      key: "name",
      header: "名称",
      className: "px-3 py-2",
      render: row => (
        <div className="flex items-center gap-2">
          <div>
            <div className="text-xs font-medium text-slate-700">{row.name}</div>
            {row.description ? <div className="text-[10px] text-slate-400">{row.description}</div> : null}
          </div>
          <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "启用" : "停用"}</Badge>
        </div>
      ),
    },
    { key: "scriptPath", header: "路径", className: "px-3 py-2 text-xs font-mono text-slate-500", render: row => <span>{row.scriptPath}</span> },
    {
      key: "schedule",
      header: "调度",
      className: "px-3 py-2 text-xs text-slate-500",
      render: row => <span>{row.cronExpression ? `cron: ${row.cronExpression}` : row.intervalDays ? `每${row.intervalDays}天` : "—"}</span>,
    },
    {
      key: "params",
      header: "参数",
      className: "px-3 py-2 text-xs font-mono text-slate-400 max-w-[160px] truncate",
      render: row => <span className="truncate">{row.params ? JSON.stringify(row.params) : "—"}</span>,
    },
    { key: "executionCount", header: "执行次数", className: "px-3 py-2 text-xs text-slate-600", render: row => <span>{row.executionCount}</span> },
    {
      key: "nextRunAt",
      header: "下次执行",
      className: "px-3 py-2 text-xs text-slate-400",
      render: row => <span>{row.nextRunAt ? new Date(row.nextRunAt).toLocaleString("zh-CN") : "—"}</span>,
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: row => (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={() => handleTrigger(row)}>触发</Button>
          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>编辑</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleToggle(row)}>{row.isActive ? "停用" : "启用"}</Button>
          <Button variant="outline" size="sm" onClick={() => viewHistory(row)}>历史</Button>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => handleDelete(row)}>删除</Button>
        </div>
      ),
    },
  ];

  const execColumns: Column<ExecutionRow>[] = [
    {
      key: "status",
      header: "状态",
      className: "py-2",
      render: e => <Badge variant={e.status === 1 ? "default" : e.status === 2 ? "destructive" : "secondary"}>{e.statusLabel}</Badge>,
    },
    { key: "startedAt", header: "开始", className: "py-2 text-slate-400", render: e => <span>{new Date(e.startedAt).toLocaleString("zh-CN")}</span> },
    { key: "duration", header: "耗时", className: "py-2 text-slate-500", render: e => <span>{e.durationMs ? `${e.durationMs}ms` : "—"}</span> },
    { key: "error", header: "错误", className: "py-2 text-red-500 max-w-[200px] truncate", render: e => <span className="truncate">{e.errorMsg ?? "—"}</span> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" data-testid={`${ids.root}-create`} onClick={openCreate}>新建脚本</Button>
      </div>

      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <PanelState testId={ids.root} resource={resource} onRetry={reload} emptyText="暂无脚本">
        {(d) => (
          <AdminDataTable
            columns={columns}
            rows={d.items}
            rowKey={row => row.id}
            rowTestId={(row) => `${ids.root}-row-${row.id}`}
            busy={busy}
            page={page}
            totalPages={Math.max(1, Math.ceil(d.total / SCRIPTS_PAGE_SIZE))}
            total={d.total}
            onPageChange={setPage}
          />
        )}
      </PanelState>

      {/* 新建/编辑 Dialog — L2 自定义频率闭环 */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "编辑脚本调度" : "新建脚本调度"}
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={handleSave}>保存</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <Field label="名称">
            <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="如：模型数据同步" />
          </Field>
          <Field label="描述">
            <Input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="可选" />
          </Field>
          <Field label="脚本路径（仅 scripts/crawl 或 scripts/ranking 下 .ts）">
            <Input value={draft.scriptPath} onChange={e => setDraft(d => ({ ...d, scriptPath: e.target.value }))} className="font-mono" placeholder="scripts/crawl/crawl_models.ts" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cron 表达式（Asia/Shanghai）">
              <Input value={draft.cronExpression} onChange={e => setDraft(d => ({ ...d, cronExpression: e.target.value }))} className="font-mono" placeholder="0 2 * * *" />
            </Field>
            <Field label="或 间隔天数">
              <Input value={draft.intervalDays} onChange={e => setDraft(d => ({ ...d, intervalDays: e.target.value }))} inputMode="numeric" placeholder="如 1" />
            </Field>
          </div>
          <Field label='参数 JSON（透传为 CLI --key value，如 {"source":"all"}）'>
            <textarea
              value={draft.paramsJson}
              onChange={e => setDraft(d => ({ ...d, paramsJson: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 ring-[var(--ring)]"
              placeholder='{"source":"all"}'
            />
          </Field>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={draft.isActive} onChange={e => setDraft(d => ({ ...d, isActive: e.target.checked }))} />
            启用调度
          </label>
          {formError ? <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</div> : null}
        </div>
      </Dialog>

      {/* 执行历史 Dialog — R-32 @aidean/ui Dialog */}
      <Dialog
        open={!!execView}
        onClose={() => setExecView(null)}
        title={`${execView?.name ?? ""} — 执行历史`}
        className="max-w-2xl"
        footer={<Button variant="outline" size="sm" onClick={() => setExecView(null)}>关闭</Button>}
      >
        <AdminDataTable
          columns={execColumns}
          rows={executions}
          rowKey={e => e.id}
          emptyText="暂无执行记录"
          busy={loadingExec}
        />
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="确认删除脚本"
        message={`确认删除脚本「${pendingDelete?.name ?? ""}」？（软删除，历史执行保留）`}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

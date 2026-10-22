"use client";

/**
 * 评估管理（R-50）：
 * - Evaluation 列表（状态过滤/分页）
 * - 查看详情（参与模型、结果）
 * - 删除评估（软删除）
 */

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge, Button, Dialog, Select } from "@aidean/ui";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

interface EvalRow {
  id: string;
  title: string | null;
  evalType: string;
  status: number;
  progress: number;
  isPaid: boolean;
  cost: number;
  userId: string;
  evaluationModels: Array<{ id: string; modelId: string; model: { nameDisplay: string; nameCn: string | null; slug: string } }>;
  createdAt: string;
}

const STATUS_LABELS: Record<number, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  0: { label: "待执行", variant: "secondary" },
  1: { label: "执行中", variant: "secondary" },
  2: { label: "已完成", variant: "default" },
  3: { label: "失败", variant: "destructive" },
};

export function EvaluationManager() {
  const [evals, setEvals] = useState<EvalRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<EvalRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // 内联状态提示（替代原生 alert），对齐 Vendors/News 范式
  const [message, setMessage] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async (p: number) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (statusFilter) params.set("status", statusFilter);
    setLoading(true);
    const res = await adminFetch<{ items: EvalRow[]; total: number }>(
      `/api/v1/admin/evaluations?${params}`
    );
    setLoading(false);
    if (res.ok && res.data) {
      setEvals(res.data.items);
      setTotal(res.data.total);
    }
  }, [statusFilter]);

  useEffect(() => { void load(page); }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleDelete(id: string) {
    setPendingDelete(id);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setPendingDelete(null);
    const res = await adminFetch(`/api/v1/admin/evaluations/${id}`, { method: "DELETE" });
    if (res.ok) {
      void load(page);
      setMessage("评估任务已删除");
    } else {
      setMessage(res.message ?? "操作失败");
    }
  }

  async function handleArchive(id: string) {
    const res = await adminFetch(`/api/v1/admin/evaluations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "archive" }),
    });
    if (res.ok) { void load(page); setMessage("已归档"); }
    else setMessage(res.message ?? "归档失败");
  }

  async function handleUnarchive(id: string) {
    const res = await adminFetch(`/api/v1/admin/evaluations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "unarchive" }),
    });
    if (res.ok) { void load(page); setMessage("已恢复"); }
    else setMessage(res.message ?? "恢复失败");
  }

  async function handleViewDetail(id: string) {
    const res = await adminFetch<{ item: EvalRow }>(`/api/v1/admin/evaluations/${id}`);
    if (res.ok && res.data) {
      setSelected(res.data.item);
    }
  }

  const columns: Column<EvalRow>[] = [
    { key: "createdAt", header: "时间", className: "px-3 py-2 text-xs text-slate-400", render: e => <span>{new Date(e.createdAt).toLocaleString("zh-CN")}</span> },
    { key: "title", header: "标题", className: "px-3 py-2 text-sm text-slate-700", render: e => <span>{e.title ?? "（无标题）"}</span> },
    { key: "evalType", header: "类型", className: "px-3 py-2 text-xs text-slate-500", render: e => <span>{e.evalType}</span> },
    { key: "models", header: "模型数", className: "px-3 py-2 text-xs text-slate-600", render: e => <span>{e.evaluationModels?.length ?? 0}</span> },
    { key: "status", header: "状态", className: "px-3 py-2", render: e => {
      const s = STATUS_LABELS[e.status] ?? { label: String(e.status), variant: "secondary" as const };
      return <Badge variant={s.variant}>{s.label}</Badge>;
    } },
    { key: "cost", header: "费用", className: "px-3 py-2 text-xs text-slate-600", render: e => <span>¥{e.cost.toFixed(2)}</span> },
    { key: "actions", header: "操作", className: "px-3 py-2", render: e => (
      <div className="flex gap-2">
        <button onClick={() => handleViewDetail(e.id)} className="text-xs text-primary hover:underline">详情</button>
        <button onClick={() => handleArchive(e.id)} className="text-xs text-slate-500 hover:underline">归档</button>
        <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:underline">删除</button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-white">
          <option value="">全部状态</option>
          <option value="0">待执行</option>
          <option value="1">执行中</option>
          <option value="2">已完成</option>
          <option value="3">失败</option>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setPage(1); void load(1); }}>刷新</Button>
        <span className="ml-auto text-xs text-slate-500">共 {total} 条</span>
      </div>

      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={evals}
        rowKey={e => e.id}
        emptyText="暂无评估任务"
        busy={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={p => setPage(p)}
      />

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="评估详情"
        className="max-w-2xl"
      >
        {selected && (
          <div className="max-h-[60vh] overflow-y-auto">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">标题</dt><dd className="text-slate-800">{selected.title ?? "—"}</dd>
              <dt className="text-slate-500">类型</dt><dd className="text-slate-800">{selected.evalType}</dd>
              <dt className="text-slate-500">状态</dt><dd>{STATUS_LABELS[selected.status]?.label ?? selected.status}</dd>
              <dt className="text-slate-500">费用</dt><dd>¥{selected.cost.toFixed(2)}</dd>
              <dt className="text-slate-500">进度</dt><dd>{selected.progress}%</dd>
              <dt className="text-slate-500">时间</dt><dd>{new Date(selected.createdAt).toLocaleString("zh-CN")}</dd>
            </dl>
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-slate-700">参与模型</h3>
              <ul className="space-y-1">
                {selected.evaluationModels?.map(m => (
                  <li key={m.id} className="text-xs text-slate-600">
                    {m.model?.nameDisplay ?? m.model?.nameCn ?? m.model?.slug ?? m.modelId}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="确认删除"
        message="确认删除此评估任务？此操作为软删除。"
        onConfirm={() => confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

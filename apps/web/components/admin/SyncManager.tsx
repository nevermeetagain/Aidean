"use client";

/**
 * 同步管理（R-10 修复 + R-40 AdminDataTable 迁移 + R-47 多源扩展）：
 * - SyncBatch 列表（状态/来源过滤）
 * - ModelChangeLog 列表（变更类型/回滚状态过滤）
 * - 触发 dry-run 同步（支持选择主源 + 额外源进行交叉验证）
 * - 回滚单条变更（POST /api/v1/admin/sync/changes/[id]/revert）
 *
 * R-47：新增数据源选择器，可选择 huggingface / lmsys 作为额外源，
 * 传入 additionalSources 字段触发多源交叉验证。
 */

import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "./adminFetch";
import { Badge, Button, Dialog, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@aidean/ui";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { SYNC_SOURCES } from "../../lib/sync/sources/registry";

interface SyncBatchRow {
  id: string;
  batchCode: string;
  source: string | null;
  status: string;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  createdAt: string;
}

interface ChangeLogRow {
  id: string;
  modelCode: string | null;
  changeType: string;
  changedFields: string[];
  isReverted: boolean;
  revertReason: string | null;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  completed: "default",
  running: "secondary",
  failed: "destructive",
  partial: "destructive",
};

// 单一事实来源：采集源下拉由 registry.ts 派生，与服务端 ADAPTER_REGISTRY 键集合
// 由 registry.spec.ts 断言一致——彻底消除历史上 UI(9) 落后于 registry(11) 的漂移。
const SOURCE_OPTIONS = SYNC_SOURCES.map((s) => ({ value: s.key, label: s.label }));

export function SyncManager() {
  const [tab, setTab] = useState<"batches" | "changes">("batches");
  const [batches, setBatches] = useState<SyncBatchRow[]>([]);
  const [changes, setChanges] = useState<ChangeLogRow[]>([]);
  // #35③：批次/变更记录在途 → 表格「加载中…」（参照 UsersTable #68 模式）
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [primarySource, setPrimarySource] = useState("openrouter");
  const [extraSources, setExtraSources] = useState<string[]>([]);
  const [conflictReport, setConflictReport] = useState<Array<{ modelCode: string; field: string; sourceA: string; sourceB: string; valueA: string; valueB: string }> | null>(null);
  // 内联提示（替代原生 alert）+ 回滚原因输入 Dialog（替代原生 prompt）
  const [message, setMessage] = useState<string | null>(null);
  const [revertTarget, setRevertTarget] = useState<string | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const pageSize = 20;

  const load = useCallback(async (p: number) => {
    if (tab === "batches") {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      if (statusFilter) params.set("status", statusFilter);
      setLoading(true);
      const res = await adminFetch<{ items: SyncBatchRow[]; total: number }>(
        `/api/v1/admin/sync/batches?${params}`
      );
      setLoading(false);
      if (res.ok && res.data) { setBatches(res.data.items); setTotal(res.data.total); }
    } else {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      if (statusFilter) params.set("changeType", statusFilter);
      setLoading(true);
      const res = await adminFetch<{ items: ChangeLogRow[]; total: number }>(
        `/api/v1/admin/sync/changes?${params}`
      );
      setLoading(false);
      if (res.ok && res.data) { setChanges(res.data.items); setTotal(res.data.total); }
    }
  }, [tab, statusFilter]);

  useEffect(() => { void load(page); }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleDryRun() {
    setConflictReport(null);
    const res = await adminFetch<{
      batchId: string;
      validationSummary?: { crossValidation?: { totalConflicts: number; conflicts: Array<{ modelCode: string; field: string; sourceA: string; sourceB: string; valueA: string; valueB: string }> } } | null;
    }>("/api/v1/admin/sync/batches", {
      method: "POST",
      body: JSON.stringify({
        source: primarySource,
        dryRun: true,
        additionalSources: extraSources.length > 0 ? extraSources : undefined,
      }),
    });
    if (res.ok && res.data) {
      void load(page);
      // R-66: 展示交叉验证冲突报告
      const cv = res.data.validationSummary?.crossValidation;
      if (cv && cv.conflicts && cv.conflicts.length > 0) {
        setConflictReport(cv.conflicts);
      }
    } else {
      setMessage(res.message ?? "同步失败");
    }
  }

  function handleRevert(id: string) {
    setRevertTarget(id);
    setRevertReason("");
  }

  async function confirmRevert() {
    if (!revertTarget) return;
    const id = revertTarget;
    // Dialog 取消会关闭而不调用本函数（等价于旧 prompt 返回 null 中止）；空串作为默认原因合法
    setRevertTarget(null);
    const res = await adminFetch(`/api/v1/admin/sync/changes/${id}/revert`, {
      method: "POST",
      body: JSON.stringify({ reason: revertReason || "管理员手动回滚" }),
    });
    if (res.ok) {
      void load(page);
      setMessage("已回滚该变更");
    } else {
      setMessage(res.message ?? "回滚失败");
    }
  }

  function toggleExtraSource(value: string) {
    setExtraSources(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  }

  // 批次列定义
  const batchColumns: Column<SyncBatchRow>[] = [
    { key: "batchCode", header: "批次号", className: "px-3 py-2 text-xs font-mono text-slate-600", render: b => <span>{b.batchCode}</span> },
    { key: "source", header: "来源", className: "px-3 py-2 text-xs text-slate-500", render: b => <span>{b.source ?? "—"}</span> },
    { key: "status", header: "状态", className: "px-3 py-2", render: b => <Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>{b.status}</Badge> },
    { key: "totalRecords", header: "总数", className: "px-3 py-2 text-xs text-slate-600", render: b => <span>{b.totalRecords}</span> },
    { key: "successRecords", header: "成功", className: "px-3 py-2 text-xs text-emerald-600", render: b => <span>{b.successRecords}</span> },
    { key: "failedRecords", header: "失败", className: "px-3 py-2 text-xs text-red-500", render: b => <span>{b.failedRecords}</span> },
    { key: "createdAt", header: "时间", className: "px-3 py-2 text-xs text-slate-400", render: b => <span>{new Date(b.createdAt).toLocaleString("zh-CN")}</span> },
  ];

  // 变更记录列定义
  const changeColumns: Column<ChangeLogRow>[] = [
    { key: "createdAt", header: "时间", className: "px-3 py-2 text-xs text-slate-400", render: c => <span>{new Date(c.createdAt).toLocaleString("zh-CN")}</span> },
    { key: "modelCode", header: "模型", className: "px-3 py-2 text-xs font-mono text-slate-600", render: c => <span>{c.modelCode ?? "—"}</span> },
    { key: "changeType", header: "类型", className: "px-3 py-2", render: c => <Badge variant={c.changeType === "CREATE" ? "default" : c.changeType === "DELETE" ? "destructive" : "secondary"}>{c.changeType}</Badge> },
    { key: "changedFields", header: "变更字段", className: "px-3 py-2 text-xs text-slate-500", render: c => <span>{c.changedFields.join(", ")}</span> },
    { key: "revertStatus", header: "回滚状态", className: "px-3 py-2", render: c => c.isReverted ? <span className="text-xs text-amber-600">已回滚: {c.revertReason}</span> : <span className="text-xs text-slate-400">未回滚</span> },
    { key: "actions", header: "操作", className: "px-3 py-2", render: c => !c.isReverted && c.changeType !== "CREATE" ? <button onClick={() => handleRevert(c.id)} className="text-xs text-red-500 hover:underline">回滚</button> : null },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant={tab === "batches" ? "primary" : "outline"} size="sm" onClick={() => { setTab("batches"); setStatusFilter(""); setPage(1); }}>
          同步批次
        </Button>
        <Button variant={tab === "changes" ? "primary" : "outline"} size="sm" onClick={() => { setTab("changes"); setStatusFilter(""); setPage(1); }}>
          变更记录
        </Button>
        {tab === "batches" ? (
          <>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ml-2 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <option value="">全部状态</option>
              <option value="running">运行中</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
              <option value="partial">部分成功</option>
            </select>
            <Button variant="outline" size="sm" onClick={handleDryRun} className="ml-auto">触发 dry-run</Button>
          </>
        ) : (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ml-2 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm">
            <option value="">全部类型</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="SYNC">SYNC</option>
          </select>
        )}
        <span className="ml-auto text-xs text-slate-500">共 {total} 条</span>
      </div>

      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      {tab === "batches" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-2.5">
          <span className="text-xs font-medium text-slate-600">数据源：</span>
          <select value={primarySource} onChange={(e) => setPrimarySource(e.target.value)} className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs">
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-xs text-slate-400">额外源（交叉验证）：</span>
          {SOURCE_OPTIONS.filter(o => o.value !== primarySource).map(o => (
            <label key={o.value} className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={extraSources.includes(o.value)}
                onChange={() => toggleExtraSource(o.value)}
                className="h-3 w-3 rounded border-slate-300"
              />
              {o.value}
            </label>
          ))}
        </div>
      )}

      {tab === "batches" ? (
        <AdminDataTable
          columns={batchColumns}
          rows={batches}
          rowKey={b => b.id}
          emptyText="暂无同步批次"
          busy={loading}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={p => setPage(p)}
        />
      ) : (
        <AdminDataTable
          columns={changeColumns}
          rows={changes}
          rowKey={c => c.id}
          emptyText="暂无变更记录"
          busy={loading}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={p => setPage(p)}
        />
      )}

      {conflictReport && conflictReport.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h3 className="text-sm font-semibold text-amber-700">
            交叉验证冲突报告（{conflictReport.length} 项）
          </h3>
          <p className="mt-1 text-xs text-amber-600">
            以下字段在多个数据源之间存在差异，请人工确认后决定采纳哪个源的值。
          </p>
          <div className="mt-3 text-xs">
            {/* #35 小票：admin 域最后一处内联 <table> 收敛至 @aidean/ui Table 底座 */}
            <Table>
              <TableHeader>
                <TableRow className="border-amber-200 hover:bg-transparent">
                  <TableHead className="py-1.5 pr-3 text-amber-700">模型</TableHead>
                  <TableHead className="py-1.5 pr-3 text-amber-700">字段</TableHead>
                  <TableHead className="py-1.5 pr-3 text-amber-700">源 A</TableHead>
                  <TableHead className="py-1.5 pr-3 text-amber-700">值 A</TableHead>
                  <TableHead className="py-1.5 pr-3 text-amber-700">源 B</TableHead>
                  <TableHead className="py-1.5 pr-3 text-amber-700">值 B</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflictReport.map((c, i) => (
                  <TableRow key={i} className="border-amber-100">
                    <TableCell className="py-1.5 pr-3 font-mono text-slate-700">{c.modelCode}</TableCell>
                    <TableCell className="py-1.5 pr-3 text-slate-600">{c.field}</TableCell>
                    <TableCell className="py-1.5 pr-3 text-slate-500">{c.sourceA}</TableCell>
                    <TableCell className="py-1.5 pr-3 text-slate-700">{c.valueA}</TableCell>
                    <TableCell className="py-1.5 pr-3 text-slate-500">{c.sourceB}</TableCell>
                    <TableCell className="py-1.5 pr-3 text-slate-700">{c.valueB}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <button onClick={() => setConflictReport(null)} className="mt-2 text-xs text-amber-600 hover:underline">
            关闭报告
          </button>
        </div>
      )}

      {/* 回滚原因输入 Dialog — 替代原生 prompt */}
      <Dialog
        open={revertTarget !== null}
        onClose={() => setRevertTarget(null)}
        title="回滚变更"
        className="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRevertTarget(null)}>取消</Button>
            <Button variant="danger" size="sm" onClick={() => void confirmRevert()}>确认回滚</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">确定回滚此变更？可填写回滚原因（留空则记为“管理员手动回滚”）。</p>
          <Input
            value={revertReason}
            onChange={(e) => setRevertReason(e.target.value)}
            placeholder="回滚原因（可选）"
          />
        </div>
      </Dialog>
    </div>
  );
}

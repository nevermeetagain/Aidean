"use client";

/**
 * 基准测试管理（R-10/R-15 修复 + R-31 AdminDataTable 接入 + R-36/R-37 Dialog/Input 迁移）：
 * - 分页列表（modelCode/benchmarkType/verifiedStatus 过滤）
 * - 手动录入基准数据（POST /api/v1/admin/benchmarks）
 * - 审核（PATCH verifiedStatus 0↔1）
 * - CSV 批量导入（R-33 provenance）
 * - 批量操作（R-28）+ ConfirmDialog 确认（R-36）
 */

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Dialog, Input, Select } from "@aidean/ui";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

interface BenchmarkRow {
  id: string;
  modelId: string;
  benchmarkType: string;
  totalScore: number;
  sourceName: string;
  sourceType: string;
  verifiedStatus: number;
  testDate: string | null;
  createdAt: string;
  model: { modelCode: string; nameDisplay: string } | null;
}

const SOURCE_TYPE_LABEL: Record<string, string> = {
  SELF: "自测",
  OFFICIAL: "官方",
  THIRD_PARTY: "第三方",
  COMMUNITY: "社区",
  SYNC: "同步",
};

export function BenchmarksManager() {
  const [rows, setRows] = useState<BenchmarkRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const pageSize = 20;

  const [formData, setFormData] = useState({
    modelId: "",
    benchmarkType: "",
    totalScore: "",
    sourceName: "admin_manual",
    sourceType: "SELF",
    testDate: "",
  });

  // Batch selection state (R-28)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  // R-36: ConfirmDialog 替代 confirm()
  const [pendingDelete, setPendingDelete] = useState(false);

  async function executeBatch(action: "verify" | "unverify" | "delete") {
    setBatchBusy(true);
    const res = await adminFetch<{ affected: number }>("/api/v1/admin/benchmarks/batch", {
      method: "POST",
      body: JSON.stringify({ ids: [...selectedIds], action }),
    });
    setBatchBusy(false);
    if (res.ok) {
      setSelectedIds(new Set());
      setImportResult(`批量${action} 完成: ${res.data?.affected ?? 0} 条受影响`);
      void load(page);
    } else {
      setImportResult(res.message);
    }
  }

  function handleBatch(action: "verify" | "unverify" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete") {
      setPendingDelete(true);
      return;
    }
    void executeBatch(action);
  }

  async function handleImportCsv(file: File) {
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await adminFetch<{
      imported: number;
      skipped: number;
      skippedModels?: string[];
      total: number;
      syncBatchId?: string;
    }>("/api/v1/admin/benchmarks/import", {
      method: "POST",
      body: fd,
    });
    setImporting(false);
    if (res.ok && res.data) {
      const d = res.data;
      const parts = [`CSV 导入完成: ${d.imported}/${d.total} 条成功`];
      if (d.skipped > 0) {
        parts.push(`${d.skipped} 条跳过（modelCode 不存在）`);
        if (d.skippedModels && d.skippedModels.length > 0) {
          parts.push(`跳过的模型: ${d.skippedModels.join(", ")}`);
        }
      }
      if (d.syncBatchId) {
        parts.push(`SyncBatch: ${d.syncBatchId.slice(0, 8)}…`);
      }
      setImportResult(parts.join(" | "));
      void load(page);
    } else {
      setImportResult(res.message ?? "导入失败");
    }
  }

  const load = useCallback(async (p: number) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (typeFilter) params.set("benchmarkType", typeFilter);
    if (statusFilter) params.set("verifiedStatus", statusFilter);
    setLoading(true);
    const res = await adminFetch<{ items: BenchmarkRow[]; total: number }>(
      `/api/v1/admin/benchmarks?${params}`
    );
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setTotal(res.data.total);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminFetch("/api/v1/admin/benchmarks", {
      method: "POST",
      body: JSON.stringify({
        modelId: formData.modelId,
        benchmarkType: formData.benchmarkType,
        totalScore: parseFloat(formData.totalScore),
        sourceName: formData.sourceName,
        sourceType: formData.sourceType,
        testDate: formData.testDate || undefined,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({ modelId: "", benchmarkType: "", totalScore: "", sourceName: "admin_manual", sourceType: "SELF", testDate: "" });
      void load(page);
    } else {
      setImportResult(res.message);
    }
  }

  async function handleVerify(id: string, target: number) {
    const res = await adminFetch(`/api/v1/admin/benchmarks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ verifiedStatus: target }),
    });
    if (res.ok) {
      void load(page);
    } else {
      setImportResult(res.message);
    }
  }

  // AdminDataTable 列定义
  const columns: Column<BenchmarkRow>[] = [
    { key: "modelCode", header: "模型", className: "px-3 py-2 text-xs font-mono text-slate-600", render: row => <span>{row.model?.modelCode ?? row.modelId.slice(0, 8)}</span> },
    { key: "benchmarkType", header: "基准类型", className: "px-3 py-2 text-xs text-slate-600", render: row => <span>{row.benchmarkType}</span> },
    { key: "totalScore", header: "总分", className: "px-3 py-2 text-xs font-semibold text-slate-700", render: row => <span>{row.totalScore}</span> },
    { key: "source", header: "来源", className: "px-3 py-2 text-xs text-slate-500", render: row => <span>{SOURCE_TYPE_LABEL[row.sourceType] ?? row.sourceType} / {row.sourceName}</span> },
    { key: "testDate", header: "测试日期", className: "px-3 py-2 text-xs text-slate-500", render: row => <span>{row.testDate ? new Date(row.testDate).toLocaleDateString("zh-CN") : "—"}</span> },
    {
      key: "verifiedStatus",
      header: "状态",
      className: "px-3 py-2",
      render: row => <Badge variant={row.verifiedStatus === 1 ? "default" : "secondary"}>{row.verifiedStatus === 1 ? "已审核" : "待审核"}</Badge>,
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: row => row.verifiedStatus === 0 ? (
        <Button variant="ghost" size="sm" className="text-primary hover:underline" onClick={() => handleVerify(row.id, 1)}>审核通过</Button>
      ) : (
        <Button variant="ghost" size="sm" className="text-slate-400 hover:underline" onClick={() => handleVerify(row.id, 0)}>撤销审核</Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          placeholder="基准类型..."
          className="max-w-[180px]"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white"
        >
          <option value="">全部状态</option>
          <option value="0">待审核</option>
          <option value="1">已审核</option>
        </Select>
        <Button variant="primary" size="sm" onClick={() => { setPage(1); void load(1); }}>查询</Button>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "取消" : "+ 录入基准"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImport(!showImport)}
        >
          CSV 导入
        </Button>
      </div>

      {importResult && <div className="rounded bg-primary/5 p-2 text-sm text-primary">{importResult}</div>}
      {showImport ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">CSV 格式: modelCode,benchmarkType,totalScore,testDate,sourceName,score1,score2,...</div>
          <input type="file" accept=".csv,text/csv" disabled={importing} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImportCsv(f); }} className="mt-2 block text-sm" />
          {importing && <div className="mt-1 text-xs text-slate-400">导入中...</div>}
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-3">
          <Input value={formData.modelId} onChange={(e) => setFormData({ ...formData, modelId: e.target.value })} placeholder="模型 ID *" required />
          <Input value={formData.benchmarkType} onChange={(e) => setFormData({ ...formData, benchmarkType: e.target.value })} placeholder="基准类型（如 MMLU）*" required />
          <Input value={formData.totalScore} onChange={(e) => setFormData({ ...formData, totalScore: e.target.value })} placeholder="总分 *" required type="number" step="0.01" />
          <Input value={formData.sourceName} onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })} placeholder="来源名称" />
          <Select value={formData.sourceType} onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })} className="h-9">
            {Object.entries(SOURCE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input value={formData.testDate} onChange={(e) => setFormData({ ...formData, testDate: e.target.value })} placeholder="测试日期" type="date" />
          <Button type="submit" variant="primary" className="col-span-full">提交</Button>
        </form>
      ) : null}

      {selectedIds.size > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-xs text-primary">已选 {selectedIds.size} 项</span>
          <Button variant="primary" size="sm" className="bg-emerald-500" onClick={() => handleBatch("verify")} disabled={batchBusy}>批量验证</Button>
          <Button variant="primary" size="sm" className="bg-amber-500" onClick={() => handleBatch("unverify")} disabled={batchBusy}>取消验证</Button>
          <Button variant="danger" size="sm" onClick={() => handleBatch("delete")} disabled={batchBusy}>批量删除</Button>
          <Button variant="ghost" size="sm" className="ml-auto text-slate-500" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
        </div>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={row => row.id}
        emptyText="暂无基准测试数据"
        busy={batchBusy || loading}
        selectable
        selectedIds={selectedIds}
        onToggleRow={id => {
          const next = new Set(selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIds(next);
        }}
        onToggleAll={() => {
          if (rows.every(r => selectedIds.has(r.id))) setSelectedIds(new Set());
          else setSelectedIds(new Set(rows.map(r => r.id)));
        }}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={p => setPage(p)}
      />

      <ConfirmDialog
        open={pendingDelete}
        title="确认批量删除"
        message={`确认批量删除 ${selectedIds.size} 条评测数据？（软删，可恢复）`}
        onConfirm={() => { setPendingDelete(false); void executeBatch("delete"); }}
        onCancel={() => setPendingDelete(false)}
      />
    </div>
  );
}

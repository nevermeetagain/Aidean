"use client";

import { useState, useCallback } from "react";
import { Code, Play, Clock, CheckCircle, XCircle } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface ScriptRow {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  lastRunAt: string | null;
  lastRunResult: string | null;
  runCount: number;
  isActive: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { text: string; color: string }> = {
  SYNC: { text: "同步", color: "text-blue-600 bg-blue-50" },
  CLEANUP: { text: "清理", color: "text-orange-600 bg-orange-50" },
  REPORT: { text: "报表", color: "text-purple-600 bg-purple-50" },
  MAINTENANCE: { text: "维护", color: "text-green-600 bg-green-50" },
};

const STATUS_LABELS: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  IDLE: { text: "空闲", color: "text-gray-600 bg-gray-50", icon: <Clock className="h-3 w-3" /> },
  RUNNING: { text: "运行中", color: "text-blue-600 bg-blue-50", icon: <Play className="h-3 w-3" /> },
  SUCCESS: { text: "成功", color: "text-green-600 bg-green-50", icon: <CheckCircle className="h-3 w-3" /> },
  FAILED: { text: "失败", color: "text-red-600 bg-red-50", icon: <XCircle className="h-3 w-3" /> },
};

export default function ScriptsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<ScriptRow>(
    `/admin/scripts?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deleteScript } = useDelete("/admin/scripts", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/scripts`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const activeCount = items?.filter((i) => i.isActive).length || 0;
  const runningCount = items?.filter((i) => i.status === "RUNNING").length || 0;
  const totalRuns = items?.reduce((sum, i) => sum + (i.runCount || 0), 0) || 0;

  const stats = [
    { label: "活跃脚本", value: activeCount, icon: <Code className="h-4 w-4" />, color: "blue" },
    { label: "运行中", value: runningCount, icon: <Play className="h-4 w-4" />, color: "green" },
    { label: "总执行", value: totalRuns.toLocaleString(), icon: <CheckCircle className="h-4 w-4" />, color: "purple" },
  ];

  const columns: TableColumn<ScriptRow>[] = [
    {
      key: "name",
      title: "脚本名称",
      width: "200px",
      render: (row) => <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>,
    },
    { key: "code", title: "代码", width: "120px" },
    {
      key: "type",
      title: "类型",
      width: "80px",
      render: (row) => {
        const t = TYPE_LABELS[row.type];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t?.color || "text-gray-600 bg-gray-50"}`}>
            {t?.text || row.type}
          </span>
        );
      },
    },
    {
      key: "status",
      title: "状态",
      width: "90px",
      render: (row) => {
        const s = STATUS_LABELS[row.status];
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s?.color || "text-gray-600 bg-gray-50"}`}>
            {s?.icon}
            {s?.text || row.status}
          </span>
        );
      },
    },
    {
      key: "runCount",
      title: "执行次数",
      width: "80px",
      align: "center",
      render: (row) => <span>{row.runCount || 0}</span>,
    },
    {
      key: "lastRunAt",
      title: "最近执行",
      width: "140px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.lastRunAt ? new Date(row.lastRunAt).toLocaleString() : "-"}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">执行</AdminButton>
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]" onClick={() => { if (confirm(`删除脚本 ${row.name}？`)) deleteScript(row.id); }}>删除</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Code className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">脚本管理</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <AdminCard key={s.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${s.color}-50 flex items-center justify-center text-${s.color}-600`}>{s.icon}</div>
            <div>
              <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{s.value}</div>
              <div className="text-xs text-[rgb(var(--admin-text-secondary))]">{s.label}</div>
            </div>
          </AdminCard>
        ))}
      </div>

      <AdminListPage<ScriptRow>
        title=""
        subtitle="管理自动化脚本，查看执行状态与历史记录"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        onCreate={() => {}}
        createButtonText="新建脚本"
        emptyText="暂无脚本"
        error={error}
      />
    </div>
  );
}

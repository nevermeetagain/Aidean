"use client";

import { useState, useCallback } from "react";
import { ListChecks, Play, Pause, CheckCircle, XCircle, Clock } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface TaskRow {
  id: string;
  name: string;
  scriptName: string;
  status: string;
  progress: number;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  PENDING: { text: "等待中", color: "text-gray-600 bg-gray-50", icon: <Clock className="h-3 w-3" /> },
  RUNNING: { text: "运行中", color: "text-blue-600 bg-blue-50", icon: <Play className="h-3 w-3" /> },
  PAUSED: { text: "已暂停", color: "text-yellow-600 bg-yellow-50", icon: <Pause className="h-3 w-3" /> },
  COMPLETED: { text: "已完成", color: "text-green-600 bg-green-50", icon: <CheckCircle className="h-3 w-3" /> },
  FAILED: { text: "失败", color: "text-red-600 bg-red-50", icon: <XCircle className="h-3 w-3" /> },
};

export default function ScriptTasksPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<TaskRow>(
    `/admin/scripts/tasks?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deleteTask } = useDelete("/admin/scripts/tasks", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/scripts/tasks`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const pendingCount = items?.filter((i) => i.status === "PENDING").length || 0;
  const runningCount = items?.filter((i) => i.status === "RUNNING").length || 0;
  const completedCount = items?.filter((i) => i.status === "COMPLETED").length || 0;

  const stats = [
    { label: "等待中", value: pendingCount, icon: <Clock className="h-4 w-4" />, color: "gray" },
    { label: "运行中", value: runningCount, icon: <Play className="h-4 w-4" />, color: "blue" },
    { label: "已完成", value: completedCount, icon: <CheckCircle className="h-4 w-4" />, color: "green" },
  ];

  const columns: TableColumn<TaskRow>[] = [
    {
      key: "name",
      title: "任务名称",
      width: "200px",
      render: (row) => <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>,
    },
    {
      key: "scriptName",
      title: "所属脚本",
      width: "140px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.scriptName}</span>,
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
      key: "progress",
      title: "进度",
      width: "120px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${row.progress || 0}%` }} />
          </div>
          <span className="text-xs">{row.progress || 0}%</span>
        </div>
      ),
    },
    {
      key: "priority",
      title: "优先级",
      width: "70px",
      align: "center",
      render: (row) => <span className={`text-xs ${row.priority >= 8 ? "text-red-600" : row.priority >= 5 ? "text-orange-600" : "text-gray-600"}`}>P{row.priority}</span>,
    },
    {
      key: "startedAt",
      title: "开始时间",
      width: "140px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.startedAt ? new Date(row.startedAt).toLocaleString() : "-"}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {row.status === "RUNNING" && <AdminButton variant="link" size="sm">暂停</AdminButton>}
          {row.status === "PAUSED" && <AdminButton variant="link" size="sm">继续</AdminButton>}
          <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]" onClick={() => { if (confirm(`取消任务 ${row.name}？`)) deleteTask(row.id); }}>取消</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">任务管理</h1>
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

      <AdminListPage<TaskRow>
        title=""
        subtitle="管理任务执行队列，查看任务状态、进度与执行日志"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        emptyText="暂无任务"
        error={error}
      />
    </div>
  );
}

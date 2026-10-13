"use client";

import { useState, useCallback } from "react";
import { Database, HardDrive, Clock, CheckCircle, Download, RotateCcw } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface BackupRow {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  isAuto: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  FULL: "全量备份",
  INCREMENTAL: "增量备份",
  SCHEMA: "结构备份",
  DATA: "数据备份",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  COMPLETED: { text: "完成", color: "text-green-600 bg-green-50" },
  RUNNING: { text: "进行中", color: "text-blue-600 bg-blue-50" },
  FAILED: { text: "失败", color: "text-red-600 bg-red-50" },
  EXPIRED: { text: "已过期", color: "text-gray-600 bg-gray-50" },
};

export default function DatabaseBackupsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<BackupRow>(
    `/admin/scripts/backups?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deleteBackup } = useDelete("/admin/scripts/backups", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/scripts/backups`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const totalSize = items?.reduce((sum, i) => sum + (i.size || 0), 0) || 0;
  const autoCount = items?.filter((i) => i.isAuto).length || 0;
  const validCount = items?.filter((i) => i.status === "COMPLETED").length || 0;

  const stats = [
    { label: "总备份数", value: items?.length || 0, icon: <Database className="h-4 w-4" />, color: "blue" },
    { label: "自动备份", value: autoCount, icon: <Clock className="h-4 w-4" />, color: "purple" },
    { label: "存储占用", value: formatSize(totalSize), icon: <HardDrive className="h-4 w-4" />, color: "orange" },
  ];

  const columns: TableColumn<BackupRow>[] = [
    {
      key: "name",
      title: "备份名称",
      width: "240px",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.isAuto && <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">自动</span>}
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      title: "类型",
      width: "90px",
      render: (row) => <span className="text-sm">{TYPE_LABELS[row.type] || row.type}</span>,
    },
    {
      key: "size",
      title: "大小",
      width: "80px",
      render: (row) => <span className="text-sm">{formatSize(row.size || 0)}</span>,
    },
    {
      key: "status",
      title: "状态",
      width: "70px",
      render: (row) => {
        const s = STATUS_LABELS[row.status];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.color || "text-gray-600 bg-gray-50"}`}>
            {s?.text || row.status}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: "140px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{new Date(row.createdAt).toLocaleString()}</span>,
    },
    {
      key: "expiresAt",
      title: "过期时间",
      width: "100px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "永久"}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm"><Download className="h-3 w-3 mr-1" />下载</AdminButton>
          <AdminButton variant="link" size="sm"><RotateCcw className="h-3 w-3 mr-1" />恢复</AdminButton>
          <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]" onClick={() => { if (confirm(`删除备份 ${row.name}？`)) deleteBackup(row.id); }}>删除</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">数据库备份</h1>
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

      <AdminListPage<BackupRow>
        title=""
        subtitle="管理数据库备份策略，执行手动/定时备份与恢复"
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
        createButtonText="手动备份"
        emptyText="暂无备份"
        error={error}
      />
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, Database } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface SyncBatchRow {
  id: string;
  batchName: string;
  syncType: string;
  source: string;
  status: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

const STATUS_LABELS: Record<string, { text: string; icon: React.ReactNode; color: string }> = {
  PENDING: { text: "等待中", icon: <Clock className="h-4 w-4" />, color: "text-yellow-600 bg-yellow-50" },
  RUNNING: { text: "同步中", icon: <RefreshCw className="h-4 w-4 animate-spin" />, color: "text-blue-600 bg-blue-50" },
  COMPLETED: { text: "已完成", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600 bg-green-50" },
  FAILED: { text: "失败", icon: <XCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50" },
  PARTIAL: { text: "部分成功", icon: <AlertCircle className="h-4 w-4" />, color: "text-orange-600 bg-orange-50" },
};

const SYNC_TYPE_LABELS: Record<string, string> = {
  FULL: "全量同步",
  INCREMENTAL: "增量同步",
  MANUAL: "手动同步",
  SCHEDULED: "定时同步",
};

export default function SyncBatchesPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { items, pagination, isLoading, error, refresh } = useList<SyncBatchRow>(
    apiKeys.syncBatches({ keyword: searchKeyword, page, limit: pageSize, status: statusFilter }),
    {
      params: { keyword: searchKeyword, page, limit: pageSize, status: statusFilter },
    }
  );

  const { mutate: deleteBatch } = useDelete("/admin/models/sync-batches", {
    onSuccess: () => refresh(),
    invalidateKeys: [apiKeys.syncBatches()],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const clearFilters = () => {
    setStatusFilter("");
    setPage(1);
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return "-";
    const end = completedAt ? new Date(completedAt) : new Date();
    const start = new Date(startedAt);
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (diff < 60) return `${diff}秒`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟`;
    return `${Math.floor(diff / 3600)}小时${Math.floor((diff % 3600) / 60)}分钟`;
  };

  const columns: TableColumn<SyncBatchRow>[] = [
    {
      key: "batchName",
      title: "批次名称",
      width: "200px",
      render: (row) => (
        <div>
          <div className="font-medium text-[rgb(var(--admin-text-primary))]">{row.batchName}</div>
          <div className="text-xs text-[rgb(var(--admin-text-muted))]">{SYNC_TYPE_LABELS[row.syncType] || row.syncType}</div>
        </div>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: "110px",
      render: (row) => {
        const s = STATUS_LABELS[row.status] || { text: row.status, icon: null, color: "text-gray-600 bg-gray-50" };
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
            {s.icon}
            {s.text}
          </span>
        );
      },
    },
    {
      key: "progress",
      title: "进度",
      width: "150px",
      render: (row) => {
        const progress = row.totalCount > 0 ? Math.round((row.successCount / row.totalCount) * 100) : 0;
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[rgb(var(--admin-text-secondary))]">{row.successCount}/{row.totalCount}</span>
              <span className="font-medium text-[rgb(var(--admin-text-primary))]">{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[rgb(var(--admin-bg-hover))] overflow-hidden">
              <div
                className="h-full rounded-full bg-[rgb(var(--admin-primary))] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "failedCount",
      title: "失败数",
      width: "70px",
      align: "center" as const,
      render: (row) =>
        row.failedCount > 0 ? (
          <span className="text-sm font-medium text-red-600">{row.failedCount}</span>
        ) : (
          <span className="text-[rgb(var(--admin-text-muted))]">-</span>
        ),
    },
    {
      key: "duration",
      title: "耗时",
      width: "100px",
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))]">
          {formatDuration(row.startedAt, row.completedAt)}
        </span>
      ),
    },
    {
      key: "startedAt",
      title: "开始时间",
      width: "140px",
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))]">
          {row.startedAt ? new Date(row.startedAt).toLocaleString("zh-CN") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center" as const,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">详情</AdminButton>
          {row.status === "FAILED" && (
            <AdminButton variant="link" size="sm">重试</AdminButton>
          )}
          <AdminButton
            variant="link"
            size="sm"
            className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
            onClick={() => {
              if (confirm(`确认删除批次 ${row.batchName}？`)) {
                deleteBatch(row.id);
              }
            }}
          >
            删除
          </AdminButton>
        </div>
      ),
    },
  ];

  const hasFilters = statusFilter;

  return (
    <>
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AdminCard className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">同步中</div>
              <div className="text-xl font-semibold text-[rgb(var(--admin-text-primary))]">
                {items?.filter((i) => i.status === "RUNNING").length || 0}
              </div>
            </div>
          </AdminCard>
          <AdminCard className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">已完成</div>
              <div className="text-xl font-semibold text-[rgb(var(--admin-text-primary))]">
                {items?.filter((i) => i.status === "COMPLETED").length || 0}
              </div>
            </div>
          </AdminCard>
          <AdminCard className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">失败</div>
              <div className="text-xl font-semibold text-[rgb(var(--admin-text-primary))]">
                {items?.filter((i) => i.status === "FAILED").length || 0}
              </div>
            </div>
          </AdminCard>
          <AdminCard className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">总批次</div>
              <div className="text-xl font-semibold text-[rgb(var(--admin-text-primary))]">
                {pagination?.total || 0}
              </div>
            </div>
          </AdminCard>
        </div>

        {/* 筛选栏 */}
        <AdminCard className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">状态筛选:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-md border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-bg-sidebar))] text-sm text-[rgb(var(--admin-text-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary))]"
            >
              <option value="">所有状态</option>
              <option value="PENDING">等待中</option>
              <option value="RUNNING">同步中</option>
              <option value="COMPLETED">已完成</option>
              <option value="FAILED">失败</option>
              <option value="PARTIAL">部分成功</option>
            </select>
            {hasFilters && (
              <AdminButton variant="ghost" size="sm" onClick={clearFilters}>
                清除筛选
              </AdminButton>
            )}
          </div>
        </AdminCard>

        {/* 同步批次列表 */}
        <AdminListPage<SyncBatchRow>
          title="同步批次"
          subtitle="管理模型数据同步任务"
          columns={columns}
          data={items}
          loading={isLoading}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  pageSize: pagination.limit,
                  total: pagination.total,
                  totalPages: pagination.totalPages,
                }
              : undefined
          }
          searchKeyword={searchKeyword}
          onSearch={handleSearch}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onRefresh={refresh}
          onCreate={() => {
            // TODO: 打开创建同步任务对话框
          }}
          createButtonText="新建同步"
          emptyText="暂无同步批次数据"
          error={error}
        />
      </div>
    </>
  );
}

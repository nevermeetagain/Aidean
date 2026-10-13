"use client";

import { useState, useCallback } from "react";
import { GitCommit, Tag, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface ModelVersionRow {
  id: string;
  versionNumber: string;
  modelId: string;
  modelName: string;
  changelog: string | null;
  status: string;
  isLatest: boolean;
  releasedAt: string | null;
  modelParams?: number | null;
  contextWindow?: number | null;
}

const STATUS_LABELS: Record<string, { text: string; icon: React.ReactNode; color: string }> = {
  DRAFT: { text: "草稿", icon: <FileText className="h-4 w-4" />, color: "text-gray-600 bg-gray-50" },
  PENDING: { text: "待发布", icon: <Clock className="h-4 w-4" />, color: "text-yellow-600 bg-yellow-50" },
  RELEASED: { text: "已发布", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600 bg-green-50" },
  DEPRECATED: { text: "已废弃", icon: <XCircle className="h-4 w-4" />, color: "text-red-600 bg-red-50" },
};

export default function VersionsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { items, pagination, isLoading, error, refresh } = useList<ModelVersionRow>(
    apiKeys.versions({ keyword: searchKeyword, page, limit: pageSize, status: statusFilter }),
    {
      params: { keyword: searchKeyword, page, limit: pageSize, status: statusFilter },
    }
  );

  const { mutate: deleteVersion } = useDelete("/admin/models/versions", {
    onSuccess: () => refresh(),
    invalidateKeys: [apiKeys.versions()],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const clearFilters = () => {
    setStatusFilter("");
    setPage(1);
  };

  const columns: TableColumn<ModelVersionRow>[] = [
    {
      key: "version",
      title: "版本信息",
      width: "220px",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.isLatest ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
              <Tag className="h-3 w-3" />
              最新
            </div>
          ) : (
            <div className="w-8" />
          )}
          <div>
            <div className="font-medium text-[rgb(var(--admin-text-primary))]">{row.versionNumber}</div>
            <div className="text-xs text-[rgb(var(--admin-text-muted))]">{row.modelName}</div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: "100px",
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
      key: "changelog",
      title: "变更说明",
      width: "300px",
      render: (row) => (
        <div className="text-sm text-[rgb(var(--admin-text-secondary))] line-clamp-2">
          {row.changelog || <span className="text-[rgb(var(--admin-text-muted))]">无变更说明</span>}
        </div>
      ),
    },
    {
      key: "params",
      title: "参数规模",
      width: "100px",
      align: "center" as const,
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))]">
          {row.modelParams ? `${(row.modelParams / 1e9).toFixed(1)}B` : "-"}
        </span>
      ),
    },
    {
      key: "releasedAt",
      title: "发布时间",
      width: "140px",
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))]">
          {row.releasedAt ? new Date(row.releasedAt).toLocaleString("zh-CN") : "-"}
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
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          {!row.isLatest && (
            <AdminButton
              variant="link"
              size="sm"
              className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
              onClick={() => {
                if (confirm(`确认删除版本 ${row.versionNumber}？`)) {
                  deleteVersion(row.id);
                }
              }}
            >
              删除
            </AdminButton>
          )}
        </div>
      ),
    },
  ];

  const hasFilters = statusFilter;

  // 统计各状态版本数量
  const statusCounts = {
    total: pagination?.total || 0,
    latest: items?.filter((i) => i.isLatest).length || 0,
    released: items?.filter((i) => i.status === "RELEASED").length || 0,
    pending: items?.filter((i) => i.status === "PENDING").length || 0,
  };

  return (
    <>
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AdminCard className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <GitCommit className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">总版本数</div>
              <div className="text-xl font-semibold text-[rgb(var(--admin-text-primary))]">
                {statusCounts.total}
              </div>
            </div>
          </AdminCard>
          <AdminCard className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">最新版本</div>
              <div className="text-xl font-semibold text-[rgb(var(--admin-text-primary))]">
                {statusCounts.latest}
              </div>
            </div>
          </AdminCard>
          <AdminCard className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">已发布</div>
              <div className="text-xl font-semibold text-[rgb(var(--admin-text-primary))]">
                {statusCounts.released}
              </div>
            </div>
          </AdminCard>
          <AdminCard className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">待发布</div>
              <div className="text-xl font-semibold text-[rgb(var(--admin-text-primary))]">
                {statusCounts.pending}
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
              <option value="DRAFT">草稿</option>
              <option value="PENDING">待发布</option>
              <option value="RELEASED">已发布</option>
              <option value="DEPRECATED">已废弃</option>
            </select>
            {hasFilters && (
              <AdminButton variant="ghost" size="sm" onClick={clearFilters}>
                清除筛选
              </AdminButton>
            )}
          </div>
        </AdminCard>

        {/* 版本列表 */}
        <AdminListPage<ModelVersionRow>
          title="版本管理"
          subtitle="管理AI模型版本发布"
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
            // TODO: 打开创建版本对话框
          }}
          createButtonText="新建版本"
          emptyText="暂无版本数据"
          error={error}
        />
      </div>
    </>
  );
}

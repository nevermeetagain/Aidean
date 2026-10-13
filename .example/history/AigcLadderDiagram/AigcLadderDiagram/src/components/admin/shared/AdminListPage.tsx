"use client";

import { useState, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { AdminCard } from "./AdminCard";
import { AdminButton } from "./AdminButton";
import { AdminTable, TableColumn, TablePagination } from "./AdminTable";
import { SearchBar } from "./SearchBar";
import { PageSkeleton } from "../../../hooks/useLoading";
import type { ApiError } from "@/hooks/useApi";

interface AdminListPageProps<T> {
  title: string;
  subtitle?: string;
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: TablePagination;
  searchKeyword?: string;
  onSearch?: (keyword: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRefresh?: () => void;
  onCreate?: () => void;
  createButtonText?: string;
  emptyText?: string;
  error?: ApiError | null;
}

export function AdminListPage<T>({
  title,
  subtitle,
  columns,
  data,
  loading = false,
  pagination,
  searchKeyword = "",
  onSearch,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onCreate,
  createButtonText = "新建",
  emptyText = "暂无数据",
  error,
}: AdminListPageProps<T>) {
  const [searchValue, setSearchValue] = useState(searchKeyword);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  const handleClear = useCallback(() => {
    setSearchValue("");
    onSearch?.("");
  }, [onSearch]);

  if (loading && data.length === 0) {
    return (
      <div className="space-y-6" data-admin>
        {/* 标题区 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[rgb(var(--admin-text-secondary))]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-admin>
      {/* 标题区 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[rgb(var(--admin-text-secondary))]">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
            >
              刷新
            </AdminButton>
          )}
          {onCreate && (
            <AdminButton
              variant="primary"
              size="sm"
              onClick={onCreate}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {createButtonText}
            </AdminButton>
          )}
        </div>
      </div>

      {/* 搜索栏 */}
      {onSearch && (
        <AdminCard className="p-4">
          <SearchBar
            value={searchValue}
            onSearch={handleSearch}
            onClear={handleClear}
            placeholder="搜索关键词..."
            loading={loading}
          />
        </AdminCard>
      )}

      {/* 错误提示 */}
      {error && (
        <AdminCard className="p-4 border-l-4 border-l-red-500 bg-red-50">
          <p className="text-sm text-red-700">
            加载失败：{error.message}
          </p>
        </AdminCard>
      )}

      {/* 数据表格 */}
      <AdminCard>
        <AdminTable
          columns={columns}
          data={data}
          loading={loading}
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          emptyText={emptyText}
        />
      </AdminCard>
    </div>
  );
}

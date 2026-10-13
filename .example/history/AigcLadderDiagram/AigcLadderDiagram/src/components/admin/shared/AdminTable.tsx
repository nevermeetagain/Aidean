"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { AdminButton } from "./AdminButton";

export interface TableColumn<T> {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface RowExpandable<T> {
  expandedRowKeys: string[];
  expandedRowRender: (record: T) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: TablePagination;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  emptyText?: string;
  rowKey?: keyof T | ((row: T) => string);
  expandable?: RowExpandable<T>;
}

const pageSizeOptions = [10, 20, 50, 100];

export function AdminTable<T>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  emptyText = "暂无数据",
  rowKey = "id" as keyof T,
  expandable,
}: AdminTableProps<T>) {
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === "function") {
      return rowKey(row);
    }
    return String(row[rowKey] ?? index);
  };

  const getAlignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  return (
    <div className="bg-[rgb(var(--admin-bg-sidebar))] rounded-xl border border-[rgb(var(--admin-border))] shadow-[var(--admin-shadow-sm)] overflow-hidden">
      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[rgb(var(--admin-bg))]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-medium text-[rgb(var(--admin-text-secondary))] uppercase tracking-wider ${getAlignClass(col.align)}`}
                  style={{ width: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--admin-border-light))]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-[rgb(var(--admin-text-muted))]">
                    <div className="h-5 w-5 border-2 border-[rgb(var(--admin-border))] border-t-[rgb(var(--admin-primary))] rounded-full animate-spin" />
                    <span className="text-sm">加载中...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="text-[rgb(var(--admin-text-muted))]">
                    <svg
                      className="mx-auto h-12 w-12 mb-3 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-sm">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={getRowKey(row, index)}
                  className="hover:bg-[rgb(var(--admin-bg-hover))] transition-colors duration-150"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-[rgb(var(--admin-text-primary))] ${getAlignClass(col.align)}`}
                    >
                      {col.render
                        ? col.render(row, index)
                        : String((row as Record<string, unknown>)[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[rgb(var(--admin-border-light))] bg-[rgb(var(--admin-bg))] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* 左侧信息 */}
          <div className="text-sm text-[rgb(var(--admin-text-muted))]">
            共 <span className="font-medium text-[rgb(var(--admin-text-primary))]">{pagination.total}</span> 条
            <span className="mx-2">|</span>
            第 <span className="font-medium text-[rgb(var(--admin-text-primary))]">{pagination.page}</span> / {pagination.totalPages} 页
          </div>

          {/* 右侧控制 */}
          <div className="flex items-center gap-2">
            {/* 每页条数 */}
            <select
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="h-8 px-2 text-sm rounded-lg bg-[rgb(var(--admin-bg-sidebar))] border border-[rgb(var(--admin-border))] text-[rgb(var(--admin-text-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary-ring))]"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}条/页
                </option>
              ))}
            </select>

            {/* 分页按钮 */}
            <div className="flex items-center gap-1">
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => onPageChange?.(1)}
                disabled={pagination.page === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </AdminButton>
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </AdminButton>
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </AdminButton>
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => onPageChange?.(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

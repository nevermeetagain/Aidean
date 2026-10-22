"use client";

/**
 * AdminDataTable — 基于 @aidean/ui Table 的 admin 表格复合组件（R-22 修复 + R-40 扩展）。
 *
 * 功能：
 * - 泛型列定义（key + header + render）
 * - 分页控件
 * - 空态展示
 * - 可选行选择（checkbox）
 * - 可选行展开（expandedRowId + expandedRowRender，用于详情展示）
 * - 可选行点击（onRowClick）
 *
 * 设计决策：放在 apps/web 而非 packages/ui，因为耦合 adminFetch 类型推断。
 * 后续若需要解耦可将 render 改为 slot pattern。
 */

import type { ReactNode } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@aidean/ui";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
  busy?: boolean;
  /** 分页 */
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  /** 行选择 */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  /** 行展开（R-40: AuditLogsTable 详情行） */
  expandedRowId?: string | null;
  expandedRowRender?: (row: T) => ReactNode;
  expandedColSpan?: number;
  /** 行点击 */
  onRowClick?: (id: string) => void;
  /** 行 testid 生成（B11-05 五态外壳：`admin-<模块>-row-<id>`）；不传则不渲染属性 */
  rowTestId?: (row: T) => string;
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = "暂无数据",
  busy = false,
  page,
  totalPages,
  total,
  onPageChange,
  selectable = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
  expandedRowId,
  expandedRowRender,
  expandedColSpan,
  onRowClick,
  rowTestId,
}: AdminDataTableProps<T>) {
  const allSelected = selectable && rows.length > 0 && rows.every(r => selectedIds?.has(rowKey(r)));
  const colCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10 px-2">
                  <input
                    type="checkbox"
                    checked={allSelected ?? false}
                    onChange={() => onToggleAll?.()}
                    aria-label="全选"
                  />
                </TableHead>
              )}
              {columns.map(col => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => {
              const id = rowKey(row);
              const isSelected = selectable && selectedIds?.has(id);
              const isExpanded = expandedRowId === id;
              return (
                <FragmentRow
                  key={id}
                  id={id}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  selectable={selectable}
                  onToggleRow={onToggleRow}
                  onRowClick={onRowClick}
                  columns={columns}
                  row={row}
                  expandedRowRender={expandedRowRender}
                  expandedColSpan={expandedColSpan ?? colCount}
                  testId={rowTestId?.(row)}
                />
              );
            })}
            {rows.length === 0 && !busy && (
              <TableRow>
                <TableCell colSpan={colCount} className="px-3 py-8 text-center text-sm text-slate-500">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
            {/* #35 小票：busy（含消费方 busy={busy || loading} 通道）且无数据时呈加载中，
                取代此前 busy 期的整表空白（v2.8 #68 同类「空态闪现」问题的底座级修复） */}
            {rows.length === 0 && busy && (
              <TableRow>
                <TableCell colSpan={colCount} className="px-3 py-8 text-center text-sm text-slate-400">
                  <span className="inline-flex animate-pulse items-center gap-2">加载中…</span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {page && totalPages && totalPages > 1 && onPageChange && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1 || busy}
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-sm text-slate-500">
            {page} / {totalPages}{total !== undefined ? `（共 ${total} 条）` : ""}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || busy}
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

/** 内部组件：渲染一行 + 可选的展开详情行 */
function FragmentRow<T>({
  id,
  isSelected,
  isExpanded,
  selectable,
  onToggleRow,
  onRowClick,
  columns,
  row,
  expandedRowRender,
  expandedColSpan,
  testId,
}: {
  id: string;
  isSelected: boolean | undefined;
  isExpanded: boolean;
  selectable: boolean;
  onToggleRow?: (id: string) => void;
  onRowClick?: (id: string) => void;
  columns: Column<T>[];
  row: T;
  expandedRowRender?: (row: T) => ReactNode;
  expandedColSpan: number;
  testId?: string;
}) {
  return (
    <>
      <TableRow
        data-testid={testId}
        className={isSelected ? "bg-primary/5" : undefined}
        onClick={onRowClick ? () => onRowClick(id) : undefined}
      >
        {selectable && (
          <TableCell className="w-10 px-2">
            <input
              type="checkbox"
              checked={isSelected ?? false}
              onChange={() => onToggleRow?.(id)}
              aria-label={`选择 ${id}`}
            />
          </TableCell>
        )}
        {columns.map(col => (
          <TableCell key={col.key} className={col.className}>
            {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
          </TableCell>
        ))}
      </TableRow>
      {isExpanded && expandedRowRender ? (
        <TableRow className="bg-slate-50/50">
          <TableCell colSpan={expandedColSpan} className="px-6 py-3">
            {expandedRowRender(row)}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

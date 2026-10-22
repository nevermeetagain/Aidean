"use client";

/**
 * MatrixPanel — 矩阵视图共用外壳（B11-03b · L2-E）。
 *
 * 职责严格限定三件，**不取数**（取数仍由各面板的 usePanelResource 负责）：
 * ① 顶部筛选栏（filters slot）+ 右侧操作区（toolbar slot，如「新建」按钮）；
 * ② 分页条：上一页 / 下一页 / 「第 x/共 y 页」，页大小固定 MATRIX_PAGE_SIZE=50；
 * ③ 用 @aidean/ui 的 Table* 渲染表头与数据行（columns 由调用方传入，单元格内容由 renderCell 决定）。
 *
 * testid（沿用 EVD-B11-03/handoff.md §三 的命名规范，矩阵专属）：
 *   筛选栏 `<testId>-filters`、分页条 `<testId>-pagination`、上一页 `<testId>-prev`、下一页 `<testId>-next`、
 *   数据行 `<testId>-row-<rowKey>`。五态根 testid 由外层 PanelState 承载，这里不重复挂载，避免双根。
 */
import type { ReactNode } from "react";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@aidean/ui";

/**
 * 矩阵页大小固定 50：与 /admin/protocols、/admin/capabilities 的
 * parsePagination({ defaultPageSize: 50, maxPageSize: 100 }) 默认档对齐，
 * 也与 P0 落地的「pageSize>50 一律 400」的前端口径一致。
 */
export const MATRIX_PAGE_SIZE = 50;

export interface MatrixColumn {
  /** 列标识：矩阵维度值（协议名 / 能力名），标识列固定用 "entity" */
  key: string;
  /** 表头文案 */
  label: string;
  /** 缺省：首列左对齐，其余（矩阵维度列）居中；调用方可显式覆盖 */
  align?: "left" | "center";
}

export interface MatrixPanelProps<T> {
  /** 五态根 testid 同前缀（如 admin-protocols） */
  testId: string;
  columns: readonly MatrixColumn[];
  rows: T[];
  rowKey: (row: T) => string;
  /** 单元格内容：由行 + 列 key 决定（矩阵里多数列指向同一条记录的不同维度） */
  renderCell: (row: T, key: string) => ReactNode;
  /** 当前页（1 基） */
  page: number;
  /** 记录总数（来自列表信封 data.total），用于算页数 */
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  /** 筛选栏（下拉 / 搜索框） */
  filters?: ReactNode;
  /** 操作区（新建按钮等），靠右 */
  toolbar?: ReactNode;
  /** 请求在途：禁用翻页，避免与乐观更新交错 */
  busy?: boolean;
}

export function MatrixPanel<T>({
  testId,
  columns,
  rows,
  rowKey,
  renderCell,
  page,
  total,
  pageSize,
  onPageChange,
  filters,
  toolbar,
  busy = false,
}: MatrixPanelProps<T>) {
  const size = pageSize ?? MATRIX_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const alignOf = (col: MatrixColumn, i: number): "left" | "center" =>
    col.align ?? (i === 0 ? "left" : "center");
  const hasSlot = Boolean(filters || toolbar);

  return (
    <div className="space-y-3">
      {hasSlot ? (
        <div data-testid={`${testId}-filters`} className="flex flex-wrap items-center gap-2">
          {filters}
          {toolbar ? <div className="ml-auto flex items-center gap-2">{toolbar}</div> : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead
                  key={col.key}
                  className={alignOf(col, i) === "center" ? "text-center whitespace-nowrap" : undefined}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)} data-testid={`${testId}-row-${rowKey(row)}`}>
                {columns.map((col, i) => (
                  <TableCell
                    key={col.key}
                    className={alignOf(col, i) === "center" ? "text-center" : undefined}
                  >
                    {renderCell(row, col.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="px-3 py-8 text-center text-sm text-slate-500">
                  当前页无数据
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div data-testid={`${testId}-pagination`} className="flex flex-wrap items-center gap-2">
        <Button
          data-testid={`${testId}-prev`}
          variant="outline"
          size="sm"
          disabled={page <= 1 || busy}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          上一页
        </Button>
        <span className="text-sm text-slate-500">
          第 {page}/共 {totalPages} 页（{total} 条）
        </span>
        <Button
          data-testid={`${testId}-next`}
          variant="outline"
          size="sm"
          disabled={page >= totalPages || busy}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

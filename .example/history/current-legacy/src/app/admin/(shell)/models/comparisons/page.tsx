"use client";

import { useState, useCallback } from "react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { useList, useDelete, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface ComparisonRow {
  id: string;
  title: string;
  evaluationType: string;
  compareMode: string;
  creator: string | null;
  modelCount: number;
  status: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  BENCHMARK: "基准测试",
  CUSTOM: "自定义测试",
  ABNORMAL: "异常检测",
  RANKING: "排名评测",
};

const MODE_LABELS: Record<string, string> = {
  ONE_TO_ONE: "1对1对比",
  ONE_TO_MANY: "1对多对比",
  MANY_TO_MANY: "多对多对比",
  ROUND_ROBIN: "循环赛",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  PENDING: { text: "待开始", color: "text-yellow-600 bg-yellow-50" },
  RUNNING: { text: "进行中", color: "text-blue-600 bg-blue-50" },
  COMPLETED: { text: "已完成", color: "text-green-600 bg-green-50" },
  FAILED: { text: "失败", color: "text-red-600 bg-red-50" },
};

export default function ComparisonsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<ComparisonRow>(
    apiKeys.comparisons({ keyword: searchKeyword, page, limit: pageSize })
  );

  const { mutate: deleteComparison } = useDelete("/admin/evaluations", {
    onSuccess: () => refresh(),
    invalidateKeys: [apiKeys.comparisons()],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const columns: TableColumn<ComparisonRow>[] = [
    {
      key: "title",
      title: "标题",
      width: "200px",
      render: (row) => (
        <div className="font-medium text-[rgb(var(--admin-text-primary))]">
          {row.title}
        </div>
      ),
    },
    {
      key: "evaluationType",
      title: "评测类型",
      width: "100px",
      render: (row) => TYPE_LABELS[row.evaluationType] || row.evaluationType,
    },
    {
      key: "compareMode",
      title: "对比模式",
      width: "100px",
      render: (row) => MODE_LABELS[row.compareMode] || row.compareMode,
    },
    {
      key: "modelCount",
      title: "参与模型",
      width: "80px",
      align: "center" as const,
      render: (row) => `${row.modelCount}个`,
    },
    {
      key: "status",
      title: "状态",
      width: "80px",
      render: (row) => {
        const s = STATUS_LABELS[row.status] || { text: row.status, color: "text-gray-600 bg-gray-50" };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
            {s.text}
          </span>
        );
      },
    },
    {
      key: "creator",
      title: "创建者",
      width: "100px",
      render: (row) => row.creator || "系统",
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center" as const,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">查看</AdminButton>
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton
            variant="link"
            size="sm"
            className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
            onClick={() => {
              if (confirm(`确认删除对比评测 ${row.title}？`)) {
                deleteComparison(row.id);
              }
            }}
          >
            删除
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <AdminListPage<ComparisonRow>
      title="对比评测"
      subtitle="管理模型对比评测任务"
      columns={columns}
      data={items}
      loading={isLoading}
      pagination={
        pagination
          ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages }
          : undefined
      }
      searchKeyword={searchKeyword}
      onSearch={handleSearch}
      onPageChange={setPage}
      onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      onRefresh={refresh}
      onCreate={() => {}}
      createButtonText="新建评测"
      emptyText="暂无对比评测数据"
      error={error}
    />
  );
}

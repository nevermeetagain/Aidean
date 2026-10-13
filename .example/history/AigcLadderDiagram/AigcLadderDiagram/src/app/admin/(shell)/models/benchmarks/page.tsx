"use client";

import { useState, useCallback } from "react";
import { Trophy, Zap, Brain, Code2, Target, BarChart3 } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface BenchmarkRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  metricType: string;
  baselineScore: number | null;
  unit: string | null;
  evaluationCount: number;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { text: string; icon: React.ReactNode; color: string }> = {
  REASONING: { text: "推理能力", icon: <Brain className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" },
  CODE: { text: "代码能力", icon: <Code2 className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" },
  MATH: { text: "数学能力", icon: <Target className="h-4 w-4" />, color: "text-green-600 bg-green-50" },
  KNOWLEDGE: { text: "知识问答", icon: <BarChart3 className="h-4 w-4" />, color: "text-orange-600 bg-orange-50" },
  CREATIVITY: { text: "创意生成", icon: <Zap className="h-4 w-4" />, color: "text-pink-600 bg-pink-50" },
};

const METRIC_TYPE_LABELS: Record<string, string> = {
  ACCURACY: "准确率",
  SCORE: "得分",
  RANK: "排名",
  PERCENTILE: "百分位",
  TIME: "耗时",
  TOKEN: "Token数",
};

export default function BenchmarksPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { items, pagination, isLoading, error, refresh } = useList<BenchmarkRow>(
    apiKeys.benchmarks({ keyword: searchKeyword, page, limit: pageSize, category: categoryFilter }),
    {
      params: { keyword: searchKeyword, page, limit: pageSize, category: categoryFilter },
    }
  );

  const { mutate: deleteBenchmark } = useDelete("/admin/models/benchmarks", {
    onSuccess: () => refresh(),
    invalidateKeys: [apiKeys.benchmarks()],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const clearFilters = () => {
    setCategoryFilter("");
    setPage(1);
  };

  const columns: TableColumn<BenchmarkRow>[] = [
    {
      key: "name",
      title: "评测维度",
      width: "220px",
      render: (row) => (
        <div>
          <div className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</div>
          {row.description && (
            <div className="text-xs text-[rgb(var(--admin-text-muted))] line-clamp-1">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      title: "分类",
      width: "120px",
      render: (row) => {
        const c = CATEGORY_LABELS[row.category] || { text: row.category, icon: null, color: "text-gray-600 bg-gray-50" };
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>
            {c.icon}
            {c.text}
          </span>
        );
      },
    },
    {
      key: "metricType",
      title: "指标类型",
      width: "100px",
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))]">
          {METRIC_TYPE_LABELS[row.metricType] || row.metricType}
        </span>
      ),
    },
    {
      key: "baselineScore",
      title: "基准值",
      width: "100px",
      align: "center" as const,
      render: (row) => (
        <div className="text-sm">
          {row.baselineScore !== null ? (
            <span className="font-medium text-[rgb(var(--admin-text-primary))]">
              {row.baselineScore}
              {row.unit && <span className="text-xs text-[rgb(var(--admin-text-muted))] ml-1">{row.unit}</span>}
            </span>
          ) : (
            <span className="text-[rgb(var(--admin-text-muted))]">-</span>
          )}
        </div>
      ),
    },
    {
      key: "evaluationCount",
      title: "评测次数",
      width: "90px",
      align: "center" as const,
      render: (row) => (
        <span className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">
          {row.evaluationCount}
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
          <AdminButton
            variant="link"
            size="sm"
            className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
            onClick={() => {
              if (confirm(`确认删除评测维度 ${row.name}？`)) {
                deleteBenchmark(row.id);
              }
            }}
          >
            删除
          </AdminButton>
        </div>
      ),
    },
  ];

  const hasFilters = categoryFilter;

  return (
    <>
      <div className="space-y-4">
        {/* 筛选栏 */}
        <AdminCard className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">分类筛选:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-md border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-bg-sidebar))] text-sm text-[rgb(var(--admin-text-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary))]"
            >
              <option value="">所有分类</option>
              <option value="REASONING">推理能力</option>
              <option value="CODE">代码能力</option>
              <option value="MATH">数学能力</option>
              <option value="KNOWLEDGE">知识问答</option>
              <option value="CREATIVITY">创意生成</option>
            </select>
            {hasFilters && (
              <AdminButton variant="ghost" size="sm" onClick={clearFilters}>
                清除筛选
              </AdminButton>
            )}
          </div>
        </AdminCard>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(CATEGORY_LABELS).map(([key, { text, icon, color }]) => (
            <AdminCard key={key} className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color.replace("text-", "bg-").replace("600", "100")}`}>
                {icon}
              </div>
              <div>
                <div className="text-sm text-[rgb(var(--admin-text-muted))]">{text}</div>
                <div className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
                  {items?.filter((i) => i.category === key).length || 0}
                </div>
              </div>
            </AdminCard>
          ))}
        </div>

        {/* 评测维度列表 */}
        <AdminListPage<BenchmarkRow>
          title="性能评测"
          subtitle="管理模型评测维度与基准值"
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
            // TODO: 打开创建评测维度对话框
          }}
          createButtonText="新建维度"
          emptyText="暂无评测维度数据"
          error={error}
        />
      </div>
    </>
  );
}

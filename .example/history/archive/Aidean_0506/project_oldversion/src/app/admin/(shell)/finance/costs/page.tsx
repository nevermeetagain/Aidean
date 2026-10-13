"use client";

import { useState, useCallback } from "react";
import { TrendingUp, DollarSign, Cpu, BarChart3 } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface CostRow {
  id: string;
  model: { id: string; name: string; provider: string };
  date: string;
  requestCount: number;
  tokenCount: number;
  costAmount: number;
  avgCostPerRequest: number;
  trend: number;
}

export default function FinanceCostsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<CostRow>(
    `/admin/finance/costs?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const totalCost = items?.reduce((sum, i) => sum + (i.costAmount || 0), 0) || 0;
  const totalRequests = items?.reduce((sum, i) => sum + (i.requestCount || 0), 0) || 0;
  const totalTokens = items?.reduce((sum, i) => sum + (i.tokenCount || 0), 0) || 0;

  const stats = [
    { label: "总成本", value: `¥${totalCost.toFixed(2)}`, icon: <DollarSign className="h-4 w-4" />, color: "red" },
    { label: "总请求数", value: totalRequests.toLocaleString(), icon: <BarChart3 className="h-4 w-4" />, color: "blue" },
    { label: "总Token数", value: totalTokens.toLocaleString(), icon: <Cpu className="h-4 w-4" />, color: "green" },
  ];

  const columns: TableColumn<CostRow>[] = [
    {
      key: "model",
      title: "模型",
      width: "180px",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.model?.name || "-"}</span>
          <span className="text-xs text-[rgb(var(--admin-text-secondary))]">{row.model?.provider || "-"}</span>
        </div>
      ),
    },
    {
      key: "date",
      title: "日期",
      width: "100px",
      render: (row) => <span className="text-sm">{new Date(row.date).toLocaleDateString()}</span>,
    },
    {
      key: "requestCount",
      title: "请求数",
      width: "100px",
      align: "center",
      render: (row) => <span className="text-[rgb(var(--admin-text-primary))]">{row.requestCount?.toLocaleString() || 0}</span>,
    },
    {
      key: "tokenCount",
      title: "Token数",
      width: "120px",
      align: "center",
      render: (row) => <span>{row.tokenCount?.toLocaleString() || 0}</span>,
    },
    {
      key: "costAmount",
      title: "成本金额",
      width: "100px",
      render: (row) => <span className="font-medium text-red-600">¥{(row.costAmount || 0).toFixed(4)}</span>,
    },
    {
      key: "avgCostPerRequest",
      title: "平均成本/请求",
      width: "100px",
      render: (row) => <span className="text-sm">¥{(row.avgCostPerRequest || 0).toFixed(6)}</span>,
    },
    {
      key: "trend",
      title: "趋势",
      width: "70px",
      align: "center",
      render: (row) => {
        const isUp = (row.trend || 0) > 0;
        return (
          <span className={`text-xs ${isUp ? "text-red-600" : "text-green-600"}`}>
            {isUp ? "↑" : "↓"} {Math.abs(row.trend || 0).toFixed(1)}%
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">成本分析</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <AdminCard key={s.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${s.color}-50 flex items-center justify-center text-${s.color}-600`}>
              {s.icon}
            </div>
            <div>
              <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{s.value}</div>
              <div className="text-xs text-[rgb(var(--admin-text-secondary))]">{s.label}</div>
            </div>
          </AdminCard>
        ))}
      </div>

      <AdminListPage<CostRow>
        title=""
        subtitle="分析平台运营成本，查看模型调用成本趋势"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        emptyText="暂无成本数据"
        error={error}
      />
    </div>
  );
}

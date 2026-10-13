"use client";

import { useState, useCallback } from "react";
import { Sliders, AlertTriangle, CheckCircle, Gauge } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface QuotaRow {
  id: string;
  user: { id: string; name: string; email: string };
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  alertThreshold: number;
  isAlertEnabled: boolean;
  updatedAt: string;
}

export default function FinanceQuotasPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<QuotaRow>(
    `/admin/finance/quotas?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deleteQuota } = useDelete("/admin/finance/quotas", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/finance/quotas`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const getUsagePercent = (used: number, limit: number) => {
    if (!limit) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "text-red-600 bg-red-50";
    if (percent >= 70) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const stats = [
    { label: "设置配额用户", value: items?.length || 0, icon: <Sliders className="h-4 w-4" />, color: "blue" },
    { label: "超限预警用户", value: items?.filter((i) => getUsagePercent(i.monthlyUsed, i.monthlyLimit) >= 90).length || 0, icon: <AlertTriangle className="h-4 w-4" />, color: "red" },
  ];

  const columns: TableColumn<QuotaRow>[] = [
    {
      key: "user",
      title: "用户",
      width: "180px",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.user?.name || "-"}</span>
          <span className="text-xs text-[rgb(var(--admin-text-secondary))]">{row.user?.email || "-"}</span>
        </div>
      ),
    },
    {
      key: "daily",
      title: "日配额/使用",
      width: "120px",
      render: (row) => {
        const percent = getUsagePercent(row.dailyUsed, row.dailyLimit);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm">{row.dailyUsed?.toLocaleString()} / {row.dailyLimit?.toLocaleString()}</span>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${getUsageColor(percent).replace("text-", "bg-").replace("-50", "-500")}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "monthly",
      title: "月配额/使用",
      width: "120px",
      render: (row) => {
        const percent = getUsagePercent(row.monthlyUsed, row.monthlyLimit);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm">{row.monthlyUsed?.toLocaleString()} / {row.monthlyLimit?.toLocaleString()}</span>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${getUsageColor(percent).replace("text-", "bg-").replace("-50", "-500")}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "alertThreshold",
      title: "告警阈值",
      width: "80px",
      align: "center",
      render: (row) => <span className="text-sm">{row.alertThreshold}%</span>,
    },
    {
      key: "isAlertEnabled",
      title: "告警",
      width: "60px",
      align: "center",
      render: (row) => (
        row.isAlertEnabled ? <CheckCircle className="h-4 w-4 text-green-600 mx-auto" /> : <span className="text-gray-400">-</span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">调整</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sliders className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">配额管理</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
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

      <AdminListPage<QuotaRow>
        title=""
        subtitle="管理用户调用配额，设置限额与告警阈值"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        emptyText="暂无配额数据"
        error={error}
      />
    </div>
  );
}

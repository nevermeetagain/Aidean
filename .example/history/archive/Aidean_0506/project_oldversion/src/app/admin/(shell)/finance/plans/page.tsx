"use client";

import { useState, useCallback } from "react";
import { Package, Users, Star, Zap } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface PlanRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: number;
  duration: number;
  quotaPerMonth: number;
  features: string[];
  isActive: boolean;
  subscriberCount: number;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  true: { text: "上架", color: "text-green-600 bg-green-50" },
  false: { text: "下架", color: "text-gray-600 bg-gray-50" },
};

export default function PlansManagementPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<PlanRow>(
    `/admin/finance/plans?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deletePlan } = useDelete("/admin/finance/plans", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/finance/plans`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const activeCount = items?.filter((i) => i.isActive).length || 0;
  const totalSubscribers = items?.reduce((sum, i) => sum + (i.subscriberCount || 0), 0) || 0;

  const stats = [
    { label: "上架套餐", value: activeCount, icon: <Package className="h-4 w-4" />, color: "blue" },
    { label: "订阅用户", value: totalSubscribers, icon: <Users className="h-4 w-4" />, color: "green" },
  ];

  const columns: TableColumn<PlanRow>[] = [
    {
      key: "name",
      title: "套餐名称",
      width: "160px",
      render: (row) => <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>,
    },
    { key: "code", title: "代码", width: "100px" },
    {
      key: "price",
      title: "价格",
      width: "100px",
      render: (row) => <span className="font-medium text-green-600">¥{(row.price || 0).toFixed(2)}/{row.duration}月</span>,
    },
    {
      key: "quotaPerMonth",
      title: "月配额",
      width: "100px",
      render: (row) => <span>{row.quotaPerMonth?.toLocaleString() || 0} 次</span>,
    },
    {
      key: "subscriberCount",
      title: "订阅数",
      width: "80px",
      align: "center",
      render: (row) => <span className="text-[rgb(var(--admin-text-primary))]">{row.subscriberCount || 0}</span>,
    },
    {
      key: "isActive",
      title: "状态",
      width: "70px",
      render: (row) => {
        const s = STATUS_LABELS[String(row.isActive)];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.color || "text-gray-600 bg-gray-50"}`}>
            {s?.text || "-"}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton
            variant="link"
            size="sm"
            className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
            onClick={() => {
              if (confirm(`确认删除套餐 ${row.name}？`)) {
                deletePlan(row.id);
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">套餐管理</h1>
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

      <AdminListPage<PlanRow>
        title=""
        subtitle="管理订阅套餐，设置价格与配额"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        onCreate={() => {}}
        createButtonText="新建套餐"
        emptyText="暂无套餐数据"
        error={error}
      />
    </div>
  );
}

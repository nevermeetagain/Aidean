"use client";

import { useState, useCallback } from "react";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface BalanceRow {
  id: string;
  user: { id: string; name: string; email: string };
  balance: number;
  frozenAmount: number;
  totalRecharge: number;
  totalConsume: number;
  lastRechargeAt: string | null;
  updatedAt: string;
}

export default function BalanceManagementPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<BalanceRow>(
    `/admin/finance/balance?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const totalBalance = items?.reduce((sum, i) => sum + (i.balance || 0), 0) || 0;
  const totalRecharge = items?.reduce((sum, i) => sum + (i.totalRecharge || 0), 0) || 0;
  const totalConsume = items?.reduce((sum, i) => sum + (i.totalConsume || 0), 0) || 0;

  const stats = [
    { label: "总余额", value: `¥${totalBalance.toFixed(2)}`, icon: <Wallet className="h-4 w-4" />, color: "blue" },
    { label: "累计充值", value: `¥${totalRecharge.toFixed(2)}`, icon: <TrendingUp className="h-4 w-4" />, color: "green" },
    { label: "累计消费", value: `¥${totalConsume.toFixed(2)}`, icon: <TrendingDown className="h-4 w-4" />, color: "orange" },
  ];

  const columns: TableColumn<BalanceRow>[] = [
    {
      key: "user",
      title: "用户",
      width: "200px",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.user?.name || "-"}</span>
          <span className="text-xs text-[rgb(var(--admin-text-secondary))]">{row.user?.email || "-"}</span>
        </div>
      ),
    },
    {
      key: "balance",
      title: "当前余额",
      width: "120px",
      render: (row) => (
        <span className="font-medium text-green-600">¥{(row.balance || 0).toFixed(2)}</span>
      ),
    },
    {
      key: "frozenAmount",
      title: "冻结金额",
      width: "100px",
      render: (row) => (
        <span className="text-orange-600">¥{(row.frozenAmount || 0).toFixed(2)}</span>
      ),
    },
    {
      key: "totalRecharge",
      title: "累计充值",
      width: "100px",
      render: (row) => (
        <span className="text-blue-600">¥{(row.totalRecharge || 0).toFixed(2)}</span>
      ),
    },
    {
      key: "totalConsume",
      title: "累计消费",
      width: "100px",
      render: (row) => (
        <span className="text-gray-600">¥{(row.totalConsume || 0).toFixed(2)}</span>
      ),
    },
    {
      key: "lastRechargeAt",
      title: "最近充值",
      width: "140px",
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))]">
          {row.lastRechargeAt ? new Date(row.lastRechargeAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">详情</AdminButton>
          <AdminButton variant="link" size="sm">调整</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">余额管理</h1>
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

      <AdminListPage<BalanceRow>
        title=""
        subtitle="管理用户余额，查看充值与消费记录"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        emptyText="暂无余额数据"
        error={error}
      />
    </div>
  );
}

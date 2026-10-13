"use client";

import { useState, useCallback } from "react";
import { Receipt, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface TransactionRow {
  id: string;
  transactionNo: string;
  user: { id: string; name: string; email: string };
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  relatedOrderNo: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  RECHARGE: { text: "充值", color: "text-green-600 bg-green-50", icon: <ArrowDownRight className="h-3 w-3" /> },
  CONSUME: { text: "消费", color: "text-orange-600 bg-orange-50", icon: <ArrowUpRight className="h-3 w-3" /> },
  REFUND: { text: "退款", color: "text-blue-600 bg-blue-50", icon: <Minus className="h-3 w-3" /> },
  ADJUST: { text: "调整", color: "text-purple-600 bg-purple-50", icon: <Minus className="h-3 w-3" /> },
};

export default function TransactionsManagementPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { items, pagination, isLoading, error, refresh } = useList<TransactionRow>(
    `/admin/finance/transactions?keyword=${searchKeyword}&page=${page}&limit=${pageSize}&type=${typeFilter}`,
    { params: { keyword: searchKeyword, page, limit: pageSize, type: typeFilter } }
  );

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const totalIn = items?.filter((i) => i.type === "RECHARGE").reduce((sum, i) => sum + i.amount, 0) || 0;
  const totalOut = items?.filter((i) => i.type === "CONSUME").reduce((sum, i) => sum + Math.abs(i.amount), 0) || 0;
  const totalCount = items?.length || 0;

  const stats = [
    { label: "总收入", value: `¥${totalIn.toFixed(2)}`, color: "green" },
    { label: "总支出", value: `¥${totalOut.toFixed(2)}`, color: "orange" },
    { label: "交易笔数", value: totalCount, color: "blue" },
  ];

  const columns: TableColumn<TransactionRow>[] = [
    { key: "transactionNo", title: "流水号", width: "150px" },
    {
      key: "user",
      title: "用户",
      width: "160px",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.user?.name || "-"}</span>
          <span className="text-xs text-[rgb(var(--admin-text-secondary))]">{row.user?.email || "-"}</span>
        </div>
      ),
    },
    {
      key: "type",
      title: "类型",
      width: "80px",
      render: (row) => {
        const t = TYPE_LABELS[row.type] || { text: row.type, color: "text-gray-600 bg-gray-50", icon: null };
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>
            {t.icon}
            {t.text}
          </span>
        );
      },
    },
    {
      key: "amount",
      title: "金额",
      width: "100px",
      render: (row) => {
        const isIncome = row.type === "RECHARGE" || row.type === "REFUND";
        return (
          <span className={`font-medium ${isIncome ? "text-green-600" : "text-orange-600"}`}>
            {isIncome ? "+" : "-"}¥{Math.abs(row.amount || 0).toFixed(2)}
          </span>
        );
      },
    },
    {
      key: "balanceAfter",
      title: "余额",
      width: "100px",
      render: (row) => <span className="text-sm">¥{(row.balanceAfter || 0).toFixed(2)}</span>,
    },
    {
      key: "description",
      title: "说明",
      width: "180px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))] truncate max-w-[160px] block">{row.description || "-"}</span>,
    },
    {
      key: "createdAt",
      title: "时间",
      width: "140px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{new Date(row.createdAt).toLocaleString()}</span>,
    },
  ];

  const filterBar = (
    <div className="flex items-center gap-4">
      <select
        value={typeFilter}
        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        className="px-3 py-1.5 text-sm border border-[rgb(var(--admin-border))] rounded-md bg-white"
      >
        <option value="">全部类型</option>
        <option value="RECHARGE">充值</option>
        <option value="CONSUME">消费</option>
        <option value="REFUND">退款</option>
        <option value="ADJUST">调整</option>
      </select>
      {typeFilter && (
        <AdminButton variant="link" size="sm" onClick={() => { setTypeFilter(""); setPage(1); }}>
          清除筛选
        </AdminButton>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Receipt className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">交易记录</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <AdminCard key={s.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${s.color}-50 flex items-center justify-center`}>
              <span className={`text-${s.color}-600 font-bold`}>{s.value}</span>
            </div>
            <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{s.label}</span>
          </AdminCard>
        ))}
      </div>

      <AdminListPage<TransactionRow>
        title=""
        subtitle="查看所有用户交易明细，包括充值、消费、退款"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        emptyText="暂无交易记录"
        error={error}
      />
    </div>
  );
}

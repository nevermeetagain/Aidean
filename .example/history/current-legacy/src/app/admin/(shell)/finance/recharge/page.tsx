"use client";

import { useState, useCallback } from "react";
import { CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface RechargeRow {
  id: string;
  orderNo: string;
  user: { id: string; name: string; email: string };
  amount: number;
  paymentMethod: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  PENDING: { text: "待支付", color: "text-yellow-600 bg-yellow-50", icon: <Clock className="h-3 w-3" /> },
  PAID: { text: "已支付", color: "text-green-600 bg-green-50", icon: <CheckCircle className="h-3 w-3" /> },
  FAILED: { text: "支付失败", color: "text-red-600 bg-red-50", icon: <XCircle className="h-3 w-3" /> },
  REFUNDED: { text: "已退款", color: "text-gray-600 bg-gray-50", icon: <CreditCard className="h-3 w-3" /> },
};

const METHOD_LABELS: Record<string, string> = {
  ALIPAY: "支付宝",
  WECHAT: "微信支付",
  BANK: "银行转账",
  CARD: "银行卡",
};

export default function RechargeManagementPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { items, pagination, isLoading, error, refresh } = useList<RechargeRow>(
    `/admin/finance/recharge?keyword=${searchKeyword}&page=${page}&limit=${pageSize}&status=${statusFilter}`,
    { params: { keyword: searchKeyword, page, limit: pageSize, status: statusFilter } }
  );

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const totalAmount = items?.reduce((sum, i) => sum + (i.status === "PAID" ? i.amount : 0), 0) || 0;
  const pendingCount = items?.filter((i) => i.status === "PENDING").length || 0;
  const paidCount = items?.filter((i) => i.status === "PAID").length || 0;

  const stats = [
    { label: "已收款金额", value: `¥${totalAmount.toFixed(2)}`, color: "green" },
    { label: "待支付订单", value: pendingCount, color: "yellow" },
    { label: "已完成订单", value: paidCount, color: "blue" },
  ];

  const columns: TableColumn<RechargeRow>[] = [
    { key: "orderNo", title: "订单号", width: "160px" },
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
      key: "amount",
      title: "金额",
      width: "100px",
      render: (row) => <span className="font-medium text-green-600">¥{(row.amount || 0).toFixed(2)}</span>,
    },
    {
      key: "paymentMethod",
      title: "支付方式",
      width: "100px",
      render: (row) => <span className="text-sm">{METHOD_LABELS[row.paymentMethod] || row.paymentMethod}</span>,
    },
    {
      key: "status",
      title: "状态",
      width: "100px",
      render: (row) => {
        const s = STATUS_LABELS[row.status] || { text: row.status, color: "text-gray-600 bg-gray-50", icon: null };
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
            {s.icon}
            {s.text}
          </span>
        );
      },
    },
    {
      key: "paidAt",
      title: "支付时间",
      width: "140px",
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))]">
          {row.paidAt ? new Date(row.paidAt).toLocaleString() : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">详情</AdminButton>
        </div>
      ),
    },
  ];

  const filterBar = (
    <div className="flex items-center gap-4">
      <select
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        className="px-3 py-1.5 text-sm border border-[rgb(var(--admin-border))] rounded-md bg-white"
      >
        <option value="">全部状态</option>
        <option value="PENDING">待支付</option>
        <option value="PAID">已支付</option>
        <option value="FAILED">支付失败</option>
        <option value="REFUNDED">已退款</option>
      </select>
      {statusFilter && (
        <AdminButton variant="link" size="sm" onClick={() => { setStatusFilter(""); setPage(1); }}>
          清除筛选
        </AdminButton>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">充值管理</h1>
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

      <AdminListPage<RechargeRow>
        title=""
        subtitle="管理用户充值订单，查看支付状态"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        emptyText="暂无充值订单"
        error={error}
      />
    </div>
  );
}

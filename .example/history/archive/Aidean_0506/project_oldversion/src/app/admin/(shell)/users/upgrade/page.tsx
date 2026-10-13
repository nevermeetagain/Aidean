"use client";

import { useState, useCallback } from "react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { useList, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface UpgradeRequestRow {
  id: string;
  userId: string;
  userEmail: string;
  userNickname: string | null;
  currentRole: string;
  targetRole: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  USER: "普通用户",
  ADMIN: "管理员",
  SUPER_ADMIN: "超级管理员",
  VIP: "VIP会员",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  PENDING: { text: "待审核", color: "text-yellow-600 bg-yellow-50" },
  APPROVED: { text: "已通过", color: "text-green-600 bg-green-50" },
  REJECTED: { text: "已拒绝", color: "text-red-600 bg-red-50" },
};

export default function UserUpgradePage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<UpgradeRequestRow>(
    apiKeys.upgradeRequests({ keyword: searchKeyword, page, limit: pageSize })
  );

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const columns: TableColumn<UpgradeRequestRow>[] = [
    {
      key: "user",
      title: "用户",
      width: "180px",
      render: (row) => (
        <div>
          <div className="font-medium text-[rgb(var(--admin-text-primary))]">
            {row.userNickname || row.userEmail}
          </div>
          <div className="text-xs text-[rgb(var(--admin-text-muted))]">
            {row.userEmail}
          </div>
        </div>
      ),
    },
    {
      key: "currentRole",
      title: "当前等级",
      width: "90px",
      render: (row) => ROLE_LABELS[row.currentRole] || row.currentRole,
    },
    {
      key: "targetRole",
      title: "目标等级",
      width: "90px",
      render: (row) => (
        <span className="text-[rgb(var(--admin-primary))]">
          {ROLE_LABELS[row.targetRole] || row.targetRole}
        </span>
      ),
    },
    {
      key: "reason",
      title: "申请理由",
      width: "200px",
      render: (row) => row.reason || "-",
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
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center" as const,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {row.status === "PENDING" && (
            <>
              <AdminButton variant="link" size="sm" className="text-green-600">通过</AdminButton>
              <AdminButton variant="link" size="sm" className="text-red-600">拒绝</AdminButton>
            </>
          )}
          <AdminButton variant="link" size="sm">查看</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <AdminListPage<UpgradeRequestRow>
      title="升级权限"
      subtitle="管理用户等级升级申请"
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
      emptyText="暂无升级申请"
      error={error}
    />
  );
}

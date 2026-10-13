"use client";

import { useState, useCallback } from "react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { useList, useDelete, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface UserRow {
  id: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  role: string;
  status: string;
  balance: number;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { text: string; color: string }> = {
  SUPER_ADMIN: { text: "超级管理员", color: "text-purple-600 bg-purple-50" },
  ADMIN: { text: "管理员", color: "text-blue-600 bg-blue-50" },
  USER: { text: "普通用户", color: "text-gray-600 bg-gray-50" },
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: "正常", color: "text-green-600 bg-green-50" },
  INACTIVE: { text: "停用", color: "text-gray-600 bg-gray-50" },
  BANNED: { text: "封禁", color: "text-red-600 bg-red-50" },
  LOCKED: { text: "锁定", color: "text-yellow-600 bg-yellow-50" },
};

export default function UsersPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<UserRow>(
    apiKeys.users({ keyword: searchKeyword, page, limit: pageSize }),
    {
      params: { keyword: searchKeyword, page, limit: pageSize },
    }
  );

  const { mutate: deleteUser } = useDelete("/admin/users", {
    onSuccess: () => refresh(),
    invalidateKeys: [apiKeys.users()],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const columns: TableColumn<UserRow>[] = [
    {
      key: "nickname",
      title: "用户",
      width: "180px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[rgb(var(--admin-bg-hover))] flex items-center justify-center text-xs font-medium text-[rgb(var(--admin-text-secondary))]">
            {(row.nickname || row.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-[rgb(var(--admin-text-primary))]">
              {row.nickname || "-"}
            </div>
            <div className="text-xs text-[rgb(var(--admin-text-muted))]">
              {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      title: "角色",
      width: "100px",
      render: (row) => {
        const r = ROLE_LABELS[row.role] || { text: row.role, color: "text-gray-600 bg-gray-50" };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${r.color}`}>
            {r.text}
          </span>
        );
      },
    },
    {
      key: "status",
      title: "状态",
      width: "70px",
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
      key: "balance",
      title: "余额",
      width: "90px",
      align: "right" as const,
      render: (row) => (
        <span className="font-mono text-sm">¥{Number(row.balance).toFixed(2)}</span>
      ),
    },
    {
      key: "emailVerified",
      title: "邮箱验证",
      width: "80px",
      align: "center" as const,
      render: (row) =>
        row.emailVerified ? (
          <span className="text-green-600">已验证</span>
        ) : (
          <span className="text-[rgb(var(--admin-text-muted))]">未验证</span>
        ),
    },
    {
      key: "lastLoginAt",
      title: "最近登录",
      width: "140px",
      render: (row) =>
        row.lastLoginAt
          ? new Date(row.lastLoginAt).toLocaleDateString("zh-CN")
          : "-",
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center" as const,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">
            编辑
          </AdminButton>
          <AdminButton
            variant="link"
            size="sm"
            className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
            onClick={() => {
              if (confirm(`确认删除用户 ${row.nickname || row.email}？`)) {
                deleteUser(row.id);
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
    <AdminListPage<UserRow>
      title="用户管理"
      subtitle="管理系统用户账户、权限与状态"
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
        // TODO: 打开创建用户对话框
      }}
      createButtonText="新建用户"
      emptyText="暂无用户数据"
      error={error}
    />
  );
}

"use client";

import { useState, useCallback } from "react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { useList, useDelete, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface McpRow {
  id: string;
  name: string;
  nameCn: string | null;
  displayName: string;
  author: string | null;
  category: string | null;
  protocolType: string;
  npmPackage: string | null;
  downloads: number;
  stars: number;
  isVerified: boolean;
  isFeatured: boolean;
  isActive: boolean;
  source: string | null;
  sourceId: string | null;
  sourceUrl: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

const PROTOCOL_LABELS: Record<string, string> = {
  stdio: "STDIO",
  sse: "SSE",
  http: "HTTP",
  websocket: "WebSocket",
};

const MCP_SOURCE_LABELS: Record<string, string> = {
  smithery: "Smithery",
  glama: "Glama",
  manual: "手动创建",
};

export default function MCPManagementPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const { items, pagination, isLoading, error, refresh } = useList<McpRow>(
    apiKeys.mcps({ keyword: searchKeyword, page, limit: pageSize })
  );

  const { mutate: deleteMcp } = useDelete("/admin/tools", {
    onSuccess: () => refresh(),
    invalidateKeys: [apiKeys.mcps()],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/v1/admin/tools/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "mcp",
          sources: sourceFilter ? [sourceFilter] : undefined,
        }),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.success) refresh();
    } catch {
      setSyncResult({ success: false, error: "同步请求失败" });
    } finally {
      setSyncing(false);
    }
  }, [syncing, sourceFilter, refresh]);

  const columns: TableColumn<McpRow>[] = [
    {
      key: "displayName",
      title: "名称",
      width: "200px",
      render: (row) => (
        <div>
          <div className="font-medium text-[rgb(var(--admin-text-primary))]">
            {row.displayName}
          </div>
          {row.nameCn && (
            <div className="text-xs text-[rgb(var(--admin-text-muted))]">
              {row.nameCn}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "author",
      title: "作者",
      width: "100px",
      render: (row) => row.author || "-",
    },
    {
      key: "protocolType",
      title: "传输协议",
      width: "90px",
      render: (row) => (
        <code className="text-xs px-1.5 py-0.5 rounded bg-[rgb(var(--admin-bg))] text-[rgb(var(--admin-text-secondary))]">
          {PROTOCOL_LABELS[row.protocolType] || row.protocolType}
        </code>
      ),
    },
    {
      key: "npmPackage",
      title: "NPM 包",
      width: "150px",
      render: (row) =>
        row.npmPackage ? (
          <code className="text-xs text-[rgb(var(--admin-text-secondary))] truncate block max-w-[150px]">
            {row.npmPackage}
          </code>
        ) : (
          "-"
        ),
    },
    {
      key: "downloads",
      title: "下载量",
      width: "80px",
      align: "right" as const,
      render: (row) => row.downloads.toLocaleString(),
    },
    {
      key: "stars",
      title: "收藏",
      width: "70px",
      align: "right" as const,
      render: (row) => row.stars.toLocaleString(),
    },
    {
      key: "source",
      title: "数据源",
      width: "90px",
      render: (row) => {
        const label = MCP_SOURCE_LABELS[row.source || ""] || row.source || "手动";
        const colorMap: Record<string, string> = {
          smithery: "text-blue-600 bg-blue-50",
          glama: "text-orange-600 bg-orange-50",
          manual: "text-gray-600 bg-gray-50",
        };
        const color = colorMap[row.source || "manual"] || "text-gray-600 bg-gray-50";
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: "isVerified",
      title: "状态",
      width: "80px",
      render: (row) => {
        if (!row.isActive)
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-red-600 bg-red-50">
              已停用
            </span>
          );
        if (row.isVerified)
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-green-600 bg-green-50">
              已认证
            </span>
          );
        if (row.isFeatured)
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-blue-600 bg-blue-50">
              精选
            </span>
          );
        return <span className="text-[rgb(var(--admin-text-muted))]">普通</span>;
      },
    },
    {
      key: "lastSyncedAt",
      title: "最后同步",
      width: "100px",
      render: (row) => {
        if (!row.lastSyncedAt) return <span className="text-[rgb(var(--admin-text-muted))]">-</span>;
        const d = new Date(row.lastSyncedAt);
        return <span className="text-xs text-[rgb(var(--admin-text-secondary))]">{d.toLocaleDateString()}</span>;
      },
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
              if (confirm(`确认删除 MCP Server ${row.displayName}？`)) deleteMcp(row.id);
            }}
          >
            删除
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* 同步控制栏 */}
      <div className="mb-4 p-4 rounded-lg bg-[rgb(var(--admin-bg))] border border-[rgb(var(--admin-border))]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">数据同步</h3>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-sm border border-[rgb(var(--admin-border))] rounded px-2 py-1 bg-white text-[rgb(var(--admin-text-primary))]"
            >
              <option value="">全部数据源</option>
              <option value="smithery">Smithery.ai</option>
              <option value="glama">Glama.ai</option>
            </select>
            <AdminButton variant="primary" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? "同步中..." : "立即同步"}
            </AdminButton>
          </div>
          {syncResult && (
            <div className={`text-xs px-3 py-1 rounded ${syncResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {syncResult.success
                ? `同步完成: 新增${syncResult.data?.stats?.totalCreated || 0}, 更新${syncResult.data?.stats?.totalUpdated || 0}`
                : `同步失败: ${syncResult.error || "未知错误"}`}
            </div>
          )}
        </div>
      </div>

    <AdminListPage<McpRow>
      title="MCP 管理"
      subtitle="管理 MCP Server 工具协议"
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
      createButtonText="新建 MCP"
      emptyText="暂无 MCP Server 数据"
      error={error}
    />
    </div>
  );
}

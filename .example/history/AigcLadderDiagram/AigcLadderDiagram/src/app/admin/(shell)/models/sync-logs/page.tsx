"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Filter, RotateCw, FileText, Plus, Minus, Database } from "lucide-react";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminTable, TableColumn } from "@/components/admin/shared/AdminTable";
import { useToastActions } from "@/components/admin/shared/AdminToast";

interface ChangeLog {
  id: string;
  modelId: string;
  changeType: "NEW" | "UPDATED" | "DEPRECATED" | "UNCHANGED";
  batchId: string;
  beforeData: Record<string, any> | null;
  afterData: Record<string, any> | null;
  changedFields: string[];
  createdAt: string;
}

interface ChangeStats {
  total: number;
  distribution: Record<string, number>;
}

export default function SyncLogsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [stats, setStats] = useState<ChangeStats | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toast = useToastActions();

  // 获取同步日志
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", "50");
      if (selectedType) {
        params.append("changeType", selectedType);
      }

      const response = await fetch(`/api/v1/admin/sync/logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.changes);
        setStats(data.data.stats);
      } else {
        toast.error("获取日志失败", data.error || "未知错误");
      }
    } catch (error) {
      toast.error("获取日志失败", error instanceof Error ? error.message : "网络错误");
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchLogs();
  }, [selectedType]);

  // 切换行展开状态
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // 获取变更类型标签
  const getChangeTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      NEW: "bg-green-100 text-green-700",
      UPDATED: "bg-blue-100 text-blue-700",
      DEPRECATED: "bg-red-100 text-red-700",
      UNCHANGED: "bg-gray-100 text-gray-700",
    };
    const labels: Record<string, string> = {
      NEW: "新增",
      UPDATED: "更新",
      DEPRECATED: "废弃",
      UNCHANGED: "无变化",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded font-medium ${styles[type] || styles.UNCHANGED}`}>
        {labels[type] || type}
      </span>
    );
  };

  const columns: TableColumn<ChangeLog>[] = [
    {
      key: "expand",
      title: "",
      width: "40px",
      render: (record: ChangeLog, _index: number) => (
        <button
          onClick={() => toggleRow(record.id)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {expandedRows.has(record.id) ? (
            <Minus className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      ),
    },
    {
      key: "changeType",
      title: "变更类型",
      width: "100px",
      render: (record: ChangeLog) => getChangeTypeBadge(record.changeType),
    },
    {
      key: "modelId",
      title: "模型",
      render: (record: ChangeLog) => <span className="font-mono text-sm">{record.modelId}</span>,
    },
    {
      key: "changedFields",
      title: "变更字段",
      render: (record: ChangeLog) =>
        record.changedFields?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {record.changedFields.slice(0, 3).map((field) => (
              <span key={field} className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                {field}
              </span>
            ))}
            {record.changedFields.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                +{record.changedFields.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "batchId",
      title: "批次ID",
      width: "200px",
      render: (record: ChangeLog) => (
        <span className="font-mono text-xs text-gray-500 truncate block max-w-[180px]">
          {record.batchId}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "时间",
      width: "160px",
      render: (record: ChangeLog) => (
        <span className="text-sm text-gray-600">
          {new Date(record.createdAt).toLocaleString("zh-CN")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">
            同步变更日志
          </h1>
          <p className="text-sm text-[rgb(var(--admin-text-muted))] mt-1">
            查看模型数据同步的历史变更记录
          </p>
        </div>
        <AdminButton
          variant="secondary"
          onClick={fetchLogs}
          disabled={isLoading}
          className="gap-2"
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          刷新
        </AdminButton>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-[rgb(var(--admin-text-muted))]">总变更数</div>
                <div className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
                  {stats.total}
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-[rgb(var(--admin-text-muted))]">新增</div>
                <div className="text-lg font-semibold text-green-600">
                  {stats.distribution?.NEW || 0}
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-[rgb(var(--admin-text-muted))]">更新</div>
                <div className="text-lg font-semibold text-blue-600">
                  {stats.distribution?.UPDATED || 0}
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-[rgb(var(--admin-text-muted))]">废弃</div>
                <div className="text-lg font-semibold text-red-600">
                  {stats.distribution?.DEPRECATED || 0}
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* 筛选器 */}
      <AdminCard className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType("")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedType === ""
                  ? "bg-[rgb(var(--admin-primary))] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedType("NEW")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedType === "NEW"
                  ? "bg-green-500 text-white"
                  : "bg-green-50 text-green-600 hover:bg-green-100"
              }`}
            >
              新增
            </button>
            <button
              onClick={() => setSelectedType("UPDATED")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedType === "UPDATED"
                  ? "bg-blue-500 text-white"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              更新
            </button>
            <button
              onClick={() => setSelectedType("DEPRECATED")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedType === "DEPRECATED"
                  ? "bg-red-500 text-white"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              废弃
            </button>
          </div>
        </div>
      </AdminCard>

      {/* 日志表格 */}
      <AdminCard className="p-0 overflow-hidden">
        <AdminTable
          columns={columns}
          data={logs}
          loading={isLoading}
          rowKey="id"
          emptyText="暂无变更记录"
        />
        
        {/* 展开的行详情 */}
        {Array.from(expandedRows).map((rowId) => {
          const record = logs.find((l) => l.id === rowId);
          if (!record) return null;
          return (
            <div key={rowId} className="p-4 bg-gray-50 space-y-3 border-t">
              {record.beforeData && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">变更前:</div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(record.beforeData, null, 2)}
                  </pre>
                </div>
              )}
              {record.afterData && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">变更后:</div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(record.afterData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </AdminCard>
    </div>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import { Play, RotateCw, History, Activity, Database, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { useToastActions } from "@/components/admin/shared/AdminToast";

interface SyncStatus {
  isRunning: boolean;
  currentJob: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  stats: {
    totalBatches: number;
    successCount: number;
    failureCount: number;
  };
}

interface SyncResult {
  success: boolean;
  batchId: string;
  stats: {
    modelsFound: number;
    modelsNew: number;
    modelsUpdated: number;
    modelsDeprecated: number;
    errors: number;
    duration: number;
  };
}

export default function SyncManagementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const toast = useToastActions();

  // 获取同步状态
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/sync?view=status");
      const data = await response.json();
      if (data.success) {
        setSyncStatus(data.data.scheduler);
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    }
  }, []);

  // 触发手动同步
  const triggerSync = async (dryRun: boolean = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun,
          sources: ["openrouter", "arena"],
          timeout: 30000,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLastResult(data.data);
        toast.success(
          "同步成功",
          `发现 ${data.data.stats.modelsFound} 个模型，新增 ${data.data.stats.modelsNew} 个，更新 ${data.data.stats.modelsUpdated} 个`
        );
      } else {
        toast.error("同步失败", data.error || "未知错误");
      }
    } catch (error) {
      toast.error("同步失败", error instanceof Error ? error.message : "网络错误");
    } finally {
      setIsLoading(false);
      fetchStatus();
    }
  };

  // 初始加载状态
  useState(() => {
    fetchStatus();
  });

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">
            模型数据同步
          </h1>
          <p className="text-sm text-[rgb(var(--admin-text-muted))] mt-1">
            管理大模型数据同步任务，支持 OpenRouter 和 Arena AI 数据源
          </p>
        </div>
        <AdminButton
          variant="secondary"
          onClick={fetchStatus}
          disabled={isLoading}
          className="gap-2"
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          刷新状态
        </AdminButton>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${syncStatus?.isRunning ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">同步状态</div>
              <div className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
                {syncStatus?.isRunning ? "进行中" : "空闲"}
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">总批次</div>
              <div className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
                {syncStatus?.stats?.totalBatches || 0}
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">成功次数</div>
              <div className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
                {syncStatus?.stats?.successCount || 0}
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">失败次数</div>
              <div className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
                {syncStatus?.stats?.failureCount || 0}
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* 操作区域 */}
      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-[rgb(var(--admin-text-primary))] mb-4">
          手动同步
        </h2>
        <div className="flex flex-wrap gap-4">
          <AdminButton
            size="lg"
            onClick={() => triggerSync(false)}
            disabled={isLoading || syncStatus?.isRunning}
            className="gap-2"
          >
            <Play className="h-5 w-5" />
            {isLoading ? "同步中..." : "立即同步"}
          </AdminButton>
          
          <AdminButton
            variant="secondary"
            size="lg"
            onClick={() => triggerSync(true)}
            disabled={isLoading || syncStatus?.isRunning}
            className="gap-2"
          >
            <Clock className="h-5 w-5" />
            试运行（Dry Run）
          </AdminButton>
        </div>
        
        <div className="mt-4 text-sm text-[rgb(var(--admin-text-muted))]">
          <p>上次运行: {syncStatus?.lastRunAt ? new Date(syncStatus.lastRunAt).toLocaleString("zh-CN") : "从未运行"}</p>
          {syncStatus?.nextRunAt && (
            <p>下次定时运行: {new Date(syncStatus.nextRunAt).toLocaleString("zh-CN")}</p>
          )}
        </div>
      </AdminCard>

      {/* 同步结果 */}
      {lastResult && (
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--admin-text-primary))] mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            上次同步结果
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[rgb(var(--admin-bg-hover))] rounded-lg">
              <div className="text-2xl font-bold text-[rgb(var(--admin-primary))]">
                {lastResult.stats.modelsFound}
              </div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">发现模型</div>
            </div>
            <div className="p-3 bg-[rgb(var(--admin-bg-hover))] rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {lastResult.stats.modelsNew}
              </div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">新增模型</div>
            </div>
            <div className="p-3 bg-[rgb(var(--admin-bg-hover))] rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {lastResult.stats.modelsUpdated}
              </div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">更新模型</div>
            </div>
            <div className="p-3 bg-[rgb(var(--admin-bg-hover))] rounded-lg">
              <div className="text-2xl font-bold text-[rgb(var(--admin-text-muted))]">
                {(lastResult.stats.duration / 1000).toFixed(1)}s
              </div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">耗时</div>
            </div>
          </div>
        </AdminCard>
      )}

      {/* 数据源说明 */}
      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-[rgb(var(--admin-text-primary))] mb-4">
          数据源配置
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-[rgb(var(--admin-border))] rounded-lg">
            <div>
              <div className="font-medium text-[rgb(var(--admin-text-primary))]">OpenRouter</div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">
                获取模型元数据、定价信息、参数配置
              </div>
            </div>
            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">已启用</span>
          </div>
          <div className="flex items-center justify-between p-3 border border-[rgb(var(--admin-border))] rounded-lg">
            <div>
              <div className="font-medium text-[rgb(var(--admin-text-primary))]">Arena AI Leaderboard</div>
              <div className="text-sm text-[rgb(var(--admin-text-muted))]">
                获取模型 Elo 评分和排名数据
              </div>
            </div>
            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">已启用</span>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}

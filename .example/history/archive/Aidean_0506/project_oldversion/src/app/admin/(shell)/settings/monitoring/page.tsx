"use client";

import { useState } from "react";
import { Activity, Cpu, HardDrive, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";

interface MetricCard {
  title: string;
  value: string;
  unit: string;
  trend: string;
  status: "normal" | "warning" | "critical";
  icon: React.ReactNode;
}

const METRICS: MetricCard[] = [
  { title: "CPU 使用率", value: "45", unit: "%", trend: "+2%", status: "normal", icon: <Cpu className="h-5 w-5" /> },
  { title: "内存使用", value: "68", unit: "%", trend: "-5%", status: "normal", icon: <Activity className="h-5 w-5" /> },
  { title: "磁盘空间", value: "72", unit: "%", trend: "+1%", status: "warning", icon: <HardDrive className="h-5 w-5" /> },
  { title: "API 响应", value: "120", unit: "ms", trend: "-10ms", status: "normal", icon: <Clock className="h-5 w-5" /> },
];

const ALERTS = [
  { id: 1, level: "warning", message: "磁盘使用率超过70%", time: "10分钟前" },
  { id: 2, level: "info", message: "API响应时间优化", time: "1小时前" },
];

export default function SystemMonitoringPage() {
  const [timeRange, setTimeRange] = useState("1h");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
          <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">性能监控</h1>
        </div>
        <div className="flex gap-2">
          {["1h", "24h", "7d", "30d"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? "bg-[rgb(var(--admin-primary))] text-white"
                  : "bg-white border border-[rgb(var(--admin-border))] text-[rgb(var(--admin-text-primary))] hover:bg-[rgb(var(--admin-bg-secondary))]"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {METRICS.map((metric) => (
          <AdminCard key={metric.title} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="text-[rgb(var(--admin-text-secondary))]">{metric.title}</div>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  metric.status === "normal"
                    ? "bg-green-50 text-green-600"
                    : metric.status === "warning"
                    ? "bg-yellow-50 text-yellow-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {metric.icon}
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">{metric.value}</span>
              <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{metric.unit}</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className={`h-3 w-3 ${metric.trend.startsWith("+") ? "text-red-500" : "text-green-500"}`} />
              <span className={`text-xs ${metric.trend.startsWith("+") ? "text-red-500" : "text-green-500"}`}>{metric.trend}</span>
              <span className="text-xs text-[rgb(var(--admin-text-tertiary))]">较上小时</span>
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <AdminCard className="col-span-2 p-6 min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <Activity className="h-12 w-12 text-[rgb(var(--admin-border))] mx-auto mb-4" />
            <p className="text-[rgb(var(--admin-text-secondary))]">性能趋势图表区域</p>
            <p className="text-xs text-[rgb(var(--admin-text-tertiary))] mt-2">集成图表库后显示历史数据</p>
          </div>
        </AdminCard>

        <AdminCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 text-[rgb(var(--admin-warning))]" />
            <h3 className="font-semibold text-[rgb(var(--admin-text-primary))]">最近告警</h3>
          </div>
          <div className="space-y-3">
            {ALERTS.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 bg-[rgb(var(--admin-bg-secondary))] rounded-lg">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 ${
                    alert.level === "critical" ? "bg-red-500" : alert.level === "warning" ? "bg-yellow-500" : "bg-blue-500"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm text-[rgb(var(--admin-text-primary))]">{alert.message}</p>
                  <p className="text-xs text-[rgb(var(--admin-text-tertiary))]">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

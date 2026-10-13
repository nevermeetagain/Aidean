"use client";

import { useEffect, useState } from "react";
import { Users, Box, Wrench, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "@/lib/api/client";
import { TrendChart } from "./TrendChart";

interface Stats {
  users: { total: number; today: number };
  models: { total: number };
  tools: { total: number; skills: number; mcps: number; agents: number };
  transactions: { total: number };
  evaluations: { total: number };
  trends: {
    dates: string[];
    visits: number[];
    users: number[];
    clicks: number[];
  } | null;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  color: string;
  iconBgColor: string;
}

function StatCard({ icon, label, value, subValue, trend, color, iconBgColor }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-bg-sidebar))] p-5 shadow-[var(--admin-shadow-sm)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgColor}`}>
            {icon}
          </div>
          <div>
            <div className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">{value}</div>
            <div className="text-xs text-[rgb(var(--admin-text-muted))]">{label}</div>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"
          }`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
            <span>{subValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    users: { total: 0, today: 0 },
    models: { total: 0 },
    tools: { total: 0, skills: 0, mcps: 0, agents: 0 },
    transactions: { total: 0 },
    evaluations: { total: 0 },
    trends: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<any>("/admin/stats");
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("[Stats Load Error]", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 构建趋势图数据
  const trendData = stats.trends
    ? {
        visits: stats.trends.dates.map((date, i) => ({ date: date.slice(5), value: stats.trends!.visits[i] })),
        users: stats.trends.dates.map((date, i) => ({ date: date.slice(5), value: stats.trends!.users[i] })),
        clicks: stats.trends.dates.map((date, i) => ({ date: date.slice(5), value: stats.trends!.clicks[i] })),
      }
    : null;

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" style={{ color: "rgb(var(--admin-primary))" }} />}
          label="用户总数"
          value={stats.users.total.toLocaleString()}
          subValue={`+${stats.users.today} 今日`}
          trend={stats.users.today > 0 ? "up" : "neutral"}
          color="text-[rgb(var(--admin-primary))]"
          iconBgColor="bg-[rgb(var(--admin-primary-light))]"
        />
        <StatCard
          icon={<Box className="h-5 w-5" style={{ color: "rgb(var(--admin-success))" }} />}
          label="模型总数"
          value={stats.models.total.toLocaleString()}
          color="text-[rgb(var(--admin-success))]"
          iconBgColor="bg-[rgb(var(--admin-success))]/10"
        />
        <StatCard
          icon={<Wrench className="h-5 w-5" style={{ color: "rgb(var(--admin-warning))" }} />}
          label="工具总数"
          value={stats.tools.total.toLocaleString()}
          subValue={`${stats.tools.skills} Skills, ${stats.tools.mcps} MCP, ${stats.tools.agents} Agent`}
          color="text-[rgb(var(--admin-warning))]"
          iconBgColor="bg-[rgb(var(--admin-warning))]/10"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" style={{ color: "rgb(var(--admin-purple))" }} />}
          label="交易笔数"
          value={stats.transactions.total.toLocaleString()}
          color="text-[rgb(var(--admin-purple))]"
          iconBgColor="bg-purple-50"
        />
      </div>

      {/* 趋势图表 */}
      {!loading && trendData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <TrendChart
            title="访问人数趋势 (近7天)"
            data={trendData.visits}
            color="rgb(var(--admin-primary))"
          />
          <TrendChart
            title="用户增长趋势 (近7天)"
            data={trendData.users}
            color="rgb(var(--admin-success))"
          />
          <TrendChart
            title="点击次数趋势 (近7天)"
            data={trendData.clicks}
            color="rgb(var(--admin-warning))"
          />
        </div>
      )}
    </div>
  );
}


"use client";

/**
 * IntelligenceDashboard — 智能仪表盘。
 */

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge, Button } from "@aidean/ui";

interface ReportSummary {
  totalProviders: number;
  totalModels: number;
  totalStations: number;
  pendingCandidates: number;
  newCandidates: number;
  promotedCandidates: number;
  changeEvents: number;
}

interface ReportData {
  reportDate: string;
  summary: ReportSummary;
  newProviders: Array<{ name: string; domain?: string | null; source: string }>;
  newModels: Array<{ name: string; providerName?: string }>;
  priceChanges: Array<{ entity: string; detail: Record<string, unknown> }>;
  changes: Array<{ type: string; entityName: string; detectedAt: string }>;
  trends: { providerGrowth: number; modelGrowth: number; avgPriceChange: number | null };
}

interface SnapshotRow {
  id: string;
  snapshotDate: string;
  snapshotType: string;
  providerCount: number;
  modelCount: number;
  stationCount: number;
  summary: Record<string, unknown> | null;
}

export function IntelligenceDashboard() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<SnapshotRow[]>("/api/v1/admin/intelligence/snapshots?limit=10");
      if (res.ok && res.data) {
        setSnapshots(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await adminFetch<ReportData>("/api/v1/admin/intelligence/reports", { method: "POST" });
      if (res.ok && res.data) {
        setReport(res.data);
      }
    } finally {
      setGenerating(false);
    }
  };

  const generateSnapshot = async () => {
    await adminFetch("/api/v1/admin/intelligence/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "full" }),
    });
    void fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button onClick={generateReport} disabled={generating}>
          {generating ? "生成中..." : "生成智能报告"}
        </Button>
        <Button variant="outline" onClick={generateSnapshot}>生成快照</Button>
      </div>

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="总平台数" value={report.summary.totalProviders} />
            <StatCard label="总模型数" value={report.summary.totalModels} />
            <StatCard label="新候选" value={report.summary.newCandidates} />
            <StatCard label="变更事件" value={report.summary.changeEvents} />
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="font-medium mb-2">趋势</h4>
            <div className="flex gap-6 text-sm">
              <span>平台增长: <strong className={report.trends.providerGrowth > 0 ? "text-green-600" : ""}>{report.trends.providerGrowth}</strong></span>
              <span>模型增长: <strong className={report.trends.modelGrowth > 0 ? "text-green-600" : ""}>{report.trends.modelGrowth}</strong></span>
            </div>
          </div>

          {report.newProviders.length > 0 && (
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">新发现的平台</h4>
              <div className="space-y-1">
                {report.newProviders.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{p.source}</Badge>
                    <span>{p.name}</span>
                    {p.domain && <span className="text-gray-500">{p.domain}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.changes.length > 0 && (
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-2">变更事件</h4>
              <div className="space-y-1 max-h-60 overflow-auto">
                {report.changes.slice(0, 20).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{c.type}</Badge>
                    <span>{c.entityName}</span>
                    <span className="text-gray-400">{new Date(c.detectedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border p-4">
        <h4 className="font-medium mb-2">市场快照</h4>
        {loading ? (
          <p className="text-sm text-gray-500">加载中...</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-gray-500">暂无快照</p>
        ) : (
          <div className="space-y-1">
            {snapshots.map(s => (
              <div key={s.id} className="flex items-center gap-3 text-sm border-b py-1">
                <span className="text-gray-500">{new Date(s.snapshotDate).toLocaleString()}</span>
                <Badge variant="secondary">{s.snapshotType}</Badge>
                <span>P:{s.providerCount}</span>
                <span>M:{s.modelCount}</span>
                <span>S:{s.stationCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

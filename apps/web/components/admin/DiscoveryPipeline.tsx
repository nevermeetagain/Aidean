"use client";

/**
 * DiscoveryPipeline — 发现管道控制台。
 */

import { useCallback, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge, Button } from "@aidean/ui";

interface StageStatus {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  candidatesFound?: number;
  merged?: number;
  new?: number;
  processed?: number;
  total?: number;
  error?: string;
  durationMs?: number;
}

interface PipelineResult {
  pipelineId: string;
  status: "running" | "completed" | "failed";
  stages: StageStatus[];
  startedAt: string;
  completedAt?: string;
  totalCandidates: number;
  promoted: number;
  rejected: number;
}

const SOURCES = [
  { value: "registry", label: "Registry" },
  { value: "search", label: "Search" },
  { value: "github", label: "GitHub" },
  { value: "news", label: "News" },
];

const STAGE_LABELS: Record<string, string> = {
  discovery: "候选发现",
  resolution: "实体消歧",
  fingerprint: "技术指纹",
  protocol: "协议探测",
  pricing: "价格提取",
  plan: "套餐发现",
};

export function DiscoveryPipeline() {
  const [selectedSources, setSelectedSources] = useState<string[]>(["registry", "search", "github", "news"]);
  const [dryRun, setDryRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source],
    );
  };

  const runPipeline = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await adminFetch<PipelineResult>("/api/v1/admin/discovery/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: selectedSources, dryRun }),
      });
      if (res.ok && res.data) {
        setResult(res.data);
      } else {
        setError(res.message ?? "管道执行失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "管道执行失败");
    } finally {
      setRunning(false);
    }
  }, [selectedSources, dryRun]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="font-semibold text-lg">发现管道控制台</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">数据源</label>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map(src => (
              <label key={src.value} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(src.value)}
                  onChange={() => toggleSource(src.value)}
                  className="rounded"
                />
                <span className="text-sm">{src.label}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={e => setDryRun(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Dry Run（不写入数据库）</span>
        </label>

        <Button onClick={runPipeline} disabled={running || selectedSources.length === 0}>
          {running ? "执行中..." : "触发发现管道"}
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {result && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">管道 {result.pipelineId}</h4>
            <Badge variant={result.status === "completed" ? "default" : "destructive"}>
              {result.status}
            </Badge>
          </div>

          <div className="space-y-2">
            {result.stages.map(stage => (
              <div key={stage.name} className="flex items-center gap-3 text-sm">
                <span className="w-24">{STAGE_LABELS[stage.name] ?? stage.name}</span>
                <Badge variant={
                  stage.status === "completed" ? "default" :
                  stage.status === "failed" ? "destructive" :
                  stage.status === "running" ? "secondary" : "secondary"
                }>
                  {stage.status}
                </Badge>
                {stage.candidatesFound !== undefined && (
                  <span className="text-gray-500">发现 {stage.candidatesFound}</span>
                )}
                {stage.merged !== undefined && (
                  <span className="text-gray-500">合并 {stage.merged} / 新增 {stage.new}</span>
                )}
                {stage.processed !== undefined && (
                  <span className="text-gray-500">处理 {stage.processed}/{stage.total}</span>
                )}
                {stage.durationMs !== undefined && (
                  <span className="text-gray-400">{(stage.durationMs / 1000).toFixed(1)}s</span>
                )}
                {stage.error && (
                  <span className="text-red-500">{stage.error}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4 text-sm border-t pt-2">
            <span>总候选: <strong>{result.totalCandidates}</strong></span>
            <span className="text-green-600">升级: <strong>{result.promoted}</strong></span>
            <span className="text-red-500">拒绝: <strong>{result.rejected}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

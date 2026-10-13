"use client";

/**
 * CapabilityMatrix — 能力矩阵展示。
 */

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge } from "@aidean/ui";

interface CapabilityRow {
  id: string;
  modelId: string;
  capability: string;
  supported: boolean;
  source: string;
  confidence: number;
  maxContextLength: number | null;
}

const CAPABILITIES = [
  "function_calling", "vision", "reasoning", "structured_output",
  "prompt_caching", "code_execution", "web_search", "long_context",
];

export function CapabilityMatrix() {
  const [rows, setRows] = useState<CapabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCapabilities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ rows: CapabilityRow[] }>("/api/v1/admin/capabilities?pageSize=200");
      if (res.ok && res.data) {
        setRows(res.data.rows);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCapabilities(); }, [fetchCapabilities]);

  const modelGroups = new Map<string, CapabilityRow[]>();
  for (const row of rows) {
    if (!modelGroups.has(row.modelId)) modelGroups.set(row.modelId, []);
    modelGroups.get(row.modelId)!.push(row);
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-gray-500">加载中...</p>
      ) : modelGroups.size === 0 ? (
        <p className="text-sm text-gray-500">暂无能力数据</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Model ID</th>
                {CAPABILITIES.map(c => (
                  <th key={c} className="text-center p-2 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(modelGroups.entries()).map(([modelId, modelRows]) => (
                <tr key={modelId} className="border-b">
                  <td className="p-2 font-mono text-xs">{modelId}</td>
                  {CAPABILITIES.map(cap => {
                    const row = modelRows.find(r => r.capability === cap);
                    return (
                      <td key={cap} className="text-center p-2">
                        {row ? (
                          <Badge variant={row.supported ? "default" : "destructive"}>
                            {row.supported ? "✓" : "✗"}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

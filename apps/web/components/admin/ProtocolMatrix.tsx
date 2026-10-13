"use client";

/**
 * ProtocolMatrix — 协议兼容性矩阵展示。
 */

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge } from "@aidean/ui";

interface ProtocolRow {
  id: string;
  entityType: string;
  entityId: string;
  protocol: string;
  supported: boolean;
  probeMethod: string | null;
  confidence: number;
  probedAt: string;
}

const PROTOCOLS = [
  "openai_chat", "openai_responses", "anthropic_messages",
  "streaming", "tool_calling", "structured_output",
  "vision", "audio", "pdf", "reasoning", "mcp",
];

export function ProtocolMatrix() {
  const [rows, setRows] = useState<ProtocolRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ rows: ProtocolRow[] }>("/api/v1/admin/protocols?pageSize=200");
      if (res.ok && res.data) {
        setRows(res.data.rows);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProtocols(); }, [fetchProtocols]);

  const entityGroups = new Map<string, ProtocolRow[]>();
  for (const row of rows) {
    const key = `${row.entityType}:${row.entityId}`;
    if (!entityGroups.has(key)) entityGroups.set(key, []);
    entityGroups.get(key)!.push(row);
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-gray-500">加载中...</p>
      ) : entityGroups.size === 0 ? (
        <p className="text-sm text-gray-500">暂无协议兼容数据</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Entity</th>
                {PROTOCOLS.map(p => (
                  <th key={p} className="text-center p-2 whitespace-nowrap">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(entityGroups.entries()).map(([key, entityRows]) => (
                <tr key={key} className="border-b">
                  <td className="p-2 font-mono text-xs">{key}</td>
                  {PROTOCOLS.map(proto => {
                    const row = entityRows.find(r => r.protocol === proto);
                    return (
                      <td key={proto} className="text-center p-2">
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

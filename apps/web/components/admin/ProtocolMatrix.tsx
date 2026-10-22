"use client";

/**
 * ProtocolMatrix — 协议兼容性矩阵展示。
 *
 * B11-03（参考接入）：五态由 PanelState 外壳承载（失败渲染 error+重试，不再误显空态）；
 * 列来自 MATRIX_PROTOCOLS（= Prisma enum ModelProtocol，与 ai_models.protocol 同源）。
 * 表格规范化 / 增删改 UI 属 B11-03b 后续批（见 EVD-B11-03/handoff.md）。
 */

import { adminFetch } from "./adminFetch";
import { Badge } from "@aidean/ui";
import { PanelState, usePanelResource } from "./PanelState";
import { MATRIX_PROTOCOLS } from "../../lib/features/admin/matrix/constants";

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

const PROTOCOLS = MATRIX_PROTOCOLS;

/** 列表端点 pageSize 服务端封顶 100（WC#8），此处按上限请求 */
export const PROTOCOL_LIST_URL = "/api/v1/admin/protocols?pageSize=100";

export const loadProtocols = (signal?: AbortSignal) =>
  adminFetch<{ rows: ProtocolRow[] }>(PROTOCOL_LIST_URL, { signal });

export function ProtocolMatrix() {
  const { resource, reload } = usePanelResource(loadProtocols, (d) => d.rows.length === 0);

  return (
    <PanelState testId="admin-protocols" resource={resource} onRetry={reload} emptyText="暂无协议兼容数据">
      {(data) => <ProtocolTable rows={data.rows} />}
    </PanelState>
  );
}

function ProtocolTable({ rows }: { rows: ProtocolRow[] }) {
  const entityGroups = new Map<string, ProtocolRow[]>();
  for (const row of rows) {
    const key = `${row.entityType}:${row.entityId}`;
    if (!entityGroups.has(key)) entityGroups.set(key, []);
    entityGroups.get(key)!.push(row);
  }

  return (
    <div className="space-y-4">
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
    </div>
  );
}

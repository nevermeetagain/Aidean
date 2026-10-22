"use client";

/**
 * CandidateManager — 发现候选管理。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge, Button, Dialog } from "@aidean/ui";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { PanelState, usePanelResource } from "./PanelState";
import { panelTestIds } from "../../lib/admin/panel-resource";

export interface CandidateRow {
  id: string;
  candidateType: string;
  name: string;
  domain: string | null;
  apiBase: string | null;
  sourceType: string;
  status: string;
  discoveredAt: string;
  evidence?: Array<{ id: string; evidenceType: string; claim: string; confidence: number }>;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  discovered: "secondary",
  verifying: "secondary",
  verified: "default",
  promoted: "default",
  rejected: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  discovered: "已发现",
  verifying: "验证中",
  verified: "已验证",
  promoted: "已升级",
  rejected: "已拒绝",
};

/** 列表数据形状（信封 data） */
export type CandidatesListData = { rows: CandidateRow[]; total: number };

/** 五态外壳 testid 前缀（B11-05） */
export const CANDIDATES_PANEL_PREFIX = "admin-discovery-candidates";

export const CANDIDATES_PAGE_SIZE = 20;

export function buildCandidatesUrl(page = 1, status = "", type = ""): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(CANDIDATES_PAGE_SIZE) });
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  return `/api/v1/admin/discovery/candidates?${params}`;
}

/** 首屏地址（单测锁定 loader 无参调用的请求 URL，与改造前完全一致） */
export const CANDIDATES_LIST_URL = buildCandidatesUrl();

export const loadCandidates = (signal?: AbortSignal, page = 1, status = "", type = "") =>
  adminFetch<CandidatesListData>(buildCandidatesUrl(page, status, type), { signal });

export function CandidateManager() {
  const ids = panelTestIds(CANDIDATES_PANEL_PREFIX);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<CandidateRow | null>(null);

  const loader = useCallback(
    (signal: AbortSignal) => loadCandidates(signal, page, statusFilter, typeFilter),
    [page, statusFilter, typeFilter],
  );
  const { resource, reload, refresh } = usePanelResource(loader, (d) => d.rows.length === 0);

  // 筛选/翻页才重新取数：以查询签名比对（StrictMode 下 effect 双跑也不会重复请求）
  const signature = `${statusFilter}|${typeFilter}|${page}`;
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    reload();
  }, [signature, reload]);

  const promote = async (id: string, targetType: "ModelProvider" | "APIStation") => {
    await adminFetch(`/api/v1/admin/discovery/candidates/${id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType }),
    });
    refresh();
  };

  const columns: Column<CandidateRow>[] = [
    { key: "name", header: "名称" },
    { key: "candidateType", header: "类型" },
    { key: "domain", header: "域名" },
    { key: "sourceType", header: "来源" },
    {
      key: "status",
      header: "状态",
      render: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status] ?? "secondary"}>
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "操作",
      render: (row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setSelected(row)}>详情</Button>
          {row.status === "verified" && (
            <Button size="sm" onClick={() => void promote(row.id, "ModelProvider")}>升级</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">全部状态</option>
          <option value="discovered">已发现</option>
          <option value="verifying">验证中</option>
          <option value="verified">已验证</option>
          <option value="promoted">已升级</option>
          <option value="rejected">已拒绝</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">全部类型</option>
          <option value="provider">Provider</option>
          <option value="gateway">Gateway</option>
          <option value="model">Model</option>
          <option value="tool">Tool</option>
        </select>
      </div>

      <PanelState testId={ids.root} resource={resource} onRetry={reload} emptyText="暂无发现候选">
        {(d) => (
          <AdminDataTable
            columns={columns}
            rows={d.rows}
            rowKey={(row) => row.id}
            rowTestId={(row) => `${ids.root}-row-${row.id}`}
            page={page}
            total={d.total}
            onPageChange={setPage}
          />
        )}
      </PanelState>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "候选详情"}
        className="max-w-2xl"
        footer={
          <>
            {selected?.status === "verified" && (
              <>
                <Button onClick={() => void promote(selected.id, "ModelProvider")}>升级为 Provider</Button>
                <Button variant="outline" onClick={() => void promote(selected.id, "APIStation")}>升级为 Station</Button>
              </>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>关闭</Button>
          </>
        }
      >
        {selected && (
          <div className="max-h-[60vh] overflow-auto">
            <dl className="space-y-2 text-sm">
              <div><dt className="inline font-medium">类型: </dt><dd className="inline">{selected.candidateType}</dd></div>
              <div><dt className="inline font-medium">域名: </dt><dd className="inline">{selected.domain ?? "—"}</dd></div>
              <div><dt className="inline font-medium">API Base: </dt><dd className="inline">{selected.apiBase ?? "—"}</dd></div>
              <div><dt className="inline font-medium">来源: </dt><dd className="inline">{selected.sourceType}</dd></div>
              <div><dt className="inline font-medium">状态: </dt><dd className="inline">{selected.status}</dd></div>
              <div><dt className="inline font-medium">发现时间: </dt><dd className="inline">{new Date(selected.discoveredAt).toLocaleString()}</dd></div>
            </dl>

            {selected.evidence && selected.evidence.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">证据链</h4>
                <div className="space-y-2">
                  {selected.evidence.map(ev => (
                    <div key={ev.id} className="border rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{ev.evidenceType}</Badge>
                        <span className="text-slate-500">置信度: {(ev.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <p className="mt-1">{ev.claim}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}

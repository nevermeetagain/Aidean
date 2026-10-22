"use client";

/**
 * CapabilityMatrix — 能力矩阵（B11-03b · L2-G）。
 *
 * 五态走 PanelState（不再自写 loading state），表格走 MatrixPanel：
 * - 列 = MATRIX_CAPABILITIES（维度真源，本地字符串数组已删除）；行 = modelId 分组
 * - 筛选 = source（值域 CAPABILITY_SOURCES，默认全部）+ modelId 子串检索（300ms 防抖）
 * - 分页 = page + pageSize=50（原 pageSize=200 会被服务端钳到 100，看不到全量）
 * - 交互 = 格子 PATCH {supported} 乐观更新（失败回滚并显示 message）+ POST 新建 + ConfirmDialog 删除
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge, Button, Dialog, Input, Label, Select } from "@aidean/ui";
import { PanelState, usePanelResource } from "./PanelState";
import { ConfirmDialog } from "./ConfirmDialog";
import { MATRIX_PAGE_SIZE, MatrixPanel, type MatrixColumn } from "./MatrixPanel";
import {
  CAPABILITY_SOURCES,
  MATRIX_CAPABILITIES,
  type CapabilitySource,
  type MatrixCapability,
} from "../../lib/features/admin/matrix/constants";

interface CapabilityRow {
  id: string;
  modelId: string;
  capability: string;
  supported: boolean;
  source: string;
  confidence: number;
  maxContextLength: number | null;
}

interface ListData {
  rows: CapabilityRow[];
  total: number;
}

interface ModelGroup {
  key: string;
  cells: Record<string, CapabilityRow>;
}

/** 空串 = 不筛选来源（与后端 `source ? {...} : {}` 口径一致） */
export type CapabilitySourceFilter = CapabilitySource | "";

export const buildCapabilityUrl = (page = 1, source: CapabilitySourceFilter = "", modelId = "") => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(MATRIX_PAGE_SIZE) });
  if (source) params.set("source", source);
  if (modelId) params.set("modelId", modelId);
  return `/api/v1/admin/capabilities?${params}`;
};

/** 首屏地址（单测锁定 loader 无参调用的请求 URL） */
export const CAPABILITY_LIST_URL = buildCapabilityUrl();

export const loadCapabilities = (
  signal?: AbortSignal,
  page = 1,
  source: CapabilitySourceFilter = "",
  modelId = "",
) => adminFetch<ListData>(buildCapabilityUrl(page, source, modelId), { signal });

function groupByModel(rows: CapabilityRow[]): ModelGroup[] {
  const groups = new Map<string, ModelGroup>();
  for (const row of rows) {
    let g = groups.get(row.modelId);
    if (!g) {
      g = { key: row.modelId, cells: {} };
      groups.set(row.modelId, g);
    }
    g.cells[row.capability] = row;
  }
  return [...groups.values()];
}

const COLUMNS: MatrixColumn[] = [
  { key: "model", label: "Model ID" },
  ...MATRIX_CAPABILITIES.map((c) => ({ key: c as string, label: c as string })),
];

export function CapabilityMatrix() {
  const [page, setPage] = useState(1);
  const [source, setSource] = useState<CapabilitySourceFilter>("");
  const [modelIdInput, setModelIdInput] = useState("");
  const [modelId, setModelId] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CapabilityRow | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const loader = useCallback(
    (signal: AbortSignal) => loadCapabilities(signal, page, source, modelId),
    [page, source, modelId],
  );
  const { resource, reload, refresh, setResource } = usePanelResource(loader, (d) => d.rows.length === 0);

  // 搜索框防抖：停止输入 300ms 才落到查询条件（同值 setState 由 React 短路，不会多发请求）
  useEffect(() => {
    const t = setTimeout(() => {
      setModelId(modelIdInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [modelIdInput]);

  // 筛选/翻页才重新取数：签名比对，StrictMode 下 effect 双跑也不会重复请求
  const signature = `${source}|${modelId}|${page}`;
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    reload();
  }, [signature, reload]);

  async function toggleSupported(rec: CapabilityRow) {
    if (resource.status !== "ready") return;
    const prev = resource.data;
    const next = !rec.supported;
    const patch = (rows: CapabilityRow[]) =>
      rows.map((r) => (r.id === rec.id ? { ...r, supported: next } : r));
    setResource({ status: "ready", data: { ...prev, rows: patch(prev.rows) } });
    const res = await adminFetch<CapabilityRow>(`/api/v1/admin/capabilities/${rec.id}`, {
      method: "PATCH",
      body: JSON.stringify({ supported: next }),
    });
    if (res.ok) {
      setNotice({ kind: "ok", text: `${rec.modelId} 的 ${rec.capability} 已切换为${next ? "支持" : "不支持"}` });
    } else {
      setResource({ status: "ready", data: prev });
      setNotice({ kind: "error", text: res.message ?? "切换失败，已回滚" });
    }
  }

  async function confirmDelete() {
    const rec = pendingDelete;
    if (!rec) return;
    setPendingDelete(null);
    const res = await adminFetch(`/api/v1/admin/capabilities/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      setNotice({ kind: "ok", text: "能力记录已删除" });
      refresh();
    } else {
      setNotice({ kind: "error", text: res.message ?? "删除失败" });
    }
  }

  return (
    <>
      <PanelState
        testId="admin-capabilities"
        resource={resource}
        onRetry={reload}
        emptyText="暂无能力数据"
        emptyAction={
          <Button data-testid="admin-capabilities-create" size="sm" onClick={() => setCreating(true)}>
            新建
          </Button>
        }
      >
        {(data) => (
          <div className="space-y-2">
            {notice ? (
              <p
                role={notice.kind === "error" ? "alert" : "status"}
                data-testid="admin-capabilities-notice"
                className={
                  notice.kind === "error"
                    ? "rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700"
                    : "rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600"
                }
              >
                {notice.text}
              </p>
            ) : null}

            <MatrixPanel
              testId="admin-capabilities"
              columns={COLUMNS}
              rows={groupByModel(data.rows)}
              rowKey={(g) => g.key}
              page={page}
              total={data.total}
              onPageChange={setPage}
              filters={
                <>
                  <Label className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">来源</span>
                    <Select
                      data-testid="admin-capabilities-filter-source"
                      size="sm"
                      className="w-32"
                      value={source}
                      onChange={(e) => {
                        setSource(e.target.value as CapabilitySourceFilter);
                        setPage(1);
                      }}
                    >
                      <option value="">全部</option>
                      {CAPABILITY_SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </Label>
                  <Label className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Model ID</span>
                    <Input
                      data-testid="admin-capabilities-filter-model-id"
                      type="search"
                      className="h-8 w-56 text-xs"
                      value={modelIdInput}
                      placeholder="UUID 片段…"
                      onChange={(e) => setModelIdInput(e.target.value)}
                    />
                  </Label>
                </>
              }
              toolbar={
                <Button data-testid="admin-capabilities-create" size="sm" onClick={() => setCreating(true)}>
                  新建
                </Button>
              }
              renderCell={(g, key) => {
                if (key === "model") {
                  return <span className="font-mono text-xs">{g.key}</span>;
                }
                const rec = g.cells[key];
                if (!rec) {
                  return <span className="text-slate-400">—</span>;
                }
                return (
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      data-testid={`admin-capabilities-toggle-${rec.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      title="点击切换 supported"
                      onClick={() => void toggleSupported(rec)}
                    >
                      <Badge variant={rec.supported ? "default" : "destructive"}>
                        {rec.supported ? "✓" : "✗"}
                      </Badge>
                      <span className="text-[10px] text-slate-400">{Math.round(rec.confidence * 100)}%</span>
                    </Button>
                    <Button
                      data-testid={`admin-capabilities-delete-${rec.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-[var(--danger)]"
                      onClick={() => setPendingDelete(rec)}
                    >
                      删除
                    </Button>
                  </div>
                );
              }}
            />
          </div>
        )}
      </PanelState>

      {/* 弹窗条件挂载：Dialog 含 useEffect，@aidean/ui 在 node 单测下是第二份 React 副本（handoff §四） */}
      {creating ? (
        <CapabilityCreateDialog
          open
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setNotice({ kind: "ok", text: "能力记录已写入（同 (modelId, capability, source) 为覆盖）" });
            refresh();
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          open
          title="确认删除"
          message={`确认删除 ${pendingDelete.modelId} 的 ${pendingDelete.capability}（来源 ${pendingDelete.source}）能力记录？`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}

/** 新建（POST upsert）：字段严格对齐 CapabilityCreateSchema（strict，未知键 40000） */
function CapabilityCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formModelId, setFormModelId] = useState("");
  const [capability, setCapability] = useState<MatrixCapability>(MATRIX_CAPABILITIES[0]);
  const [supported, setSupported] = useState(true);
  const [formSource, setFormSource] = useState<CapabilitySource>("official");
  const [confidence, setConfidence] = useState("0.8");
  const [maxContext, setMaxContext] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const conf = Number(confidence);
    if (Number.isNaN(conf) || conf < 0 || conf > 1) {
      setError("置信度须为 0–1 之间的数值");
      return;
    }
    const trimmed = maxContext.trim();
    const mcl = trimmed === "" ? undefined : Number(trimmed);
    if (mcl !== undefined && (!Number.isInteger(mcl) || mcl <= 0)) {
      setError("最大上下文长度须为正整数（留空表示不限）");
      return;
    }
    setSubmitting(true);
    const res = await adminFetch<CapabilityRow>("/api/v1/admin/capabilities", {
      method: "POST",
      body: JSON.stringify({
        modelId: formModelId.trim(),
        capability,
        supported,
        source: formSource,
        confidence: conf,
        ...(mcl === undefined ? {} : { maxContextLength: mcl }),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setFormModelId("");
      setMaxContext("");
      onCreated();
    } else {
      setError(res.message ?? "创建失败");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="新建能力记录">
      <form onSubmit={submit} className="space-y-3" data-testid="admin-capabilities-form">
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Model ID *（模型主键 UUID）</span>
          <Input
            data-testid="admin-capabilities-form-model-id"
            value={formModelId}
            onChange={(e) => setFormModelId(e.target.value)}
            placeholder="0192f0c4-…"
            required
          />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">能力维度 *</span>
            <Select
              data-testid="admin-capabilities-form-capability"
              value={capability}
              onChange={(e) => setCapability(e.target.value as MatrixCapability)}
            >
              {MATRIX_CAPABILITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Label>
          <Label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">来源 *</span>
            <Select
              data-testid="admin-capabilities-form-source"
              value={formSource}
              onChange={(e) => setFormSource(e.target.value as CapabilitySource)}
            >
              {CAPABILITY_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Label>
          <Label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">是否支持</span>
            <Select value={String(supported)} onChange={(e) => setSupported(e.target.value === "true")}>
              <option value="true">支持</option>
              <option value="false">不支持</option>
            </Select>
          </Label>
          <Label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">置信度 0–1</span>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
            />
          </Label>
        </div>
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">最大上下文长度（正整数，可空）</span>
          <Input
            type="number"
            min={1}
            step={1}
            value={maxContext}
            onChange={(e) => setMaxContext(e.target.value)}
            placeholder="例如 128000"
          />
        </Label>
        {error ? (
          <p role="alert" data-testid="admin-capabilities-form-error" className="text-xs text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          {/* 表单内提交按钮必须显式 type="submit"（Button 默认 type="button"） */}
          <Button type="submit" size="sm" data-testid="admin-capabilities-form-submit" disabled={submitting}>
            {submitting ? "提交中…" : "创建"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

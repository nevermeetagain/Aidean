"use client";

/**
 * ProtocolMatrix — 协议兼容性矩阵（B11-03b · L2-F）。
 *
 * 结构：五态由 PanelState 承载（口径不变），表格走 MatrixPanel（@aidean/ui Table*，无原生表格标签）。
 * - 列 = MATRIX_PROTOCOLS（与 Prisma enum ModelProtocol 同源，禁再写字符串数组）；行 = entityType:entityId 实体分组
 * - 筛选 = entityType（默认 vendor：全表 ~1033 行，vendor 约 33 行首屏可读）
 * - 分页 = page + pageSize=50，页数由信封 data.total 反算
 * - 格子点击 = PATCH {supported} 乐观更新，失败回滚并显示服务端 message
 * - 新建 = POST（upsert 语义，同 (entityType,entityId,protocol) 覆盖）；删除 = ConfirmDialog → DELETE
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Badge, Button, Dialog, Input, Label, Select } from "@aidean/ui";
import { PanelState, usePanelResource } from "./PanelState";
import { ConfirmDialog } from "./ConfirmDialog";
import { MATRIX_PAGE_SIZE, MatrixPanel, type MatrixColumn } from "./MatrixPanel";
import {
  MATRIX_ENTITY_TYPES,
  MATRIX_PROTOCOLS,
  type MatrixEntityType,
  type MatrixProtocol,
} from "../../lib/features/admin/matrix/constants";

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

interface ListData {
  rows: ProtocolRow[];
  total: number;
}

/** 一个实体一行，cells 按协议名索引（缺项显示占位符） */
interface EntityGroup {
  key: string;
  entityType: string;
  entityId: string;
  cells: Record<string, ProtocolRow>;
}

/** 默认视图口径：vendor 维度（handoff §一 数据量建议） */
export const DEFAULT_ENTITY_TYPE: MatrixEntityType = "vendor";

export const buildProtocolUrl = (page = 1, entityType: string = DEFAULT_ENTITY_TYPE) =>
  `/api/v1/admin/protocols?page=${page}&pageSize=${MATRIX_PAGE_SIZE}&entityType=${entityType}`;

/** 首屏 URL（单测锁定 loader 无参调用时的请求地址） */
export const PROTOCOL_LIST_URL = buildProtocolUrl();

export const loadProtocols = (signal?: AbortSignal, page = 1, entityType: string = DEFAULT_ENTITY_TYPE) =>
  adminFetch<ListData>(buildProtocolUrl(page, entityType), { signal });

function groupByEntity(rows: ProtocolRow[]): EntityGroup[] {
  const groups = new Map<string, EntityGroup>();
  for (const row of rows) {
    const key = `${row.entityType}:${row.entityId}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, entityType: row.entityType, entityId: row.entityId, cells: {} };
      groups.set(key, g);
    }
    g.cells[row.protocol] = row;
  }
  return [...groups.values()];
}

const COLUMNS: MatrixColumn[] = [
  { key: "entity", label: "实体" },
  ...MATRIX_PROTOCOLS.map((p) => ({ key: p as string, label: p as string })),
];

export function ProtocolMatrix() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<MatrixEntityType>(DEFAULT_ENTITY_TYPE);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProtocolRow | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const loader = useCallback(
    (signal: AbortSignal) => loadProtocols(signal, page, entityType),
    [page, entityType],
  );
  const { resource, reload, refresh, setResource } = usePanelResource(loader, (d) => d.rows.length === 0);

  // 筛选/翻页才重新取数：以查询签名比对（StrictMode 下 effect 双跑也不会重复请求）
  const signature = `${entityType}|${page}`;
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    reload();
  }, [signature, reload]);

  async function toggleSupported(rec: ProtocolRow) {
    if (resource.status !== "ready") return;
    const prev = resource.data;
    const next = !rec.supported;
    const patch = (rows: ProtocolRow[]) =>
      rows.map((r) => (r.id === rec.id ? { ...r, supported: next } : r));
    setResource({ status: "ready", data: { ...prev, rows: patch(prev.rows) } });
    const res = await adminFetch<ProtocolRow>(`/api/v1/admin/protocols/${rec.id}`, {
      method: "PATCH",
      body: JSON.stringify({ supported: next }),
    });
    if (res.ok) {
      setNotice({ kind: "ok", text: `${rec.entityType}:${rec.entityId} 的 ${rec.protocol} 已切换为${next ? "支持" : "不支持"}` });
    } else {
      setResource({ status: "ready", data: prev });
      setNotice({ kind: "error", text: res.message ?? "切换失败，已回滚" });
    }
  }

  async function confirmDelete() {
    const rec = pendingDelete;
    if (!rec) return;
    setPendingDelete(null);
    const res = await adminFetch(`/api/v1/admin/protocols/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      setNotice({ kind: "ok", text: "协议兼容记录已删除" });
      refresh();
    } else {
      setNotice({ kind: "error", text: res.message ?? "删除失败" });
    }
  }

  return (
    <>
      <PanelState
        testId="admin-protocols"
        resource={resource}
        onRetry={reload}
        emptyText="暂无协议兼容数据"
        emptyAction={
          <Button data-testid="admin-protocols-create" size="sm" onClick={() => setCreating(true)}>
            新建
          </Button>
        }
      >
        {(data) => (
          <div className="space-y-2">
            {notice ? (
              <p
                role={notice.kind === "error" ? "alert" : "status"}
                data-testid="admin-protocols-notice"
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
              testId="admin-protocols"
              columns={COLUMNS}
              rows={groupByEntity(data.rows)}
              rowKey={(g) => g.key}
              page={page}
              total={data.total}
              onPageChange={setPage}
              filters={
                <Label className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">实体类型</span>
                  <Select
                    data-testid="admin-protocols-filter-entity-type"
                    size="sm"
                    className="w-32"
                    value={entityType}
                    onChange={(e) => {
                      setEntityType(e.target.value as MatrixEntityType);
                      setPage(1);
                    }}
                  >
                    {MATRIX_ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Label>
              }
              toolbar={
                <Button data-testid="admin-protocols-create" size="sm" onClick={() => setCreating(true)}>
                  新建
                </Button>
              }
              renderCell={(g, key) => {
                if (key === "entity") {
                  return (
                    <span className="font-mono text-xs" title={`${g.entityType} / ${g.entityId}`}>
                      {g.key}
                    </span>
                  );
                }
                const rec = g.cells[key];
                if (!rec) {
                  return (
                    <span data-testid={`admin-protocols-absent-${g.key}-${key}`} className="text-slate-300">
                      —
                    </span>
                  );
                }
                return (
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      data-testid={`admin-protocols-toggle-${rec.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      title="点击切换 supported"
                      onClick={() => void toggleSupported(rec)}
                    >
                      <Badge variant={rec.supported ? "default" : "destructive"}>
                        {rec.supported ? "✓" : "✗"}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {Math.round(rec.confidence * 100)}%
                      </span>
                    </Button>
                    <Button
                      data-testid={`admin-protocols-delete-${rec.id}`}
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

      {/* 弹窗条件挂载：Dialog 内含 useEffect，而 @aidean/ui 在 node 单测下是第二份 React 副本
          （见 EVD-B11-03/handoff.md §四），首屏若静态渲染会让 renderToStaticMarkup 抛 Invalid hook call */}
      {creating ? (
        <ProtocolCreateDialog
          open
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setNotice({ kind: "ok", text: "协议兼容记录已写入（同键为覆盖）" });
            refresh();
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          open
          title="确认删除"
          message={`确认删除 ${pendingDelete.entityType}:${pendingDelete.entityId} 的 ${pendingDelete.protocol} 兼容记录？`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}

/** 新建（POST upsert）：字段严格对齐 ProtocolCreateSchema（strict，未知键 40000） */
function ProtocolCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formEntityType, setFormEntityType] = useState<MatrixEntityType>("vendor");
  const [entityId, setEntityId] = useState("");
  const [protocol, setProtocol] = useState<MatrixProtocol>(MATRIX_PROTOCOLS[0]);
  const [supported, setSupported] = useState(true);
  const [confidence, setConfidence] = useState("0.8");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = Number(confidence);
    if (Number.isNaN(num) || num < 0 || num > 1) {
      setError("置信度须为 0–1 之间的数值");
      return;
    }
    setSubmitting(true);
    const res = await adminFetch<ProtocolRow>("/api/v1/admin/protocols", {
      method: "POST",
      body: JSON.stringify({
        entityType: formEntityType,
        entityId: entityId.trim(),
        protocol,
        supported,
        confidence: num,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setEntityId("");
      onCreated();
    } else {
      setError(res.message ?? "创建失败");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="新建协议兼容记录">
      <form onSubmit={submit} className="space-y-3" data-testid="admin-protocols-form">
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">实体类型 *</span>
          <Select
            data-testid="admin-protocols-form-entity-type"
            value={formEntityType}
            onChange={(e) => setFormEntityType(e.target.value as MatrixEntityType)}
          >
            {MATRIX_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Label>
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">实体 ID *（对应实体的主键 UUID）</span>
          <Input
            data-testid="admin-protocols-form-entity-id"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="0192f0c4-…"
            required
          />
        </Label>
        <Label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">协议 *</span>
          <Select
            data-testid="admin-protocols-form-protocol"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as MatrixProtocol)}
          >
            {MATRIX_PROTOCOLS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Label>
        <div className="grid grid-cols-2 gap-3">
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
        {error ? (
          <p role="alert" data-testid="admin-protocols-form-error" className="text-xs text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          {/* 表单内提交按钮必须显式 type="submit"（Button 默认 type="button"） */}
          <Button type="submit" size="sm" data-testid="admin-protocols-form-submit" disabled={submitting}>
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

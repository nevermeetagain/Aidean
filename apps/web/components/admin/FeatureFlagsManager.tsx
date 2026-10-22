"use client";

/**
 * FeatureFlagsManager — 后台功能开关管理（TASK-018 / 需求 §3.9 / 契约⑥「后台·功能开关」）。
 *
 * 读 GET /api/v1/admin/feature-flags（→ { items }），改 PATCH /api/v1/admin/feature-flags/[id]（→ { isEnabled }）。
 * - 复用规范组件：AdminDataTable（表格）+ Button（启停）+ ConfirmDialog（关闭核心开关 gateway.chat 二次确认）。
 *   @aidean/ui 无 Switch，沿用同域 OidcClientsManager 的「Button 启停」范式（风格统一、不引入新组件）。
 * - 五态锚点（data-testid，e2e TASK-019 断言基准）：flags-loading / flags-empty / flags-error / flags-saved；
 *   flags-forbidden 由 RSC 页（无 admin.configs.read → redirect /admin）承担，本组件不呈现。
 * - canWrite=false → 只读（隐藏操作列）；保存后服务端 revalidateTag("feature-flags") 使前台即时生效。
 */
import { useCallback, useEffect, useState } from "react";

import type { AdminFeatureFlag } from "@aidean/shared";
import { Button } from "@aidean/ui";

import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { adminFetch } from "./adminFetch";

/** 关闭前需二次确认的核心开关（网关对话，影响全站对话能力）。 */
const CORE_FLAG_ON_DISABLE = "gateway.chat";

function fmtUpdatedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 16).replace("T", " ");
}

export function FeatureFlagsManager({ canWrite = false }: { canWrite?: boolean }) {
  const [rows, setRows] = useState<AdminFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDisable, setPendingDisable] = useState<AdminFeatureFlag | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminFetch<{ items: AdminFeatureFlag[] }>("/api/v1/admin/feature-flags");
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
    } else {
      setError(res.message ?? "加载失败，请重试");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyToggle(flag: AdminFeatureFlag, nextEnabled: boolean) {
    setBusy(true);
    setSaved(null);
    const res = await adminFetch<AdminFeatureFlag>(`/api/v1/admin/feature-flags/${flag.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isEnabled: nextEnabled }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved("已保存，前台即时生效");
      await load();
    } else {
      setError(res.message ?? "加载失败，请重试");
    }
  }

  function onToggle(flag: AdminFeatureFlag) {
    // 关闭核心开关 gateway.chat → ConfirmDialog 二次确认；其余即时切换（幂等 PATCH）。
    if (flag.flagCode === CORE_FLAG_ON_DISABLE && flag.isEnabled) {
      setPendingDisable(flag);
      return;
    }
    void applyToggle(flag, !flag.isEnabled);
  }

  const columns: Column<AdminFeatureFlag>[] = [
    {
      key: "flag",
      header: "功能",
      className: "px-3 py-2",
      render: (f) => (
        <div>
          <div className="text-slate-800">{f.nameCn || f.name}</div>
          <div className="text-xs text-slate-500">
            {f.flagCode}
            {f.description ? ` · ${f.description}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "类目",
      className: "px-3 py-2 text-xs text-slate-600",
      render: (f) => <span>{f.category ?? "—"}</span>,
    },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: (f) => (
        <span
          data-testid={`flag-status-${f.flagCode}`}
          className={f.isEnabled ? "font-medium text-emerald-700" : "text-slate-500"}
        >
          {f.isEnabled ? "启用" : "停用"}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "更新时间",
      className: "px-3 py-2 text-xs tabular-nums text-slate-500",
      render: (f) => <span>{fmtUpdatedAt(f.updatedAt)}</span>,
    },
    ...(canWrite
      ? ([
          {
            key: "actions",
            header: "操作",
            className: "px-3 py-2",
            render: (f: AdminFeatureFlag) => (
              <Button
                data-testid={`flag-toggle-${f.flagCode}`}
                variant={f.isEnabled ? "danger" : "primary"}
                size="sm"
                disabled={busy}
                onClick={() => onToggle(f)}
              >
                {f.isEnabled ? "停用" : "启用"}
              </Button>
            ),
          },
        ] as Column<AdminFeatureFlag>[])
      : []),
  ];

  return (
    <div className="space-y-3">
      {/* 状态区（契约⑥五态内联锚点；role=status 便于无障碍/e2e） */}
      {saved && !error ? (
        <p
          role="status"
          data-testid="flags-saved"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
        >
          {saved}
        </p>
      ) : null}
      {error ? (
        <div
          role="status"
          data-testid="flags-error"
          className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
            重试
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p
          data-testid="flags-loading"
          className="rounded-lg border border-slate-200 bg-white px-3 py-8 text-center text-sm text-slate-400"
        >
          <span className="inline-flex animate-pulse items-center gap-2">加载中…</span>
        </p>
      ) : rows.length === 0 ? (
        <p
          data-testid="flags-empty"
          className="rounded-lg border border-slate-200 bg-white px-3 py-8 text-center text-sm text-slate-500"
        >
          暂无功能开关（请运行种子）
        </p>
      ) : (
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(f) => f.id}
          emptyText="暂无功能开关（请运行种子）"
          busy={busy}
        />
      )}

      <ConfirmDialog
        open={!!pendingDisable}
        variant="danger"
        title="确认关闭网关对话"
        message="关闭「网关对话（gateway.chat）」将立即对所有用户停用统一网关对话能力，确认关闭？"
        confirmLabel="确认关闭"
        cancelLabel="取消"
        onConfirm={() => {
          const flag = pendingDisable;
          setPendingDisable(null);
          if (flag) void applyToggle(flag, false);
        }}
        onCancel={() => setPendingDisable(null)}
      />
    </div>
  );
}

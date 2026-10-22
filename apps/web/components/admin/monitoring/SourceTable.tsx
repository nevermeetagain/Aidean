"use client";

/**
 * SourceTable — 监控源表（TASK-064）。
 *
 * 列：源（label/key）｜分级（TierBadge）｜类型｜鉴权｜启用开关｜最近运行（时间/状态/条数）｜操作（手动运行）。
 * 只读用户（无 admin.sync.write）看得到开关与运行按钮但不可操作（disabled + title 说明）。
 * authRequired 源在本版本无 keyed collector：运行按钮禁用并提示（后端 50012 兜底）。
 * 最近运行由调度器写入，本表只读展示；lastError 以 title 悬浮完整文案。
 */
import type { MonitoringSource } from "@aidean/shared";

import { AdminDataTable, type Column } from "../AdminDataTable";
import { TierBadge } from "./TierBadge";

const KIND_LABEL: Record<MonitoringSource["kind"], string> = {
  official: "官方",
  cloud: "云厂商",
  hosted: "托管推理",
  aggregator: "聚合路由",
  relay: "中转",
  benchmark: "评测",
  community: "社区",
};

const RUN_STATUS_LABEL: Record<MonitoringSource["lastStatus"], string> = {
  never: "从未运行",
  ok: "成功",
  partial: "部分成功",
  failed: "失败",
  credential_missing: "缺凭证",
  disabled: "已停用",
};

const RUN_STATUS_CLASS: Record<MonitoringSource["lastStatus"], string> = {
  never: "bg-slate-100 text-slate-500 ring-slate-200",
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  partial: "bg-amber-50 text-amber-700 ring-amber-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  credential_missing: "bg-amber-50 text-amber-700 ring-amber-200",
  disabled: "bg-slate-100 text-slate-500 ring-slate-200",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "从未运行";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 窄屏省略年份，给固定操作列留宽 */
function formatWhenShort(iso: string | null): string {
  if (!iso) return "从未运行";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface SourceTableProps {
  rows: MonitoringSource[];
  canWrite: boolean;
  busy: boolean;
  busyKeys: Set<string>;
  runningKey: string | null;
  onToggleEnabled: (row: MonitoringSource, enabled: boolean) => void;
  onRun: (row: MonitoringSource) => void;
  onRefresh: () => void;
}

export function SourceTable({
  rows,
  canWrite,
  busy,
  busyKeys,
  runningKey,
  onToggleEnabled,
  onRun,
  onRefresh,
}: SourceTableProps) {
  const columns: Column<MonitoringSource>[] = [
    {
      key: "label",
      header: "源",
      className: "px-3 py-2",
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-800" data-testid={`monitoring-source-${row.key}`}>
              {row.label}
            </span>
            {/* 窄屏分级内联展示，腾出最近运行/操作列宽 */}
            <span className="lg:hidden">
              <TierBadge tier={row.tier} />
            </span>
            {!row.enabled ? (
              <span className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 lg:inline">已停用</span>
            ) : null}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-400">{row.key}</div>
        </div>
      ),
    },
    {
      key: "tier",
      header: "分级",
      className: "hidden px-3 py-2 lg:table-cell",
      render: (row) => <TierBadge tier={row.tier} />,
    },
    {
      key: "kind",
      header: "类型",
      className: "hidden px-3 py-2 text-xs text-slate-600 lg:table-cell",
      render: (row) => KIND_LABEL[row.kind] ?? row.kind,
    },
    {
      key: "auth",
      header: "鉴权",
      className: "hidden px-3 py-2 lg:table-cell",
      render: (row) =>
        row.authRequired ? (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-200">
            需 Key
          </span>
        ) : (
          <span className="text-[11px] text-slate-500">公开页</span>
        ),
    },
    {
      key: "enabled",
      header: "启用",
      className: "px-3 py-2",
      render: (row) => {
        const isBusy = busyKeys.has(row.key);
        const disabled = !canWrite || isBusy;
        return (
          <button
            type="button"
            role="switch"
            aria-checked={row.enabled}
            aria-label={`${row.enabled ? "停用" : "启用"} ${row.label}`}
            data-testid={`monitoring-toggle-${row.key}`}
            disabled={disabled}
            title={canWrite ? (isBusy ? "保存中…" : undefined) : "无 admin.sync.write 权限"}
            onClick={() => onToggleEnabled(row, !row.enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              row.enabled ? "bg-emerald-500" : "bg-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                row.enabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        );
      },
    },
    {
      key: "lastRun",
      header: "最近运行",
      className: "px-3 py-2",
      render: (row) => (
        <div className="space-y-1">
          <div className="whitespace-nowrap text-[11px] text-slate-500">
            <span className="lg:hidden">{formatWhenShort(row.lastRunAt)}</span>
            <span className="hidden lg:inline">{formatWhen(row.lastRunAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              data-testid={`monitoring-status-${row.key}`}
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                RUN_STATUS_CLASS[row.lastStatus] ?? RUN_STATUS_CLASS.never
              }`}
            >
              {RUN_STATUS_LABEL[row.lastStatus] ?? row.lastStatus}
            </span>
            <span className="text-[11px] text-slate-400">{row.lastCount === null ? "— 条" : `${row.lastCount} 条`}</span>
          </div>
          {row.lastError ? (
            <p className="max-w-36 truncate text-[11px] text-red-600 lg:max-w-56" title={row.lastError}>
              {row.lastError}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "操作",
      // 窄屏表格横向滚动时固定右侧，保证「手动运行」始终可见
      className: "sticky right-0 border-l border-slate-100 bg-white px-3 py-2",
      render: (row) => {
        const isRunning = runningKey === row.key;
        // 轮询按单源设计：任一源运行中时其余运行按钮一并禁用，避免并发等待混淆。
        const disabled = !canWrite || row.authRequired || runningKey !== null;
        const title = row.authRequired
          ? "该源需要 API Key，本版本不支持手动运行"
          : !canWrite
            ? "无 admin.sync.write 权限"
            : runningKey !== null && !isRunning
              ? "另一个源正在运行，请等待完成"
              : undefined;
        return (
          <button
            type="button"
            data-testid={`monitoring-run-${row.key}`}
            disabled={disabled}
            title={title}
            onClick={() => onRun(row)}
            className="whitespace-nowrap rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRunning ? "运行中…" : "手动运行"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">监控源</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            tier 为结构性风险分级（S1 原厂 → C 中转），非实测 SLA；健康态由最近一次调度写入。
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          刷新
        </button>
      </div>
      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        emptyText="尚未注册监控源"
        busy={busy}
      />
    </div>
  );
}

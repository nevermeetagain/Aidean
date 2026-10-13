"use client";

/**
 * 兑换码管理（SubTask 3.3.1 + 3.5.3 + R-40 AdminDataTable/Input/Button/ConfirmDialog 迁移）：
 * - 批次生成（余额码/套餐码，≤500 枚）→ 响应一次性明文码 → 前端渲染 CSV 下载；
 * - 批次聚合列表（状态分布）+ 码明细列表（批次/状态筛选 + 分页）+ 单码禁用；
 * - 卡商密钥卡：生成（明文仅展示一次）+ 启停。
 */
import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "./adminFetch";
import { Badge, Button, Input } from "@aidean/ui";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

interface BatchRow {
  batchNo: string;
  name: string | null;
  targetType: string;
  total: number;
  enabled: number;
  issued: number;
  used: number;
  disabled: number;
  expired: number;
  createdAt: string;
}

interface CodeRow {
  id: string;
  codeMasked: string;
  targetType: string;
  balanceYuan: string | null;
  packageId: string | null;
  batchNo: string | null;
  status: string;
  expiresAt: string | null;
  redeemedAt: string | null;
}

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ListData {
  codes: CodeRow[];
  batches: BatchRow[];
  packages: { id: string; title: string }[];
  total: number;
  page: number;
  pageSize: number;
}

const CODE_STATUSES = ["ENABLED", "ISSUED", "USED", "DISABLED", "EXPIRED"] as const;
const statusText: Record<string, string> = {
  ENABLED: "可用",
  ISSUED: "已出库",
  USED: "已使用",
  DISABLED: "已禁用",
  EXPIRED: "已过期",
};

function downloadCsv(batchNo: string, codes: string[]): void {
  const csv = "code,batchNo\n" + codes.map((c) => `${c},${batchNo}`).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `redemption-codes-${batchNo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RedemptionManager() {
  const [data, setData] = useState<ListData | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  // #35③：load（批次+码）与 loadKeys（卡商密钥）在途 → 各表「加载中…」
  const [loading, setLoading] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 批次生成表单
  const [genName, setGenName] = useState("");
  const [targetType, setTargetType] = useState<"BALANCE" | "PACKAGE">("BALANCE");
  const [balanceYuan, setBalanceYuan] = useState("10");
  const [packageId, setPackageId] = useState("");
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [lastGen, setLastGen] = useState<{ batchNo: string; codes: string[] } | null>(null);

  // 码列表筛选
  const [filterBatch, setFilterBatch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  // 卡商密钥
  const [keyName, setKeyName] = useState("");
  const [lastKey, setLastKey] = useState<string | null>(null);

  // ConfirmDialog 状态
  const [pendingDisable, setPendingDisable] = useState<CodeRow | null>(null);
  const [pendingToggleKey, setPendingToggleKey] = useState<KeyRow | null>(null);

  const load = useCallback(
    async (p: number, batch: string, status: string) => {
      const qs = new URLSearchParams({ page: String(p), pageSize: "20" });
      if (batch) qs.set("batchNo", batch);
      if (status) qs.set("status", status);
      setLoading(true);
      const res = await adminFetch<ListData>(`/api/v1/admin/redemption-codes?${qs.toString()}`);
      setLoading(false);
      if (res.ok && res.data) {
        setData(res.data);
        setMessage(null);
      } else {
        setMessage(res.message ?? "加载失败");
      }
    },
    []
  );

  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    const res = await adminFetch<{ keys: KeyRow[] }>("/api/v1/admin/partner-keys");
    setLoadingKeys(false);
    if (res.ok && res.data) setKeys(res.data.keys);
  }, []);

  useEffect(() => {
    void load(1, "", "");
    void loadKeys();
  }, [load, loadKeys]);

  async function submitGenerate() {
    const body: Record<string, unknown> = {
      name: genName.trim() || null,
      targetType,
      count,
      prefix,
    };
    if (targetType === "BALANCE") {
      const minor = Math.round(Number(balanceYuan) * 100);
      if (!Number.isFinite(minor) || minor <= 0) {
        setMessage("面额须为正数（元）");
        return;
      }
      body.balanceMinor = String(minor);
    } else {
      if (!packageId) {
        setMessage("套餐码须选择绑定套餐");
        return;
      }
      body.packageId = packageId;
    }
    if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

    setBusy(true);
    const res = await adminFetch<{ batchNo: string; codes: string[]; count: number }>(
      "/api/v1/admin/redemption-codes/batches",
      { method: "POST", body: JSON.stringify(body) }
    );
    setBusy(false);
    if (!res.ok || !res.data) {
      setMessage(res.message ?? "生成失败");
      return;
    }
    setLastGen({ batchNo: res.data.batchNo, codes: res.data.codes });
    setMessage(`批次 ${res.data.batchNo} 生成成功，共 ${res.data.count} 枚（明文仅本次展示，请立即导出）`);
    setFilterBatch(res.data.batchNo);
    setPage(1);
    await load(1, res.data.batchNo, "");
  }

  async function disableCode(c: CodeRow) {
    setBusy(true);
    const res = await adminFetch<{ changed: boolean }>(`/api/v1/admin/redemption-codes/${c.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "DISABLED" }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "禁用失败");
      return;
    }
    setMessage(res.data?.changed ? "已禁用" : "该码已使用/已禁用，无需操作");
    await load(page, filterBatch, filterStatus);
  }

  async function generateKey() {
    if (!keyName.trim()) {
      setMessage("密钥名称必填");
      return;
    }
    setBusy(true);
    const res = await adminFetch<{ key: { id: string; prefix: string }; apiKey: string }>("/api/v1/admin/partner-keys", {
      method: "POST",
      body: JSON.stringify({ name: keyName.trim() }),
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setMessage(res.message ?? "生成失败");
      return;
    }
    setLastKey(res.data.apiKey);
    setKeyName("");
    setMessage("卡商密钥已生成（明文仅本次展示，请立即复制）");
    await loadKeys();
  }

  async function toggleKey(k: KeyRow) {
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/partner-keys/${k.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !k.isActive }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "操作失败");
      return;
    }
    await loadKeys();
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  // 批次列表列定义
  const batchColumns: Column<BatchRow>[] = [
    { key: "batchNo", header: "批次号", className: "px-3 py-2 font-mono text-xs text-slate-600", render: b => <span>{b.batchNo}</span> },
    { key: "name", header: "名称", className: "px-3 py-2 text-slate-500", render: b => <span>{b.name ?? "—"}</span> },
    { key: "targetType", header: "类型", className: "px-3 py-2 text-slate-500", render: b => <span>{b.targetType === "BALANCE" ? "余额码" : "套餐码"}</span> },
    { key: "total", header: "总量", className: "px-3 py-2 tabular-nums text-slate-800", render: b => <span>{b.total}</span> },
    { key: "enabled", header: "可用", className: "px-3 py-2 tabular-nums font-medium text-emerald-600", render: b => <span>{b.enabled}</span> },
    { key: "issued", header: "出库", className: "px-3 py-2 tabular-nums text-sky-600", render: b => <span>{b.issued}</span> },
    { key: "used", header: "已用", className: "px-3 py-2 tabular-nums text-slate-500", render: b => <span>{b.used}</span> },
    { key: "disabled", header: "禁用", className: "px-3 py-2 tabular-nums text-rose-600", render: b => <span>{b.disabled}</span> },
    { key: "expired", header: "过期", className: "px-3 py-2 tabular-nums text-slate-400", render: b => <span>{b.expired}</span> },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: b => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFilterBatch(b.batchNo);
            setPage(1);
            void load(1, b.batchNo, filterStatus);
          }}
        >
          查看明细
        </Button>
      ),
    },
  ];

  // 码明细列定义
  const codeColumns: Column<CodeRow>[] = [
    { key: "codeMasked", header: "码（脱敏）", className: "px-3 py-2 font-mono text-xs text-slate-600", render: c => <span>{c.codeMasked}</span> },
    { key: "targetType", header: "类型", className: "px-3 py-2 text-slate-500", render: c => <span>{c.targetType === "BALANCE" ? "余额码" : "套餐码"}</span> },
    { key: "balanceYuan", header: "面额", className: "px-3 py-2 tabular-nums text-slate-700", render: c => <span>{c.balanceYuan ? `¥${c.balanceYuan}` : "—"}</span> },
    { key: "batchNo", header: "批次", className: "px-3 py-2 font-mono text-xs text-slate-500", render: c => <span>{c.batchNo ?? "—"}</span> },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: c => (
        <span className={c.status === "ENABLED" ? "font-medium text-emerald-600" : c.status === "DISABLED" ? "text-rose-600" : "text-slate-500"}>
          {statusText[c.status] ?? c.status}
        </span>
      ),
    },
    {
      key: "redeemedAt",
      header: "兑换时间",
      className: "px-3 py-2 text-xs tabular-nums text-slate-500",
      render: c => <span>{c.redeemedAt ? c.redeemedAt.slice(0, 19).replace("T", " ") : "—"}</span>,
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: c => c.status === "ENABLED" || c.status === "ISSUED" ? (
        <Button variant="danger" size="sm" disabled={busy} onClick={() => setPendingDisable(c)}>
          禁用
        </Button>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ),
    },
  ];

  // 卡商密钥列定义
  const keyColumns: Column<KeyRow>[] = [
    { key: "name", header: "名称", className: "px-3 py-2 text-slate-600", render: k => <span>{k.name}</span> },
    { key: "prefix", header: "前缀", className: "px-3 py-2 font-mono text-xs text-slate-500", render: k => <span>{k.prefix}…</span> },
    {
      key: "isActive",
      header: "状态",
      className: "px-3 py-2",
      render: k => <Badge variant={k.isActive ? "default" : "secondary"}>{k.isActive ? "启用" : "停用"}</Badge>,
    },
    {
      key: "lastUsedAt",
      header: "最近使用",
      className: "px-3 py-2 text-xs tabular-nums text-slate-500",
      render: k => <span>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("zh-CN") : "从未"}</span>,
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: k => (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => setPendingToggleKey(k)}>
          {k.isActive ? "停用" : "启用"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      {/* 批次生成 */}
      <section aria-label="批次生成" className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-semibold text-slate-800">批次生成</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-slate-500">
            批次名称（可选）
            <Input value={genName} onChange={(e) => setGenName(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            类型
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as "BALANCE" | "PACKAGE")}
              className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[var(--accent)]"
            >
              <option value="BALANCE">余额码</option>
              <option value="PACKAGE">套餐码</option>
            </select>
          </label>
          {targetType === "BALANCE" ? (
            <label className="block text-xs font-medium text-slate-500">
              面额（元）
              <Input type="number" min={0.01} step="0.01" value={balanceYuan} onChange={(e) => setBalanceYuan(e.target.value)} className="mt-1" />
            </label>
          ) : (
            <label className="block text-xs font-medium text-slate-500">
              绑定套餐
              <select
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[var(--accent)]"
              >
                <option value="">请选择</option>
                {(data?.packages ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-medium text-slate-500">
            数量（1-500）
            <Input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-1" />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            前缀（0-8 位字母数字）
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            有效期至（可选）
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
          </label>
          <div className="flex items-end">
            <Button variant="primary" disabled={busy} onClick={() => void submitGenerate()}>
              生成批次
            </Button>
          </div>
        </div>

        {lastGen ? (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700">
                批次 {lastGen.batchNo} · {lastGen.codes.length} 枚明文码（仅本次展示）
              </span>
              <Button variant="outline" size="sm" onClick={() => downloadCsv(lastGen.batchNo, lastGen.codes)}>
                导出 CSV
              </Button>
            </div>
            <p className="mt-2 max-h-24 overflow-y-auto break-all font-mono text-xs text-amber-800/90">
              {lastGen.codes.join(" · ")}
            </p>
          </div>
        ) : null}
      </section>

      {/* 批次列表 */}
      <section aria-label="批次列表" className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-semibold text-slate-800">批次列表</h2>
        <div className="mt-3">
          <AdminDataTable
            columns={batchColumns}
            rows={data?.batches ?? []}
            rowKey={b => b.batchNo}
            emptyText="暂无批次"
            busy={loading}
          />
        </div>
      </section>

      {/* 码明细 */}
      <section aria-label="码明细" className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">码明细</h2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="按批次号筛选"
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="w-40"
            />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
                void load(1, filterBatch, e.target.value);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-[var(--accent)]"
            >
              <option value="">全部状态</option>
              {CODE_STATUSES.map((s) => (
                <option key={s} value={s}>{statusText[s]}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => {
              setFilterBatch("");
              setFilterStatus("");
              setPage(1);
              void load(1, "", "");
            }}>
              重置
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <AdminDataTable
            columns={codeColumns}
            rows={data?.codes ?? []}
            rowKey={c => c.id}
            emptyText="暂无兑换码"
            busy={loading}
            page={page}
            totalPages={totalPages}
            total={data?.total ?? 0}
            onPageChange={p => {
              setPage(p);
              void load(p, filterBatch, filterStatus);
            }}
          />
        </div>
      </section>

      {/* 卡商密钥 */}
      <section aria-label="卡商密钥" className="rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-semibold text-slate-800">卡商密钥（Partner API）</h2>
        <p className="mt-1 text-xs text-slate-500">
          卡商平台以 X-API-Key 头调用 /api/v1/partner/codes 取码与对账；明文仅生成时展示一次，库内仅存 SHA-256。
        </p>
        <div className="mt-3 flex items-end gap-2">
          <label className="block text-xs font-medium text-slate-500">
            密钥名称
            <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} className="mt-1 w-56" />
          </label>
          <Button variant="primary" disabled={busy} onClick={() => void generateKey()}>
            生成密钥
          </Button>
        </div>
        {lastKey ? (
          <p className="mt-2 break-all rounded-md border border-amber-300 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-800">
            {lastKey}
          </p>
        ) : null}
        <div className="mt-3">
          <AdminDataTable
            columns={keyColumns}
            rows={keys}
            rowKey={k => k.id}
            emptyText="暂无卡商密钥"
            busy={loadingKeys}
          />
        </div>
      </section>

      {/* ConfirmDialog: 禁用兑换码 */}
      <ConfirmDialog
        open={pendingDisable !== null}
        title="禁用兑换码"
        message={`确认禁用码 ${pendingDisable?.codeMasked ?? ""}？此操作不可撤销。`}
        onConfirm={() => {
          if (pendingDisable) void disableCode(pendingDisable);
          setPendingDisable(null);
        }}
        onCancel={() => setPendingDisable(null)}
      />

      {/* ConfirmDialog: 切换卡商密钥状态 */}
      <ConfirmDialog
        open={pendingToggleKey !== null}
        title={pendingToggleKey?.isActive ? "停用卡商密钥" : "启用卡商密钥"}
        message={`确认${pendingToggleKey?.isActive ? "停用" : "启用"}密钥「${pendingToggleKey?.name ?? ""}」？`}
        onConfirm={() => {
          if (pendingToggleKey) void toggleKey(pendingToggleKey);
          setPendingToggleKey(null);
        }}
        onCancel={() => setPendingToggleKey(null)}
      />
    </div>
  );
}

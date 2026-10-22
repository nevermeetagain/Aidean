"use client";

/**
 * 后台天梯配置面板（v1.9 + R-40 AdminDataTable 迁移）：
 * - 性能轴颗粒度：读 /api/v1/admin/ladder/config，数值输入（step 0.01）后 PUT 保存；
 * - 厂商展示优先级：读 /api/v1/admin/vendors 简表，行内 1-99 整数编辑，整组 PUT 提交；
 *   优先级数值越小越贴近性能轴（1 最高）。
 * 信封契约：{ code, message, data }；code !== 0 显示 message。
 */
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { Button, Input } from "@aidean/ui";
import { AdminDataTable, type Column } from "./AdminDataTable";

interface VendorRow {
  id: string;
  code: string;
  name: string;
  nameCn: string | null;
  country: string | null;
  priority: number;
  isActive: boolean;
}

interface EnvelopeShape<T> {
  code?: number;
  message?: string;
  data?: T;
}

export function AdminConfigPanel() {
  const [granularity, setGranularity] = useState<string>("");
  const [loadWindowPct, setLoadWindowPct] = useState<string>("");
  const [hotVendorCount, setHotVendorCount] = useState<string>("");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  // #35③：配置+厂商聚合加载在途 → 厂商表「加载中…」（参照 UsersTable #68 模式）
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cfgRes, vendorRes] = await Promise.all([
        fetch("/api/v1/admin/ladder/config").then((r) =>
          r.json() as Promise<EnvelopeShape<{ granularity: number; loadWindowPct: number; hotVendorCount: number }>>
        ),
        fetch("/api/v1/admin/vendors").then((r) => r.json() as Promise<EnvelopeShape<{ vendors: VendorRow[] }>>),
      ]);
      if (cancelled) return;
      if (cfgRes.code === 0 && cfgRes.data) {
        setGranularity(String(cfgRes.data.granularity));
        setLoadWindowPct(String(cfgRes.data.loadWindowPct));
        setHotVendorCount(String(cfgRes.data.hotVendorCount));
      }
      if (vendorRes.code === 0 && vendorRes.data) {
        setVendors(vendorRes.data.vendors);
        setDrafts(
          Object.fromEntries(vendorRes.data.vendors.map((v) => [v.id, String(v.priority)]))
        );
      }
    })().catch(() => setMessage("配置加载失败，请刷新重试")).finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function post(url: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const envelope = (await res.json()) as EnvelopeShape<unknown>;
      if (envelope.code !== 0) {
        setMessage(envelope.message ?? "保存失败");
        return false;
      }
      setMessage("已保存（前台约 1 小时缓存后生效）");
      return true;
    } catch {
      setMessage("保存失败，请重试");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function saveGranularity() {
    const value = Number(granularity);
    if (!Number.isFinite(value)) {
      setMessage("颗粒度必须为数值");
      return;
    }
    void post("/api/v1/admin/ladder/config", { granularity: value });
  }

  /** R-83 T2：上拉加载分带百分比 + 热门开发商数（一键保存两键，后端逐键 clamp + 审计） */
  function saveLoadTuning() {
    const pct = Number(loadWindowPct);
    const count = Number(hotVendorCount);
    if (!Number.isFinite(pct) || !Number.isFinite(count)) {
      setMessage("分带百分比与热门开发商数必须为数值");
      return;
    }
    void post("/api/v1/admin/ladder/config", { loadWindowPct: pct, hotVendorCount: count });
  }

  function savePriorities() {
    const priorities = Object.entries(drafts)
      .map(([id, raw]) => ({ id, priority: Number(raw) }))
      .filter((p) => Number.isInteger(p.priority));
    if (!priorities.length) {
      setMessage("无可提交的优先级配置");
      return;
    }
    void post("/api/v1/admin/vendors", { priorities });
  }

  // 厂商优先级列定义
  const vendorColumns: Column<VendorRow>[] = [
    {
      key: "name",
      header: "厂商",
      className: "py-1.5 pr-3 text-slate-700",
      render: v => (
        <span>
          {v.nameCn || v.name}
          <span className="ml-1.5 text-xs text-slate-400">{v.code}</span>
        </span>
      ),
    },
    {
      key: "country",
      header: "国别",
      className: "py-1.5 pr-3 text-slate-500",
      render: v => <span>{v.country ?? "—"}</span>,
    },
    {
      key: "isActive",
      header: "状态",
      className: "py-1.5 pr-3",
      render: v => (
        <span className={v.isActive ? "text-emerald-700" : "text-slate-400"}>
          {v.isActive ? "启用" : "停用"}
        </span>
      ),
    },
    {
      key: "priority",
      header: "优先级",
      className: "py-1.5",
      render: v => (
        <Input
          type="number"
          min={1}
          max={99}
          step={1}
          value={drafts[v.id] ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDrafts((prev) => ({ ...prev, [v.id]: e.target.value }))}
          aria-label={`${v.nameCn || v.name} 优先级`}
          className="w-20"
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {message ? (
        <p role="status" className="rounded-md border border-[var(--border)] bg-muted px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">性能轴颗粒度</h2>
        <p className="mt-1 text-xs text-slate-500">
          性能轴/分隔栏按固定颗粒值分割（默认 0.1，如 98.9 与 98.8 为相邻档位），合法域 0.01–10。
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            min={0.01}
            max={10}
            step={0.01}
            value={granularity}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGranularity(e.target.value)}
            aria-label="性能轴颗粒度"
            className="w-20"
          />
          <Button variant="primary" size="sm" disabled={busy} onClick={saveGranularity}>
            保存颗粒度
          </Button>
        </div>
      </section>

      {/* R-83 T2：上拉加载分带百分比 + 热门开发商默认列数 */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">加载窗口与热门开发商</h2>
        <p className="mt-1 text-xs text-slate-500">
          分带百分比＝首屏加载的评分量程（默认 20 即先载综合分 80–100 的模型，滑到带底自动续拉下一带，合法域 1–100）；
          热门开发商数＝天梯图默认展示的厂商列数（按优先级取前 N，其余「展开全部」，合法域 1–100）。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            max={100}
            step={1}
            value={loadWindowPct}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLoadWindowPct(e.target.value)}
            aria-label="分带百分比"
            className="w-20"
          />
          <span className="text-xs text-slate-400">%</span>
          <Input
            type="number"
            min={1}
            max={100}
            step={1}
            value={hotVendorCount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setHotVendorCount(e.target.value)}
            aria-label="热门开发商数"
            className="w-20"
          />
          <span className="text-xs text-slate-400">家</span>
          <Button variant="primary" size="sm" disabled={busy} onClick={saveLoadTuning}>
            保存加载配置
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">厂商展示优先级</h2>
            <p className="mt-1 text-xs text-slate-500">数值 1–99，越小优先级越高，天梯图中离性能轴越近。</p>
          </div>
          <Button variant="primary" size="sm" disabled={busy} onClick={savePriorities}>
            保存优先级
          </Button>
        </div>
        <div className="mt-3">
          <AdminDataTable
            columns={vendorColumns}
            rows={vendors}
            rowKey={v => v.id}
            emptyText="暂无厂商"
            busy={loading}
          />
        </div>
      </section>
    </div>
  );
}

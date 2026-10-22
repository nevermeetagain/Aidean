"use client";

/**
 * 模型定价管理（S7.1 定价孤岛激活）：
 * ModelPrice 当前价列表（原币/每百万 token 口径直接展示 Decimal（TASK-048 起默认 per_million_tokens））+ 搜索 + 编辑 + 为无当前价模型新建。
 * 只读口径下（canWrite=false）隐藏编辑/新建。金额非分单位（Decimal 19,6），按原值展示。
 * TASK-029：新增「限时优惠」子表 Tab（PromotionsPanel）；当前价行「添加优惠」直达新建对话框（预选模型）。
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Dialog, Button, Input, Tabs } from "@aidean/ui";
import { PromotionsPanel, type PromotionModelOption } from "./PromotionsPanel";

interface PriceRow {
  id: string;
  modelId: string;
  modelName: string;
  modelSlug: string;
  modelCode: string;
  vendorName: string;
  priceInput: string | null;
  priceOutput: string | null;
  priceCache: string | null;
  pricePerRequest: string | null;
  billingMode: string;
  billingCurrency: string;
  billingUnit: string;
  sourceType: string;
  notes: string | null;
}

interface ModelOption {
  id: string;
  nameDisplay: string;
  modelCode: string;
}

interface PriceForm {
  modelId: string;
  priceInput: string;
  priceOutput: string;
  priceCache: string;
  pricePerRequest: string;
  billingUnit: string;
  billingCurrency: string;
  notes: string;
}

const emptyForm: PriceForm = {
  modelId: "",
  priceInput: "",
  priceOutput: "",
  priceCache: "",
  pricePerRequest: "",
  billingUnit: "per_million_tokens",
  billingCurrency: "CNY",
  notes: "",
};

const blankNum = (v: string) => v.trim() === "";

function numOrNull(v: string): number | null {
  if (blankNum(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function PricesManager({ canWrite = false }: { canWrite?: boolean }) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PriceRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PriceForm>(emptyForm);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelQuery, setModelQuery] = useState("");
  const [modelsLoading, setModelsLoading] = useState(false);
  const [tab, setTab] = useState<"current" | "promotions">("current");
  const [promoCreateFor, setPromoCreateFor] = useState<{ modelId: string; nonce: number } | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (q.trim()) params.set("q", q.trim());
    const res = await adminFetch<{ items: PriceRow[] }>(`/api/v1/admin/prices?${params}`);
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setMessage(null);
    } else {
      setMessage(res.message ?? "加载失败");
    }
  }, []);

  useEffect(() => {
    void load("");
  }, [load]);

  /**
   * P0.3（B11-11 待裁定 / 运行态缺陷）：原先请求 `pageSize=200`，而 AdminPageQuerySchema.pageSize ≤ 50，
   * 必然 400 → 下拉恒为空。现按契约取 pageSize=50，并用 `q` 让服务端过滤候选（不新增端点）。
   */
  const loadModels = useCallback(async (q: string) => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (q.trim()) params.set("q", q.trim());
    setModelsLoading(true);
    const res = await adminFetch<{ models: ModelOption[] }>(`/api/v1/admin/models?${params}`);
    setModelsLoading(false);
    if (res.ok && res.data) {
      setModels(res.data.models.map((m) => ({ id: m.id, nameDisplay: m.nameDisplay, modelCode: m.modelCode })));
    }
  }, []);

  // 新建弹窗打开时按搜索词拉候选（300ms 防抖，避免逐字请求）；编辑态不改模型，跳过
  useEffect(() => {
    if (!creating || editing) return;
    const timer = setTimeout(() => void loadModels(modelQuery), 300);
    return () => clearTimeout(timer);
  }, [creating, editing, modelQuery, loadModels]);

  function openCreate() {
    setModelQuery("");
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  }

  function openEdit(p: PriceRow) {
    setForm({
      modelId: p.modelId,
      priceInput: p.priceInput ?? "",
      priceOutput: p.priceOutput ?? "",
      priceCache: p.priceCache ?? "",
      pricePerRequest: p.pricePerRequest ?? "",
      billingUnit: p.billingUnit ?? "per_million_tokens",
      billingCurrency: p.billingCurrency ?? "CNY",
      notes: p.notes ?? "",
    });
    setEditing(p);
    setCreating(true);
  }

  const pricedModelIds = useMemo(() => new Set(rows.map((r) => r.modelId)), [rows]);

  /** 优惠子表可选模型 = 已有当前价的模型（服务端写侧约束②：无当前价不可建优惠） */
  const promoModels = useMemo<PromotionModelOption[]>(
    () =>
      rows.map((r) => ({
        id: r.modelId,
        name: r.modelName,
        code: r.modelCode,
        currentInput: r.priceInput,
        currentOutput: r.priceOutput,
        currency: r.billingCurrency,
        unit: r.billingUnit,
      })),
    [rows],
  );

  function openPromoFor(p: PriceRow) {
    setTab("promotions");
    setPromoCreateFor({ modelId: p.modelId, nonce: Date.now() });
  }

  async function submitForm() {
    const inVal = numOrNull(form.priceInput);
    const outVal = numOrNull(form.priceOutput);
    if (inVal === null || Number.isNaN(inVal) || outVal === null || Number.isNaN(outVal)) {
      setMessage("输入/输出价必填，且为非负数字");
      return;
    }
    const cacheVal = numOrNull(form.priceCache);
    const reqVal = numOrNull(form.pricePerRequest);
    if (Number.isNaN(cacheVal) || Number.isNaN(reqVal)) {
      setMessage("缓存/每次请求价须为非负数字或留空");
      return;
    }
    const payload = {
      priceInput: inVal,
      priceOutput: outVal,
      priceCache: cacheVal,
      pricePerRequest: reqVal,
      billingUnit: form.billingUnit.trim() || "per_million_tokens",
      billingCurrency: (form.billingCurrency.trim() || "CNY").toUpperCase(),
      notes: form.notes.trim() || null,
    };
    setBusy(true);
    let res;
    if (editing) {
      res = await adminFetch(`/api/v1/admin/prices/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      if (!form.modelId) {
        setBusy(false);
        setMessage("请选择模型");
        return;
      }
      res = await adminFetch("/api/v1/admin/prices", { method: "POST", body: JSON.stringify({ modelId: form.modelId, ...payload }) });
    }
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "保存失败");
      return;
    }
    setMessage(editing ? "定价已更新" : "定价已创建");
    setCreating(false);
    await load(query);
  }

  const columns: Column<PriceRow>[] = [
    {
      key: "model",
      header: "模型",
      className: "px-3 py-2",
      render: (p) => (
        <div>
          <div className="text-slate-800">{p.modelName}</div>
          <div className="max-w-56 truncate text-xs text-slate-500">{p.modelCode} · {p.vendorName}</div>
        </div>
      ),
    },
    { key: "in", header: "输入价", className: "px-3 py-2 tabular-nums text-slate-700", render: (p) => <span>{p.priceInput ?? "—"}</span> },
    { key: "out", header: "输出价", className: "px-3 py-2 tabular-nums text-slate-700", render: (p) => <span>{p.priceOutput ?? "—"}</span> },
    { key: "cache", header: "缓存价", className: "px-3 py-2 tabular-nums text-slate-500", render: (p) => <span>{p.priceCache ?? "—"}</span> },
    { key: "unit", header: "计价", className: "px-3 py-2 text-xs text-slate-500", render: (p) => <span>{p.billingCurrency} / {p.billingUnit}</span> },
    { key: "src", header: "来源", className: "px-3 py-2 text-xs text-slate-500", render: (p) => <span>{p.sourceType}</span> },
    ...(canWrite
      ? [{
          key: "actions",
          header: "操作",
          className: "px-3 py-2",
          render: (p: PriceRow) => (
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={() => openEdit(p)}>编辑</Button>
              <Button variant="outline" size="sm" onClick={() => openPromoFor(p)}>添加优惠</Button>
            </div>
          ),
        } as Column<PriceRow>]
      : []),
  ];

  return (
    <div className="space-y-3">
      <Tabs
        items={[
          { value: "current", label: "当前价" },
          { value: "promotions", label: "限时优惠" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as "current" | "promotions")}
      />

      {tab === "promotions" ? (
        <PromotionsPanel canWrite={canWrite} models={promoModels} createFor={promoCreateFor} />
      ) : (
      <>
      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void load(query); }}
          placeholder="搜索模型名/slug/modelCode"
          className="w-64 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">共 {rows.length} 条当前价</span>
          {canWrite ? <Button variant="primary" size="sm" onClick={openCreate}>新建定价</Button> : null}
        </div>
      </div>

      <AdminDataTable columns={columns} rows={rows} rowKey={(p) => p.id} emptyText="暂无定价数据" busy={busy || loading} />

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={editing ? "编辑定价" : "新建定价"}
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void submitForm()}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          {editing ? (
            <div className="text-xs text-slate-500">模型：<span className="font-medium text-slate-800">{editing.modelName}</span>（{editing.modelCode}）</div>
          ) : (
            <label className="block text-xs font-medium text-slate-500">
              选择模型（仅可创建尚无当前价的模型）
              <Input
                type="search"
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="搜索模型名称或编码，如 gpt"
                className="mt-1"
                aria-label="搜索模型"
              />
              <select
                value={form.modelId}
                onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[var(--accent)]"
              >
                <option value="">{modelsLoading ? "加载中…" : "— 请选择 —"}</option>
                {models.filter((m) => !pricedModelIds.has(m.id)).map((m) => (
                  <option key={m.id} value={m.id}>{m.nameDisplay}（{m.modelCode}）</option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-3">
            <label className="block flex-1 text-xs font-medium text-slate-500">
              输入价
              <Input type="number" min={0} step="0.000001" value={form.priceInput} onChange={(e) => setForm({ ...form, priceInput: e.target.value })} className="mt-1" />
            </label>
            <label className="block flex-1 text-xs font-medium text-slate-500">
              输出价
              <Input type="number" min={0} step="0.000001" value={form.priceOutput} onChange={(e) => setForm({ ...form, priceOutput: e.target.value })} className="mt-1" />
            </label>
          </div>
          <div className="flex gap-3">
            <label className="block flex-1 text-xs font-medium text-slate-500">
              缓存价（可选）
              <Input type="number" min={0} step="0.000001" value={form.priceCache} onChange={(e) => setForm({ ...form, priceCache: e.target.value })} className="mt-1" />
            </label>
            <label className="block flex-1 text-xs font-medium text-slate-500">
              每次请求价（可选）
              <Input type="number" min={0} step="0.000001" value={form.pricePerRequest} onChange={(e) => setForm({ ...form, pricePerRequest: e.target.value })} className="mt-1" />
            </label>
          </div>
          <div className="flex gap-3">
            <label className="block flex-1 text-xs font-medium text-slate-500">
              计价粒度
              <Input type="text" value={form.billingUnit} onChange={(e) => setForm({ ...form, billingUnit: e.target.value })} className="mt-1" />
            </label>
            <label className="block w-28 text-xs font-medium text-slate-500">
              币种
              <Input type="text" maxLength={3} value={form.billingCurrency} onChange={(e) => setForm({ ...form, billingCurrency: e.target.value })} className="mt-1" />
            </label>
          </div>
          <label className="block text-xs font-medium text-slate-500">
            备注（可选）
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
      </Dialog>
      </>
      )}
    </div>
  );
}

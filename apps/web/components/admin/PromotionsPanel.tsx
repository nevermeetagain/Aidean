"use client";

/**
 * 限时优惠子表（TASK-029；契约⑥「后台 · 限时优惠」五态，testid：promo-empty / promo-loading / promo-error / promo-readonly / promo-saved）。
 *
 * 数据：GET/POST /api/v1/admin/prices/promotions、PATCH/DELETE /api/v1/admin/prices/promotions/[id]（TASK-028/096）。
 * 口径：
 *   - 时间输入按 Asia/Shanghai 理解（datetime-local 不带时区），提交前转 ISO UTC；列表同样按北京时间展示。
 *   - 价格以十进制字符串提交（契约 DecimalStr），客户端先校验 ≤6 位小数、≤13 位整数，服务端仍是最终裁判。
 *   - 计费币种/单位/方式不由此处填写：服务端一律继承该模型当前价（写侧约束②）。
 *   - 「限时免费」= 输入价与输出价都为 0。
 *   - 无写权限（canWrite=false）只读：隐藏新建/编辑/删除，显示「只读」标记。
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Dialog, Input } from "@aidean/ui";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { ConfirmDialog } from "./ConfirmDialog";

export interface PromotionModelOption {
  id: string;
  name: string;
  code: string;
  /** 当前价（供对话框对比展示，非提交字段） */
  currentInput: string | null;
  currentOutput: string | null;
  currency: string;
  unit: string;
}

interface PromotionRow {
  id: string;
  modelId: string;
  modelName?: string;
  priceInput: string;
  priceOutput: string;
  priceCache: string | null;
  billingCurrency: string;
  billingUnit: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  notes: string | null;
}

interface CurrentPriceRow {
  modelId: string;
  modelName: string;
  modelCode: string;
  priceInput: string | null;
  priceOutput: string | null;
  billingCurrency: string;
  billingUnit: string;
}

const toOption = (r: CurrentPriceRow): PromotionModelOption => ({
  id: r.modelId,
  name: r.modelName,
  code: r.modelCode,
  currentInput: r.priceInput,
  currentOutput: r.priceOutput,
  currency: r.billingCurrency,
  unit: r.billingUnit,
});

interface PromoForm {
  modelId: string;
  priceInput: string;
  priceOutput: string;
  priceCache: string;
  from: string; // datetime-local（北京时间）
  until: string;
  notes: string;
}

type PromoStatus = "running" | "upcoming" | "ended" | "invalid";

const STATUS_META: Record<PromoStatus, { label: string; cls: string }> = {
  running: { label: "进行中", cls: "border-rose-200 bg-rose-50 text-rose-600" },
  upcoming: { label: "未开始", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  ended: { label: "已结束", cls: "border-slate-200 bg-slate-50 text-slate-500" },
  invalid: { label: "缺结束时间", cls: "border-amber-300 bg-amber-50 text-amber-700" },
};

const DECIMAL_RE = /^\d+(\.\d+)?$/;
const PAGE_SIZE = 50;

/** 与服务端 assertPriceDecimal 同口径：非负十进制、≤6 位小数、≤13 位整数；返回错误文案或 null */
export function validatePrice(label: string, v: string, required: boolean): string | null {
  const s = v.trim();
  if (s === "") return required ? `${label}必填` : null;
  if (!DECIMAL_RE.test(s)) return `${label}须为非负数字`;
  const [int, frac = ""] = s.split(".");
  if (frac.length > 6) return `${label}小数位不能超过 6 位`;
  if (int.replace(/^0+(?=\d)/, "").length > 13) return `${label}整数位不能超过 13 位`;
  return null;
}

/** datetime-local（北京时间，YYYY-MM-DDTHH:mm）→ ISO UTC；非法 → null */
export function shanghaiLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+08:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → datetime-local（北京时间）；UTC+8 无夏令时，直接平移 8 小时 */
export function isoToShanghaiLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 16);
}

function fmtShanghai(iso: string | null): string {
  return iso ? isoToShanghaiLocal(iso).replace("T", " ") : "—";
}

export function promoStatus(row: Pick<PromotionRow, "effectiveFrom" | "effectiveUntil">, now: number): PromoStatus {
  if (!row.effectiveUntil) return "invalid";
  const from = Date.parse(row.effectiveFrom);
  const until = Date.parse(row.effectiveUntil);
  if (now < from) return "upcoming";
  if (now >= until) return "ended";
  return "running";
}

const isZero = (v: string) => DECIMAL_RE.test(v.trim()) && Number(v) === 0;

function defaultWindow(): { from: string; until: string } {
  const now = Date.now();
  const start = Math.ceil(now / 3600_000) * 3600_000; // 下一个整点
  return { from: isoToShanghaiLocal(new Date(start).toISOString()), until: isoToShanghaiLocal(new Date(start + 7 * 86400_000).toISOString()) };
}

interface Props {
  canWrite: boolean;
  models: PromotionModelOption[];
  /** 从「当前价」行点「添加优惠」进入时预选的模型；变化时自动打开新建对话框 */
  createFor?: { modelId: string; nonce: number } | null;
}

export function PromotionsPanel({ canWrite, models, createFor = null }: Props) {
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filterModel, setFilterModel] = useState("");
  const [hideEnded, setHideEnded] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const [form, setForm] = useState<PromoForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<PromotionRow | null>(null);

  /** 已知模型（含当前价）：父组件首屏 100 条 + 按需补查（优惠行所属模型、对话框搜索结果） */
  const [extraModels, setExtraModels] = useState<PromotionModelOption[]>([]);
  const [modelQuery, setModelQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PromotionModelOption[] | null>(null);
  const modelById = useMemo(() => new Map([...models, ...extraModels].map((m) => [m.id, m])), [models, extraModels]);
  const now = Date.now();

  const load = useCallback(async () => {
    setLoading(true);
    // AdminPageQuerySchema：pageSize ≤ 50（运行态验收实测 pageSize=100 → 40000），按 effectiveFrom 倒序分页
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (filterModel) params.set("modelId", filterModel);
    const res = await adminFetch<{ items: PromotionRow[]; total: number; totalPages: number }>(`/api/v1/admin/prices/promotions?${params}`);
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setTotal(res.data.total);
      setTotalPages(Math.max(1, res.data.totalPages));
      setLoadError(null);
    } else {
      setLoadError(res.message ?? "加载失败");
    }
  }, [filterModel, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // 优惠行所属模型不在已知集合时按 modelId 补查当前价（「原价」划线展示用；每页至多 50 个模型，管理端低频可接受）
  useEffect(() => {
    const missing = [...new Set(rows.map((r) => r.modelId))].filter((id) => !modelById.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map((id) => adminFetch<{ items: CurrentPriceRow[] }>(`/api/v1/admin/prices?modelId=${encodeURIComponent(id)}&limit=1`)),
    ).then((results) => {
      if (cancelled) return;
      const found = results.flatMap((r) => (r.ok && r.data ? r.data.items.map(toOption) : []));
      if (found.length) setExtraModels((prev) => [...prev, ...found.filter((f) => !prev.some((p) => p.id === f.id))]);
    });
    return () => {
      cancelled = true;
    };
  }, [rows, modelById]);

  // 对话框模型搜索（服务端 q 检索当前价，避免只能选父组件首屏 100 条）
  useEffect(() => {
    const q = modelQuery.trim();
    if (!dialogOpen || q.length < 1) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void adminFetch<{ items: CurrentPriceRow[] }>(`/api/v1/admin/prices?q=${encodeURIComponent(q)}&limit=20`).then((res) => {
        if (cancelled) return;
        const opts = res.ok && res.data ? res.data.items.map(toOption) : [];
        setSearchResults(opts);
        if (opts.length) setExtraModels((prev) => [...prev, ...opts.filter((o) => !prev.some((p) => p.id === o.id))]);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [modelQuery, dialogOpen]);

  const openCreate = useCallback((modelId = "") => {
    const w = defaultWindow();
    setForm({ modelId, priceInput: "", priceOutput: "", priceCache: "", from: w.from, until: w.until, notes: "" });
    setModelQuery("");
    setEditing(null);
    setFormError(null);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    if (createFor && canWrite) openCreate(createFor.modelId);
  }, [createFor, canWrite, openCreate]);

  function openEdit(r: PromotionRow) {
    setForm({
      modelId: r.modelId,
      priceInput: r.priceInput,
      priceOutput: r.priceOutput,
      priceCache: r.priceCache ?? "",
      from: isoToShanghaiLocal(r.effectiveFrom),
      until: isoToShanghaiLocal(r.effectiveUntil),
      notes: r.notes ?? "",
    });
    setEditing(r);
    setFormError(null);
    setDialogOpen(true);
  }

  async function submit() {
    if (!form) return;
    if (!editing && !form.modelId) return setFormError("请选择模型");
    const priceErr =
      validatePrice("输入价", form.priceInput, true) ??
      validatePrice("输出价", form.priceOutput, true) ??
      validatePrice("缓存价", form.priceCache, false);
    if (priceErr) return setFormError(priceErr);
    const fromIso = shanghaiLocalToIso(form.from);
    const untilIso = shanghaiLocalToIso(form.until);
    if (!fromIso || !untilIso) return setFormError("请填写开始与结束时间");
    if (Date.parse(untilIso) <= Date.parse(fromIso)) return setFormError("结束时间必须晚于开始时间");

    const body = {
      priceInput: form.priceInput.trim(),
      priceOutput: form.priceOutput.trim(),
      priceCache: form.priceCache.trim() === "" ? null : form.priceCache.trim(),
      effectiveFrom: fromIso,
      effectiveUntil: untilIso,
      notes: form.notes.trim() === "" ? null : form.notes.trim(),
    };
    setBusy(true);
    const res = editing
      ? await adminFetch(`/api/v1/admin/prices/promotions/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
      : await adminFetch("/api/v1/admin/prices/promotions", { method: "POST", body: JSON.stringify({ modelId: form.modelId, ...body }) });
    setBusy(false);
    if (!res.ok) {
      setFormError(`保存失败：${res.message ?? "未知错误"}`);
      return;
    }
    setDialogOpen(false);
    setNotice("已保存，价格页即时生效");
    await load();
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/prices/promotions/${target.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setNotice(`删除失败：${res.message ?? "未知错误"}`);
      return;
    }
    setNotice("已删除，价格页即时恢复原价");
    await load();
  }

  const visible = useMemo(
    () => (hideEnded ? rows.filter((r) => promoStatus(r, now) !== "ended") : rows),
    [rows, hideEnded, now],
  );

  const columns: Column<PromotionRow>[] = [
    {
      key: "model",
      header: "模型",
      className: "px-3 py-2",
      render: (r) => {
        const m = modelById.get(r.modelId);
        return (
          <div>
            <div className="text-slate-800">{r.modelName ?? m?.name ?? r.modelId}</div>
            <div className="max-w-56 truncate text-xs text-slate-500">{m?.code ?? ""}</div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: (r) => {
        const s = STATUS_META[promoStatus(r, now)];
        return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
      },
    },
    {
      key: "price",
      header: "优惠价（输入 / 输出）",
      className: "px-3 py-2 tabular-nums",
      render: (r) => {
        const m = modelById.get(r.modelId);
        const free = isZero(r.priceInput) && isZero(r.priceOutput);
        return (
          <div>
            <div className={free ? "font-medium text-emerald-700" : "font-medium text-rose-600"}>
              {free ? "限时免费" : `${r.priceInput} / ${r.priceOutput}`}
            </div>
            {m?.currentInput != null ? (
              <div className="text-xs text-slate-400">
                原价 <s>{m.currentInput} / {m.currentOutput ?? "—"}</s>
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "window",
      header: "窗口（北京时间）",
      className: "px-3 py-2 text-xs text-slate-600",
      render: (r) => (
        <div className="whitespace-nowrap">
          <div>{fmtShanghai(r.effectiveFrom)}</div>
          <div className="text-slate-400">至 {fmtShanghai(r.effectiveUntil)}</div>
        </div>
      ),
    },
    { key: "unit", header: "计价", className: "px-3 py-2 text-xs text-slate-500", render: (r) => <span>{r.billingCurrency} / {r.billingUnit}</span> },
    { key: "notes", header: "备注", className: "px-3 py-2 text-xs text-slate-500", render: (r) => <span className="line-clamp-2 max-w-40">{r.notes ?? "—"}</span> },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "操作",
            className: "px-3 py-2",
            render: (r: PromotionRow) => (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => openEdit(r)}>编辑</Button>
                <Button variant="outline" size="sm" onClick={() => setDeleting(r)}>删除</Button>
              </div>
            ),
          } as Column<PromotionRow>,
        ]
      : []),
  ];

  const selectedModel = form ? modelById.get(form.modelId) : undefined;
  const formFree = form ? isZero(form.priceInput) && isZero(form.priceOutput) : false;

  return (
    <div className="space-y-3" data-testid="promo-panel">
      {notice ? (
        <p data-testid={notice.startsWith("已") ? "promo-saved" : "promo-error"} role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="按模型筛选"
            value={filterModel}
            onChange={(e) => {
              setFilterModel(e.target.value);
              setPage(1);
            }}
            className="w-56 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[var(--accent)]"
          >
            <option value="">全部模型</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={hideEnded} onChange={(e) => setHideEnded(e.target.checked)} />
            隐藏已结束
          </label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">共 {total} 条{hideEnded && visible.length !== rows.length ? `（本页隐藏已结束 ${rows.length - visible.length} 条）` : ""}</span>
          {canWrite ? (
            <Button variant="primary" size="sm" onClick={() => openCreate(filterModel)}>新建优惠</Button>
          ) : (
            <span data-testid="promo-readonly" className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">只读</span>
          )}
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div data-testid="promo-loading" className="space-y-2" aria-busy="true">
          <p className="text-xs text-slate-400">加载中…</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : loadError ? (
        <div data-testid="promo-error" className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <span>加载失败：{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>重试</Button>
        </div>
      ) : visible.length === 0 && totalPages <= 1 ? (
        <div data-testid="promo-empty" className="flex flex-col items-center gap-3 rounded-md border border-dashed border-slate-200 px-6 py-10 text-center">
          <p className="text-sm text-slate-500">暂无限时优惠</p>
          {canWrite ? <Button variant="primary" size="sm" onClick={() => openCreate(filterModel)}>新建优惠</Button> : null}
        </div>
      ) : (
        <AdminDataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          emptyText="暂无限时优惠"
          busy={busy || loading}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "编辑限时优惠" : "新建限时优惠"}
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void submit()}>保存</Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-3">
            {formError ? (
              <p data-testid="promo-error" role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {formError}
              </p>
            ) : null}
            {editing ? (
              <div className="text-xs text-slate-500">
                模型：<span className="font-medium text-slate-800">{editing.modelName ?? selectedModel?.name ?? editing.modelId}</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-500">
                  选择模型（仅可选已有当前价的模型）
                  <Input
                    data-testid="promo-model-search"
                    placeholder="输入模型名 / slug / modelCode 搜索"
                    value={modelQuery}
                    onChange={(e) => setModelQuery(e.target.value)}
                    className="mt-1"
                  />
                </label>
                <select
                  aria-label="模型"
                  value={form.modelId}
                  onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                  className="block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-[var(--accent)]"
                >
                  <option value="">{searchResults && searchResults.length === 0 ? "— 无匹配的已定价模型 —" : "— 请选择 —"}</option>
                  {(searchResults ?? models).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}（{m.code}）</option>
                  ))}
                  {form.modelId && !(searchResults ?? models).some((m) => m.id === form.modelId) && modelById.get(form.modelId) ? (
                    <option value={form.modelId}>{modelById.get(form.modelId)!.name}</option>
                  ) : null}
                </select>
              </div>
            )}
            {selectedModel ? (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                当前价：输入 {selectedModel.currentInput ?? "—"} / 输出 {selectedModel.currentOutput ?? "—"}（{selectedModel.currency} / {selectedModel.unit}）。优惠沿用同一币种与计价单位。
              </p>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">优惠价</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setForm({ ...form, priceInput: "0", priceOutput: "0", priceCache: form.priceCache === "" ? "" : "0" })}
              >
                设为限时免费
              </Button>
            </div>
            <div className="flex gap-3">
              <label className="block flex-1 text-xs font-medium text-slate-500">
                输入价
                <Input inputMode="decimal" value={form.priceInput} onChange={(e) => setForm({ ...form, priceInput: e.target.value })} className="mt-1" />
              </label>
              <label className="block flex-1 text-xs font-medium text-slate-500">
                输出价
                <Input inputMode="decimal" value={form.priceOutput} onChange={(e) => setForm({ ...form, priceOutput: e.target.value })} className="mt-1" />
              </label>
              <label className="block w-28 text-xs font-medium text-slate-500">
                缓存价（可选）
                <Input inputMode="decimal" value={form.priceCache} onChange={(e) => setForm({ ...form, priceCache: e.target.value })} className="mt-1" />
              </label>
            </div>
            {formFree ? <p className="text-xs text-emerald-700">前台将显示「限时免费」徽标，窗口内调用按 0 计费。</p> : null}
            <div className="flex gap-3">
              <label className="block flex-1 text-xs font-medium text-slate-500">
                开始（北京时间）
                <Input type="datetime-local" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="mt-1" />
              </label>
              <label className="block flex-1 text-xs font-medium text-slate-500">
                结束（北京时间，不含）
                <Input type="datetime-local" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} className="mt-1" />
              </label>
            </div>
            <label className="block text-xs font-medium text-slate-500">
              备注（可选，前台不展示）
              <Input value={form.notes} maxLength={200} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
            </label>
            <p className="text-[11px] leading-relaxed text-slate-400">
              同一模型的优惠窗口不能重叠；窗口为 [开始, 结束)，到结束时刻自动恢复原价。保存后价格页、模型详情与天梯图即时生效。
            </p>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title="删除限时优惠"
        message={deleting ? `确认删除「${deleting.modelName ?? modelById.get(deleting.modelId)?.name ?? deleting.modelId}」的这条优惠？删除后立即恢复原价。` : ""}
        confirmLabel="删除"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

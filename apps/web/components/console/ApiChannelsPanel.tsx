"use client";

/**
 * 外部渠道面板（乙 · 后端统一；控制台优化 M2 体验闭环）。
 *
 * 设计要点：
 * - **单端点读侧**：GET `/api/v1/user/channels` 一次拉齐 station + custom，**数据库为唯一事实源**，
 *   前端不再本地拼装 `/user/station-keys` + `/user/custom-channels`；
 * - **写侧复用既有端点**（避免重写引入回归）：
 *   - custom 新建：POST `/api/v1/user/custom-channels`
 *   - custom 编辑：PATCH `/api/v1/user/custom-channels/[id]`（apiKey 留空=不换 Key）
 *   - station 新建：POST `/api/v1/user/station-keys`（`stationId` 支持 `catalog:<code>`，后端解析落库）
 *   - 启停：PATCH `/api/v1/user/{custom-channels|station-keys}/[id]`
 *   - 删除：DELETE 同路径
 * - **M2 体验闭环**：新增/编辑表单统一走 `@aidean/ui` `Dialog`（取消/确认 footer、ESC、遮罩关闭）；
 *   删除二次确认用站点版 `Dialog` 取代原生 `window.confirm`；行内补「编辑」入口；控件标准化为 `Button/Input`。
 * - **脱敏**：`apiKeyMasked` 仅展示掩码，明文/密文任何接口不回显。
 *
 * 导航性能优化（2026-10-09）：
 * stations 目录请求改为懒加载——仅在用户打开新增表单（draft !== null）时才 fetch，
 * 进入外部渠道 tab 首屏请求数 2→1。
 */
import type { ApiChannelView, GatewayFormat } from "@aidean/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Dialog, Input } from "@aidean/ui";

/** 上游协议格式选择项（与单一真源 GATEWAY_FORMATS 四值对齐） */
const FORMAT_OPTIONS: ReadonlyArray<{ value: GatewayFormat; label: string }> = [
  { value: "openai", label: "OpenAI（Chat Completions）" },
  { value: "anthropic", label: "Anthropic（Messages）" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "gemini", label: "Google Gemini" },
];

interface Envelope<T> {
  code: number;
  message?: string;
  data?: T | null;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.code !== 0 || body.data === undefined || body.data === null) {
    throw new Error(body?.message ?? "请求失败");
  }
  return body.data;
}

const KIND_LABEL: Record<ApiChannelView["kind"], string> = {
  station: "平台渠道",
  custom: "自定义渠道",
};

interface CatalogOption {
  id: string;
  displayName: string;
  code?: string;
  icon?: string;
}

interface Draft {
  kind: "station" | "custom";
  stationId: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  format: GatewayFormat;
  priority: string;
  groupName: string;
  weight: string;
  /** 编辑既有 custom 渠道时的目标 id；新建为 null */
  editingId: string | null;
}

const EMPTY_DRAFT: Draft = {
  kind: "custom",
  stationId: "",
  name: "",
  baseUrl: "",
  apiKey: "",
  format: "openai",
  priority: "100",
  groupName: "",
  weight: "1",
  editingId: null,
};

export function ApiChannelsPanel() {
  const [items, setItems] = useState<ApiChannelView[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [catalog, setCatalog] = useState<CatalogOption[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ApiChannelView | null>(null);

  const isEdit = draft?.editingId != null;

  const load = useCallback(async () => {
    setListError(null);
    try {
      const body = await api<{ items: ApiChannelView[] }>("/api/v1/user/channels");
      setItems(body.items);
    } catch (e) {
      setListError((e as Error).message);
      setItems([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load();
  }, [load]);

  // stations 目录懒加载：仅在用户打开新增表单（draft !== null）时才 fetch，
  // 进入外部渠道 tab 首屏请求数 2→1。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (draft === null || draft.kind !== "station") return;
    if (catalog.length > 0) return; // 已加载则复用，避免每次开表单重复请求
    let cancelled = false;
    void (async () => {
      try {
        const body = await api<{ items: CatalogOption[] }>("/api/v1/user/station-keys/stations");
        if (!cancelled) setCatalog(body.items);
      } catch {
        // 目录不可用不阻塞录入，用户可手填 baseUrl
      }
    })();
    return () => {
      cancelled = true;
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const station = (items ?? []).filter((i) => i.kind === "station").length;
    const custom = (items ?? []).filter((i) => i.kind === "custom").length;
    const active = (items ?? []).filter((i) => i.isActive).length;
    return { total: items?.length ?? 0, active, station, custom };
  }, [items]);

  function openAdd() {
    setFormError(null);
    setNotice(null);
    setDraft({ ...EMPTY_DRAFT });
  }

  function openEdit(item: ApiChannelView) {
    setFormError(null);
    setNotice(null);
    setDraft({
      kind: "custom",
      stationId: "",
      name: item.name,
      baseUrl: item.baseUrl ?? "",
      apiKey: "",
      format: item.format,
      priority: String(item.priority ?? 100),
      groupName: item.groupName ?? "",
      weight: String(item.weight ?? 1),
      editingId: item.id,
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft) return;
    setFormError(null);
    setSubmitting(true);
    try {
      if (draft.kind === "custom") {
        const body: Record<string, unknown> = {
          name: draft.name.trim(),
          baseUrl: draft.baseUrl.trim(),
          format: draft.format,
          priority: Number(draft.priority) || 100,
          groupName: draft.groupName.trim() || null,
          weight: Number(draft.weight) || 1,
        };
        // apiKey 仅在用户填写时才提交（编辑时留空 = 不换密钥）
        if (draft.apiKey.trim()) body.apiKey = draft.apiKey.trim();
        if (draft.editingId) {
          await api(`/api/v1/user/custom-channels/${draft.editingId}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
          setNotice("渠道已保存");
        } else {
          await api("/api/v1/user/custom-channels", {
            method: "POST",
            body: JSON.stringify({ ...body, models: [] as string[] }),
          });
          setNotice("渠道已添加");
        }
      } else {
        const body = { stationId: draft.stationId, apiKey: draft.apiKey, name: draft.name.trim() || undefined };
        await api("/api/v1/user/station-keys", { method: "POST", body: JSON.stringify(body) });
        setNotice("渠道已添加");
      }
      setDraft(null);
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: ApiChannelView) {
    setBusyId(item.id);
    setNotice(null);
    try {
      await api(`/api/v1/user/${item.kind === "custom" ? "custom-channels" : "station-keys"}/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      setNotice(`${item.name} 已${item.isActive ? "停用" : "启用"}`);
      await load();
    } catch (e) {
      setNotice(`操作失败：${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemove() {
    const item = deleteTarget;
    if (!item) return;
    setBusyId(item.id);
    setNotice(null);
    try {
      await api(`/api/v1/user/${item.kind === "custom" ? "custom-channels" : "station-keys"}/${item.id}`, {
        method: "DELETE",
      });
      setNotice(`已删除「${item.name}」`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setNotice(`删除失败：${(e as Error).message}`);
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="外部渠道" data-testid="console-api-channels" className="mt-8 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">外部渠道</h3>
          <p className="mt-1 text-sm text-slate-500">
            所有可用上游渠道（平台渠道 + 自定义渠道）一次加载，数据以数据库为准。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()} className="h-9 rounded-md border border-border px-3">
            刷新
          </Button>
          <Button variant="dark" size="sm" onClick={openAdd} className="h-9 rounded-md border border-border px-3 font-medium">
            添加渠道
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="渠道总数" value={stats.total} />
        <StatCard label="已启用" value={stats.active} />
        <StatCard label="平台渠道" value={stats.station} />
        <StatCard label="自定义渠道" value={stats.custom} />
      </div>

      {notice && <p className="mt-3 text-sm text-slate-500" aria-live="polite">{notice}</p>}
      {listError && <p className="mt-3 text-sm text-red-600">{listError}</p>}

      {(items ?? []).length === 0 && !listError ? (
        <p className="mt-4 text-sm text-slate-400">暂无渠道，点击右上「添加渠道」开始。</p>
      ) : (
        <div className="mt-4 space-y-2">
          {(items ?? []).map((item) => (
            <ChannelRow
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onToggle={() => void toggleActive(item)}
              onEdit={item.kind === "custom" ? () => openEdit(item) : undefined}
              onRemove={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      {/* 新增 / 编辑渠道：统一 Dialog 承载（取消/确认 footer、ESC、遮罩关闭） */}
      <Dialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={isEdit ? "编辑渠道" : "添加渠道"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)} className="h-9 rounded-md border border-border px-4">
              取消
            </Button>
            <Button
              type="submit"
              form="channel-form"
              disabled={submitting}
              variant="dark"
              className="h-9 rounded-md border border-border px-4 font-medium disabled:opacity-50"
            >
              {submitting ? "提交中…" : isEdit ? "保存" : "添加"}
            </Button>
          </>
        }
      >
        {draft && (
          <form id="channel-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              {(["custom", "station"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  disabled={isEdit}
                  onClick={() => setDraft({ ...draft, kind })}
                  className={`rounded px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                    draft.kind === kind ? "bg-foreground text-background" : "border border-border text-slate-600"
                  }`}
                >
                  {KIND_LABEL[kind]}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {draft.kind === "station" ? (
                <label className="text-sm">
                  <span className="text-slate-600">选择平台</span>
                  <select
                    required
                    value={draft.stationId}
                    onChange={(e) => setDraft({ ...draft, stationId: e.target.value })}
                    className="mt-1 block w-full rounded border border-border bg-card px-2 py-1.5"
                  >
                    <option value="">请选择官方平台…</option>
                    {catalog.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block text-sm">
                  <span className="text-slate-600">名称</span>
                  <Input
                    required
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="例如 我的中转"
                    maxLength={64}
                    className="mt-1"
                  />
                </label>
              )}
              {draft.kind === "custom" && (
                <label className="block text-sm">
                  <span className="text-slate-600">Base URL</span>
                  <Input
                    required
                    type="url"
                    value={draft.baseUrl}
                    onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                    placeholder="https://relay.example.com/v1"
                    className="mt-1"
                  />
                </label>
              )}
              {draft.kind === "custom" && (
                <label className="text-sm">
                  <span className="text-slate-600">格式</span>
                  <select
                    value={draft.format}
                    onChange={(e) => setDraft({ ...draft, format: e.target.value as Draft["format"] })}
                    className="mt-1 block w-full rounded border border-border bg-card px-2 py-1.5"
                  >
                    {FORMAT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {draft.kind === "custom" && (
                <label className="block text-sm">
                  <span className="text-slate-600">优先级（小者优先，1-999）</span>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={draft.priority}
                    onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                    className="mt-1"
                  />
                </label>
              )}
              {draft.kind === "custom" && (
                <label className="block text-sm">
                  <span className="text-slate-600">分组标签</span>
                  <Input
                    value={draft.groupName}
                    onChange={(e) => setDraft({ ...draft, groupName: e.target.value })}
                    placeholder="可选"
                    maxLength={32}
                    className="mt-1"
                  />
                </label>
              )}
              {draft.kind === "custom" && (
                <label className="block text-sm">
                  <span className="text-slate-600">权重（同优先级分摊）</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={draft.weight}
                    onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                    className="mt-1"
                  />
                </label>
              )}
              <label className="block text-sm sm:col-span-2">
                <span className="text-slate-600">API Key{isEdit ? "（留空=不换）" : ""}</span>
                <Input
                  required={!isEdit}
                  value={draft.apiKey}
                  onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                  placeholder={isEdit ? "不修改请留空" : "仅提交一次，列表仅回显掩码"}
                  className="mt-1"
                />
              </label>
            </div>
            {draft.kind === "station" && (
              <p className="text-xs text-slate-400">选择平台后填写对应平台 API Key；目录中已入库的平台直接复用真实站点。</p>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </form>
        )}
      </Dialog>

      {/* 删除二次确认：站点版 Dialog 取代原生 window.confirm */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="确认删除渠道"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="h-9 rounded-md border border-border px-4">
              取消
            </Button>
            <Button variant="danger" onClick={() => void confirmRemove()} className="h-9 rounded-md px-4 font-medium">
              确认删除
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-foreground">
            确认删除「{deleteTarget.name}」？删除后不可恢复。
          </p>
        )}
      </Dialog>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ChannelRow({
  item,
  busy,
  onToggle,
  onEdit,
  onRemove,
}: {
  item: ApiChannelView;
  busy: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onRemove: () => void;
}) {
  const badge =
    item.kind === "custom" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700";
  return (
    <div
      data-testid={`channel-row-${item.kind}-${item.id}`}
      className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 ${item.isActive ? "border-border" : "border-dashed opacity-60"}`}
    >
      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge}`}>{KIND_LABEL[item.kind]}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.name}</span>
      <span className="text-xs text-slate-400">{item.format}</span>
      {item.kind === "custom" && item.priority !== undefined && (
        <span className="text-xs text-slate-400">优先级 {item.priority}</span>
      )}
      {item.kind === "custom" && item.weight !== undefined && item.weight !== 1 && (
        <span className="text-xs text-slate-400">权重 {item.weight}</span>
      )}
      {item.kind === "custom" && item.groupName && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{item.groupName}</span>
      )}
      <span className="font-mono text-xs text-slate-400">{item.apiKeyMasked}</span>
      <span className={`text-xs ${item.isActive ? "text-emerald-600" : "text-slate-400"}`}>
        {item.isActive ? "启用" : "停用"}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        {onEdit && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onEdit} className="h-7 rounded border border-border px-2">
            编辑
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={busy} onClick={onToggle} className="h-7 rounded border border-border px-2">
          {item.isActive ? "停用" : "启用"}
        </Button>
        <Button variant="danger" size="sm" disabled={busy} onClick={onRemove} className="h-7 rounded px-2 text-white">
          删除
        </Button>
      </div>
    </div>
  );
}

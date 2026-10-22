"use client";

/**
 * 模型管理表格（R-31 AdminDataTable + R-32 Dialog/Button/Input）：
 * - 分页/搜索（modelCode/nameDisplay）/厂商列
 * - 行内编辑 isActive 开关与 visibility 下拉（PATCH 白名单字段）
 * - 新增模型按钮 + 表单弹窗（POST /api/v1/admin/models）T-2.2.5
 * - 删除按钮 + 二次确认（DELETE /api/v1/admin/models/[id]）T-2.2.6
 * - 批量操作（R-16）
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Dialog, Button, Input, Label, Select } from "@aidean/ui";
import { ConfirmDialog } from "./ConfirmDialog";

interface ModelRow {
  id: string;
  modelCode: string;
  nameDisplay: string;
  vendorName: string;
  visibility: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

interface VendorOption {
  id: string;
  nameDisplay: string;
}

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "公开",
  LOGIN_ONLY: "需登录",
  PAID_ONLY: "付费可见",
  HIDDEN: "隐藏",
};

const MODEL_TYPE_LABEL: Record<string, string> = {
  CHAT: "对话",
  REASONING: "推理",
  MULTIMODAL: "多模态",
  CODE: "代码",
  VISION: "视觉",
};

const PROTOCOL_LABEL: Record<string, string> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  GOOGLE: "Google",
  CUSTOM: "自定义",
  RESPONSES: "Responses",
};

const EMPTY_FORM = {
  modelCode: "",
  nameDisplay: "",
  slug: "",
  vendorId: "",
  modelType: "CHAT",
  protocol: "OPENAI",
  visibility: "HIDDEN",
  contextLength: "",
  description: "",
};

export function ModelsTable({ initialData }: { initialData?: { models: ModelRow[]; total: number } }) {
  // 首屏服务端预取命中时：直接用初始数据渲染，不进入 loading，并跳过挂载后的首次客户端往返。
  // 未命中（无 initialData / 预取失败降级）时，行为与旧版一致（loading 首帧 true + 挂载即拉）。
  const [rows, setRows] = useState<ModelRow[]>(initialData?.models ?? []);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(!initialData);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const skipFirstFetch = useRef(!!initialData);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pageSize = 20;

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [creating, setCreating] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ModelRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Batch selection state (R-16)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  function handleBatch(action: "activate" | "deactivate" | "hide" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete") {
      setPendingDelete(true);
      return;
    }
    void executeBatch(action);
  }

  async function executeBatch(action: "activate" | "deactivate" | "hide" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete") {
      setPendingDelete(true);
      return;
    }
    setBatchBusy(true);
    const res = await adminFetch<{ affected: number }>("/api/v1/admin/models/batch", {
      method: "POST",
      body: JSON.stringify({ ids: [...selectedIds], action }),
    });
    setBatchBusy(false);
    if (res.ok) {
      setSelectedIds(new Set());
      setMessage(`批量${action} 完成: ${res.data?.affected ?? 0} 条受影响`);
      void load(page, search);
    } else {
      setMessage(res.message);
    }
  }

  const load = useCallback(async (p: number, query: string) => {
    setLoading(true);
    const res = await adminFetch<{ models: ModelRow[]; total: number }>(
      `/api/v1/admin/models?page=${p}&pageSize=${pageSize}${query ? `&q=${encodeURIComponent(query)}` : ""}`
    );
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.models);
      setTotal(res.data.total);
      setMessage(null);
    } else {
      setMessage(res.message ?? "加载失败");
    }
  }, []);

  useEffect(() => {
    // 预取命中：消费一次即置 false，跳过与首屏数据重复的 page=1/search="" 拉取。
    // （dev reactStrictMode 会双跑 effect，第二次 skipFirstFetch 已为 false → 仍会拉一次，属 dev 现象；prod 单次即跳过。）
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    void load(page, search);
  }, [load, page, search]);

  async function loadVendors() {
    const res = await adminFetch<{ vendors: VendorOption[] }>("/api/v1/admin/vendors?pageSize=100");
    if (res.ok && res.data) {
      setVendors(res.data.vendors);
    }
  }

  async function patchModel(id: string, body: Record<string, unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    const res = await adminFetch(`/api/v1/admin/models/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "操作失败");
      return;
    }
    setMessage(done);
    await load(page, search);
  }

  async function handleCreate() {
    if (!createForm.modelCode || !createForm.nameDisplay) {
      setMessage("modelCode 和 nameDisplay 为必填");
      return;
    }
    setCreating(true);
    setMessage(null);
    const body = {
      ...createForm,
      contextLength: createForm.contextLength ? parseInt(createForm.contextLength) : undefined,
    };
    const res = await adminFetch("/api/v1/admin/models", { method: "POST", body: JSON.stringify(body) });
    setCreating(false);
    if (!res.ok) {
      setMessage(res.message ?? "创建失败");
      return;
    }
    setMessage(`✅ 模型 ${createForm.modelCode} 已创建（审计日志已记录）`);
    setShowCreate(false);
    setCreateForm({ ...EMPTY_FORM });
    await load(1, search);
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setMessage(null);
    const res = await adminFetch(`/api/v1/admin/models/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setMessage(res.message ?? "删除失败");
      setDeleteTarget(null);
      return;
    }
    setMessage(`✅ 模型 ${deleteTarget.modelCode} 已软删除（审计日志已记录，前台即时生效）`);
    setDeleteTarget(null);
    await load(page, search);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: Column<ModelRow>[] = [
    {
      key: "model",
      header: "模型",
      className: "px-3 py-2",
      render: m => (
        <div>
          <div className="text-slate-800">{m.nameDisplay}</div>
          <div className="text-xs text-slate-500">{m.modelCode}</div>
        </div>
      ),
    },
    { key: "vendor", header: "厂商", className: "px-3 py-2 text-slate-500", render: m => <span>{m.vendorName}</span> },
    {
      key: "isActive",
      header: "上架",
      className: "px-3 py-2",
      render: m => (
        <Label className="inline-flex cursor-pointer items-center gap-1.5 font-normal">
          <input
            type="checkbox"
            checked={m.isActive}
            disabled={busy}
            onChange={(e) =>
              void patchModel(m.id, { isActive: e.target.checked }, `已${e.target.checked ? "上架" : "下架"} ${m.modelCode}（前台 /models 即时生效）`)
            }
            aria-label={`${m.modelCode} 上架开关`}
            className="h-4 w-4 accent-indigo-500"
          />
          <span className={`text-xs ${m.isActive ? "text-emerald-600" : "text-slate-500"}`}>
            {m.isActive ? "上架" : "下架"}
          </span>
        </Label>
      ),
    },
    {
      key: "visibility",
      header: "可见性",
      className: "px-3 py-2",
      render: m => (
        <>
          <span className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${m.visibility === "PUBLIC" ? "bg-emerald-100 text-emerald-700" : m.visibility === "HIDDEN" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
            {VISIBILITY_LABEL[m.visibility]}
          </span>
          <Select size="sm"
            aria-label={`${m.modelCode} 可见性`}
            value={m.visibility}
            disabled={busy}
            onChange={(e) => void patchModel(m.id, { visibility: e.target.value }, "可见性已更新")}
            className="bg-white text-slate-700 shadow-[var(--shadow-sm)]"
          >
            {Object.entries(VISIBILITY_LABEL).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </Select>
        </>
      ),
    },
    {
      key: "isFeatured",
      header: "推荐",
      className: "px-3 py-2",
      render: m => (
        <input
          type="checkbox"
          checked={m.isFeatured}
          disabled={busy}
          onChange={(e) => void patchModel(m.id, { isFeatured: e.target.checked }, "推荐位已更新")}
          aria-label={`${m.modelCode} 推荐开关`}
          className="h-4 w-4 accent-amber-500"
        />
      ),
    },
    {
      key: "sortOrder",
      header: "排序",
      className: "px-3 py-2",
      render: m => (
        <Input
          type="number"
          min={0}
          max={9999}
          defaultValue={m.sortOrder}
          disabled={busy}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (Number.isInteger(v) && v >= 0 && v <= 9999 && v !== m.sortOrder) {
              void patchModel(m.id, { sortOrder: v }, "排序已更新");
            }
          }}
          aria-label={`${m.modelCode} 排序值`}
          className="w-16 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs tabular-nums text-slate-700 shadow-[var(--shadow-sm)]"
        />
      ),
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: m => (
        <Button variant="danger" size="sm" disabled={busy} onClick={() => setDeleteTarget(m)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <Input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="按 modelCode / 名称搜索"
          aria-label="搜索模型"
          className="w-72"
        />
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-sm text-[var(--primary-foreground)] transition-opacity hover:opacity-90">
          搜索
        </button>
        <button
          type="button"
          onClick={() => {
            void loadVendors();
            setShowCreate(true);
          }}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
        >
          + 新增模型
        </button>
        <span className="ml-auto text-xs text-slate-500">共 {total} 个模型</span>
      </form>

      {selectedIds.size > 0 ? (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-primary/5 px-3 py-2">
          <span className="text-xs text-primary">已选 {selectedIds.size} 项</span>
          <Button variant="primary" size="sm" disabled={batchBusy} onClick={() => void handleBatch("activate")}>批量上架</Button>
          <Button variant="outline" size="sm" disabled={batchBusy} onClick={() => void handleBatch("deactivate")}>批量下架</Button>
          <Button variant="ghost" size="sm" disabled={batchBusy} onClick={() => void handleBatch("hide")}>批量隐藏</Button>
          <Button variant="danger" size="sm" disabled={batchBusy} onClick={() => void handleBatch("delete")}>批量删除</Button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-400">取消选择</button>
        </div>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={m => m.id}
        emptyText={search ? "未找到匹配模型" : "暂无模型"}
        busy={busy || loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        selectable
        selectedIds={selectedIds}
        onToggleRow={id => {
          const next = new Set(selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIds(next);
        }}
        onToggleAll={() => {
          if (rows.every(r => selectedIds.has(r.id))) setSelectedIds(new Set());
          else setSelectedIds(new Set(rows.map(r => r.id)));
        }}
      />

      {/* Create Model Dialog — R-32 @aidean/ui Dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="新增模型"
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={creating} onClick={() => void handleCreate()}>
              {creating ? "创建中..." : "创建"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Label className="block">
            <span className="text-xs text-slate-500">模型代码 (modelCode) *</span>
            <Input
              type="text"
              value={createForm.modelCode}
              onChange={(e) => setCreateForm({ ...createForm, modelCode: e.target.value })}
              placeholder="gpt-4o, claude-3-opus"
              className="mt-1"
            />
          </Label>
          <Label className="block">
            <span className="text-xs text-slate-500">显示名称 *</span>
            <Input
              type="text"
              value={createForm.nameDisplay}
              onChange={(e) => setCreateForm({ ...createForm, nameDisplay: e.target.value })}
              className="mt-1"
            />
          </Label>
          <Label className="block">
            <span className="text-xs text-slate-500">Slug</span>
            <Input
              type="text"
              value={createForm.slug}
              onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
              placeholder="留空则自动生成"
              className="mt-1"
            />
          </Label>
          <Label className="block">
            <span className="text-xs text-slate-500">厂商</span>
            <Select
              value={createForm.vendorId}
              onChange={(e) => setCreateForm({ ...createForm, vendorId: e.target.value })}
              className="mt-1 w-full"
            >
              <option value="">请选择</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.nameDisplay}</option>
              ))}
            </Select>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label className="block">
              <span className="text-xs text-slate-500">类型</span>
              <Select
                value={createForm.modelType}
                onChange={(e) => setCreateForm({ ...createForm, modelType: e.target.value })}
                className="mt-1 w-full"
              >
                {Object.entries(MODEL_TYPE_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </Select>
            </Label>
            <Label className="block">
              <span className="text-xs text-slate-500">协议</span>
              <Select
                value={createForm.protocol}
                onChange={(e) => setCreateForm({ ...createForm, protocol: e.target.value })}
                className="mt-1 w-full"
              >
                {Object.entries(PROTOCOL_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </Select>
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Label className="block">
              <span className="text-xs text-slate-500">可见性</span>
              <Select
                value={createForm.visibility}
                onChange={(e) => setCreateForm({ ...createForm, visibility: e.target.value })}
                className="mt-1 w-full"
              >
                {Object.entries(VISIBILITY_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </Select>
            </Label>
            <Label className="block">
              <span className="text-xs text-slate-500">上下文长度</span>
              <Input
                type="number"
                value={createForm.contextLength}
                onChange={(e) => setCreateForm({ ...createForm, contextLength: e.target.value })}
                placeholder="如 128000"
                className="mt-1"
              />
            </Label>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog — R-32 @aidean/ui Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除模型"
        className="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" size="sm" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          将软删除模型 <strong>{deleteTarget?.nameDisplay}</strong>（{deleteTarget?.modelCode}）。
          此操作会：
        </p>
        <ul className="list-disc pl-5 text-xs text-slate-500">
          <li>设置 deletedAt 时间戳（数据保留，可恢复）</li>
          <li>isActive 置为 false（前台立即不可见）</li>
          <li>写入审计日志（actorId + 变更记录）</li>
          <li>revalidatePath 刷新前台缓存</li>
        </ul>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete}
        title="确认批量删除"
        message={`确认批量删除 ${selectedIds.size} 个模型？（软删，可恢复）`}
        onConfirm={() => { setPendingDelete(false); void executeBatch("delete"); }}
        onCancel={() => setPendingDelete(false)}
      />
    </div>
  );
}

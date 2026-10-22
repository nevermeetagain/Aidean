"use client";

/**
 * 产品管理（SubTask 2.4.2 + R-31 AdminDataTable 接入）：
 * 列表 + 新建/编辑弹层表单 + 软删确认。
 * benefits 以每行一条的多行文本编辑（≤12 条）；status 切换行内直改；
 * PATCH/DELETE 后服务端 revalidatePath("/products")，前台即时生效。
 * 批量操作（R-28）。
 * intro 块（add-subplatform-showcase-pages）：链接为动态行（名称+URL+类型，≤6），
 * 信息条目每行 `分组::标签::值`；行格式错误在提交前拦截，服务端 ProductIntroSchema 兜底。
 */
import { useCallback, useEffect, useState } from "react";

import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Dialog, Button, Input, Label, Select, Textarea } from "@aidean/ui";
import { ConfirmDialog } from "./ConfirmDialog";
import { PRODUCT_CATEGORY_LABELS } from "../../lib/product-label";

type IntroKind = "product" | "repo" | "docs" | "other";
interface IntroLinkRow {
  label: string;
  url: string;
  kind: IntroKind;
}
interface IntroFactGroup {
  group: string;
  items: { label: string; value: string }[];
}
/** 价值层痛点→解法 对照行 */
interface IntroProblemRow {
  problem: string;
  solution: string;
}
/** intro v1（links+facts）+ v2 三层可选区块（enrich-subplatform-intro-pages） */
interface IntroValue {
  version: number;
  links: IntroLinkRow[];
  facts: IntroFactGroup[];
  audience?: string;
  problems?: IntroProblemRow[];
  workflow?: { title: string; steps: string[] };
  promises?: string[];
  ecosystem?: string[];
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  category: string | null;
  tagline: string | null;
  description: string | null;
  badge: string | null;
  benefits: string[];
  intro: IntroValue | null;
  status: string;
  sortOrder: number;
}

interface ProductForm {
  slug: string;
  name: string;
  displayName: string;
  category: string;
  tagline: string;
  description: string;
  badge: string;
  benefitsText: string;
  links: IntroLinkRow[];
  factsText: string;
  // v2 三层区块（每项均可留空；任一有值即保存为 version:2）
  audience: string;
  problemsText: string;
  workflowTitle: string;
  workflowStepsText: string;
  promisesText: string;
  ecosystemText: string;
  status: "ACTIVE" | "DISABLED";
  sortOrder: number;
}

const emptyForm: ProductForm = {
  slug: "",
  name: "",
  displayName: "",
  category: "",
  tagline: "",
  description: "",
  badge: "",
  benefitsText: "",
  links: [],
  factsText: "",
  audience: "",
  problemsText: "",
  workflowTitle: "",
  workflowStepsText: "",
  promisesText: "",
  ecosystemText: "",
  status: "ACTIVE",
  sortOrder: 0,
};

const KIND_OPTIONS: { value: IntroKind; label: string }[] = [
  { value: "product", label: "产品入口" },
  { value: "repo", label: "仓库" },
  { value: "docs", label: "文档" },
  { value: "other", label: "其他" },
];

/**
 * #71 二级分类选项：value 对齐 schema ProductCategory enum，文案唯一来源
 * lib/product-label.ts PRODUCT_CATEGORY_LABELS（后台/导航/列表页同源；新增分类只改一处 + schema enum）。
 */
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "未分类" },
  ...Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

function parseBenefits(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/** 链接行清洗：名称与 URL 均填写才算一条，≤6（协议/长度由服务端 zod 终判） */
function pickLinks(rows: IntroLinkRow[]): IntroLinkRow[] {
  return rows
    .map((r) => ({ label: r.label.trim(), url: r.url.trim(), kind: r.kind || "other" }))
    .filter((r) => r.label && r.url)
    .slice(0, 6);
}

/** 信息条目：每行 `分组::标签::值`；任一行不合规返回 error 阻断提交 */
function parseFacts(text: string): { error?: string; groups: IntroFactGroup[] } {
  const groups: IntroFactGroup[] = [];
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split("::").map((s) => s.trim());
    if (parts.length !== 3 || parts.some((p) => !p)) {
      return { error: `信息条目第 ${i + 1} 行不符合「分组::标签::值」格式：${line}`, groups: [] };
    }
    const [group, label, value] = parts;
    let g = groups.find((x) => x.group === group);
    if (!g) {
      g = { group, items: [] };
      groups.push(g);
    }
    g.items.push({ label, value });
  }
  return { groups };
}

/** 每行一条的清单文本（v2 promises/ecosystem/steps 共用；超条数提交前拦截，长度由服务端 zod 终判） */
function parseLineList(text: string, cap: number, label: string): { error?: string; items: string[] } {
  const items = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length > cap) return { error: `${label}最多 ${cap} 条（当前 ${items.length} 条）`, items: [] };
  return { items };
}

/** 价值层问题条目：每行 `痛点::解法`（≤4，同 parseFacts 的拦截惯例） */
function parseProblems(text: string): { error?: string; rows: IntroProblemRow[] } {
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 4) return { error: `「解决什么问题」最多 4 条（当前 ${lines.length} 条）`, rows: [] };
  const rows: IntroProblemRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i]!.split("::").map((s) => s.trim());
    if (parts.length !== 2 || parts.some((p) => !p)) {
      return { error: `问题条目第 ${i + 1} 行不符合「痛点::解法」格式：${lines[i]}`, rows: [] };
    }
    rows.push({ problem: parts[0]!, solution: parts[1]! });
  }
  return { rows };
}

/** 库内 intro → 表单初值（v1/v2 全量往返，保存不丢字段） */
function introToForm(intro: IntroValue | null): Pick<
  ProductForm,
  | "links" | "factsText"
  | "audience" | "problemsText" | "workflowTitle" | "workflowStepsText" | "promisesText" | "ecosystemText"
> {
  return {
    links: (intro?.links ?? []).map((l) => ({ label: l.label, url: l.url, kind: l.kind })),
    factsText: (intro?.facts ?? []).flatMap((g) => g.items.map((it) => `${g.group}::${it.label}::${it.value}`)).join("\n"),
    audience: intro?.audience ?? "",
    problemsText: (intro?.problems ?? []).map((p) => `${p.problem}::${p.solution}`).join("\n"),
    workflowTitle: intro?.workflow?.title ?? "",
    workflowStepsText: (intro?.workflow?.steps ?? []).join("\n"),
    promisesText: (intro?.promises ?? []).join("\n"),
    ecosystemText: (intro?.ecosystem ?? []).join("\n"),
  };
}

export function ProductsManager() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);

  // Batch selection state (R-28)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  function handleBatch(action: "activate" | "deactivate" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete") {
      setPendingDelete(true);
      return;
    }
    void executeBatch(action);
  }

  async function executeBatch(action: "activate" | "deactivate" | "delete") {
    if (selectedIds.size === 0) return;
    setBatchBusy(true);
    const res = await adminFetch<{ affected: number }>("/api/v1/admin/products/batch", {
      method: "POST",
      body: JSON.stringify({ ids: [...selectedIds], action }),
    });
    setBatchBusy(false);
    if (res.ok) {
      setSelectedIds(new Set());
      setMessage(`批量${action} 完成: ${res.data?.affected ?? 0} 条受影响`);
      void load();
    } else {
      setMessage(res.message);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch<{ products: ProductRow[] }>("/api/v1/admin/products");
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.products);
      setMessage(null);
    } else {
      setMessage(res.message ?? "加载失败");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  }

  function openEdit(p: ProductRow) {
    setForm({
      slug: p.slug,
      name: p.name,
      displayName: p.displayName ?? "",
      category: p.category ?? "",
      tagline: p.tagline ?? "",
      description: p.description ?? "",
      badge: p.badge ?? "",
      benefitsText: p.benefits.join("\n"),
      ...introToForm(p.intro),
      status: p.status === "DISABLED" ? "DISABLED" : "ACTIVE",
      sortOrder: p.sortOrder,
    });
    setEditing(p);
    setCreating(true);
  }

  async function submitForm() {
    if (!form.name.trim()) {
      setMessage("产品名称必填");
      return;
    }
    const facts = parseFacts(form.factsText);
    if (facts.error) {
      setMessage(facts.error);
      return;
    }
    const links = pickLinks(form.links);
    // v2 三层区块：行格式与条数提交前拦截（长度协议由服务端 zod 终判）
    const problems = parseProblems(form.problemsText);
    if (problems.error) {
      setMessage(problems.error);
      return;
    }
    const steps = parseLineList(form.workflowStepsText, 8, "使用步骤");
    if (steps.error) {
      setMessage(steps.error);
      return;
    }
    const promises = parseLineList(form.promisesText, 4, "安全与承诺");
    if (promises.error) {
      setMessage(promises.error);
      return;
    }
    const ecosystem = parseLineList(form.ecosystemText, 4, "生态互通");
    if (ecosystem.error) {
      setMessage(ecosystem.error);
      return;
    }
    const audience = form.audience.trim();
    // 有任意步骤就必须成块；标题留空给默认引导语（zod title 必填 min 1）
    const workflow = steps.items.length > 0 ? { title: form.workflowTitle.trim() || "使用流程", steps: steps.items } : undefined;
    const hasV2 = Boolean(audience || workflow) || problems.rows.length > 0 || promises.items.length > 0 || ecosystem.items.length > 0;
    setBusy(true);
    const common = {
      name: form.name.trim(),
      displayName: form.displayName.trim() || null,
      category: form.category || null,
      tagline: form.tagline.trim() || null,
      description: form.description.trim() || null,
      badge: form.badge.trim() || null,
      benefits: parseBenefits(form.benefitsText),
      // 空块归一为 null（PATCH 语义：null 显式清空 intro 列）；v2 任一字段有值时整体升 version:2
      intro:
        links.length > 0 || facts.groups.length > 0 || hasV2
          ? {
              version: hasV2 ? 2 : 1,
              links,
              facts: facts.groups,
              ...(audience ? { audience } : {}),
              ...(problems.rows.length > 0 ? { problems: problems.rows } : {}),
              ...(workflow ? { workflow } : {}),
              ...(promises.items.length > 0 ? { promises: promises.items } : {}),
              ...(ecosystem.items.length > 0 ? { ecosystem: ecosystem.items } : {}),
            }
          : null,
      status: form.status,
      sortOrder: form.sortOrder,
    };
    const res = editing
      ? await adminFetch(`/api/v1/admin/products/${editing.id}`, { method: "PATCH", body: JSON.stringify(common) })
      : await adminFetch("/api/v1/admin/products", {
          method: "POST",
          body: JSON.stringify({ ...common, slug: form.slug.trim().toLowerCase() }),
        });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "保存失败");
      return;
    }
    setMessage(editing ? "产品已更新（前台 /products 即时生效）" : "产品已创建");
    setCreating(false);
    await load();
  }

  async function toggleStatus(p: ProductRow) {
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/products/${p.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: p.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "操作失败");
      return;
    }
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/products/${deleteTarget.id}`, { method: "DELETE" });
    setBusy(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setMessage(res.message ?? "删除失败");
      return;
    }
    setMessage("产品已软删（前台不再展示）");
    await load();
  }

  // AdminDataTable 列定义
  const columns: Column<ProductRow>[] = [
    {
      key: "name",
      header: "产品",
      className: "px-3 py-2",
      render: p => (
        <div>
          <div className="text-slate-800">{p.name}</div>
          <div className="max-w-64 truncate text-xs text-slate-500">{p.tagline ?? "—"}</div>
        </div>
      ),
    },
    { key: "slug", header: "slug", className: "px-3 py-2 font-mono text-xs text-slate-500", render: p => <span>{p.slug}</span> },
    {
      key: "category",
      header: "分类",
      className: "px-3 py-2",
      render: p => p.category ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {CATEGORY_OPTIONS.find(c => c.value === p.category)?.label ?? p.category}
        </span>
      ) : <span className="text-slate-400">—</span>,
    },
    {
      key: "badge",
      header: "徽标",
      className: "px-3 py-2",
      render: p => p.badge ? (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{p.badge}</span>
      ) : <span className="text-slate-500">—</span>,
    },
    { key: "benefits", header: "权益数", className: "px-3 py-2 tabular-nums text-slate-600", render: p => <span>{p.benefits.length}</span> },
    { key: "sortOrder", header: "排序", className: "px-3 py-2 tabular-nums text-slate-600", render: p => <span>{p.sortOrder}</span> },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: p => (
        <span className={p.status === "ACTIVE" ? "font-medium text-emerald-700" : "text-slate-500"}>
          {p.status === "ACTIVE" ? "上架" : "下架"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: p => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-slate-600" onClick={() => openEdit(p)}>
            编辑
          </Button>
          <Button variant="outline" size="sm" className="text-slate-600" disabled={busy} onClick={() => void toggleStatus(p)}>
            {p.status === "ACTIVE" ? "下架" : "上架"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[var(--danger)]"
            onClick={() => setDeleteTarget(p)}
          >
            删除
          </Button>
        </div>
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

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">共 {rows.length} 个产品</span>
        <Button variant="primary" onClick={openCreate}>
          新建产品
        </Button>
      </div>

      {selectedIds.size > 0 ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-xs text-primary">已选 {selectedIds.size} 项</span>
          <Button size="sm" disabled={batchBusy} onClick={() => void handleBatch("activate")}>批量启用</Button>
          <Button variant="dark" size="sm" disabled={batchBusy} onClick={() => void handleBatch("deactivate")}>批量停用</Button>
          <Button variant="danger" size="sm" disabled={batchBusy} onClick={() => void handleBatch("delete")}>批量删除</Button>
          <Button variant="ghost" size="sm" className="ml-auto text-slate-500" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
        </div>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={p => p.id}
        emptyText="暂无产品，点击右上角「新建产品」"
        busy={busy || loading}
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


      {/* 新建/编辑弹层 — R-32 使用 @aidean/ui Dialog */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={editing ? "编辑产品" : "新建产品"}
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void submitForm()}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Label className="block text-xs font-medium text-slate-500">
            slug（小写字母/数字/连字符{editing ? "，创建后不可改" : ""}）
            <Input
              type="text"
              value={form.slug}
              disabled={!!editing}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="mt-1"
            />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            名称
            <Input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Label className="block text-xs font-medium text-slate-500">
              中文显示名（可选，留空显英文名）
              <Input
                type="text"
                value={form.displayName}
                placeholder="如：信源引擎机器人"
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="mt-1"
              />
            </Label>
            <Label className="block text-xs font-medium text-slate-500">
              二级分类（#71）
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 block w-full bg-white"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Label>
          </div>
          <Label className="block text-xs font-medium text-slate-500">
            一句话简介（可选）
            <Input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="mt-1"
            />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            徽标文案（可选，如「已上线」）
            <Input
              type="text"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              className="mt-1"
            />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            详细描述（可选）
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full bg-white text-slate-800"
            />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            权益条目（每行一条，≤12 条）
            <Textarea
              rows={4}
              value={form.benefitsText}
              onChange={(e) => setForm({ ...form, benefitsText: e.target.value })}
              className="mt-1 w-full bg-white text-slate-800"
            />
          </Label>
          {/* intro 块（add-subplatform-showcase-pages）：链接动态行 + 信息条目多行文本 */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">介绍页链接（≤6 条；「产品入口」渲染为主按钮，其余为描边按钮）</p>
            {form.links.map((row, i) => (
              <div key={i} className="mt-2 flex items-center gap-2">
                <Input
                  type="text"
                  value={row.label}
                  placeholder="名称"
                  onChange={(e) =>
                    setForm({ ...form, links: form.links.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)) })
                  }
                  className="w-24 shrink-0"
                />
                <Input
                  type="url"
                  value={row.url}
                  placeholder="https://…"
                  onChange={(e) =>
                    setForm({ ...form, links: form.links.map((r, idx) => (idx === i ? { ...r, url: e.target.value } : r)) })
                  }
                  className="min-w-0 flex-1"
                />
                <Select aria-label="类型" size="sm"
                  value={row.kind}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      links: form.links.map((r, idx) => (idx === i ? { ...r, kind: e.target.value as IntroKind } : r)),
                    })
                  }
                  className="w-20 shrink-0 bg-white text-slate-800"
                >
                  {KIND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-[var(--danger)]"
                  onClick={() => setForm({ ...form, links: form.links.filter((_, idx) => idx !== i) })}
                >
                  删
                </Button>
              </div>
            ))}
            {form.links.length < 6 ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-slate-600"
                onClick={() => setForm({ ...form, links: [...form.links, { label: "", url: "", kind: "other" }] })}
              >
                ＋ 添加链接
              </Button>
            ) : null}
          </div>
          <Label className="block text-xs font-medium text-slate-500">
            信息条目（每行「分组::标签::值」，如 交付::交付形态::Docker Compose 一键部署；面向读者用业务语言，勿堆技术栈）
            <Textarea
              rows={4}
              value={form.factsText}
              onChange={(e) => setForm({ ...form, factsText: e.target.value })}
              className="mt-1 w-full bg-white text-slate-800"
            />
          </Label>
          {/* 三层介绍区块（enrich-subplatform-intro-pages #70）：任一字段有值即保存为 intro v2，前台按三层区块渲染 */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">
              三层介绍内容（可选；受众 → 价值 → 流程 → 决策，填写任一项保存后介绍页即升级 v2 区块）
            </p>
            <Label className="mt-2 block text-xs font-medium text-slate-500">
              适用人群·身份层（≤80 字）
              <Input
                type="text"
                value={form.audience}
                placeholder="如：需要长期沉淀公众号内容并检索复用的人"
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                className="mt-1"
              />
            </Label>
            <Label className="mt-2 block text-xs font-medium text-slate-500">
              解决什么问题·价值层（每行「痛点::解法」，≤4 行）
              <Textarea
                rows={4}
                value={form.problemsText}
                placeholder={"公众号文章散在收藏夹里找不到::链接发给机器人即入库"}
                onChange={(e) => setForm({ ...form, problemsText: e.target.value })}
                className="mt-1 w-full bg-white text-slate-800"
              />
            </Label>
            <div className="mt-2 flex items-end gap-2">
              <Label className="block min-w-0 flex-1 text-xs font-medium text-slate-500">
                如何使用·流程标题
                <Input
                  type="text"
                  value={form.workflowTitle}
                  placeholder="如：一条链接到可用的知识库"
                  onChange={(e) => setForm({ ...form, workflowTitle: e.target.value })}
                  className="mt-1"
                />
              </Label>
            </div>
            <Label className="mt-2 block text-xs font-medium text-slate-500">
              使用步骤（每行一步，≤8 步；有步骤才会成块，标题留空默认「使用流程」）
              <Textarea
                rows={4}
                value={form.workflowStepsText}
                placeholder={"发送公众号链接给机器人\n选择订阅范围\n自动解析入库\n随时问答并附原文溯源"}
                onChange={(e) => setForm({ ...form, workflowStepsText: e.target.value })}
                className="mt-1 w-full bg-white text-slate-800"
              />
            </Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Label className="block text-xs font-medium text-slate-500">
                生态互通·决策层（每行一条，≤4）
                <Textarea
                  rows={3}
                  value={form.ecosystemText}
                  placeholder={"与主平台账号统一登录"}
                  onChange={(e) => setForm({ ...form, ecosystemText: e.target.value })}
                  className="mt-1 w-full bg-white text-slate-800"
                />
              </Label>
              <Label className="block text-xs font-medium text-slate-500">
                安全与承诺·决策层（每行一条，≤4）
                <Textarea
                  rows={3}
                  value={form.promisesText}
                  placeholder={"私有部署，数据留在自有环境"}
                  onChange={(e) => setForm({ ...form, promisesText: e.target.value })}
                  className="mt-1 w-full bg-white text-slate-800"
                />
              </Label>
            </div>
          </div>
          <div className="flex gap-4">
            <Label className="block text-xs font-medium text-slate-500">
              状态
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProductForm["status"] })}
                className="mt-1 block w-32 bg-white text-slate-800"
              >
                <option value="ACTIVE">上架</option>
                <option value="DISABLED">下架</option>
              </Select>
            </Label>
            <Label className="block text-xs font-medium text-slate-500">
              排序（越小越前）
              <Input
                type="number"
                min={0}
                max={999}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="mt-1 w-24"
              />
            </Label>
          </div>
        </div>
      </Dialog>

      {/* 软删确认 — R-32 使用 @aidean/ui Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除产品？"
        className="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => void confirmDelete()}>确认删除</Button>
          </>
        }
      >
        <p className="text-sm text-slate-500">
          将软删 <span className="font-medium text-slate-800">{deleteTarget?.name}</span>（{deleteTarget?.slug}），前台 /products 不再展示。
        </p>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete}
        title="确认批量删除"
        message={`确认批量操作 ${selectedIds.size} 项？`}
        onConfirm={() => { setPendingDelete(false); void executeBatch("delete"); }}
        onCancel={() => setPendingDelete(false)}
      />
    </div>
  );
}

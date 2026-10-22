"use client";

/**
 * 资讯管理（news-admin-cms T3 + R-31 AdminDataTable + R-32 Dialog/Button/Input + S7 类别筛选）：
 * 列表 + 新建/编辑弹层（Markdown 原文编辑 + 预览）+ 硬删确认。
 * 列表顶部按 category 客户端筛选（S7：官方 5 篇归入「官方公告」，可一键聚合编辑）。
 * 编辑回读的是库内原始 contentMarkdown（需求 3：重新编辑仍是 Markdown）；
 * 预览用 marked（gfm/breaks 同服务端）渲染归一化后的文本，仅后台可见、不落库。
 * PATCH/DELETE 后服务端 revalidatePath("/news")，前台即时生效。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Marked } from "marked";
import { NEWS_CATEGORIES, type NewsCategory } from "@aidean/shared";

import { normalizeNewsMarkdown } from "../../lib/features/news/normalize";
import { adminFetch } from "./adminFetch";
import { AdminDataTable, type Column } from "./AdminDataTable";
import { Dialog, Button, Input, Label, Select, Textarea } from "@aidean/ui";

interface NewsRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  contentMarkdown: string;
  pinned: boolean;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
}

interface NewsForm {
  slug: string;
  title: string;
  summary: string;
  category: NewsCategory;
  pinned: boolean;
  status: "DRAFT" | "PUBLISHED";
  contentMarkdown: string;
}

const previewMarked = new Marked({ gfm: true, breaks: true });

function blankForm(): NewsForm {
  return { slug: "", title: "", summary: "", category: "热门", pinned: false, status: "DRAFT", contentMarkdown: "" };
}

export function NewsManager() {
  const [rows, setRows] = useState<NewsRow[]>([]);
  // #35③：列表请求在途（参照 UsersTable #68 模式），首载不闪空态
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsForm>(blankForm());
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [deleteTarget, setDeleteTarget] = useState<NewsRow | null>(null);
  const [filterCat, setFilterCat] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch<{ items: NewsRow[] }>("/api/v1/admin/news");
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.items);
      setMessage(null);
    } else {
      setMessage(res.message ?? "加载失败");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(blankForm());
    setEditId(null);
    setTab("write");
    setEditing(true);
  }

  function openEdit(n: NewsRow) {
    setForm({
      slug: n.slug,
      title: n.title,
      summary: n.summary,
      category: (NEWS_CATEGORIES as readonly string[]).includes(n.category) ? (n.category as NewsCategory) : "热门",
      pinned: n.pinned,
      status: n.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      contentMarkdown: n.contentMarkdown,
    });
    setEditId(n.id);
    setTab("write");
    setEditing(true);
  }

  const previewHtml = useMemo(() => {
    if (tab !== "preview") return "";
    return previewMarked.parse(normalizeNewsMarkdown(form.contentMarkdown), { async: false }) as string;
  }, [tab, form.contentMarkdown]);

  async function submitForm() {
    if (!form.title.trim()) {
      setMessage("标题必填");
      return;
    }
    if (!editId && !form.slug.trim()) {
      setMessage("新建时 slug 必填");
      return;
    }
    if (!form.contentMarkdown.trim()) {
      setMessage("正文（Markdown）必填");
      return;
    }
    setBusy(true);
    const common = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      category: form.category,
      pinned: form.pinned,
      status: form.status,
      contentMarkdown: form.contentMarkdown,
    };
    const res = editId
      ? await adminFetch(`/api/v1/admin/news/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(common),
        })
      : await adminFetch("/api/v1/admin/news", { method: "POST", body: JSON.stringify({ ...common, slug: form.slug.trim().toLowerCase() }) });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "保存失败");
      return;
    }
    setMessage(editId ? "资讯已更新（前台 /news 即时生效）" : "资讯已创建");
    setEditing(false);
    await load();
  }

  async function togglePinned(n: NewsRow) {
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/news/${n.id}`, { method: "PATCH", body: JSON.stringify({ pinned: !n.pinned }) });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message ?? "操作失败");
      return;
    }
    await load();
  }

  async function toggleStatus(n: NewsRow) {
    setBusy(true);
    const res = await adminFetch(`/api/v1/admin/news/${n.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: n.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }),
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
    const res = await adminFetch(`/api/v1/admin/news/${deleteTarget.id}`, { method: "DELETE" });
    setBusy(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setMessage(res.message ?? "删除失败");
      return;
    }
    setMessage("资讯已删除（前台不再展示）");
    await load();
  }

  const columns: Column<NewsRow>[] = [
    {
      key: "title",
      header: "标题",
      className: "px-3 py-2",
      render: n => (
        <div>
          <div className="flex items-center gap-2">
            {n.pinned ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">置顶</span> : null}
            <span className="text-slate-800">{n.title}</span>
          </div>
          <div className="max-w-72 truncate text-xs text-slate-500">{n.summary || "—"}</div>
        </div>
      ),
    },
    { key: "slug", header: "slug", className: "px-3 py-2 font-mono text-xs text-slate-500", render: n => <span>{n.slug}</span> },
    { key: "category", header: "分类", className: "px-3 py-2 text-slate-600", render: n => <span>{n.category}</span> },
    {
      key: "status",
      header: "状态",
      className: "px-3 py-2",
      render: n => <span className={n.status === "PUBLISHED" ? "font-medium text-emerald-700" : "text-slate-500"}>{n.status === "PUBLISHED" ? "已发布" : "草稿"}</span>,
    },
    { key: "publishedAt", header: "发布日期", className: "px-3 py-2 text-xs tabular-nums text-slate-500", render: n => <span>{n.publishedAt ? n.publishedAt.slice(0, 10) : "—"}</span> },
    {
      key: "actions",
      header: "操作",
      className: "px-3 py-2",
      render: n => (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(n)}>编辑</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void togglePinned(n)}>{n.pinned ? "取消置顶" : "置顶"}</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void toggleStatus(n)}>{n.status === "PUBLISHED" ? "转草稿" : "发布"}</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(n)}>删除</Button>
        </div>
      ),
    },
  ];

  const visible = filterCat ? rows.filter((n) => n.category === filterCat) : rows;

  return (
    <div className="space-y-3">
      {message ? (
        <p role="status" className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-white text-slate-800"
          aria-label="按分类筛选"
        >
          <option value="">全部分类</option>
          {NEWS_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <span className="text-xs text-slate-500">共 {visible.length}{filterCat ? ` / ${rows.length}` : ""} 条资讯（{filterCat || "全部"}·置顶恒排最前）</span>
        <Button variant="primary" size="sm" onClick={openCreate}>新建资讯</Button>
      </div>

      <AdminDataTable
        columns={columns}
        rows={visible}
        rowKey={n => n.id}
        emptyText="暂无资讯，点击右上角「新建资讯」"
        busy={busy || loading}
      />

      {/* 新建/编辑 Dialog — R-32 @aidean/ui Dialog */}
      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title={editId ? "编辑资讯" : "新建资讯"}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>取消</Button>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void submitForm()}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Label className="block text-xs font-medium text-slate-500">
              slug（小写字母/数字/连字符{editId ? "，创建后不可改" : ""}）
              <Input
                type="text"
                value={form.slug}
                disabled={!!editId}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="mt-1"
              />
            </Label>
            <Label className="block text-xs font-medium text-slate-500">
              分类
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as NewsCategory })}
                className="mt-1 block w-full bg-white text-slate-800"
              >
                {NEWS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Label>
          </div>
          <Label className="block text-xs font-medium text-slate-500">
            标题
            <Input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
          </Label>
          <Label className="block text-xs font-medium text-slate-500">
            摘要（列表卡片展示，留空自动取正文首行）
            <Textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="mt-1 w-full bg-white text-slate-800"
            />
          </Label>
          <div className="flex items-center gap-5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              置顶（列表恒排最前）
            </Label>
            <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as NewsForm["status"] })}
                className="bg-white text-slate-800"
              >
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">发布</option>
              </Select>
              状态
            </Label>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Button
                variant={tab === "write" ? "primary" : "outline"}
                size="sm"
                onClick={() => setTab("write")}
              >
                编写（Markdown）
              </Button>
              <Button
                variant={tab === "preview" ? "primary" : "outline"}
                size="sm"
                onClick={() => setTab("preview")}
              >
                预览
              </Button>
              <span className="text-[11px] text-slate-400">支持 ()[] 等含括号链接；保存的始终是 Markdown 原文</span>
            </div>
            {tab === "write" ? (
              <Textarea
                rows={14}
                value={form.contentMarkdown}
                onChange={(e) => setForm({ ...form, contentMarkdown: e.target.value })}
                placeholder={"## 小标题\n\n正文支持 GFM：列表、表格、代码块、链接 [文本](https://example.com/a(b)c) 等。"}
                className="mt-2 w-full bg-white font-mono text-[13px] leading-6 text-slate-800"
              />
            ) : (
              <div
                className="news-content mt-2 max-h-80 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3"
                dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-slate-400">暂无内容</p>' }}
              />
            )}
          </div>
        </div>
      </Dialog>

      {/* 硬删确认 Dialog — R-32 @aidean/ui Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除资讯？"
        className="max-w-sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => void confirmDelete()}>确认删除</Button>
          </>
        }
      >
        <p className="mt-2 text-sm text-slate-500">
          将删除 <span className="font-medium text-slate-800">{deleteTarget?.title}</span>（{deleteTarget?.slug}），前台 /news 立即消失，操作留审计。
        </p>
      </Dialog>
    </div>
  );
}

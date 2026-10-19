"use client";

/**
 * 控制台 · 我的收藏面板（TASK-023 · 契约⑥「控制台·我的收藏」五态）。
 *
 * 五态（data-testid）：favs-empty / favs-loading / favs-error（重试）/ favs-disabled（开关关）/ favs-list。
 * 交互：refType 过滤（全部/模型/平台站点）+ 分页 + 删除二次确认；目标已下线项置灰且仍可删除（不级联失效）。
 * 一致性：删除成功后回写模块级 store（useFavoritesStore），使详情页/天梯卡片按钮即时同步为「未收藏」。
 * 数据源：GET/DELETE /api/v1/user/favorites（withApi 信封；TASK-022）。自包含，范式对齐 ApiKeysPanel。
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@aidean/ui";
import type { FavoriteItem, FavoriteRefType } from "@aidean/shared";

import { useFavoritesEnabled, useFavoritesLoaded, useFavoritesStore } from "../../hooks/useFavorites";

const TYPE_LABEL: Record<FavoriteRefType, string> = { MODEL: "模型", API_STATION: "平台站点" };
const FILTERS: ReadonlyArray<{ id: "all" | FavoriteRefType; label: string }> = [
  { id: "all", label: "全部" },
  { id: "MODEL", label: "模型" },
  { id: "API_STATION", label: "平台站点" },
];
const PAGE_SIZE = 20;

interface PageData {
  items: FavoriteItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function FavoritesPanel() {
  const enabled = useFavoritesEnabled();
  const loaded = useFavoritesLoaded();
  const [filter, setFilter] = useState<"all" | FavoriteRefType>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("pageSize", String(PAGE_SIZE));
      if (filter !== "all") q.set("refType", filter);
      const res = await fetch(`/api/v1/user/favorites?${q.toString()}`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message ?? "加载失败，请重试");
        setData(null);
      } else {
        setData(body?.data as PageData);
      }
    } catch {
      setError("网络异常，请稍后重试");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  async function remove(item: FavoriteItem) {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/user/favorites/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        // 回写共享 store：详情页/天梯按钮即时同步为未收藏
        useFavoritesStore.getState().applyDelete(`${item.refType}:${item.refId}`);
        setConfirmId(null);
        // 若删完本页最后一条，回退一页
        if (data && data.items.length === 1 && page > 1) setPage((p) => p - 1);
        else void load();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "删除失败");
        setConfirmId(null);
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusyId(null);
    }
  }

  // 首帧载入中（loaded=false）：显骨架，勿误报「暂未开放」（CodeReview M-2）
  if (!loaded) {
    return (
      <section aria-label="我的收藏" className="mt-8 rounded-lg border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground">我的收藏</h3>
        <ul className="mt-4 space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} data-testid="favs-loading" className="h-12 animate-pulse rounded-md bg-slate-100" />
          ))}
          <li className="sr-only">加载中…</li>
        </ul>
      </section>
    );
  }
  // 已载入且开关关闭（含直链深链）：显式禁用态
  if (!enabled) {
    return (
      <section aria-label="我的收藏" className="mt-8 rounded-lg border border-border bg-card p-5">
        <p data-testid="favs-disabled" className="py-6 text-center text-sm text-slate-500">
          收藏功能暂未开放
        </p>
      </section>
    );
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <section aria-label="我的收藏" className="mt-8 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">我的收藏</h3>
        {/* refType 过滤（分段按钮 · group/aria-pressed 语义，CodeReview N-5） */}
        <div role="group" aria-label="收藏类型过滤" className="flex gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              type="button"
              variant={filter === f.id ? "primary" : "ghost"}
              size="sm"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={filter === f.id ? "" : "text-slate-500 hover:text-foreground"}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p data-testid="favs-error" role="status" className="text-sm text-red-700">
            {error}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            重试
          </Button>
        </div>
      )}

      {loading ? (
        <ul className="mt-4 space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} data-testid="favs-loading" className="h-12 animate-pulse rounded-md bg-slate-100" />
          ))}
          <li className="sr-only">加载中…</li>
        </ul>
      ) : error ? null : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
          <p data-testid="favs-empty" className="text-sm text-slate-500">
            还没有收藏，去天梯图看看
          </p>
          <Link
            href="/models"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            前往天梯图
          </Link>
        </div>
      ) : (
        <>
          <ul data-testid="favs-list" className="mt-4 divide-y divide-border">
            {items.map((it) => {
              const offline = it.target === null;
              return (
                <li key={it.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className={"truncate font-medium " + (offline ? "text-slate-400" : "text-foreground")}>
                      {offline ? "（目标已下线）" : it.target!.name}
                      <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        {TYPE_LABEL[it.refType]}
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {offline ? "原收藏目标已不可访问，可删除本条收藏" : `收藏于 ${new Date(it.createdAt).toLocaleDateString()}`}
                      {it.note ? ` · ${it.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!offline && (
                      <Link
                        href={it.target!.href}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        查看
                      </Link>
                    )}
                    {confirmId === it.id ? (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={busyId !== null}
                          onClick={() => void remove(it)}
                          className="h-7 rounded px-2 text-xs font-medium text-white"
                        >
                          {busyId === it.id ? "删除中…" : "确认删除"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmId(null)} className="h-7 rounded border border-border px-2 text-xs">
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => setConfirmId(it.id)}
                        className="text-xs text-red-600 underline-offset-2 hover:underline"
                      >
                        删除
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>
                第 {data?.page ?? 1} / {totalPages} 页 · 共 {data?.total ?? 0} 条
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  上一页
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

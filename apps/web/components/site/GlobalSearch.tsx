"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SearchHit } from "@aidean/shared";

/**
 * 顶栏全局搜索（TASK-034，S5 / REQ-F-15，契约⑥「顶栏全局搜索」五态）。
 *
 * 行为契约：
 * - 唯一搜索入口：桌面端挂在 SiteHeader（≥md），移动端挂在 MobileNav 抽屉顶部（<md）；
 *   除 components/site/ 外全站不出现搜索框。
 * - 防抖 250ms 后发 GET /api/v1/search；旧请求经 AbortController 取消（契约 loading 态）。
 * - 五态（契约⑥ testid）：idle 静默 / search-loading / search-results（按 模型/产品/资讯 分组）/
 *   search-no-hit / search-error（面板内提示，不弹窗）。
 * - 键盘：↑↓ 在命中项间循环、Enter 跳转当前项、Esc 关闭面板；role=combobox/listbox/option。
 * - 三主题（data-theme indigo/teal/orange 仅覆盖 --primary）：对比度由 slate 系文字 +
 *   text-primary 强调色保证，无需 dark: 变体（浅色体系单轨，同 CompareDock 口径）。
 */

const GROUP_LABEL: Record<SearchHit["type"], string> = {
  model: "模型",
  product: "产品",
  news: "资讯",
};
const GROUP_ORDER: SearchHit["type"][] = ["model", "product", "news"];

type Status = "idle" | "loading" | "success" | "empty" | "error";

/** 分组视图模型：保持契约组序，空组不渲染 */
function groupHits(hits: SearchHit[]) {
  return GROUP_ORDER.map((type) => ({ type, label: GROUP_LABEL[type], items: hits.filter((h) => h.type === type) })).filter(
    (g) => g.items.length > 0,
  );
}

export function GlobalSearch({ variant = "desktop" }: { variant?: "desktop" | "mobile" } = {}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => groupHits(hits), [hits]);
  // 扁平命中序列（键盘导航跨组连续）
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
    abortRef.current?.abort();
  }, []);

  // 防抖 250ms + AbortController 取消旧请求（契约 loading 态行为）
  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      abortRef.current?.abort();
      setStatus("idle");
      setHits([]);
      return;
    }
    setStatus("loading");
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}&limit=5`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        if (!res.ok) {
          setStatus("error");
          setHits([]);
          return;
        }
        const body = (await res.json()) as { code: number; data: { hits: SearchHit[] } | null };
        if (controller.signal.aborted) return;
        if (body.code !== 0 || !body.data) {
          setStatus("error");
          setHits([]);
          return;
        }
        setHits(body.data.hits);
        setStatus(body.data.hits.length > 0 ? "success" : "empty");
        setActive(-1);
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        setStatus("error");
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  // 点击组件外关闭（面板内点击不关闭）
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  const go = useCallback(
    (hit: SearchHit | undefined) => {
      if (!hit) return;
      close();
      setQ("");
      router.push(hit.href);
    },
    [close, router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (status !== "success" || flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[active] ?? flat[0]);
    }
  };

  const panelId = `search-panel-${variant}`;
  const showPanel = open && status !== "idle";

  return (
    <div ref={rootRef} className="relative">
      <div
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={panelId}
        aria-haspopup="listbox"
        aria-owns={panelId}
      >
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          // UX-19（EVD-UX-01）：w-44 可用文字宽约 132px（176−pl-8−pr-3），原「搜索模型 / 产品 / 资讯…」≈150px 被截断；
          // 去空格与省略号后 8 个汉字 + 2 斜杠 ≈122px 完整显示。不加宽输入框，以免 1280 断点（UX-01 xl）页头再挤出溢出。
          placeholder="搜索模型/产品/资讯"
          aria-label="全站搜索"
          autoComplete="off"
          className={
            variant === "desktop"
              ? "w-44 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none transition-[width,border-color] focus:w-60 focus:border-primary focus:bg-white"
              : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none focus:border-primary"
          }
        />
        {/* 放大镜装饰图标（aria-hidden，不参与交互） */}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={
            variant === "desktop"
              ? "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 fill-none stroke-slate-400 stroke-[1.6]"
              : "pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400 stroke-[1.6]"
          }
        >
          <circle cx="9" cy="9" r="5.5" />
          <path d="M13.5 13.5L17 17" strokeLinecap="round" />
        </svg>
      </div>

      {showPanel && (
        <div
          id={panelId}
          role="listbox"
          aria-label="搜索结果"
          className={
            variant === "desktop"
              ? "absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              : "mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md"
          }
        >
          {status === "loading" && (
            <div data-testid="search-loading" className="px-4 py-3 text-sm text-slate-500" role="status">
              搜索中…
            </div>
          )}
          {status === "error" && (
            <div data-testid="search-error" className="px-4 py-3 text-sm text-red-600" role="alert">
              搜索暂不可用
            </div>
          )}
          {status === "empty" && (
            <div data-testid="search-no-hit" className="px-4 py-3 text-sm text-slate-500">
              没有找到相关结果
            </div>
          )}
          {status === "success" && (
            <div data-testid="search-results" className="max-h-[24rem] overflow-y-auto p-1.5">
              {groups.map((g) => (
                <div key={g.type} className="mb-1 last:mb-0">
                  <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium tracking-wide text-slate-400">{g.label}</div>
                  {g.items.map((hit) => {
                    const idx = flat.indexOf(hit);
                    return (
                      <button
                        key={`${hit.type}:${hit.id}`}
                        type="button"
                        role="option"
                        aria-selected={idx === active}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go(hit)}
                        className={
                          idx === active
                            ? "block w-full rounded-lg bg-slate-100 px-2.5 py-2 text-left"
                            : "block w-full rounded-lg px-2.5 py-2 text-left"
                        }
                      >
                        <span className="block truncate text-sm font-medium text-slate-700">{hit.title}</span>
                        {hit.subtitle && <span className="block truncate text-xs text-slate-400">{hit.subtitle}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

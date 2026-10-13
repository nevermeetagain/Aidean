"use client";

/**
 * 模型详情锚点目录（Task L.5.1）：左侧 sticky 导航。
 * - 平滑滚动：页面加载时为 html 置 scroll-behavior: smooth，锚点跳转由浏览器原生平滑执行；
 * - 当前节高亮：IntersectionObserver rootMargin "-40% 0px -55%"（视口 40%~45% 横带）
 *   命中的节即高亮；无命中时保持上一个高亮项不闪烁。
 */
import { useEffect, useState } from "react";

export interface DetailTocItem {
  /** 目标节元素 id（不含 #） */
  id: string;
  label: string;
}

interface DetailTocProps {
  items: readonly DetailTocItem[];
}

export function DetailToc({ items }: DetailTocProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="页面目录" className="text-sm">
      <ul className="space-y-1 border-l border-[var(--border)]">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "true" : undefined}
                className={`-ml-px block border-l-2 py-1.5 pl-3 transition-colors ${
                  active
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

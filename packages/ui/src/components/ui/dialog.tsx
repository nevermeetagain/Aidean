"use client";
// 占位简化版:条件渲染不挂 portal;遮罩点击/Esc/关闭钮均可关闭,MVP 可用性优先
import { useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, footer, className }: DialogProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn("relative z-10 w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 shadow-xl", className)}
      >
        {title ? <h2 className="mb-3 text-lg font-semibold">{title}</h2> : null}
        <div>{children}</div>
        {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-3 top-3 rounded px-1.5 text-slate-500 hover:text-[var(--foreground)]"
        >
          X
        </button>
      </div>
    </div>
  );
}
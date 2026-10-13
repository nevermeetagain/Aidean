"use client";

/**
 * 版本切换器（Task L.4.2）：专业版/应用版两段纯 UI 视角层。
 * 高亮非受控，随 store.version；应用版预设「对话」类型筛选，专业版恢复不限。
 */
import { useLadderStore } from "../../stores/ladderStore";

const VERSIONS: ReadonlyArray<{ value: "professional" | "application"; label: string }> = [
  { value: "professional", label: "专业版" },
  { value: "application", label: "应用版" },
];

interface VersionSwitcherProps {
  /** 预设筛选写入后的反馈回调（父级置 pending 编排 fetch） */
  onChange?: () => void;
}

export function VersionSwitcher({ onChange }: VersionSwitcherProps) {
  const version = useLadderStore((s) => s.version);
  const setVersion = useLadderStore((s) => s.setVersion);
  const setFilter = useLadderStore((s) => s.setFilter);
  const resetFilterGroup = useLadderStore((s) => s.resetFilterGroup);

  function switchTo(next: "professional" | "application") {
    if (next === version) return;
    setVersion(next);
    if (next === "application") {
      setFilter("modelType", ["CHAT"]);
    } else {
      resetFilterGroup("modelType");
    }
    onChange?.();
  }

  return (
    <div
      role="group"
      aria-label="榜单版本视角"
      className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-sm)]"
    >
      {VERSIONS.map(({ value, label }) => {
        const active = version === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            title={
              value === "application"
                ? "应用版视角：预设对话类模型筛选"
                : "专业版视角：全类型模型不限"
            }
            onClick={() => switchTo(value)}
            className={`px-3.5 py-1.5 text-sm transition-colors ${
              active
                ? "bg-primary text-[var(--primary-foreground)]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

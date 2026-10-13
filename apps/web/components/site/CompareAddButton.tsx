"use client";

/**
 * CompareAddButton：模型「+对比」按钮（EVAL-01）。
 * - 通用客户端组件：ladder 矩阵卡片与 models 详情页共用；
 * - 点击 toggle compareStore（加入/移出），已加入显示 ✓；
 * - 父级须为相对定位容器；size 可选 sm（卡片浮钮）/ md（详情页常规按钮）。
 */
import { useCompareStore } from "../../stores/compareStore";
import { Button } from "@aidean/ui";

interface Props {
  modelId: string;
  nameDisplay: string;
  slug?: string | null;
  size?: "sm" | "md";
}

export function CompareAddButton({ modelId, nameDisplay, slug = null, size = "sm" }: Props) {
  const toggle = useCompareStore((s) => s.toggle);
  const inList = useCompareStore((s) => s.items.some((i) => i.modelId === modelId));

  if (size === "sm") {
    return (
      <button
        type="button"
        aria-label={inList ? `移出对比：${nameDisplay}` : `加入对比：${nameDisplay}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle({ modelId, nameDisplay, slug });
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-400 transition-colors hover:text-primary"
      >
        {inList ? "✓" : "+"}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={inList ? "outline" : "ghost"}
      size="sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle({ modelId, nameDisplay, slug });
      }}
      className={
        inList
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
      }
    >
      {inList ? "✓ 已加入对比" : "+ 加入对比"}
    </Button>
  );
}

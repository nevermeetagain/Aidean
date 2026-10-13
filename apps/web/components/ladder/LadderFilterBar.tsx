"use client";

/**
 * 天梯筛选栏（Task L.4.1 / M-LADDER v1.8 筛选改版 / v1.9 开闭源并入标签组）：
 * - 五组筛选按钮互斥展开下拉面板，每组面板首项为「不限」（点击清空该组，未选时高亮）；
 * - 测评组首项「综合」默认选中（综合分口径 = 四维测评分数平均值，服务端对 benchmark 透传不过滤），
 *   测评为单选语义（exclusive）；类型/协议/标签/时间均为多选；
 * - 标签组内置伪标签：最新/热门置顶、冷门置底（迁自 v1.7 快速筛选 chips），互斥勾选；
 *   开源/闭源为真实过滤标签（服务端按 isOpenSource 过滤，多选任一命中，同选=不限）；
 * - 原独立「开源」下拉组已移除（v1.9）：开源/闭源并入标签组，URL isOpenSource 键保留回放兼容；
 * - 任一变更立即 setFilter 并触发 onQueryChange（父级置 pending 编排 fetch）；组外点击收起面板。
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  LADDER_FILTER_KEYS,
  LADDER_PSEUDO_TAGS,
  useLadderStore,
} from "../../stores/ladderStore";
import type { LadderFilterKey } from "../../stores/ladderStore";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroup {
  key: LadderFilterKey;
  label: string;
  /** 单选语义组：选中另一项即替换而非追加 */
  exclusive?: boolean;
  options: readonly FilterOption[];
}

const GROUPS: readonly FilterGroup[] = [
  {
    key: "modelType",
    label: "类型",
    options: [
      { value: "CHAT", label: "对话" },
      { value: "REASONING", label: "推理" },
      { value: "MULTIMODAL", label: "多模态" },
      { value: "VISION", label: "视觉" },
      { value: "CODE", label: "代码" },
      { value: "IMAGE_GEN", label: "图像生成" },
      { value: "VIDEO", label: "视频" },
      { value: "AUDIO", label: "语音" },
    ],
  },
  {
    key: "protocol",
    label: "协议",
    options: [
      { value: "ANTHROPIC", label: "Anthropic Messages" },
      { value: "OPENAI", label: "OpenAI Chat Completions" },
      { value: "RESPONSES", label: "OpenAI Responses API" },
      { value: "GOOGLE", label: "Gemini Native generateContent" },
      { value: "CUSTOM", label: "自定义HTTP" },
    ],
  },
  {
    key: "benchmark",
    label: "测评",
    exclusive: true,
    options: [
      { value: "composite", label: "综合" },
      { value: "mmlu", label: "MMLU" },
      { value: "humaneval", label: "HumanEval" },
      { value: "math", label: "MATH" },
    ],
  },
  {
    key: "tags",
    label: "标签",
    options: [
      { value: "最新", label: "最新" },
      { value: "热门", label: "热门" },
      { value: "开源", label: "开源" },
      { value: "闭源", label: "闭源" },
      { value: "推理", label: "推理" },
      { value: "编程", label: "编程" },
      { value: "长上下文", label: "长上下文" },
      { value: "性价比", label: "性价比" },
      { value: "多模态", label: "多模态" },
      { value: "轻量", label: "轻量" },
      { value: "MoE", label: "MoE" },
      { value: "冷门", label: "冷门" },
    ],
  },
  {
    key: "updatedWithin",
    label: "时间",
    options: [
      { value: "30d", label: "30天内" },
      { value: "90d", label: "90天内" },
      { value: "180d", label: "半年内" },
      { value: "365d", label: "一年内" },
      { value: "730d", label: "两年内" },
    ],
  },
];

interface LadderFilterBarProps {
  onQueryChange?: () => void;
}

export function LadderFilterBar({ onQueryChange }: LadderFilterBarProps) {
  const filters = useLadderStore((s) => s.filters);
  const setFilter = useLadderStore((s) => s.setFilter);
  const resetFilterGroup = useLadderStore((s) => s.resetFilterGroup);

  /** 互斥展开：同一时刻至多一个面板 */
  const [openGroup, setOpenGroup] = useState<LadderFilterKey | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 组外点击收起面板
  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) return;
      setOpenGroup(null);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function commit(group: LadderFilterKey, next: string[]) {
    setFilter(group, next);
    onQueryChange?.();
  }

  function toggleOption(group: FilterGroup, value: string) {
    const current = filters[group.key];
    if (group.exclusive) {
      // 单选语义：再次点选取消，点选其它项直接替换
      commit(group.key, current.includes(value) ? [] : [value]);
      return;
    }
    if ((LADDER_PSEUDO_TAGS as readonly string[]).includes(value)) {
      // 伪标签互斥（v1.8）：勾选即替换其余伪标签，真实标签保留；再点取消
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current.filter((v) => !(LADDER_PSEUDO_TAGS as readonly string[]).includes(v)), value];
      commit(group.key, next);
      return;
    }
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    commit(group.key, next);
  }

  /** 「不限」：清空该组选择（回退组默认不限） */
  function clearGroup(group: FilterGroup) {
    resetFilterGroup(group.key);
    onQueryChange?.();
  }

  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500">筛选</span>
      {GROUPS.map((group) => {
        const selected = filters[group.key];
        const isOpen = openGroup === group.key;
        return (
          <div key={group.key} className="relative">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenGroup(isOpen ? null : group.key)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                selected.length > 0 || isOpen
                  ? "border-primary/40 bg-primary/5 text-primary shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 shadow-[var(--shadow-sm)] hover:border-slate-300"
              }`}
            >
              {group.label}
              {selected.length > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-xs leading-5 text-white">
                  {selected.length}
                </span>
              ) : null}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {isOpen ? (
              <div
                role="group"
                aria-label={`筛选：${group.label}`}
                className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => clearGroup(group)}
                  aria-pressed={selected.length === 0}
                  className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                    selected.length === 0
                      ? "bg-slate-50 font-medium text-primary"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  不限
                </button>
                <div className="my-1 border-t border-slate-100" aria-hidden="true" />
                {group.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(option.value)}
                      onChange={() => toggleOption(group, option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

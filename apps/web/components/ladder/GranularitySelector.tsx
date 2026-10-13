"use client";

/**
 * 分度值选择器（v2.0）：性能轴最小一格的量值（档高）。
 * - 位于排序下拉右方，标签「分度值」；
 * - 纯呈现层状态：切换仅改变矩阵档位划分与轴刻度密度，零网络请求、不进 URL；
 * - 选项 = 常见档位 ∪ 后台配置默认值 ∪ 当前值（保证受控回环不丢项）。
 */
import { useMemo } from "react";

/** 常见档位（综合分 0–100 量纲下的合理分割粒度） */
const GRANULARITY_STEPS: ReadonlyArray<number> = [0.1, 0.2, 0.5, 1, 2, 5];

interface GranularitySelectorProps {
  /** 当前分度值（父级受控） */
  value: number;
  /** 后台配置默认值（SSR 注入，恒在选项内） */
  defaultValue: number;
  onChange: (value: number) => void;
}

export function GranularitySelector({ value, defaultValue, onChange }: GranularitySelectorProps) {
  const options = useMemo(() => {
    const set = new Set<number>(GRANULARITY_STEPS);
    set.add(defaultValue);
    set.add(value);
    return [...set].sort((a, b) => a - b);
  }, [defaultValue, value]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">分度值</span>
      <select
        aria-label="性能轴分度值"
        title="性能轴每一格代表的分值（档高），越小刻度越密"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-[96px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-[var(--shadow-sm)] outline-none transition-colors focus:border-[var(--accent)]"
      >
        {options.map((step) => (
          <option key={step} value={step}>
            {step}
          </option>
        ))}
      </select>
    </div>
  );
}

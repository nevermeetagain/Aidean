"use client";

/**
 * 天梯排序栏（Task L.4.1）：180px 下拉 + 自定义公式行内预检。
 * - 选 custom 仅展开输入框，不立即改 store（现行排序保持 lastGood）；
 * - 输入 300ms 防抖后经 formula-parser 白名单求值预检：
 *   FormulaError → 红字展示原始 message，store.sort 不动；
 *   合法 → 提交 customFormula + sort='custom' 生效（此后再编辑非法也不打断现行列表）。
 */
import { useEffect, useRef, useState } from "react";
import {
  evaluateFormula,
  FormulaError,
} from "../../lib/features/ranking/formula-parser";
import { useLadderStore } from "../../stores/ladderStore";

const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "composite", label: "综合评分" },
  { value: "contextLength", label: "上下文长度" },
  { value: "latency", label: "响应速度" },
  { value: "price", label: "价格" },
  { value: "custom", label: "自定义公式" },
];

/** 预检试算样本：仅验证公式可求值，与具体数据无关 */
const PROBE_VARS = { score: 60, priceInput: 1, contextLength: 128000 };

interface LadderSortBarProps {
  onQueryChange?: () => void;
}

export function LadderSortBar({ onQueryChange }: LadderSortBarProps) {
  const sort = useLadderStore((s) => s.sort);
  const setSort = useLadderStore((s) => s.setSort);
  const setCustomFormula = useLadderStore((s) => s.setCustomFormula);
  const customFormula = useLadderStore((s) => s.customFormula);

  const [draft, setDraft] = useState(customFormula);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 历史提交过有效公式时，切回 custom 视图预填草稿
  useEffect(() => {
    if (sort === "custom" && !draft && customFormula) setDraft(customFormula);
    // draft 变化本身不应重放该同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  function handleSelect(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value === "custom") {
      // 不触碰 store：等待首个合法公式提交后再生效
      setFormulaError(null);
      return;
    }
    setFormulaError(null);
    setCustomFormula("");
    setDraft("");
    setSort(value as typeof sort);
    onQueryChange?.();
  }

  function handleDraftChange(text: string) {
    setDraft(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const expr = text.trim();
      try {
        evaluateFormula(expr, PROBE_VARS);
        setFormulaError(null);
        setCustomFormula(expr);
        if (sort !== "custom") setSort("custom");
        onQueryChange?.();
      } catch (error) {
        setFormulaError(error instanceof FormulaError ? error.message : "公式错误：表达式无法解析");
      }
    }, 300);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">排序</span>
        <select
          aria-label="排序方式"
          value={sort}
          onChange={(event) => handleSelect(event.target.value)}
          className="w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-[var(--shadow-sm)] outline-none transition-colors focus:border-[var(--accent)]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {sort === "custom" ? (
          <input
            type="text"
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            placeholder="${score}*0.9-{priceInput}/100"
            aria-label="自定义排序公式"
            className={`w-[280px] rounded-lg border bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-[var(--shadow-sm)] outline-none transition-colors ${
              formulaError
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-[var(--accent)]"
            }`}
          />
        ) : null}
      </div>
      {formulaError ? (
        <p data-testid="ladder-formula-error" className="text-xs leading-4 text-red-600">
          {formulaError}
        </p>
      ) : null}
    </div>
  );
}

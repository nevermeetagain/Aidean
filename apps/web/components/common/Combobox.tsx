"use client";

/**
 * Combobox — 可搜索下拉选择（UX-08 / UX-09 通用件）。
 *
 * - 输入即搜（防抖），取数函数由调用方注入（按关键字服务端取一页，不一次铺开全量）；
 * - 失败≠空：取数失败显示错误文案 + 重试，成功且 0 条才显示空态；
 * - 选中不关闭面板（适合多选场景），已选项带 ✓ 标记；isDisabled 的项不可选；
 * - 可访问性：input role=combobox + listbox/option + aria-activedescendant，
 *   ↑/↓ 移动、Enter 选择、Esc 关闭；鼠标按下不夺焦（mousedown preventDefault）。
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
  /** 分组名（如厂商），相邻同组的选项共用一个组标题 */
  group?: string;
  /** 次级说明（右侧淡色） */
  hint?: string;
}

export type ComboboxLoadResult =
  | { ok: true; options: ComboboxOption[]; total?: number }
  | { ok: false; message: string };

export interface ComboboxProps {
  /** 无障碍标签（input aria-label） */
  label: string;
  placeholder?: string;
  load: (query: string, signal: AbortSignal) => Promise<ComboboxLoadResult>;
  onSelect: (option: ComboboxOption) => void;
  isSelected?: (value: string) => boolean;
  isDisabled?: (value: string) => boolean;
  emptyText?: string;
  debounceMs?: number;
  testId?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; options: ComboboxOption[]; total: number }
  | { status: "error"; message: string };

export function Combobox({
  label,
  placeholder = "搜索…",
  load,
  onSelect,
  isSelected,
  isDisabled,
  emptyText = "没有匹配的结果",
  debounceMs = 250,
  testId = "combobox",
  className,
  inputClassName,
  disabled,
}: ComboboxProps) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [active, setActive] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 打开时按当前关键字取数（防抖 + 晚到响应丢弃）
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    const timer = window.setTimeout(() => {
      loadRef
        .current(query, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) return;
          if (res.ok) setState({ status: "ready", options: res.options, total: res.total ?? res.options.length });
          else setState({ status: "error", message: res.message });
          setActive(0);
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: "error", message: "加载失败，请重试" });
        });
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, debounceMs, reloadKey]);

  const options = useMemo(() => (state.status === "ready" ? state.options : []), [state]);
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const choose = useCallback(
    (option: ComboboxOption | undefined) => {
      if (!option || isDisabled?.(option.value)) return;
      onSelect(option);
    },
    [isDisabled, onSelect],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else if (options.length) setActive((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length) setActive((i) => (i - 1 + options.length) % options.length);
    } else if (event.key === "Enter") {
      if (open && options.length) {
        event.preventDefault();
        choose(options[active]);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }
  }

  // 相邻同组只渲染一次组标题
  const rows = useMemo(() => {
    const out: Array<{ kind: "group"; label: string; key: string } | { kind: "option"; option: ComboboxOption; index: number }> = [];
    let lastGroup: string | undefined;
    options.forEach((option, index) => {
      if (option.group && option.group !== lastGroup) out.push({ kind: "group", label: option.group, key: `g-${index}` });
      lastGroup = option.group;
      out.push({ kind: "option", option, index });
    });
    return out;
  }, [options]);

  return (
    <div className={`relative ${className ?? ""}`} data-testid={testId}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length ? optionId(active) : undefined}
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        data-testid={`${testId}-input`}
        className={`h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-slate-500 focus:border-primary focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 ${inputClassName ?? ""}`}
      />
      {open ? (
        <div
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)]"
          // 面板内按下鼠标不夺输入框焦点（否则 blur 先关面板，点击落空）
          onMouseDown={(e) => e.preventDefault()}
        >
          {state.status === "error" ? (
            <div role="alert" data-testid={`${testId}-error`} className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-red-700">
              <span>{state.message}</span>
              <button
                type="button"
                data-testid={`${testId}-retry`}
                onClick={() => setReloadKey((k) => k + 1)}
                className="shrink-0 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
              >
                重试
              </button>
            </div>
          ) : state.status === "ready" && options.length === 0 ? (
            <p data-testid={`${testId}-empty`} className="px-3 py-3 text-sm text-slate-500">
              {emptyText}
            </p>
          ) : state.status !== "ready" ? (
            <p role="status" className="px-3 py-3 text-sm text-slate-500">
              加载中…
            </p>
          ) : null}
          <ul id={listId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1">
            {rows.map((row) =>
              row.kind === "group" ? (
                <li key={row.key} role="presentation" className="px-3 pb-1 pt-2 text-xs font-medium text-slate-500">
                  {row.label}
                </li>
              ) : (
                <li
                  key={row.option.value}
                  id={optionId(row.index)}
                  role="option"
                  aria-selected={isSelected?.(row.option.value) ?? false}
                  aria-disabled={isDisabled?.(row.option.value) || undefined}
                  onMouseEnter={() => setActive(row.index)}
                  onClick={() => choose(row.option)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                    row.index === active ? "bg-muted" : ""
                  } ${isDisabled?.(row.option.value) ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span className="min-w-0 truncate text-foreground">{row.option.label}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    {row.option.hint ? <span>{row.option.hint}</span> : null}
                    {isSelected?.(row.option.value) ? <span aria-hidden="true" className="text-primary">✓</span> : null}
                  </span>
                </li>
              ),
            )}
          </ul>
          {state.status === "ready" && state.total > options.length ? (
            <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-slate-500">
              共 {state.total} 个匹配，仅显示前 {options.length} 个，继续输入关键字缩小范围
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

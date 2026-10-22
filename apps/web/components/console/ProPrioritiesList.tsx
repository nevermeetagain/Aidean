"use client";

/**
 * 专业版模型优先级管理列表（Task A.4.1）。
 *
 * - 可写行：数字步进器（-/+ 即时钳制 1-99）+ 键入框；键入越界时行内红字且禁用整组保存；
 * - free 只读行（readOnly===true）：灰色锁定样式 + 「自动装载」角标，不可编辑；
 * - 底部整组保存 PUT /api/v1/user/priorities；成功绿字 3s 自灭（setTimeout 清 state，未引第三方）；
 * - 草稿 useState 从 props 初始化；挂载经 resetDraft 写入 store 作为跨模式切换的编辑留存底座，
 *   之后每次变更经 updateDraftPriority 增量镜像（草稿本身不持久化）。
 */
import { useEffect, useRef, useState } from "react";

import type { PriorityItem } from "../../lib/features/user/service";
import { useConsoleStore, type DraftPriorityRow } from "../../stores/consoleStore";

const PRIORITY_MIN = 1;
const PRIORITY_MAX = 99;

/** 数字输入即时钳制（按钮步进专用；键入路径允许暂态越界走红字校验） */
function clampPriority(n: number): number {
  return Math.min(PRIORITY_MAX, Math.max(PRIORITY_MIN, n));
}

function isValidPriority(n: number): boolean {
  return Number.isInteger(n) && n >= PRIORITY_MIN && n <= PRIORITY_MAX;
}

interface ProPrioritiesListProps {
  priorities: PriorityItem[];
}

export function ProPrioritiesList({ priorities }: ProPrioritiesListProps) {
  const updateDraftPriority = useConsoleStore((s) => s.updateDraftPriority);
  const resetDraft = useConsoleStore((s) => s.resetDraft);
  const setConfigSave = useConsoleStore((s) => s.setConfigSave);

  const editableRowsRef = useRef<DraftPriorityRow[]>(
    priorities.filter((row) => !row.readOnly).map((row) => ({ modelId: row.modelId, priority: row.priority }))
  );

  // 草稿从 props 初始化 useState：store 已有未保存草稿则交叉合并（保留用户中途切走的修改）
  const [draft, setDraft] = useState<DraftPriorityRow[]>(() => {
    const stored = useConsoleStore.getState().draftPriorities;
    const merged = stored
      .filter((row) => editableRowsRef.current.some((base) => base.modelId === row.modelId))
      .map((row) => ({ modelId: row.modelId, priority: row.priority }));
    for (const base of editableRowsRef.current) {
      if (!merged.some((row) => row.modelId === base.modelId)) merged.push(base);
    }
    return merged;
  });

  // 挂载即把草稿基线同步进 store，形成单次编辑会话内的镜像权威副本
  const didSyncRef = useRef(false);
  useEffect(() => {
    if (!didSyncRef.current) {
      didSyncRef.current = true;
      resetDraft(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);

  // 卸载清理未触发的 toast 定时器，避免对卸载组件 setState
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  /** 提交到组件层：本地 setState + store 镜像（store 仅接收有限合法数值防污染回灌） */
  function commitChange(next: DraftPriorityRow[], changedId: string) {
    setDraft(next);
    const changed = next.find((row) => row.modelId === changedId);
    if (changed && Number.isFinite(changed.priority)) {
      updateDraftPriority(changed.modelId, changed.priority);
    }
  }

  function stepPriority(modelId: string, delta: number) {
    commitChange(
      draft.map((row) =>
        row.modelId === modelId
          ? { ...row, priority: clampPriority(clampPriority(row.priority) + delta) }
          : row
      ),
      modelId
    );
  }

  function typePriority(modelId: string, raw: string) {
    const parsed = raw.trim() === "" ? Number.NaN : Number(raw);
    commitChange(
      draft.map((row) => (row.modelId === modelId ? { ...row, priority: parsed } : row)),
      modelId
    );
  }

  const invalidIds = draft.filter((row) => !isValidPriority(row.priority));
  const canSave = !saving && invalidIds.length === 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    setSavedNotice(false);
    try {
      const res = await fetch("/api/v1/user/priorities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          draft.map((row) => ({ modelId: row.modelId, priority: clampPriority(row.priority) }))
        ),
      });
      const body = (await res.json().catch(() => null)) as
        | { code?: number; message?: string }
        | null;
      if (!res.ok || !body || body.code !== 0) {
        setSaveError(body?.message ?? "保存失败，请稍后重试");
        return;
      }
      setSavedNotice(true);
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = window.setTimeout(() => setSavedNotice(false), 3000);
    } catch {
      setSaveError("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  // 保存动作注册到 consoleStore：标题行统一渲染按钮（置版本切换左侧）；handleSave 经 ref 取最新草稿。
  const invalidCount = invalidIds.length;
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;
  useEffect(() => {
    setConfigSave({
      idleLabel: "保存优先级",
      savingLabel: "保存中…",
      saving,
      disabled: !canSave,
      onSave: () => void saveRef.current(),
    });
    return () => setConfigSave(null);
  }, [saving, invalidCount, canSave, setConfigSave]);

  const readOnlyRows = priorities.filter((row) => row.readOnly === true);

  return (
    <div data-testid="pro-priorities-list">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {draft.length === 0 && readOnlyRows.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-400">暂无可配置模型</li>
        )}

        {draft.map((row) => {
          const meta = priorities.find((p) => p.modelId === row.modelId);
          const modelName = meta?.modelName ?? row.modelId;
          const invalid = !isValidPriority(row.priority);
          return (
            <li key={row.modelId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {modelName}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`降低 ${modelName} 优先级数值`}
                  disabled={invalid}
                  onClick={() => stepPriority(row.modelId, -1)}
                  className="size-7 rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="number"
                  min={PRIORITY_MIN}
                  max={PRIORITY_MAX}
                  aria-label={`${modelName} 优先级`}
                  value={Number.isFinite(row.priority) ? String(row.priority) : ""}
                  onChange={(e) => typePriority(row.modelId, e.target.value)}
                  className={`w-16 rounded-md border px-2 py-1 text-center text-sm tabular-nums outline-none transition-colors focus:border-primary ${
                    invalid ? "border-red-300 text-red-600" : "border-border"
                  }`}
                />
                <button
                  type="button"
                  aria-label={`提高 ${modelName} 优先级数值`}
                  disabled={invalid}
                  onClick={() => stepPriority(row.modelId, 1)}
                  className="size-7 rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
              {invalid && (
                <p role="alert" className="w-full text-xs text-red-600">
                  优先级需为 {PRIORITY_MIN}-{PRIORITY_MAX} 的整数
                </p>
              )}
            </li>
          );
        })}

        {/* free 只读锁定行：系统自动装载，不入可写集、不参与保存 */}
        {readOnlyRows.map((row) => (
          <li
            key={row.modelId}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-muted px-4 py-3 opacity-80"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-400">
              {row.modelName}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-primary align-middle">
              自动装载
            </span>
            <input
              type="number"
              disabled
              aria-label={`${row.modelName} 优先级（只读）`}
              value={String(row.priority)}
              readOnly
              tabIndex={-1}
              className="w-16 rounded-md border border-transparent bg-transparent px-2 py-1 text-center text-sm tabular-nums text-slate-400"
            />
          </li>
        ))}
      </ul>

      {saveError && (
        <p role="alert" className="mt-3 text-sm text-red-600" data-testid="pro-save-error">
          {saveError}
        </p>
      )}
      {savedNotice && (
        <p aria-live="polite" className="mt-3 text-sm text-green-700" data-testid="pro-saved">
          优先级已保存
        </p>
      )}
      {/* 保存动作已上移至「模型配置」标题行（版本切换左侧），经 consoleStore.configSave 统一触发 */}
    </div>
  );
}

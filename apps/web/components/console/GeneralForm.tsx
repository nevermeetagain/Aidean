"use client";

/**
 * 控制台通用形态表单 + 版本形态切换（Task A.4.1 / A.4.2；redesign-console-workspace 改版）。
 *
 * - GeneralForm：四档绑定分组卡（OPUS/SONNET/FABLE/HAIKU），绑定徽章删除/添加均为本地草稿；
 *   跨档（含同档）重复 modelId 前端先行红字并禁用保存，通过后整组平铺 PUT tier-mappings；
 *   free 区独立只读卡（「系统配置」徽章 + freeNote），无任何编辑控件。
 * - ModeSwitch：「通用版/专业版」Segmented 受控切换（consoleStore.mode 持久化），
 *   由 ConsoleWorkspace 右置于「模型配置」标题行；原纵向 ConsoleModePanels 布局已废弃。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { MODEL_TIER_ORDER, type ModelTier } from "@aidean/shared";

import type { TierMappingItem, TierMappingsView } from "../../lib/features/user/service";
import { Button, Input } from "@aidean/ui";
import { useConsoleStore, type ConsoleMode } from "../../stores/consoleStore";

/** 档名中文展示映射（自定义合理中文，与后台枚举解耦） */
const TIER_LABELS_CN: Record<ModelTier, string> = {
  OPUS: "Opus 高能级",
  SONNET: "Sonnet 均衡级",
  FABLE: "Fable 创作级",
  HAIKU: "Haiku 轻量级",
};

/** 本地草稿结构：tier → 绑定模型数组（深拷贝自 props，删除/添加不触碰服务端数据） */
type TierDraft = Record<ModelTier, TierMappingItem[]>;

function cloneTierDraft(tiers: TierMappingsView["tiers"]): TierDraft {
  const draft = {} as TierDraft;
  for (const key of MODEL_TIER_ORDER) {
    draft[key] = (tiers[key] ?? []).map((item) => ({ ...item }));
  }
  return draft;
}

/** 全草稿中出现于多个条目的 modelId 集合（同档重复与跨档重复统一拦截） */
function collectDuplicateIds(draft: TierDraft): Set<string> {
  const seen = new Map<string, number>();
  for (const key of MODEL_TIER_ORDER) {
    for (const item of draft[key]) {
      seen.set(item.modelId, (seen.get(item.modelId) ?? 0) + 1);
    }
  }
  return new Set([...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id));
}

interface GeneralFormProps {
  tierMappings: TierMappingsView;
}

export function GeneralForm({ tierMappings }: GeneralFormProps) {
  const [draft, setDraft] = useState<TierDraft>(() => cloneTierDraft(tierMappings.tiers));
  // 各档『+ 添加绑定』输入行的受控值
  const [inputs, setInputs] = useState<Record<ModelTier, string>>({
    OPUS: "",
    SONNET: "",
    FABLE: "",
    HAIKU: "",
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const setConfigSave = useConsoleStore((s) => s.setConfigSave);

  const duplicateIds = useMemo(() => collectDuplicateIds(draft), [draft]);
  const hasDuplicates = duplicateIds.size > 0;
  const flatDraft = useMemo(
    () =>
      MODEL_TIER_ORDER.flatMap((tier) =>
        draft[tier].map((item) => ({ tier, modelId: item.modelId }))
      ),
    [draft]
  );

  /** 添加绑定：非空校验先行（红字），加入本地草稿后清空输入 */
  function handleAdd(tier: ModelTier) {
    const value = inputs[tier].trim();
    if (!value) return;
    setDraft((cur) => ({
      ...cur,
      [tier]: [...cur[tier], { modelId: value, modelName: "" }],
    }));
    setInputs((cur) => ({ ...cur, [tier]: "" }));
    setSaveError(null);
  }

  function handleRemove(tier: ModelTier, modelId: string) {
    setDraft((cur) => ({
      ...cur,
      [tier]: cur[tier].filter((item) => item.modelId !== modelId),
    }));
  }

  async function handleSave() {
    if (hasDuplicates || saving) return;
    setSaving(true);
    setSaveError(null);
    setSavedNotice(false);
    try {
      const res = await fetch("/api/v1/user/tier-mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flatDraft),
      });
      const body = (await res.json().catch(() => null)) as
        | { code?: number; message?: string }
        | null;
      if (!res.ok || !body || body.code !== 0) {
        setSaveError(body?.message ?? "保存失败，请稍后重试");
        return;
      }
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 3000);
    } catch {
      setSaveError("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  // 保存动作注册到 consoleStore：标题行统一渲染按钮（置版本切换左侧）。
  // handleSave 经 ref 取最新闭包（草稿每次变更都刷新 ref），disabled/label 仅随 saving/hasDuplicates 变更重注册。
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;
  useEffect(() => {
    setConfigSave({
      idleLabel: "保存四档绑定",
      savingLabel: "保存中…",
      saving,
      disabled: saving || hasDuplicates,
      onSave: () => void saveRef.current(),
    });
    return () => setConfigSave(null);
  }, [saving, hasDuplicates, setConfigSave]);

  return (
    <div data-testid="general-form">
      {/* 四档绑定分组卡 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {MODEL_TIER_ORDER.map((tier) => (
          <article key={tier} className="rounded-lg border border-border bg-card p-5">
            <header className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">{TIER_LABELS_CN[tier]}</h3>
              <span className="text-xs uppercase tracking-wide text-slate-400">{tier}</span>
            </header>

            <ul className="mt-3 space-y-2" aria-label={`${TIER_LABELS_CN[tier]}绑定模型`}>
              {draft[tier].length === 0 && (
                <li className="text-sm text-slate-400">暂无绑定模型</li>
              )}
              {draft[tier].map((item) => {
                const duplicated = duplicateIds.has(item.modelId);
                return (
                  <li
                    key={item.modelId}
                    className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 ${
                      duplicated
                        ? "border-red-300 bg-red-50"
                        : "border-border bg-background"
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm">
                      {item.modelName ? (
                        <span className="font-medium text-foreground">{item.modelName}</span>
                      ) : null}
                      <span
                        title={item.modelId}
                        className={`ml-2 rounded border px-1.5 py-0.5 font-mono text-xs ${
                          duplicated
                            ? "border-red-300 text-red-600"
                            : "border-border text-slate-500"
                        }`}
                      >
                        {item.modelId.slice(0, 8)}
                      </span>
                    </span>
                    <Button
                      type="button"
                      aria-label={`删除 ${item.modelName || item.modelId} 的 ${tier} 绑定`}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(tier, item.modelId)}
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 transition-colors hover:bg-muted hover:text-red-600"
                    >
                      ✕
                    </Button>
                  </li>
                );
              })}
            </ul>

            {/* 添加绑定输入行 */}
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={inputs[tier]}
                onChange={(e) => setInputs((cur) => ({ ...cur, [tier]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd(tier);
                  }
                }}
                placeholder="输入 modelId 后添加"
                className="px-2.5 py-1.5 focus:border-primary"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleAdd(tier)}
                disabled={!inputs[tier].trim()}
                className="shrink-0 whitespace-nowrap px-3 py-1.5 disabled:cursor-not-allowed"
              >
                + 添加绑定
              </Button>
            </div>
            {/* 空值由按钮 disabled 拦截（非空校验先行），无红字分支需要渲染 */}
          </article>
        ))}
      </div>

      {/* free 只读说明区：仅展示，不可绑定或修改 */}
      <aside className="mt-4 rounded-lg border border-dashed border-border bg-muted p-4">
        <span className="mr-2 inline-block rounded-full border border-border px-2 py-0.5 text-xs font-medium text-accent align-middle">
          系统配置
        </span>
        <p className="mt-2 text-sm text-slate-500">{tierMappings.free.freeNote}</p>
      </aside>

      {/* 去重校验红字（先于提交的前端守卫）+ 保存动作 */}
      {hasDuplicates && (
        <p role="alert" className="mt-4 text-sm text-red-600" data-testid="tier-dup-error">
          同一模型不可绑定多个等级：{[...duplicateIds].join("、")}
        </p>
      )}
      {saveError && (
        <p role="alert" className="mt-2 text-sm text-red-600" data-testid="tier-save-error">
          {saveError}
        </p>
      )}
      {savedNotice && !hasDuplicates && (
        <p aria-live="polite" className="mt-2 text-sm text-green-700" data-testid="tier-saved">
          等级绑定已保存
        </p>
      )}
      {/* 保存动作已上移至「模型配置」标题行（版本切换左侧），经 consoleStore.configSave 统一触发 */}
    </div>
  );
}

const MODE_OPTIONS: ReadonlyArray<{ value: ConsoleMode; label: string }> = [
  { value: "general", label: "通用版" },
  { value: "pro", label: "专业版" },
];

/** Segmented 双形态受控切换：mode 经 consoleStore 持久化；供 ConsoleWorkspace 右置复用 */
export function ModeSwitch() {
  const mode = useConsoleStore((s) => s.mode);
  const setMode = useConsoleStore((s) => s.setMode);

  return (
    <div
      role="group"
      aria-label="版本形态切换"
      className="inline-flex items-center rounded-lg border border-border bg-card p-1"
      data-testid="console-mode-switch"
    >
      {MODE_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          aria-pressed={mode === opt.value}
          variant={mode === opt.value ? "primary" : "ghost"}
          size="sm"
          onClick={() => setMode(opt.value)}
          className={
            mode === opt.value
              ? "rounded-md px-4 py-1.5 font-medium"
              : "rounded-md px-4 py-1.5 text-slate-500 transition-colors hover:text-foreground"
          }
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

/** 工作区容器读取当前形态的统一入口（与 ModeSwitch 同源） */
export function useConsoleMode() {
  return useConsoleStore((s) => s.mode);
}

/**
 * console 控制台双形态前端状态（Task A.4.1）。
 *
 * - mode（通用 general / 专业 pro）：localStorage 持久化，key 见 CONSOLE_MODE_STORAGE_KEY，
 *   partialize 仅序列化 mode（默认 general）；跨模式偏好跟随浏览器留存。
 * - draftPriorities：专业版优先级编辑草稿，纯会话内临时态——刻意**不持久化**：
 *   组件挂载时经 resetDraft(rows) 以服务端数据初始化，编辑增量经 updateDraftPriority 镜像，
 *   用于通用↔专业模式往返切换时不丢失未保存修改。
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ConsoleMode = "general" | "pro";

export const CONSOLE_MODE_STORAGE_KEY = "aidean-console-mode";

/** 专业版优先级草稿行（不含 free 只读行：该行由组件层独立渲染锁定态，永不入可写集） */
export interface DraftPriorityRow {
  modelId: string;
  priority: number;
}

/**
 * 模型配置「保存」动作通道（T2 保存按钮上移到版本切换左侧）。
 * 通用版/专业版各自的 handleSave/校验态/文案仍内聚在表单组件内，仅经 register 暴露给
 * ConsoleWorkspace 标题行统一渲染按钮；label 随 mode 切换，disabled/saving 实时联动。
 */
export interface ConfigSaveAction {
  /** 常态文案（如「保存四档绑定」/「保存优先级」） */
  idleLabel: string;
  /** 提交中文案（如「保存中…」） */
  savingLabel: string;
  saving: boolean;
  /** 校验未过（重复绑定 / 越界）或提交中 → 禁用 */
  disabled: boolean;
  onSave: () => void;
}

interface ConsoleState {
  mode: ConsoleMode;
  draftPriorities: DraftPriorityRow[];
  /** 当前形态表单注册的保存动作；无（如未挂载）为 null */
  configSave: ConfigSaveAction | null;
  setMode: (mode: ConsoleMode) => void;
  /** 单行步进/键入后的草稿镜像（仅可写行调用） */
  updateDraftPriority: (modelId: string, priority: number) => void;
  /** 整组重置草稿基线（挂载初始化或保存回写成功后对齐服务端快照）；缺省清空 */
  resetDraft: (rows?: DraftPriorityRow[]) => void;
  /** 表单挂载/状态变更时注册保存动作；卸载传 null 清理 */
  setConfigSave: (action: ConfigSaveAction | null) => void;
}

export const useConsoleStore = create<ConsoleState>()(
  persist(
    (set) => ({
      mode: "general",
      draftPriorities: [],
      configSave: null,
      setMode: (mode) => set({ mode }),
      updateDraftPriority: (modelId, priority) =>
        set((state) => ({
          draftPriorities: state.draftPriorities.some((row) => row.modelId === modelId)
            ? state.draftPriorities.map((row) =>
                row.modelId === modelId ? { ...row, priority } : row
              )
            : [...state.draftPriorities, { modelId, priority }],
        })),
      resetDraft: (rows = []) =>
        set({
          draftPriorities: rows.map((row) => ({ modelId: row.modelId, priority: row.priority })),
        }),
      setConfigSave: (action) => set({ configSave: action }),
    }),
    {
      name: CONSOLE_MODE_STORAGE_KEY,
      partialize: (state) => ({ mode: state.mode }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);

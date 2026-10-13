/**
 * evaluation 列表/详情共享的状态展示元数据（EVAL-01）。
 * 状态机与后端 EVALUATION_STATUS 对齐；仅做展示映射，不承载业务判定。
 */
export const STATUS_META: Record<number, { label: string; cls: string }> = {
  0: { label: "待执行", cls: "bg-slate-100 text-slate-500" },
  1: { label: "执行中", cls: "bg-sky-50 text-sky-600" },
  2: { label: "已完成", cls: "bg-emerald-50 text-emerald-600" },
  3: { label: "失败", cls: "bg-red-50 text-red-600" },
};

export interface EvaluationListRow {
  id: string;
  status: number;
  isPaid: boolean;
  prompt: string;
  winnerModelId: string | null;
  /** 费用（分/minor 整数字符串） */
  costMinor: string;
  /** 费用（元、两位小数字符串，UI 展示用，前缀 ¥ 由渲染侧加） */
  costYuan: string;
  createdAt: string;
  modelCount: number;
}

export interface EvaluationModelView {
  id: string;
  modelId: string;
  modelName: string;
  modelSlug: string | null;
  status: string;
  response: string | null;
  errorMessage: string | null;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  latencyMs: number | null;
  ttftMs: number | null;
}

export interface EvaluationDetailView {
  id: string;
  status: number;
  isPaid: boolean;
  prompt: string;
  title: string | null;
  winnerModelId: string | null;
  /** 费用（分/minor 整数字符串） */
  costMinor: string;
  /** 费用（元、两位小数字符串） */
  costYuan: string;
  errorMsg: string | null;
  createdAt: string;
  completedAt: string | null;
  models: EvaluationModelView[];
}

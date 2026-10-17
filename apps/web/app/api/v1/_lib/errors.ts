/**
 * API v1 业务错误码表与统一异常类型。
 *
 * 段位对齐 docs/architecture/API接口文档.md §4：
 *   0 成功；1xxxx 用户/认证；2xxxx 模型/天梯；3xxxx 模型站/统一API；4xxxx 财务；5xxxx 系统。
 *
 * 唯一码源已迁至 @aidean/shared（TASK-001 / ADR-P001 / REQ-NF-001）：
 *   本文件不再定义任何码值，仅重导出 ERROR_CODES / DEFAULT_STATUS_BY_CODE（TASK-002 消除双源）。
 *   新增错误码须先在 contracts 与 shared 登记，不得回到本表补写码值。
 *   formatZodMessage 与 ApiError 为 web 运行时专属，保留于本文件。
 */
import { ERROR_CODES as SHARED_ERROR_CODES } from "@aidean/shared";

// 唯一源重导出：码值与 HTTP 映射均来自 @aidean/shared，本文件零码值定义。
export { ERROR_CODES, DEFAULT_STATUS_BY_CODE } from "@aidean/shared";

/** formatZodMessage 入参结构（与 zod ZodIssue 兼容的最小面，避免 web 侧直连 zod 依赖） */
export interface ZodLikeIssue {
  code: string;
  message?: string;
  path?: readonly (string | number)[];
  expected?: unknown;
  received?: unknown;
  options?: readonly unknown[];
}

/** Zod issue → 中文 40000 文案（P3：统一参数校验文案层；enum 中文提示，custom 透传语义） */
export function formatZodMessage(issue: ZodLikeIssue): string {
  const at = (issue.path?.join(".") || "body") as string;
  switch (issue.code) {
    case "invalid_enum_value":
      return `枚举值非法，允许 ${(issue.options ?? []).join("/")}`;
    case "invalid_type":
      return `参数类型非法（期望 ${String(issue.expected)}，收到 ${String(issue.received)}）`;
    case "too_big":
      return `数值超出上限（路径：${at}）`;
    case "too_small":
      return `数值低于下限（路径：${at}）`;
    case "custom":
      return issue.message || "参数校验失败";
    default:
      return `参数非法：${at}`;
  }
}

/** web 侧错误码值联合（类型派生自 shared 唯一源；与 shared ErrorCodeValue 同义，保留旧名以兼容既有引用） */
export type ErrorCode = (typeof SHARED_ERROR_CODES)[keyof typeof SHARED_ERROR_CODES];

/**
 * 业务异常：在 handler/service 内抛出后由 withApi 捕获，
 * 自动转为 errorResponse(code, message)，data 恒为 null。
 * httpStatus 可选显式覆盖，缺省按 DEFAULT_STATUS_BY_CODE 推断（再缺省：50000→500 / 其余→400）。
 */
export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

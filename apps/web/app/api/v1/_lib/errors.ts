/**
 * API v1 业务错误码表与统一异常类型。
 *
 * 段位对齐 docs/architecture/API接口文档.md §4：
 *   0 成功；1xxxx 用户/认证；2xxxx 模型/天梯；3xxxx 模型站/统一API；4xxxx 财务；5xxxx 系统。
 * 新增错误码须先在该文档登记，再回到本表补充。
 */

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

export const ERROR_CODES = {
  /** 用户不存在（1xxxx 用户/认证段示例） */
  USER_NOT_FOUND: 10001,
  /** 邮箱已被注册（注册唯一约束冲突） */
  EMAIL_DUPLICATED: 10002,
  /** 凭据无效（用户不存在/密码错误统一码，防枚举） */
  INVALID_CREDENTIALS: 10003,
  /** 未登录/会话无效或已过期（含 refresh 令牌无效） */
  UNAUTHENTICATED: 10004,
  /** 账号已被禁用或锁定（status != ACTIVE） */
  ACCOUNT_DISABLED: 10005,
  /** 请求过于频繁（限流：登录/token 端点固定窗口，M-SSO P0.5） */
  TOO_MANY_REQUESTS: 10006,
  /** client scope 不足（服务间端点授权范围校验，M-SSO P1.8） */
  FORBIDDEN_CLIENT_SCOPE: 10007,
  /** 需要管理员权限（v1.9：后台配置端点 requireAdminApi 守卫） */
  FORBIDDEN: 10008,
  /** 凭据已吊销/停用，再次吊销按幂等冲突拒绝（S4 credentials revoke → 409） */
  CREDENTIAL_NOT_REVOCABLE: 10009,
  /** 模型不存在（2xxxx 模型/天梯段） */
  MODEL_NOT_FOUND: 20001,
  /** 榜单类型非法（ladder type 仅允许 models|stations） */
  RANKING_TYPE_INVALID: 20002,
  /** 站点不可用（3xxxx 模型站/统一API段） */
  SITE_UNAVAILABLE: 30001,
  /** 网关无可用路由（候选链为空：无配置且无可用 free 兜底） */
  GATEWAY_NO_ROUTE: 30002,
  /** 网关全部候选失败（沿降级链尝试耗尽仍无成功） */
  GATEWAY_ALL_FAILED: 30003,
  /** 上游返回错误（上游非 2xx 或响应不可解析） */
  UPSTREAM_ERROR: 30004,
  /** 通用请求参数非法（badRequest 默认码；message 承载具体语义） */
  BAD_REQUEST: 40000,
  /** 余额不足（4xxxx 财务段；可用额 = 余额 − 预扣冻结） */
  INSUFFICIENT_BALANCE: 40001,
  /** 充值订单不存在或不属于当前用户 */
  RECHARGE_ORDER_NOT_FOUND: 40002,
  /** 订单状态不允许该操作（非 PENDING 订单重复受理按幂等成功处理除外） */
  ORDER_STATE_INVALID: 40003,
  /** 预扣不存在/已捕获/已作废/已过期，无法继续操作 */
  HOLD_INVALID: 40004,
  /** 支付渠道回调验签失败 */
  NOTIFY_SIGNATURE_INVALID: 40005,
  /** 内部错误（5xxxx 系统段；未知异常统一收敛于此） */
  INTERNAL_ERROR: 50000,
} as const;

/** 业务码 → HTTP 状态默认映射（仅登记偏离「非 50000 即 400」默认值的码位） */
export const DEFAULT_STATUS_BY_CODE: Partial<Record<number, number>> = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [ERROR_CODES.UNAUTHENTICATED]: 401,
  [ERROR_CODES.ACCOUNT_DISABLED]: 403,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.TOO_MANY_REQUESTS]: 429,
  [ERROR_CODES.FORBIDDEN_CLIENT_SCOPE]: 403,
  [ERROR_CODES.NOTIFY_SIGNATURE_INVALID]: 401,
  [ERROR_CODES.CREDENTIAL_NOT_REVOCABLE]: 409,
};

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

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

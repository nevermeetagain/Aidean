// 唯一错误码源（ADR-P001 / REQ-NF-001）——由 docs/任务规划V0.5.0/contracts/02-errors.contract.ts 经 TASK-001 原样落地。
// 落地后本文件为全项目唯一错误码源：
//   - apps/web/app/api/v1/_lib/errors.ts 仅允许 `export { ... } from "@aidean/shared"` 重导出（TASK-002）；
//   - packages/shared/src/types/index.ts 旧冲突表 ErrorCode/ErrorCodeValue 已删除（TASK-001）；
//   - 任何码值/HTTP 映射改动须先提 ADR 并经评审（契约冻结铁律）。
import { z } from "zod";

/** 全量错误码（0=成功不在表内）。段位：1xxxx 用户/认证 · 2xxxx 模型/天梯/收藏 · 3xxxx 模型站/网关 · 4xxxx 财务 · 5xxxx 系统 */
export const ERROR_CODES = {
  // —— 既有 22 码（逐字沿用 apps/web/app/api/v1/_lib/errors.ts，值不得改）——
  USER_NOT_FOUND: 10001,
  EMAIL_DUPLICATED: 10002,
  INVALID_CREDENTIALS: 10003,
  UNAUTHENTICATED: 10004,
  ACCOUNT_DISABLED: 10005,
  TOO_MANY_REQUESTS: 10006,
  FORBIDDEN_CLIENT_SCOPE: 10007,
  FORBIDDEN: 10008,
  CREDENTIAL_NOT_REVOCABLE: 10009,
  MODEL_NOT_FOUND: 20001,
  RANKING_TYPE_INVALID: 20002,
  SITE_UNAVAILABLE: 30001,
  GATEWAY_NO_ROUTE: 30002,
  GATEWAY_ALL_FAILED: 30003,
  UPSTREAM_ERROR: 30004,
  BAD_REQUEST: 40000,
  INSUFFICIENT_BALANCE: 40001,
  RECHARGE_ORDER_NOT_FOUND: 40002,
  ORDER_STATE_INVALID: 40003,
  HOLD_INVALID: 40004,
  NOTIFY_SIGNATURE_INVALID: 40005,
  INTERNAL_ERROR: 50000,
  // —— 本规划新增 3 码（先登记后实现：TASK-001 落地，TASK-009 文档登记）——
  /** 收藏目标不存在/已下线（S3 收藏：refType+refId 校验失败） */
  FAVORITE_TARGET_NOT_FOUND: 20003,
  /** 依赖不可用（S0 /system/ready：DB 或 Redis 探活失败）。刻意避开旧表 50001-50003 以免语义混淆 */
  SERVICE_UNAVAILABLE: 50010,
  /** 功能开关关闭（S2：需求 §3.9「关闭则页面 403、API 拒绝」） */
  FEATURE_DISABLED: 50011,
  // —— 模型源监控增量 2 码（contracts/07-monitoring.contract.ts MONITORING_ERROR_CODES，TASK-056 落地；合计 27 码）——
  /** 监控源 key 不存在（PATCH/run 路径参数） */
  MONITOR_SOURCE_NOT_FOUND: 20004,
  /** 源需要 API Key 但未配置（run 或 keyed collector） */
  MONITOR_SOURCE_CREDENTIAL_MISSING: 50012,
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;
export type ErrorCodeValue = (typeof ERROR_CODES)[ErrorCodeKey];

/** 偏离默认（50000→500，其余→400）的 HTTP 映射。既有 8 条逐字沿用 errors.ts:84-94，新增 2 条（TASK-001）+ 监控 2 条（TASK-056）。 */
export const DEFAULT_STATUS_BY_CODE: Readonly<Partial<Record<ErrorCodeValue, number>>> = {
  10003: 401,
  10004: 401,
  10005: 403,
  10008: 403,
  10006: 429,
  10007: 403,
  40005: 401,
  10009: 409,
  50010: 503,
  50011: 403,
  20004: 404,
  50012: 503,
};

/** 由码推断 HTTP 状态（与 apps/web/app/api/v1/_lib/response.ts errorResponse 规则一致） */
export function httpStatusOf(code: ErrorCodeValue): number {
  return DEFAULT_STATUS_BY_CODE[code] ?? (code === 50000 ? 500 : 400);
}

/** 错误体结构（data 恒 null；四要素）——与 packages/shared/src/schemas/common.schema.ts ErrorResponseShapeSchema 同形 */
export const ErrorBodySchema = z.object({
  code: z.number().int().refine((c) => (Object.values(ERROR_CODES) as number[]).includes(c), "未登记错误码"),
  message: z.string().min(1),
  data: z.null(),
  requestId: z.string().min(1),
});

/**
 * 前端展示策略（UX 映射，唯一口径）：
 * - toast    ：非阻断提示（表单外操作失败）
 * - inline   ：就近字段/表单错误（40000 携带具体 message）
 * - redirect ：跳转（未登录→/login?redirect=…；后台→/admin/login）
 * - page     ：整页状态（403 无权限态 / 功能关闭态 / 503 服务维护态）
 */
export type ErrorPresentation = "toast" | "inline" | "redirect" | "page";
export const ERROR_PRESENTATION: Readonly<Record<ErrorCodeKey, ErrorPresentation>> = {
  USER_NOT_FOUND: "inline",
  EMAIL_DUPLICATED: "inline",
  INVALID_CREDENTIALS: "inline",
  UNAUTHENTICATED: "redirect",
  ACCOUNT_DISABLED: "page",
  TOO_MANY_REQUESTS: "toast",
  FORBIDDEN_CLIENT_SCOPE: "page",
  FORBIDDEN: "page",
  CREDENTIAL_NOT_REVOCABLE: "toast",
  MODEL_NOT_FOUND: "page",
  RANKING_TYPE_INVALID: "inline",
  SITE_UNAVAILABLE: "toast",
  GATEWAY_NO_ROUTE: "inline",
  GATEWAY_ALL_FAILED: "inline",
  UPSTREAM_ERROR: "inline",
  BAD_REQUEST: "inline",
  INSUFFICIENT_BALANCE: "inline",
  RECHARGE_ORDER_NOT_FOUND: "toast",
  ORDER_STATE_INVALID: "toast",
  HOLD_INVALID: "toast",
  NOTIFY_SIGNATURE_INVALID: "toast",
  INTERNAL_ERROR: "toast",
  FAVORITE_TARGET_NOT_FOUND: "toast",
  SERVICE_UNAVAILABLE: "page",
  FEATURE_DISABLED: "page",
  MONITOR_SOURCE_NOT_FOUND: "toast",
  MONITOR_SOURCE_CREDENTIAL_MISSING: "inline",
};

/** 失败路径 → 错误码覆盖表（契约自检 §4.4「错误码覆盖所有已知失败路径」的机器口径） */
export const FAILURE_PATHS: ReadonlyArray<{ path: string; code: ErrorCodeKey }> = [
  { path: "任意请求体/查询参数 zod 校验失败", code: "BAD_REQUEST" },
  { path: "（v0.2）候选价格行不可归一（未知币种/汇率缺失）且降级链无其他候选", code: "GATEWAY_NO_ROUTE" },
  { path: "未登录或 access 失效", code: "UNAUTHENTICATED" },
  { path: "账号禁用/软删", code: "ACCOUNT_DISABLED" },
  { path: "后台无 isStaff 或缺权限码", code: "FORBIDDEN" },
  { path: "登录/令牌端点限流", code: "TOO_MANY_REQUESTS" },
  { path: "readiness：DB 或 Redis 不可达", code: "SERVICE_UNAVAILABLE" },
  { path: "功能开关关闭时访问对应 API", code: "FEATURE_DISABLED" },
  { path: "收藏目标不存在/已软删/未发布", code: "FAVORITE_TARGET_NOT_FOUND" },
  { path: "删除他人或不存在的收藏（按 0 行处理，防枚举）", code: "BAD_REQUEST" },
  { path: "限时优惠窗口非法（until<=from / 与已有窗口重叠）", code: "BAD_REQUEST" },
  { path: "限时优惠指向不存在模型", code: "MODEL_NOT_FOUND" },
  { path: "网关余额不足且无 free 兜底", code: "INSUFFICIENT_BALANCE" },
  { path: "监控源 PATCH/run 的 {key} 未注册", code: "MONITOR_SOURCE_NOT_FOUND" },
  { path: "监控源 run：authRequired 源但 env MONITOR_KEY_<SOURCE> 缺失", code: "MONITOR_SOURCE_CREDENTIAL_MISSING" },
  { path: "未知异常", code: "INTERNAL_ERROR" },
];

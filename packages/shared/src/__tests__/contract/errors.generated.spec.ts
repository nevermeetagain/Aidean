// AUTO-GENERATED — DO NOT EDIT
// 由 scripts/contract/gen-contract-tests.mjs 生成（TASK-004 / REQ-NF-001 / ADR-P001）。
// 真源：packages/shared/src/errors.ts + docs/architecture/API接口文档.md §4 + contracts/03-identity.contract.ts
// 重生成：node scripts/contract/gen-contract-tests.mjs ；CI 以 git diff --exit-code 防漂移/手改。

import { describe, expect, it } from "vitest";
import { ERROR_CODES, DEFAULT_STATUS_BY_CODE, httpStatusOf, ErrorBodySchema, type ErrorCodeValue } from "../../errors";

// —— 生成期自真源解析的冻结数据（测试期与 live 模块交叉断言）——
const CODE_TABLE = {
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
  FAVORITE_TARGET_NOT_FOUND: 20003,
  MONITOR_SOURCE_NOT_FOUND: 20004,
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
  SERVICE_UNAVAILABLE: 50010,
  FEATURE_DISABLED: 50011,
  MONITOR_SOURCE_CREDENTIAL_MISSING: 50012,
} as const;

const DOC_REGISTERED: ReadonlyArray<{ code: number; identifier: string }> = [
  { code: 30001, identifier: "SITE_UNAVAILABLE" },
  { code: 30002, identifier: "GATEWAY_NO_ROUTE" },
  { code: 30003, identifier: "GATEWAY_ALL_FAILED" },
  { code: 30004, identifier: "UPSTREAM_ERROR" },
  { code: 40001, identifier: "INSUFFICIENT_BALANCE" },
  { code: 40002, identifier: "RECHARGE_ORDER_NOT_FOUND" },
  { code: 40003, identifier: "ORDER_STATE_INVALID" },
  { code: 40004, identifier: "HOLD_INVALID" },
  { code: 40005, identifier: "NOTIFY_SIGNATURE_INVALID" },
];

const HTTP_STATUS_MAP: Readonly<Record<number, number>> = {
  10003: 401,
  10004: 401,
  10005: 403,
  10006: 429,
  10007: 403,
  10008: 403,
  10009: 409,
  20004: 404,
  40005: 401,
  50010: 503,
  50011: 403,
  50012: 503,
};

const AUTHZ_DENY_CODES: ReadonlyArray<number> = [-1, 10004, 10008, 40000];

const liveCodes = ERROR_CODES as Record<string, number>;
const liveCodeValues: number[] = Object.values(liveCodes);
const liveStatus = DEFAULT_STATUS_BY_CODE as Record<number, number | undefined>;

describe("[contract] 错误码表 ↔ API接口文档 §4（doc 登记 ⊆ 代码表，先登记后实现）", () => {
  it("生成期码表与 live ERROR_CODES 逐值一致（防 shared 漂移未重生成）", () => {
    for (const [k, v] of Object.entries(CODE_TABLE)) {
      expect(liveCodes, `码 ${k} 应存在于 ERROR_CODES`).toHaveProperty(k);
      expect(liveCodes[k], `码 ${k} 值漂移`).toBe(v);
    }
    expect(Object.keys(liveCodes).length).toBe(Object.keys(CODE_TABLE).length);
  });

  it("§4 每个登记码在代码表同名同值（doc 不登记代码表之外的码）", () => {
    for (const { code, identifier } of DOC_REGISTERED) {
      expect(liveCodes, `§4 登记的 ${identifier} 应在 ERROR_CODES`).toHaveProperty(identifier);
      expect(liveCodes[identifier], `${identifier} 码值应 = ${code}`).toBe(code);
    }
  });
});

describe("[contract] HTTP 状态映射（DEFAULT_STATUS_BY_CODE + httpStatusOf 规则）", () => {
  it("live 映射与生成期快照逐值一致", () => {
    for (const [c, s] of Object.entries(HTTP_STATUS_MAP)) {
      expect(liveStatus[Number(c)], `code ${c} 状态漂移`).toBe(s);
    }
    expect(Object.keys(liveStatus).length).toBe(Object.keys(HTTP_STATUS_MAP).length);
  });

  it("映射表每个键都是已登记码值", () => {
    for (const c of Object.keys(HTTP_STATUS_MAP)) {
      expect(liveCodeValues, `映射键 ${c} 应为合法码`).toContain(Number(c));
    }
  });

  it("httpStatusOf：命中映射优先，否则 50000→500 / 其余→400", () => {
    for (const c of liveCodeValues) {
      const expected = HTTP_STATUS_MAP[c] ?? (c === 50000 ? 500 : 400);
      expect(httpStatusOf(c as ErrorCodeValue), `httpStatusOf(${c})`).toBe(expected);
    }
  });
});

describe("[contract] 错误信封 ErrorBodySchema", () => {
  it("已登记码信封通过；未登记码/非空 data/空 message 拒绝", () => {
    const registered = DOC_REGISTERED[0].code;
    expect(ErrorBodySchema.safeParse({ code: registered, message: "m", data: null, requestId: "r" }).success).toBe(true);
    expect(ErrorBodySchema.safeParse({ code: 99999, message: "m", data: null, requestId: "r" }).success).toBe(false);
    expect(ErrorBodySchema.safeParse({ code: registered, message: "m", data: { x: 1 }, requestId: "r" }).success).toBe(false);
    expect(ErrorBodySchema.safeParse({ code: registered, message: "", data: null, requestId: "r" }).success).toBe(false);
  });
});

describe("[contract] AUTHZ_BOUNDARY deny 码 ∈ 错误码表（或 -1 序列化白名单哨兵）", () => {
  it("每条拒绝边界引用的错误码都已登记", () => {
    for (const deny of AUTHZ_DENY_CODES) {
      if (deny === -1) continue;
      expect(liveCodeValues, `AUTHZ deny ${deny} 应为已登记码`).toContain(deny);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  DEFAULT_STATUS_BY_CODE,
  httpStatusOf,
  ErrorBodySchema,
  ERROR_PRESENTATION,
  FAILURE_PATHS,
  type ErrorCodeKey,
  type ErrorCodeValue,
} from "../errors";
import { SystemReadySchema } from "../schemas/system.schema";
// 唯一源对账：与迁移前 apps/web/app/api/v1/_lib/errors.ts 现网码表逐值相等。
// 快照取自 TASK-002 之前 web 的 22 既有码 + 8 条 HTTP 映射（逐字转录自 errors.ts:38-95）。
// 不 import apps/**——遵守模块边界铁律：packages/** 禁止反向依赖 apps/**（TASK-007 module-boundary）。
// 该快照为迁移时点冻结参照：TASK-002 之后 web 改由 shared 重导出，本对账不会退化为 shared↔shared 自我比对。
const WEB_ERROR_CODES_SNAPSHOT = {
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
} as const;

// 迁移前 web DEFAULT_STATUS_BY_CODE 的 8 条偏离默认（键为业务码数值，errors.ts:86-95）
const WEB_STATUS_SNAPSHOT: Readonly<Record<number, number>> = {
  10003: 401,
  10004: 401,
  10005: 403,
  10006: 429,
  10007: 403,
  10008: 403,
  10009: 409,
  40005: 401,
};

describe("errors.ts 唯一错误码源（TASK-001 / ADR-P001）", () => {
  it("码值全表唯一（无重复），共 28 码 = 既有 22 + 新增 3（TASK-001）+ 监控 2（TASK-056）+ V0.12 1（T120-10）", () => {
    const vals = Object.values(ERROR_CODES) as number[];
    const dup = vals.filter((v, i) => vals.indexOf(v) !== i);
    expect(dup).toEqual([]);
    expect(vals.length).toBe(28);
  });

  it("新增 3 码值精确（20003/50010/50011）", () => {
    expect(ERROR_CODES.FAVORITE_TARGET_NOT_FOUND).toBe(20003);
    expect(ERROR_CODES.SERVICE_UNAVAILABLE).toBe(50010);
    expect(ERROR_CODES.FEATURE_DISABLED).toBe(50011);
  });

  it("22 既有码与迁移前 web 快照逐值相等（shared 为超集，恰 +3 新增码）", () => {
    for (const [k, v] of Object.entries(WEB_ERROR_CODES_SNAPSHOT)) {
      expect(ERROR_CODES, `迁移前 web 码 ${k} 应与 shared 一致`).toHaveProperty(k);
      expect((ERROR_CODES as Record<string, number>)[k]).toBe(v);
    }
    // 快照 22 码；shared 硬锁 28（= 22 既有 + 3 新增 + 2 监控 TASK-056 + 1 渠道探测 T120-10），不随 TASK-002 web 重导出而波动
    const snapKeys = Object.keys(WEB_ERROR_CODES_SNAPSHOT);
    expect(snapKeys.length).toBe(22);
    expect(Object.keys(ERROR_CODES).length).toBe(28);
  });

  it("HTTP 映射：迁移前 web 快照 8 条逐值一致（shared 仅额外新增 2 条）", () => {
    const sharedStatus = DEFAULT_STATUS_BY_CODE as Record<string, number | undefined>;
    for (const [code, status] of Object.entries(WEB_STATUS_SNAPSHOT)) {
      expect(sharedStatus[code], `code ${code} 状态映射应与迁移前 web 一致`).toBe(status);
    }
    // shared 在迁移前 8 条之外，新增 50010→503 / 50011→403（TASK-001）与 20004→404 / 50012→503（TASK-056）
    expect(sharedStatus[50010]).toBe(503);
    expect(sharedStatus[50011]).toBe(403);
    expect(sharedStatus[20004]).toBe(404);
    expect(sharedStatus[50012]).toBe(503);
    expect(Object.keys(sharedStatus).length).toBe(12);
  });

  it("httpStatusOf 映射表驱动（偏离默认 + 默认 50000→500 / 其余→400）", () => {
    const expected: Record<number, number> = {
      10003: 401,
      10004: 401,
      10005: 403,
      10006: 429,
      10007: 403,
      10008: 403,
      10009: 409,
      40005: 401,
      50010: 503,
      50011: 403,
      50000: 500,
      10001: 400,
      40000: 400,
    };
    for (const [code, status] of Object.entries(expected)) {
      expect(httpStatusOf(Number(code) as ErrorCodeValue)).toBe(status);
    }
  });

  it("ErrorBodySchema：登记码通过，未登记码（如旧表 50003）拒绝", () => {
    expect(ErrorBodySchema.safeParse({ code: 50011, message: "x", data: null, requestId: "r" }).success).toBe(true);
    expect(ErrorBodySchema.safeParse({ code: 50003, message: "x", data: null, requestId: "r" }).success).toBe(false);
    expect(ErrorBodySchema.safeParse({ code: 10001, message: "x", data: {}, requestId: "r" }).success).toBe(false); // data 恒 null
    expect(ErrorBodySchema.safeParse({ code: 10001, message: "", data: null, requestId: "r" }).success).toBe(false); // message 非空
  });

  it("ERROR_PRESENTATION 覆盖全部码，FAILURE_PATHS 指向合法码键", () => {
    for (const key of Object.keys(ERROR_CODES) as ErrorCodeKey[]) {
      expect(ERROR_PRESENTATION).toHaveProperty(key);
    }
    for (const fp of FAILURE_PATHS) {
      expect(ERROR_CODES).toHaveProperty(fp.code);
    }
  });
});

describe("SystemReadySchema（TASK-001 落地契约① §S0）", () => {
  it("就绪态解析通过；db/redis 非 ok 或非 ready 拒绝", () => {
    expect(SystemReadySchema.safeParse({ status: "ready", checks: { db: "ok", redis: "ok" }, time: new Date().toISOString() }).success).toBe(true);
    expect(SystemReadySchema.safeParse({ status: "ready", checks: { db: "fail", redis: "ok" }, time: new Date().toISOString() }).success).toBe(false);
    expect(SystemReadySchema.safeParse({ status: "degraded", checks: { db: "ok", redis: "ok" }, time: new Date().toISOString() }).success).toBe(false);
    expect(SystemReadySchema.safeParse({ status: "ready", checks: { db: "ok", redis: "ok" }, time: "not-iso" }).success).toBe(false);
  });
});

/**
 * T120-05 启动期环境变量校验单测（卡面验收②：3 例）。
 * 口径三条：①缺必需变量必须**报出变量名**；②可选变量缺失不得被注入默认值（既有 ??/||/!== 语义不变）；
 * ③严格模式仅在真运行时生效，生产强建议项缺失只 WARN 不抛错。
 * 全部以显式 source 快照驱动，不依赖也不写回 process.env。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PRODUCTION_RECOMMENDED_ENV,
  REQUIRED_ENV,
  getEnv,
  resetEnvCacheForTest,
  shouldStrictValidate,
  validateEnv,
} from "../env";

const MINIMAL_OK = {
  DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/aidean_test",
  JWT_SECRET: "unit-test-secret",
};

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  resetEnvCacheForTest();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lib/config/env（启动期环境变量校验）", () => {
  it("[1] 必需变量缺失：getEnv 抛错且消息逐条含变量名", () => {
    expect(REQUIRED_ENV).toEqual(["DATABASE_URL", "JWT_SECRET"]);

    const src = { NODE_ENV: "production", REDIS_URL: "redis://localhost:6379" };
    const report = validateEnv(src, { production: true });
    expect(report.strict).toBe(true);
    expect(report.missingRequired).toEqual(["DATABASE_URL", "JWT_SECRET"]);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain("DATABASE_URL");
    expect(report.errors[0]).toContain("JWT_SECRET");

    expect(() => getEnv(src)).toThrowError(/DATABASE_URL/);
    expect(() => getEnv(src)).toThrowError(/JWT_SECRET/);
    // 仅缺一个时也只报该一个（勿把已配置项一起报缺，否则排障会被误导）
    const half = { ...src, DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/aidean_test" };
    expect(validateEnv(half).missingRequired).toEqual(["JWT_SECRET"]);
    // 空白值等同未配置
    expect(validateEnv({ DATABASE_URL: "   ", JWT_SECRET: "s", NODE_ENV: "production" }).missingRequired).toEqual([
      "DATABASE_URL",
    ]);
  });

  it("[2] 必需齐备而可选全缺：不抛错、不注入默认值、不写回 process.env", () => {
    const before = { ...process.env };
    const report = validateEnv({ ...MINIMAL_OK, NODE_ENV: "development" });

    expect(report.errors).toEqual([]);
    expect(report.strict).toBe(true); // 开发运行态仍为严格（只是本次没有缺失）
    expect(report.missingRequired).toEqual([]);
    expect(report.missingRecommended).toEqual([]); // 非生产不产出「生产建议」噪声
    // 缺失即 undefined：本模块不代替读取点做 ?? 回落
    expect(report.values.REDIS_URL).toBeUndefined();
    expect(report.values.SMTP_PORT).toBeUndefined();
    expect(report.values.TZ).toBeUndefined();

    const values = getEnv({ ...MINIMAL_OK, NODE_ENV: "development" });
    expect(values.DATABASE_URL).toBe(MINIMAL_OK.DATABASE_URL);
    expect(values.JWT_SECRET).toBe(MINIMAL_OK.JWT_SECRET);
    // 关键防呆：绝不把校验快照回写进 process.env（否则既有 ?? 语义会被空串/占位值污染）
    expect(process.env.DATABASE_URL).toBe(before.DATABASE_URL);
    expect(process.env.JWT_SECRET).toBe(before.JWT_SECRET);
    expect(process.env.REDIS_URL).toBe(before.REDIS_URL);
    expect(warnSpy.mock.calls.length).toBe(0);
  });

  it("[3] 严格模式口径与生产建议项：构建期/单测期不 fail-fast，建议项缺失仅 WARN", () => {
    expect(shouldStrictValidate({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" })).toBe(false);
    expect(shouldStrictValidate({ NODE_ENV: "test" })).toBe(false);
    expect(shouldStrictValidate({ NODE_ENV: "production" })).toBe(true);
    expect(shouldStrictValidate({})).toBe(true); // 未注入 NODE_ENV 的运行态仍按严格处置

    // 非严格态（单测期）：必需缺失打 console.error 而不抛，避免 vitest 全局环境被拖垮
    expect(() => getEnv({ NODE_ENV: "test" })).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("DATABASE_URL"));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("JWT_SECRET"));

    // 生产：建议项缺失 → 逐条 WARN（含变量名），且不进 errors（不阻断启动）
    const prod = validateEnv({ ...MINIMAL_OK, NODE_ENV: "production" }, { production: true });
    expect(prod.errors).toEqual([]);
    expect(prod.missingRecommended).toEqual([...PRODUCTION_RECOMMENDED_ENV]);
    const prodText = prod.warnings.join("\n");
    for (const key of PRODUCTION_RECOMMENDED_ENV) expect(prodText).toContain(key);

    // 形态不符（SMTP_PORT 非数字 / 开关非 0|1）→ WARN 且点名，读取点语义不受影响
    const odd = validateEnv(
      {
        ...MINIMAL_OK,
        NODE_ENV: "production",
        REDIS_URL: "redis://localhost:6379",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        JWT_PRIVATE_KEY: "pem",
        BILLING_NOTIFY_SECRET: "sec",
        ADMIN_API_TOKEN: "tok",
        SMTP_PORT: "4o5",
        RUN_DB_TESTS: "yes",
      },
      { production: true }
    );
    expect(odd.invalidKeys.sort()).toEqual(["RUN_DB_TESTS", "SMTP_PORT"]);
    expect(odd.missingRecommended).toEqual([]);
    const oddText = odd.warnings.join("\n");
    expect(oddText).toContain("SMTP_PORT");
    expect(oddText).toContain("RUN_DB_TESTS");
    expect(oddText).toContain("危险开关"); // 生产环境把非 0 开关视为危险项提示
  });
});

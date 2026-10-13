/**
 * loginRateLimitBypassed() contract (test-harness-only login limiter bypass).
 *
 * Safety invariant: the bypass NEVER activates in production (isProduction() gate), so the online
 * login rate limiter stays byte-identical there. Only an explicit AIDEAN_BYPASS_LOGIN_RATE_LIMIT=1 in
 * a non-production process relaxes it, letting a single full e2e pass (>20 real logins) avoid the
 * fixed-window 429. This is test-env contention, not a product defect.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { loginRateLimitBypassed } from "../constants";

describe("loginRateLimitBypassed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false when the env flag is absent", () => {
    vi.stubEnv("AIDEAN_BYPASS_LOGIN_RATE_LIMIT", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(loginRateLimitBypassed()).toBe(false);
  });

  it("is false in production even when the flag is set (production never bypasses)", () => {
    vi.stubEnv("AIDEAN_BYPASS_LOGIN_RATE_LIMIT", "1");
    vi.stubEnv("NODE_ENV", "production");
    expect(loginRateLimitBypassed()).toBe(false);
  });

  it("is true only when the flag is set AND non-production", () => {
    vi.stubEnv("AIDEAN_BYPASS_LOGIN_RATE_LIMIT", "1");
    vi.stubEnv("NODE_ENV", "development");
    expect(loginRateLimitBypassed()).toBe(true);
  });

  it("is false when the flag is not the literal 1", () => {
    vi.stubEnv("AIDEAN_BYPASS_LOGIN_RATE_LIMIT", "0");
    vi.stubEnv("NODE_ENV", "development");
    expect(loginRateLimitBypassed()).toBe(false);
  });
});

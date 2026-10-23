// V0.12.0 契约测试（T120-10）——真源 docs/任务规划V0.12.0/contracts/*.contract.ts，落地于 @aidean/shared。
import { describe, expect, it } from "vitest";
import { ERROR_CODES, ERROR_PRESENTATION, FAILURE_PATHS, httpStatusOf } from "../../errors";
import {
  PasswordStrength, ChangePasswordRequest, ChangePasswordResponse, ResetCodeRequest, ResetCodeResponse,
  ResetPasswordRequest, ResetPasswordResponse, SessionVersionRule,
} from "../../schemas/auth.schema";
import { ChannelProbeParams, ChannelProbeOutcome, ChannelProbeResponse } from "../../schemas/user.schema";
import {
  MonitorRunStatus, MonitorRunTransition, MonitorRunRequest, AdminMonitoringRunResponseV2, AdminMonitoringRunsResponse,
  MonitoringSourceDerived, ReliabilityDay, StationReliabilityResponse, MONITORING_V120_ENDPOINTS,
} from "../../schemas/monitoring.schema";

const UUID = "3f1c2b9e-5a7d-4c1e-9b2a-1d2e3f4a5b6c";
const NOW = "2026-10-23T07:00:00.000Z";
const runRow = { id: UUID, sourceKey: "openrouter", status: "pending", requestedBy: UUID, createdAt: NOW, startedAt: null, finishedAt: null, resultCount: null, error: null };

describe("02b 错误码增量", () => {
  it("恰新增 30005，且 28 码无重复", () => {
    expect(ERROR_CODES.CHANNEL_PROBE_TARGET_FORBIDDEN).toBe(30005);
    const vals = Object.values(ERROR_CODES) as number[];
    expect(vals.length).toBe(28);
    expect(new Set(vals).size).toBe(28);
  });
  it("30005 → HTTP 400 / inline", () => {
    expect(httpStatusOf(30005)).toBe(400);
    expect(ERROR_PRESENTATION.CHANNEL_PROBE_TARGET_FORBIDDEN).toBe("inline");
  });
  it("V0.12 失败路径全部登记且码键存在", () => {
    const v120 = ["改密：旧密码错误", "渠道探测：目标被 SSRF 策略拒绝", "监控立即运行：该源已有 pending/running 请求", "access token 的 ver 与库内 tokenVersion 不等"];
    for (const p of v120) expect(FAILURE_PATHS.some((f) => f.path === p), p).toBe(true);
    for (const f of FAILURE_PATHS) expect(ERROR_CODES).toHaveProperty(f.code);
  });
});

describe("03b 改密 / 找回", () => {
  it("密码强度：正例", () => expect(PasswordStrength.safeParse("abc12345").success).toBe(true));
  it("密码强度：反例（过短 / 无数字 / 无字母 / 超 72）", () => {
    for (const p of ["a1", "abcdefgh", "12345678", "a1".repeat(37)]) expect(PasswordStrength.safeParse(p).success, p).toBe(false);
  });
  it("改密：正例与新旧相同反例", () => {
    expect(ChangePasswordRequest.safeParse({ currentPassword: "old", newPassword: "abc12345" }).success).toBe(true);
    expect(ChangePasswordRequest.safeParse({ currentPassword: "abc12345", newPassword: "abc12345" }).success).toBe(false);
    expect(ChangePasswordResponse.safeParse({ changed: true }).success).toBe(true);
    expect(ChangePasswordResponse.safeParse({ changed: false }).success).toBe(false);
  });
  it("发码：正例与非法邮箱反例", () => {
    expect(ResetCodeRequest.safeParse({ email: "a@b.cn" }).success).toBe(true);
    expect(ResetCodeRequest.safeParse({ email: "not-mail" }).success).toBe(false);
    expect(ResetCodeResponse.safeParse({ sent: true }).success).toBe(true);
  });
  it("重置：6 位数字码正例与 5 位 / 字母反例", () => {
    const base = { email: "a@b.cn", newPassword: "abc12345" };
    expect(ResetPasswordRequest.safeParse({ ...base, code: "012345" }).success).toBe(true);
    expect(ResetPasswordRequest.safeParse({ ...base, code: "12345" }).success).toBe(false);
    expect(ResetPasswordRequest.safeParse({ ...base, code: "12a456" }).success).toBe(false);
    expect(ResetPasswordResponse.safeParse({ reset: true }).success).toBe(true);
  });
  it("会话版本：相等通过、不等拒绝", () => {
    expect(SessionVersionRule.safeParse({ claimVer: 3, dbVer: 3 }).success).toBe(true);
    expect(SessionVersionRule.safeParse({ claimVer: 2, dbVer: 3 }).success).toBe(false);
  });
});

describe("01b 渠道探测", () => {
  it("参数：uuid 正例、非 uuid 反例", () => {
    expect(ChannelProbeParams.safeParse({ id: UUID }).success).toBe(true);
    expect(ChannelProbeParams.safeParse({ id: "1" }).success).toBe(false);
  });
  it("outcome 恰 4 值，forbidden 不是 outcome（走 30005）", () => {
    expect(ChannelProbeOutcome.options).toEqual(["reachable", "auth_failed", "timeout", "bad_response"]);
    expect(ChannelProbeOutcome.safeParse("forbidden").success).toBe(false);
  });
  it("响应：正例与负延迟反例", () => {
    const ok = { outcome: "reachable", httpStatus: 200, latencyMs: 120, modelCount: 12, probedAt: NOW };
    expect(ChannelProbeResponse.safeParse(ok).success).toBe(true);
    expect(ChannelProbeResponse.safeParse({ ...ok, outcome: "timeout", httpStatus: null, latencyMs: null, modelCount: null }).success).toBe(true);
    expect(ChannelProbeResponse.safeParse({ ...ok, latencyMs: -1 }).success).toBe(false);
  });
});

describe("05b / 07b 监控运行请求", () => {
  it("状态 4 值；合法迁移 3 条，其余拒绝", () => {
    expect(MonitorRunStatus.options).toEqual(["pending", "running", "done", "failed"]);
    expect(MonitorRunTransition.safeParse({ from: "pending", to: "running" }).success).toBe(true);
    expect(MonitorRunTransition.safeParse({ from: "running", to: "failed" }).success).toBe(true);
    expect(MonitorRunTransition.safeParse({ from: "pending", to: "done" }).success).toBe(false);
    expect(MonitorRunTransition.safeParse({ from: "done", to: "running" }).success).toBe(false);
  });
  it("请求行：正例与超长 sourceKey 反例", () => {
    expect(MonitorRunRequest.safeParse(runRow).success).toBe(true);
    expect(MonitorRunRequest.safeParse({ ...runRow, sourceKey: "x".repeat(41) }).success).toBe(false);
  });
  it("run 响应 V2 带 requestId；runs 分页 pageSize ≤ 50", () => {
    expect(AdminMonitoringRunResponseV2.safeParse({ accepted: true, requestId: UUID }).success).toBe(true);
    expect(AdminMonitoringRunResponseV2.safeParse({ accepted: true }).success).toBe(false);
    expect(AdminMonitoringRunsResponse.safeParse({ items: [runRow], total: 1, page: 1, pageSize: 50 }).success).toBe(true);
    expect(AdminMonitoringRunsResponse.safeParse({ items: [], total: 0, page: 1, pageSize: 51 }).success).toBe(false);
  });
  it("nextRunAt 可为 null（非法 cron），非时间串拒绝", () => {
    expect(MonitoringSourceDerived.safeParse({ nextRunAt: null }).success).toBe(true);
    expect(MonitoringSourceDerived.safeParse({ nextRunAt: "tomorrow" }).success).toBe(false);
  });
});

describe("07c 可靠性读取", () => {
  it("日行：缺观测 null 合法，>100 拒绝，日期格式校验", () => {
    expect(ReliabilityDay.safeParse({ day: "2026-10-23", uptimePercent: null, successCount: 0, failureCount: 0 }).success).toBe(true);
    expect(ReliabilityDay.safeParse({ day: "2026-10-23", uptimePercent: 101, successCount: 0, failureCount: 0 }).success).toBe(false);
    expect(ReliabilityDay.safeParse({ day: "20261023", uptimePercent: 50, successCount: 1, failureCount: 1 }).success).toBe(false);
  });
  it("响应：source 只能是 llmtest", () => {
    const ok = { stationId: UUID, days: [], lastAliveAt: null, source: "llmtest" };
    expect(StationReliabilityResponse.safeParse(ok).success).toBe(true);
    expect(StationReliabilityResponse.safeParse({ ...ok, source: "other" }).success).toBe(false);
  });
});

describe("端点登记", () => {
  it("V0.12 监控端点 3 条，路径唯一", () => {
    expect(MONITORING_V120_ENDPOINTS.length).toBe(3);
    expect(new Set(MONITORING_V120_ENDPOINTS.map((e) => `${e.method} ${e.path}`)).size).toBe(3);
  });
});

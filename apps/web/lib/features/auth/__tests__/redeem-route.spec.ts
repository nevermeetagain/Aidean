/**
 * POST /api/v1/redemption/redeem 站内兑换路由单测（SubTask 3.4.1）。
 *
 * 覆盖 checklist 3-3（成功/已用/过期/429/401 五态 + 参数校验）：
 * ① 未登录 401（requireUserApi 抛 10004）；
 * ② 限流超限 429（checkFixedWindow allowed=false）；
 * ③ 余额码成功 → 200 balanceYuan（面额分转元）；
 * ④ 已用（service 抛 40000）→ 400 信封透传 message；
 * ⑤ 过期（service 抛 40000 已过期）→ 400；
 * ⑥ 入参格式非法（code 过短）→ 400，不触 service。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const userGuardStub = vi.hoisted(() => ({ requireUserApi: vi.fn() }));
const serviceStub = vi.hoisted(() => ({ redemptionService: { redeem: vi.fn() } }));
const rlStub = vi.hoisted(() => ({ checkFixedWindow: vi.fn() }));

vi.mock("../../../features/auth/session", () => userGuardStub);
vi.mock("../../../features/package/redemption/service", () => serviceStub);
vi.mock("../../../rate-limit", () => rlStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const redeemRoute = await import("../../../../app/api/v1/redemption/redeem/route");

const SESSION_OK = { userId: "u-1", tier: "PRO" };

beforeEach(() => {
  vi.resetAllMocks(); // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
  rlStub.checkFixedWindow.mockResolvedValue({ allowed: true, count: 1 });
});

function req(code: string) {
  return new Request("http://localhost/api/v1/redemption/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

describe("POST /api/v1/redemption/redeem 五态", () => {
  it("① 未登录（10004）→ HTTP 401，不触限流与核销", async () => {
    userGuardStub.requireUserApi.mockRejectedValueOnce(
      new ApiError(ERROR_CODES.UNAUTHENTICATED, "请先登录")
    );
    const res = await redeemRoute.POST(req("ABCD1234EFGH"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(10004);
    expect(rlStub.checkFixedWindow).not.toHaveBeenCalled();
    expect(serviceStub.redemptionService.redeem).not.toHaveBeenCalled();
  });

  it("② 限流超限 → HTTP 429 code=10006", async () => {
    userGuardStub.requireUserApi.mockResolvedValueOnce(SESSION_OK);
    rlStub.checkFixedWindow.mockResolvedValueOnce({ allowed: false, count: 6 });
    const res = await redeemRoute.POST(req("ABCD1234EFGH"));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe(10006);
    expect(serviceStub.redemptionService.redeem).not.toHaveBeenCalled();
  });

  it("③ 余额码成功 → 200 balanceYuan 分转元；限流键 user 维度", async () => {
    userGuardStub.requireUserApi.mockResolvedValueOnce(SESSION_OK);
    serviceStub.redemptionService.redeem.mockResolvedValueOnce({ kind: "balance", balanceMinor: 5000n });
    const res = await redeemRoute.POST(req("ABCD1234EFGH"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.result).toEqual({ kind: "balance", balanceYuan: "50.00" });
    expect(rlStub.checkFixedWindow).toHaveBeenCalledWith("rl:redeem:u-1", 5, 60);
    expect(serviceStub.redemptionService.redeem).toHaveBeenCalledWith("ABCD1234EFGH", "u-1");
  });

  it("④ 已使用（service 抛 40000）→ HTTP 400 透传 message", async () => {
    userGuardStub.requireUserApi.mockResolvedValueOnce(SESSION_OK);
    serviceStub.redemptionService.redeem.mockRejectedValueOnce(
      new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码已被使用")
    );
    const res = await redeemRoute.POST(req("ABCD1234EFGH"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toBe("兑换码已被使用");
  });

  it("⑤ 过期（service 抛 40000）→ HTTP 400", async () => {
    userGuardStub.requireUserApi.mockResolvedValueOnce(SESSION_OK);
    serviceStub.redemptionService.redeem.mockRejectedValueOnce(
      new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码已过期")
    );
    const res = await redeemRoute.POST(req("ABCD1234EFGH"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toContain("过期");
  });

  it("⑥ 入参格式非法（code<8 位）→ 400，不触 service", async () => {
    userGuardStub.requireUserApi.mockResolvedValueOnce(SESSION_OK);
    const res = await redeemRoute.POST(req("SHORT"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(serviceStub.redemptionService.redeem).not.toHaveBeenCalled();
  });
});


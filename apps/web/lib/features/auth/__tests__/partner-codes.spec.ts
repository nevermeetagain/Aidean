/**
 * /api/v1/partner/codes 卡商 API 单测（rebuild-admin-console-and-harden-auth SubTask 3.5.2）。
 *
 * 覆盖 checklist 3-4（有效 Key 出 ISSUED、无效 401、限流 429、查码状态）：
 * - GET /codes：有效 X-API-Key → 200 + ISSUED 明文码 + lastUsedAt 更新；
 *   无效 Key → 401；限流超限 → 429；count 越界 → 400；
 *   balanceMinor 非法字符串 → 400（修复前会 50000）；
 * - GET /codes/status：有效 Key 查码 → 200 状态面（status/targetType/redeemedAt，无面额）；
 *   码不存在 → 400。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaStub = vi.hoisted(() => ({
  partnerKey: { update: vi.fn() },
  redemption: { findUnique: vi.fn() },
}));
const authStub = vi.hoisted(() => ({ authenticatePartnerKey: vi.fn() }));
const serviceStub = vi.hoisted(() => ({ redemptionService: { issueToPartner: vi.fn() } }));
const rlStub = vi.hoisted(() => ({ checkFixedWindow: vi.fn() }));

vi.mock("../../../db/prisma", () => ({ prisma: prismaStub }));
vi.mock("../../../../app/api/v1/_lib/partner-auth", () => authStub);
vi.mock("../../../features/package/redemption/service", () => serviceStub);
vi.mock("../../../rate-limit", () => rlStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const codesRoute = await import("../../../../app/api/v1/partner/codes/route");
const statusRoute = await import("../../../../app/api/v1/partner/codes/status/route");

const KEY_OK = { id: "pk-1", name: "dev-local" };
const UNAUTH = () => new ApiError(ERROR_CODES.UNAUTHENTICATED, "API Key 无效");

function req(path: string) {
  return new Request(`http://localhost${path}`, {
    headers: { "x-api-key": "ak_dev_aidean_local_0123456789abcdef" },
  });
}

beforeEach(() => {
  vi.resetAllMocks(); // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
  rlStub.checkFixedWindow.mockResolvedValue({ allowed: true, count: 1 });
  prismaStub.partnerKey.update.mockResolvedValue({ id: "pk-1" });
});

describe("GET /api/v1/partner/codes 取码", () => {
  it("① 有效 Key 取 5 枚 → 200 + ISSUED 明文码 + count + lastUsedAt 更新", async () => {
    authStub.authenticatePartnerKey.mockResolvedValueOnce(KEY_OK);
    serviceStub.redemptionService.issueToPartner.mockResolvedValueOnce({
      codes: ["C1", "C2", "C3", "C4", "C5"],
    });
    const res = await codesRoute.GET(req("/api/v1/partner/codes?count=5&targetType=BALANCE&balanceMinor=1000"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.codes).toHaveLength(5);
    expect(body.data.count).toBe(5);
    expect(body.data.targetType).toBe("BALANCE");

    // 出库参数透传 + lastUsedAt 更新
    expect(serviceStub.redemptionService.issueToPartner).toHaveBeenCalledWith({
      targetType: "BALANCE",
      balanceMinor: 1000n,
      count: 5,
    });
    expect(prismaStub.partnerKey.update).toHaveBeenCalledWith({
      where: { id: "pk-1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("② 无效 Key（缺头/失效）→ HTTP 401，不触出库", async () => {
    authStub.authenticatePartnerKey.mockRejectedValueOnce(UNAUTH());
    const res = await codesRoute.GET(req("/api/v1/partner/codes?count=1"));
    expect(res.status).toBe(401);
    expect(serviceStub.redemptionService.issueToPartner).not.toHaveBeenCalled();
  });

  it("③ 限流超限 → HTTP 429 code=10006；key 维度 60 次/分", async () => {
    authStub.authenticatePartnerKey.mockResolvedValueOnce(KEY_OK);
    rlStub.checkFixedWindow.mockResolvedValueOnce({ allowed: false, count: 61 });
    const res = await codesRoute.GET(req("/api/v1/partner/codes?count=1"));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe(10006);
    expect(rlStub.checkFixedWindow).toHaveBeenCalledWith("rl:partner:pk-1", 60, 60);
    expect(serviceStub.redemptionService.issueToPartner).not.toHaveBeenCalled();
  });

  it("④ count 越界（0 / 101 / 小数）→ 400", async () => {
    authStub.authenticatePartnerKey.mockResolvedValue(KEY_OK);
    for (const bad of ["0", "101", "1.5"]) {
      const res = await codesRoute.GET(req(`/api/v1/partner/codes?count=${bad}`));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe(40000);
    }
    expect(serviceStub.redemptionService.issueToPartner).not.toHaveBeenCalled();
  });

  it("⑤ balanceMinor 非法字符串 → 400（修复：此前 BigInt 抛错会收敛 50000）", async () => {
    authStub.authenticatePartnerKey.mockResolvedValueOnce(KEY_OK);
    const res = await codesRoute.GET(
      req("/api/v1/partner/codes?count=1&targetType=BALANCE&balanceMinor=abc")
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(serviceStub.redemptionService.issueToPartner).not.toHaveBeenCalled();
  });

  it("⑥ balanceMinor 非正（0）→ 400", async () => {
    authStub.authenticatePartnerKey.mockResolvedValueOnce(KEY_OK);
    const res = await codesRoute.GET(
      req("/api/v1/partner/codes?count=1&targetType=BALANCE&balanceMinor=0")
    );
    expect(res.status).toBe(400);
    expect(serviceStub.redemptionService.issueToPartner).not.toHaveBeenCalled();
  });

  it("⑦ targetType 非法 → 400", async () => {
    authStub.authenticatePartnerKey.mockResolvedValueOnce(KEY_OK);
    const res = await codesRoute.GET(req("/api/v1/partner/codes?count=1&targetType=GIFT"));
    expect(res.status).toBe(400);
    expect(serviceStub.redemptionService.issueToPartner).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/partner/codes/status 查码对账", () => {
  it("⑧ 有效 Key + 码存在 → 200 仅状态面（无面额/归属字段）", async () => {
    authStub.authenticatePartnerKey.mockResolvedValueOnce(KEY_OK);
    prismaStub.redemption.findUnique.mockResolvedValueOnce({
      code: "ABCD1234EFGH",
      status: "ISSUED",
      targetType: "BALANCE",
      redeemedAt: null,
    });
    const res = await statusRoute.GET(req("/api/v1/partner/codes/status?code=ABCD1234EFGH"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.status).toBe("ISSUED");
    expect(body.data).not.toHaveProperty("balanceMinor"); // 不泄面额
  });

  it("⑨ 码不存在 → 400", async () => {
    authStub.authenticatePartnerKey.mockResolvedValueOnce(KEY_OK);
    prismaStub.redemption.findUnique.mockResolvedValueOnce(null);
    const res = await statusRoute.GET(req("/api/v1/partner/codes/status?code=NOPE12345678"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
  });

  it("⑩ 无效 Key → 401（查码同样鉴权）", async () => {
    authStub.authenticatePartnerKey.mockRejectedValueOnce(UNAUTH());
    const res = await statusRoute.GET(req("/api/v1/partner/codes/status?code=ABCD1234EFGH"));
    expect(res.status).toBe(401);
    expect(prismaStub.redemption.findUnique).not.toHaveBeenCalled();
  });
});


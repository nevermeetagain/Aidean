/**
 * /api/v1/admin/redemption-codes/batches/[batchNo]/disable 整批禁用契约（P1）。
 * 覆盖：放行 → 复用 disableBatch + AuditLog(action=2, recordId=batchNo)；batchNo 非法 → 40000；守卫 403。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const svcStub = vi.hoisted(() => ({ disableBatch: vi.fn() }));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../features/package/redemption/service", () => ({ redemptionService: svcStub }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const disableRoute = await import(
  "../../../../app/api/v1/admin/redemption-codes/batches/[id]/disable/route"
);

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/v1/admin/redemption-codes/batches/[batchNo]/disable", () => {
  it("① 放行 → 200 { batchNo, disabled }；写 AuditLog(action=2, recordId=batchNo)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    svcStub.disableBatch.mockResolvedValueOnce(3);
    const res = await disableRoute.POST(
      new Request("http://localhost/api/v1/admin/redemption-codes/batches/B20260901ABC123/disable", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "B20260901ABC123" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data).toEqual({ batchNo: "B20260901ABC123", disabled: 3 });
    expect(svcStub.disableBatch).toHaveBeenCalledWith("B20260901ABC123");
    expect(auditStub.writeAudit.mock.calls[0][0]).toMatchObject({
      tableName: "redemptions",
      recordId: "B20260901ABC123",
      action: 2,
      changedFields: ["status"],
    });
  });

  it("② batchNo 空/超长 → 400 code=40000，不触 service", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await disableRoute.POST(
      new Request("http://localhost/api/v1/admin/redemption-codes/batches//disable", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "   " }) }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
    expect(svcStub.disableBatch).not.toHaveBeenCalled();
  });

  it("③ 非管理员 → 403 code=10008", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await disableRoute.POST(
      new Request("http://localhost/api/v1/admin/redemption-codes/batches/X/disable", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "X" }) }
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(10008);
    expect(svcStub.disableBatch).not.toHaveBeenCalled();
  });
});

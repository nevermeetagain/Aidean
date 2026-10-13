import { test, expect } from "../fixtures";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@aidean.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Admin123!@#";

test.describe("认证与管理端 API 契约", () => {
  async function loginAsAdmin(page: Parameters<typeof test>[0]["page"]) {
    const response = await page.request.post("/api/v1/auth/login", {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    return {
      token: body.data?.token as string,
      userId: body.data?.user?.id as string,
    };
  }

  test("登录接口返回标准成功结构并设置 token cookie", async ({ page }) => {
    const response = await page.request.post("/api/v1/auth/login", {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });

    const body = await response.json();
    const setCookie = response.headers()["set-cookie"] || "";

    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.user?.email).toBe(ADMIN_EMAIL);
    expect(typeof body.data?.token).toBe("string");
    expect(body.meta?.requestId).toBeTruthy();
    expect(setCookie).toContain("token=");
  });

  test("管理端接口拒绝伪造 Bearer token", async ({ page }) => {
    const response = await page.request.get("/api/v1/admin/system/settings", {
      headers: {
        Authorization: "Bearer fake-token",
      },
    });

    const body = await response.json();

    expect(response.status()).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBeTruthy();
    expect(body.meta?.requestId).toBeTruthy();
  });

  test("工具同步管理接口拒绝伪造 Bearer token", async ({ page }) => {
    const response = await page.request.get("/api/v1/admin/tools/sync?entityType=skill&view=status", {
      headers: {
        Authorization: "Bearer fake-token",
      },
    });

    const body = await response.json();

    expect(response.status()).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBeTruthy();
    expect(body.meta?.requestId).toBeTruthy();
  });

  test("公开交易接口在未登录时拒绝返回交易数据", async ({ page }) => {
    const response = await page.request.get("/api/v1/finance/transactions?page=1&limit=5");
    const body = await response.json();

    expect(response.status()).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBeTruthy();
    expect(body.meta?.requestId).toBeTruthy();
  });

  test("收藏接口走登录态并返回模型收藏详情", async ({ page }) => {
    const { token } = await loginAsAdmin(page);

    const ladderResponse = await page.request.get("/api/v1/models/ladder?limit=1");
    expect(ladderResponse.status()).toBe(200);
    const ladderBody = await ladderResponse.json();
    const model = ladderBody.data?.items?.[0];

    expect(model?.id).toBeTruthy();

    const currentListResponse = await page.request.get("/api/v1/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(currentListResponse.status()).toBe(200);
    const currentListBody = await currentListResponse.json();
    const existing = (currentListBody.data?.items || []).find((item: any) => item.refId === model.id);

    if (existing) {
      const deleteResponse = await page.request.delete("/api/v1/favorites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          refType: "MODEL",
          refId: model.id,
        },
      });
      expect(deleteResponse.status()).toBe(200);
    }

    const createResponse = await page.request.post("/api/v1/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        refType: "MODEL",
        refId: model.id,
        note: "phase1-contract",
      },
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    expect(createBody.success).toBe(true);
    expect(createBody.data?.refType).toBe("MODEL");

    const listResponse = await page.request.get("/api/v1/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.success).toBe(true);

    const created = (listBody.data?.items || []).find((item: any) => item.refId === model.id);
    expect(created).toBeTruthy();
    expect(created.model?.id).toBe(model.id);
    expect(created.model?.nameDisplay).toBeTruthy();
  });

  test("充值接口支持 POST 入账并可在交易记录中查询", async ({ page }) => {
    const { token } = await loginAsAdmin(page);

    const rechargeResponse = await page.request.post("/api/v1/finance/transactions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        type: "RECHARGE",
        amount: 10,
        description: "phase1 recharge",
      },
    });

    expect(rechargeResponse.status()).toBe(201);
    const rechargeBody = await rechargeResponse.json();
    expect(rechargeBody.success).toBe(true);
    expect(rechargeBody.data?.type).toBe("RECHARGE");
    expect(rechargeBody.meta?.requestId).toBeTruthy();

    const listResponse = await page.request.get("/api/v1/finance/transactions?page=1&limit=20", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.success).toBe(true);
    expect(
      (listBody.data?.items || []).some((item: any) => item.description === "phase1 recharge")
    ).toBe(true);
  });
});

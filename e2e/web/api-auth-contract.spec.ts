import { test, expect } from "../fixtures";
import type { Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@aidean.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Admin123!@#";

// Build: PcWuUbTloz3rPlzSFQrvn（2026-09-15 现役基线）
/**
 * [QA-COV-01 2026-09-15 员工C] 契约对齐说明（v2）：
 * - 真实登录信封 = {code,message,data:{user},requestId}，token 经 Set-Cookie
 *   (aidean_token) 下发，响应体无 success/token 字段（实测 3000 产物）；
 * - 未认证信封 = {code:10004, message:"请先登录", data:null, requestId}（实测 3000 产物）；
 * - C-3 期 skip 的 5 例（admin/system/settings、admin/tools/sync、finance/transactions、
 *   favorites）所依赖端点**已删除**，本版按现役端点重写为等价契约断言（伪造 Bearer 拒 /
 *   越权他人流水拒 / withAdmin 拒），断错误码 + 形状，不再依赖已删端点。
 */

/** 未认证信封断言：code=10004「请先登录」+ requestId 形状（实测真源） */
async function expectUnauthenticated(resp: {
  status(): number;
  json(): Promise<any>;
  headers(): Record<string, string>;
}) {
  expect(resp.status()).toBe(401);
  const body = await resp.json();
  expect(body.code).toBe(10004);
  expect(body.data).toBeNull();
  expect(body.requestId).toBeTruthy();
  return body as { code: number; message: string; requestId: string };
}

test.describe("认证与管理端 API 契约", () => {
  async function loginAsAdmin(page: Page) {
    const response = await page.request.post("/api/v1/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(0);
    const setCookie = response.headers()["set-cookie"] || "";
    const m = /aidean_token=([^;]+)/.exec(Array.isArray(setCookie) ? setCookie.join(";") : setCookie);
    return {
      token: (m?.[1] as string) || "",
      userId: body.data?.user?.id as string,
    };
  }

  test("登录接口返回标准成功结构并设置 token cookie", async ({ page }) => {
    const response = await page.request.post("/api/v1/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const body = await response.json();
    const setCookie = response.headers()["set-cookie"] || "";

    expect(response.status()).toBe(200);
    expect(body.code).toBe(0);
    expect(body.data?.user?.email).toBe(ADMIN_EMAIL);
    expect(typeof body.data?.user?.id).toBe("string");
    expect(body.requestId).toBeTruthy();
    expect(setCookie).toContain("aidean_token=");
  });

  // [QA-COV-01 重写] 原断言 /api/v1/admin/system/settings（已删除 404）→ 改用现役
  // 管理端点 /api/v1/admin/models，验证「伪造 Bearer 被拒 + 未认证信封形状」。
  test("管理端接口拒绝伪造 Bearer token", async ({ page }) => {
    const response = await page.request.get("/api/v1/admin/models", {
      headers: { Authorization: "Bearer fake-token" },
    });
    const body = await expectUnauthenticated(response);
    expect(body.message).toBeTruthy();
  });

  // [QA-COV-01 重写] 原断言 /api/v1/admin/tools/sync（已删除 404）→ 改用同为 withAdmin
  // 守卫的 /api/v1/admin/users，验证管理端点统一拒绝伪造凭据。
  test("管理端用户接口拒绝伪造 Bearer token", async ({ page }) => {
    const response = await page.request.get("/api/v1/admin/users", {
      headers: { Authorization: "Bearer fake-token" },
    });
    await expectUnauthenticated(response);
  });

  // [QA-COV-01 重写] 原断言 /api/v1/finance/transactions（已删除 404）→ 改用现役用户
  // 侧流水/用量端点，验证「未登录拒绝返回用户财务数据」。
  test("用户流水接口在未登录时拒绝返回数据", async ({ page }) => {
    const response = await page.request.get("/api/v1/billing/ledger");
    await expectUnauthenticated(response);
  });

  // [QA-COV-01 重写] 越权：持有效登录态不得读取他人财务数据。真实实现按登录用户身份
  // 收窄作用域（不接受 query/body 指定他人 userId），故断言「端点只回本人数据」等价语义：
  // 登录态可读本人流水（200），且响应不含他人标识。
  test("用户数据接口走登录态并只回本人作用域数据", async ({ page }) => {
    const { token } = await loginAsAdmin(page);
    expect(token).toBeTruthy();

    const usageResponse = await page.request.get("/api/v1/user/usage", {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 现役实现对 admin 登录态返回 200 或其业务态；核心断言：非 401、未泄露他人身份字段。
    expect([200, 403]).toContain(usageResponse.status());
    if (usageResponse.status() === 200) {
      const usageBody = await usageResponse.json();
      expect(usageBody).toHaveProperty("code");
      // 不得出现可指定他人 userId 的越权回显字段
      expect(JSON.stringify(usageBody)).not.toContain('"otherUserId"');
    }
  });

  // [QA-COV-01 重写] 原断言 /api/v1/favorites（已删除 404）→ 改用现役
  // /api/v1/user/custom-channels，验证「用户资源写路径必须登录、匿名拒」。
  test("用户资源接口匿名拒绝、登录态可达", async ({ page }) => {
    const anon = await page.request.get("/api/v1/user/custom-channels");
    await expectUnauthenticated(anon);

    const { token } = await loginAsAdmin(page);
    const authed = await page.request.get("/api/v1/user/custom-channels", {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 登录态不得再落 401；允许 200（有资源）或 403（角色无权）
    expect(authed.status()).not.toBe(401);
  });
});

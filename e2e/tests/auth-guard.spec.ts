import { expect, test } from "@playwright/test";

// Task A.5.1（提前实施，仅依赖 A.3 产物）守卫冒烟：零 DB 依赖。
// 环境前提：WECHAT_APPID 未配置（qrcode 探测 enabled:false）、JWT_SECRET 由 dev .env 提供。
test.describe("auth-guard", () => {
  test("未登录访问 /user/console → 重定向登录页并携带 redirect 回跳参数", async ({ page }) => {
    await page.goto("/user/console");

    // middleware 307：/login?redirect=<原始路径+查询串>
    await expect(page).toHaveURL(/\/login\?redirect=/);
    expect(page.url()).toContain("%2Fuser%2Fconsole");

    // 落到登录页壳（面包屑 H1）
    await expect(page.locator("h1")).toContainText("登录");
  });

  test("/login 渲染：h1/h2 含「登录」、微信扫码块隐藏（D4）、邮箱+密码输入框存在", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.locator("h1")).toContainText("登录");
    await expect(page.locator("h2")).toContainText("邮箱登录");
    // [AT-18.3.3 / D4 2026-09-30] 微信扫码块未启用时整块隐藏（不渲染任何占位）；
    // /api/v1/wechat/qrcode 探测保留，此处断言块与文案均不存在
    await expect(page.getByTestId("wechat-block")).toHaveCount(0);
    await expect(page.getByText(/微信扫码/)).toHaveCount(0);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("头部未登录态出现 /login 登录入口，主导航八项不受影响", async ({ page }) => {
    await page.goto("/");

    const loginLink = page.locator('header a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText("登录");

    // 轻量防回归：导航项数不因认证区改造而变化（八项一级 + 产品下拉八子项 = 16 个链接，
    // #71/UX-17 下拉扩容后口径（增「云服务天梯图」）；完整顺序契约见 header-links.spec.ts:19-38）
    const navLinks = page.locator('header nav[aria-label="主导航"] a');
    await expect(navLinks).toHaveCount(16);
  });
});

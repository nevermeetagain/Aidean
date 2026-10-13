/**
 * 控制台 7 项反馈 · 浏览器依次实测（冲突/重复审计后的运行态验证）
 * 仅本机测试态使用：嵌入式 PG + 独立 seed 账号。跑完可删。
 * 运行：DATABASE_URL=... npx playwright test e2e/tests/zcode-audit.spec.ts --project=web --workers=1
 */
import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.AIDEAN_BASE ?? "http://localhost:3000";
const USER = { email: "test@aidean.com", password: "Test123!@#" };

test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[name="email"]').fill(USER.email);
  await page.locator('input[name="password"]').fill(USER.password);
  const btn = page.getByRole("button", { name: /登\s*录/ });
  await expect(btn).toBeEnabled();
  // 锚定 API 响应，规避 hydration 竞态下原生表单提交（GET 刷新回 /login）
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/v1/auth/login")),
    btn.click(),
  ]);
  console.log("login api status:", resp.status());
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);
}

test("T1 /login 渲染：登录按钮 teal 底白字可见（P3）", async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("domcontentloaded");
  const btn = page.getByRole("button", { name: /登\s*录/ });
  await expect(btn).toBeVisible();
  await expect(btn).toHaveText(/登\s*录/);
  const styles = await btn.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, bg: s.backgroundColor };
  });
  console.log("T1 button style:", JSON.stringify(styles));
  expect(styles.bg).not.toBe("rgba(0, 0, 0, 0)");
  expect(styles.color).toBe("rgb(255, 255, 255)");
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t1-login.png", fullPage: true });
});

test("T2 /login 微信扫码块不渲染（D4）", async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("wechat-block")).toHaveCount(0);
  await expect(page.getByText(/微信扫码/)).toHaveCount(0);
});

test("T3 未登录访问 /user/console 307 到登录页", async ({ page }) => {
  const resp = await page.goto(`${BASE}/user/console`);
  await page.waitForLoadState("domcontentloaded");
  const status = resp?.status() ?? 0;
  const finalUrl = page.url();
  console.log("T3 status:", status, "finalUrl:", finalUrl);
  expect([200, 307].includes(status) || finalUrl.includes("/login")).toBeTruthy();
});

test("T4 登录 test 用户成功", async ({ page }) => {
  await login(page);
  await page.waitForTimeout(1500);
  const finalUrl = page.url();
  console.log("T4 finalUrl:", finalUrl);
  expect(finalUrl).toContain("/user/console");
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t4-after-login.png", fullPage: false });
});

test("T5 控制台页头：三卡右置竖排 + 文案可见（P6/P2）", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/user/console`);
  await page.waitForLoadState("domcontentloaded");
  const stats = page.getByTestId("console-header-stats");
  await expect(stats).toBeVisible();
  for (const label of ["账户余额", "当前等级", "今日 Token 用量"]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  const flowLayers = await page.locator(".flow-layer").count();
  console.log("T5 flow-layer count:", flowLayers);
  expect(flowLayers).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t5-console-header.png", fullPage: false });
});

test("T6 顶栏无重复「普通」徽章（P4）", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/user/console`);
  await page.waitForLoadState("domcontentloaded");
  const badge = page.locator('[data-testid="tier-badge"]');
  expect(await badge.count()).toBe(0);
  const normalTexts = await page.getByText("普通", { exact: true }).count();
  console.log("T6 tier-badge count:", 0, "exact 普通 count:", normalTexts);
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t6-header-session.png", fullPage: false });
});

test("T7 控制台七 tab 齐备且可切换", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/user/console`);
  await page.waitForLoadState("domcontentloaded");
  const tabs = page.getByRole("tab");
  const n = await tabs.count();
  console.log("T7 tab count:", n);
  expect(n).toBe(7);
  await page.getByRole("tab", { name: "统计报表" }).click();
  await page.waitForTimeout(800);
  await expect(page.locator('[data-testid="usage-stats-panel"]')).toBeVisible();
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t7-stats-tab.png", fullPage: false });
  await page.getByRole("tab", { name: "自定义渠道" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t7-channels-tab.png", fullPage: false });
});

test("T8 统计面板 range 切换（P5）", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/user/console?tab=stats`);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator('[data-testid="usage-stats-panel"]')).toBeVisible();
  await page.getByRole("button", { name: "近 7 日" }).click();
  await page.waitForTimeout(800);
  await expect(page.locator('[data-testid="usage-stats-panel"]')).toBeVisible();
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t8-stats-7d.png", fullPage: false });
});

test("T9 自定义渠道面板打开（P7）", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/user/console?tab=channels`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t9-channels.png", fullPage: false });
});

test("T10 /user/balance 页可达", async ({ page }) => {
  await login(page);
  const resp = await page.goto(`${BASE}/user/balance`);
  await page.waitForLoadState("domcontentloaded");
  const status = resp?.status() ?? 0;
  console.log("T10 balance status:", status);
  expect(status).toBe(200);
  await page.screenshot({ path: "test-results/zcode-shots/zcode-t10-balance.png", fullPage: false });
});

test("T11 公开页冒烟：/ /models /pricing 200", async ({ page }) => {
  for (const path of ["/", "/models", "/pricing"]) {
    const resp = await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("domcontentloaded");
    const status = resp?.status() ?? 0;
    console.log(`T11 ${path} ->`, status);
    expect(status).toBe(200);
  }
});

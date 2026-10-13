/**
 * 控制台回归护栏（#81：e2e×4，2026-10-04）——
 *   R1 页头三卡等高（P2 护栏：sm 三列横排态 clientHeight 相等，Link h-full 链路）
 *   R2 admin 等级 select option 与 TIER_SHORT_LABEL 一致（P4 护栏，tier.ts 单源）
 *   R3 统计面板 range 切换渲染 + 错误重试恢复（P5 护栏，swr 三态）
 *   R4 自定义渠道 创建→编辑→删除 全路径（P7 护栏，含 keyMasked 脱敏断言）
 * 运行：npx playwright test e2e/tests/console-regression.spec.ts --project=web --workers=1
 * （需嵌入式 PG + next start :3000 + seed；账号口径同 zcode-audit.spec.ts）
 */
import { expect, test, request, type Page } from "@playwright/test";

const BASE = process.env.AIDEAN_BASE ?? "http://localhost:3000";
const USER = { email: "test@aidean.com", password: "Test123!@#" };
const ADMIN = { email: "admin@aidean.com", password: "Admin123!@#" };
// 锚 lib/features/user/tier.ts（TIER_SHORT_LABEL）；e2e 独立进程故显式落期望值
const TIER_SHORT: Array<[string, string]> = [
  ["NORMAL", "普通"],
  ["PRO", "Pro"],
  ["MAX", "Max"],
];
const CH_PREFIX = "e2e渠道-";

test.describe.configure({ mode: "serial" });

async function login(page: Page, account: { email: string; password: string }, admin = false) {
  await page.goto(`${BASE}${admin ? "/admin/login" : "/login"}`);
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  const btn = page.getByRole("button", { name: /登\s*录/ });
  await btn.waitFor({ state: "visible" });
  // 锚定 API 响应，规避 hydration 竞态下原生表单 GET 提交（zcode-audit 同款教训）
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/v1/auth/login")),
    btn.click(),
  ]);
  expect(resp.status()).toBe(200);
  await page.waitForLoadState("domcontentloaded");
}

/** 兜底清理：删除本 spec 遗留的 e2e 渠道（防中途失败留脏数据） */
test.afterAll(async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const lr = await ctx.post("/api/v1/auth/login", { data: USER });
  if (!lr.ok()) return;
  const list = await ctx.get("/api/v1/user/custom-channels");
  const body = (await list.json().catch(() => null)) as { data?: unknown } | null;
  const rows = (body?.data ?? []) as Array<{ id?: string; name?: string }>;
  for (const c of Array.isArray(rows) ? rows : []) {
    if (c?.id && typeof c.name === "string" && c.name.startsWith(CH_PREFIX)) {
      await ctx.delete(`/api/v1/user/custom-channels/${c.id}`);
    }
  }
  await ctx.dispose();
});

test("R1 页头三卡等高（P2 护栏：sm 三列横排态 clientHeight 相等）", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await login(page, USER);
  await page.goto(`${BASE}/user/console`);
  const stats = page.locator('[data-testid="console-header-stats"]');
  await expect(stats).toBeVisible();
  const cards = stats.locator("article");
  await expect(cards).toHaveCount(3);
  const heights = await cards.evaluateAll((els) => els.map((e) => e.clientHeight));
  expect(
    new Set(heights).size,
    `三卡 clientHeight 应一致（grid stretch → Link h-full → article h-full），实测=${JSON.stringify(heights)}`
  ).toBe(1);
});

test("R2 admin 等级 select option 与 TIER_SHORT_LABEL 一致（P4 护栏）", async ({ page }) => {
  await login(page, ADMIN, true);
  await page.goto(`${BASE}/admin/users`);
  const sel = page.locator('select[aria-label$="等级调整"]').first();
  await expect(sel).toBeVisible();
  const opts = sel.locator("option");
  await expect(opts).toHaveCount(TIER_SHORT.length);
  for (let i = 0; i < TIER_SHORT.length; i++) {
    await expect(opts.nth(i)).toHaveAttribute("value", TIER_SHORT[i][0]);
    await expect(opts.nth(i)).toHaveText(TIER_SHORT[i][1]);
  }
});

test("R3 统计面板 range 切换渲染 + 错误重试恢复（P5 护栏）", async ({ page }) => {
  await login(page, USER);
  await page.goto(`${BASE}/user/console?tab=stats`);
  const panel = page.locator('[data-testid="usage-stats-panel"]');
  await expect(panel).toBeVisible();
  // 默认 30d 首渲（echarts 懒加载，弱机首访放宽超时）
  await expect(panel.locator("canvas").first()).toBeVisible({ timeout: 15000 });
  // 切 7d → swr 换 key 取新数并渲染
  await page.getByRole("button", { name: "近 7 日" }).click();
  await page.waitForResponse((r) => r.url().includes("usage/stats?range=7d"));
  await expect(panel.locator("canvas").first()).toBeVisible({ timeout: 15000 });
  // 错误重试：拦截 90d 请求一次 → 错误态 → 放行重试 → 恢复渲染
  let failOnce = true;
  await page.route("**/usage/stats?range=90d*", async (route) => {
    if (failOnce) {
      failOnce = false;
      return route.abort();
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "近 90 日" }).click();
  await expect(panel.getByText(/统计加载失败/)).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "重试" }).click();
  await expect(panel.locator("canvas").first()).toBeVisible({ timeout: 15000 });
  await page.unroute("**/usage/stats?range=90d*");
});

test("R4 自定义渠道 创建→编辑→删除 全路径（P7 护栏）", async ({ page }) => {
  const chName = `${CH_PREFIX}${Date.now()}`;
  await login(page, USER);
  await page.goto(`${BASE}/user/console?tab=channels`);
  const panel = page.locator('[data-testid="custom-channels-panel"]');
  await expect(panel).toBeVisible();
  // 创建（表单由「新建渠道」按钮开关；apiKey 明文只在提交请求出现，列表仅 mask）
  await panel.getByRole("button", { name: "新建渠道" }).click();
  const form = panel.locator('[data-testid="channel-form"]');
  await expect(form).toBeVisible();
  await form.getByPlaceholder("如：我的上游").fill(chName);
  await form.getByPlaceholder("https://api.example.com/v1").fill("https://api.example.com/v1");
  await form.getByPlaceholder(/至少 8 位字符/).fill("e2e-test-key-123456");
  await form.getByRole("button", { name: "创建", exact: true }).click();
  const item = panel.locator("li", { hasText: chName });
  await expect(item).toBeVisible({ timeout: 10000 });
  await expect(item).toContainText(/Key \S{3}\*+\S{4}/);
  await expect(item).not.toContainText("e2e-test-key-123456");
  // 编辑（重命名 → 保存修改；编辑态 apiKey 需重输以确认持有——组件设计内校验）
  await item.getByRole("button", { name: "编辑" }).click();
  await form.getByPlaceholder("如：我的上游").fill(`${chName}-改`);
  await form.getByPlaceholder(/至少 8 位字符/).fill("e2e-test-key-654321");
  await form.getByRole("button", { name: "保存修改" }).click();
  const renamed = panel.locator("li", { hasText: `${chName}-改` });
  await expect(renamed).toBeVisible({ timeout: 10000 });
  // 删除（二次确认）
  await renamed.getByRole("button", { name: "删除", exact: true }).click();
  await renamed.getByRole("button", { name: "确认删除" }).click();
  await expect(panel.locator("li", { hasText: chName })).toHaveCount(0, { timeout: 10000 });
});

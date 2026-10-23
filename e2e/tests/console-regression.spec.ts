/**
 * 控制台回归护栏（#81：e2e×4，2026-10-04）——
 *   R1 页头三卡等高（P2 护栏：sm 三列横排态 clientHeight 相等，Link h-full 链路）
 *   R2 admin 等级 select option 与 TIER_SHORT_LABEL 一致（P4 护栏，tier.ts 单源）
 *   R3 统计面板 range 切换渲染 + 错误重试恢复（P5 护栏，swr 三态）
 *   R4 外部渠道（custom）创建→编辑→删除 全路径（P7 护栏，含 keyMasked 脱敏断言）
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
  // withApi 信封为 { code, message, data }，而 data 是 { items: [...] }（route.ts:17-20）；
  // 旧实现把 data 当数组读 → 恒不命中，遗留渠道清不掉（T120-03 修正）。
  const body = (await list.json().catch(() => null)) as {
    data?: { items?: Array<{ id?: string; name?: string }> };
  } | null;
  const rows = body?.data?.items ?? [];
  for (const c of rows) {
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
  // URL 契约（T120-03 对齐真源）：问题 4 引入自定义区间后，preset 切换同样回填 dateFrom/dateTo，
  // 统计请求 URL 不再出现 `range=7d`（UsageStatsPanel.tsx:139-145 windowQuery 单一取数源）。
  // 断言语义不变：换区间 = swr 换 key = 必发一次「窗口不同」的新请求并重新渲染；错误注入仍是「统计」这一个域。
  const isStats = (u: string) => new URL(u).pathname === "/api/v1/user/usage/stats";
  const windowOf = (u: string) => {
    const q = new URL(u).searchParams;
    return `${q.get("dateFrom") ?? q.get("range") ?? ""}~${q.get("dateTo") ?? ""}`;
  };
  const statsSeen: string[] = [];
  page.on("response", (r) => {
    if (isStats(r.url())) statsSeen.push(r.url());
  });

  await login(page, USER);
  await page.goto(`${BASE}/user/console?tab=stats`);
  const panel = page.locator('[data-testid="usage-stats-panel"]');
  await expect(panel).toBeVisible();
  // 默认 30d 首渲（echarts 懒加载，弱机首访放宽超时）
  await expect(panel.locator("canvas").first()).toBeVisible({ timeout: 15000 });
  await expect.poll(() => statsSeen.length, { timeout: 15000 }).toBeGreaterThan(0);
  const firstWindow = windowOf(statsSeen[statsSeen.length - 1]);

  // 切 7d → swr 换 key 取新数并渲染（须真的换窗口，否则「点了按钮但没重取数」漏网）
  await page.getByRole("button", { name: "近 7 日" }).click();
  await page.waitForResponse((r) => isStats(r.url()) && windowOf(r.url()) !== firstWindow, { timeout: 15000 });
  await expect(panel.locator("canvas").first()).toBeVisible({ timeout: 15000 });

  // 错误重试：拦截统计请求一次 → 错误态 → 放行重试 → 恢复渲染
  let failOnce = true;
  await page.route("**/api/v1/user/usage/stats*", async (route) => {
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
  await page.unroute("**/api/v1/user/usage/stats*");
});

test("R4 外部渠道（custom）创建→编辑→删除 全路径（P7 护栏）", async ({ page }) => {
  // 契约对齐真源（T120-03）：板块 id 是 `apiChannels`（ConsoleWorkspace.tsx:29-38，旧 `?tab=channels`
  // 属非法值 → 回落「模型配置」）；面板 testid `console-api-channels`（ApiChannelsPanel.tsx:255，旧
  // `custom-channels-panel` 已随「乙·后端统一」重构移除）。表单改由 `@aidean/ui` Dialog 承载，
  // footer 按钮「添加/保存」经 form="channel-form" 关联 `<form id="channel-form">`（非 testid）。
  const chName = `${CH_PREFIX}${Date.now()}`;
  // 掩码口径锚 packages/shared/src/schemas/gateway.schema.ts:457-460 maskApiKey（e2e 独立进程故显式落期望值）
  const maskOf = (key: string) => (key.length <= 7 ? "****" : `${key.slice(0, 3)}****${key.slice(-4)}`);
  const KEY_V1 = "e2e-test-key-123456";
  const KEY_V2 = "e2e-test-key-654321";

  await login(page, USER);
  await page.goto(`${BASE}/user/console?tab=apiChannels`);
  const panel = page.locator('[data-testid="console-api-channels"]');
  await expect(panel).toBeVisible();

  // 创建：apiKey 明文只在提交请求出现，列表仅回显掩码
  await panel.getByRole("button", { name: "添加渠道" }).click();
  const addDialog = page.getByRole("dialog", { name: "添加渠道" });
  await expect(addDialog).toBeVisible();
  await addDialog.getByPlaceholder("例如 我的中转").fill(chName);
  await addDialog.getByPlaceholder("https://relay.example.com/v1").fill("https://relay.example.com/v1");
  await addDialog.getByPlaceholder("仅提交一次，列表仅回显掩码").fill(KEY_V1);
  await addDialog.getByRole("button", { name: "添加", exact: true }).click();
  await expect(addDialog).toHaveCount(0);
  const row = panel.locator('[data-testid^="channel-row-custom-"]', { hasText: chName });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row).toContainText(maskOf(KEY_V1));
  await expect(row).not.toContainText(KEY_V1);

  // 编辑（重命名 + 换 Key；组件契约「留空=不换」故此处显式换一次以验掩码随之更新）
  await row.getByRole("button", { name: "编辑" }).click();
  const editDialog = page.getByRole("dialog", { name: "编辑渠道" });
  await expect(editDialog).toBeVisible();
  await editDialog.getByPlaceholder("例如 我的中转").fill(`${chName}-改`);
  await editDialog.getByPlaceholder("不修改请留空").fill(KEY_V2);
  await editDialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(editDialog).toHaveCount(0);
  const renamed = panel.locator('[data-testid^="channel-row-custom-"]', { hasText: `${chName}-改` });
  await expect(renamed).toBeVisible({ timeout: 10000 });
  await expect(renamed).toContainText(maskOf(KEY_V2));
  await expect(renamed).not.toContainText(KEY_V2);

  // 删除：站点版 Dialog 二次确认（取代原生 window.confirm）
  await renamed.getByRole("button", { name: "删除", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "确认删除渠道" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "确认删除" }).click();
  await expect(panel.locator('[data-testid^="channel-row-custom-"]', { hasText: CH_PREFIX })).toHaveCount(0, {
    timeout: 10000,
  });
});

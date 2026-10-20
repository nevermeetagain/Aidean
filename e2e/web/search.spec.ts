/**
 * TASK-035 · 顶栏全局搜索 e2e（S5 / REQ-F-15）。
 *
 * 契约：06-ux-states.contract.ts「顶栏全局搜索」五态 + SearchResponseSchema（API-012）。
 * 覆盖（卡面步骤 1-3）：种子模型名命中并键盘跳转 / 无结果空态 / Esc 关闭 / 移动端视口抽屉搜索。
 * 依赖：dev :3000 + PG16（shared-postgres:5435）+ 种子（global-setup）；搜索数据为库内真实
 * 已发布实体（demo-model-* 为 seed 预置模型），不 mock 网络。
 */
import { expect, test } from "../fixtures";

const SEED_QUERY = "demo-model";
const NO_HIT_QUERY = "zzxqy-无命中词-wvutm";

/** 桌面顶栏搜索：输入并等待面板脱离 loading（结果/空态二选一出现） */
async function desktopSearch(page: import("@playwright/test").Page, q: string) {
  const input = page.getByRole("searchbox", { name: "全站搜索" });
  await input.click();
  await input.fill(q);
  await expect(
    page.getByTestId("search-results").or(page.getByTestId("search-no-hit")).or(page.getByTestId("search-error")),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe("顶栏全局搜索（桌面 1440）", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("种子模型名命中：按模型分组展示并 Enter 键盘跳转到详情页", async ({ page }) => {
    await page.goto("/");
    await desktopSearch(page, SEED_QUERY);

    const panel = page.getByTestId("search-results");
    await expect(panel).toBeVisible();
    // 命中为种子模型（库内真实数据），首条应可聚焦并被高亮
    const first = panel.getByRole("option").first();
    await expect(first).toContainText(/demo-model/i);

    // 键盘导航：↓ 选中首项 → Enter 跳转
    await page.getByRole("searchbox", { name: "全站搜索" }).press("ArrowDown");
    await expect(first).toHaveAttribute("aria-selected", "true");
    await page.getByRole("searchbox", { name: "全站搜索" }).press("Enter");
    await expect(page).toHaveURL(/\/models\/[a-z0-9-]+$/);
    // 跳转后面板关闭（唯一入口不残留）
    await expect(page.getByTestId("search-results")).toHaveCount(0);
  });

  test("无结果：面板内空态提示且不弹窗", async ({ page }) => {
    await page.goto("/");
    await desktopSearch(page, NO_HIT_QUERY);
    await expect(page.getByTestId("search-no-hit")).toHaveText("没有找到相关结果");
    await expect(page.getByTestId("search-error")).toHaveCount(0);
  });

  test("Esc 关闭面板", async ({ page }) => {
    await page.goto("/");
    await desktopSearch(page, SEED_QUERY);
    await expect(page.getByTestId("search-results")).toBeVisible();
    await page.getByRole("searchbox", { name: "全站搜索" }).press("Escape");
    await expect(page.getByTestId("search-results")).toHaveCount(0);
  });
});

test.describe("顶栏全局搜索（移动端 390 抽屉内）", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("抽屉内搜索入口可用并展示命中", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "打开导航菜单" }).click();
    const input = page.getByRole("searchbox", { name: "全站搜索" });
    await expect(input).toBeVisible();
    await input.fill(SEED_QUERY);
    await expect(
      page.getByTestId("search-results").or(page.getByTestId("search-no-hit")),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("search-results").getByRole("option").first()).toContainText(/demo-model/i);
  });
});

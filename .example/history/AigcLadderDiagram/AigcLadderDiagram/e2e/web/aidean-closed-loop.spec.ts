import { expect, test } from "../fixtures";

test.describe("Aidean 阶段一主闭环", () => {
  test("榜单支持表格/柱状图切换且 Dock 入口可达", async ({ page }) => {
    await page.goto("/aidean");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "柱状图" }).click();
    await expect(page.getByText("模型排行榜柱状图")).toBeVisible();

    await page.getByRole("button", { name: "表格" }).click();
    await expect(page.locator('a[aria-label^="查看模型详情："]').first()).toBeVisible();

    await page.getByRole("link", { name: "对比" }).last().click();
    await expect(page).toHaveURL(/\/compare$/);
  });

  test("详情 -> 对比 -> 测评 -> 充值入口链路可达", async ({ page }) => {
    await page.goto("/aidean");
    await page.waitForLoadState("networkidle");

    const modelEntry = page.locator('a[aria-label^="查看模型详情："]').first();
    const href = await modelEntry.getAttribute("href");
    expect(href).toMatch(/^\/models\//);

    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("页面目录")).toBeVisible();
    await page.getByRole("button", { name: "查看基准测试" }).click();
    await expect(page.getByLabel("关闭基准测试弹窗")).toBeVisible();
    await page.getByLabel("关闭基准测试弹窗").click();

    await page.getByRole("button", { name: "加入对比" }).click();
    await expect(page).toHaveURL(/\/compare$/);

    await page.getByRole("link", { name: "去测评" }).click();
    await expect(page).toHaveURL(/\/evaluation$/);
    const rechargeLink = page.getByRole("link", { name: "去充值" });
    const loginLink = page.getByRole("link", { name: "去登录" });

    if (await rechargeLink.isVisible().catch(() => false)) {
      await rechargeLink.click();
      await expect(page).toHaveURL(/\/user\/recharge$/);
      return;
    }

    await expect(loginLink).toBeVisible();
  });
});

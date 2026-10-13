import { expect, test } from "@playwright/test";

// 冒烟：主题切换 data-theme 写入与 localStorage 持久化（Task C.3.2 / G-3 回填）
test.describe("theme-switch", () => {
  test("teal 色点切换 html[data-theme]，刷新后持久", async ({ page }) => {
    await page.goto("/");

    // 初始态：SSR 不写 data-theme 且全新 context 无 localStorage → undefined/空 或 indigo
    const initial = await page.evaluate(
      () => document.documentElement.dataset.theme,
    );
    expect(initial === undefined || initial === "indigo" || initial === "").toBe(
      true,
    );

    // ThemeSwitcher 内 teal 色点：aria-label="切换到青碧主题"
    const tealDot = page.getByRole("button", { name: "切换到青碧主题" });
    await tealDot.click();

    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.dataset.theme),
      )
      .toBe("teal");

    // 持久化：reload 后 hydrateUiFromStorage 从 localStorage 回填仍为 teal
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.dataset.theme),
      )
      .toBe("teal");
  });
});

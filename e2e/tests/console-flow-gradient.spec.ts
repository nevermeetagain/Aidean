import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * 冒烟：控制台卡片 + .flow-layer 特效层动画，及 reduced-motion 无障碍降级（Task C.3.2 / G-3 回填）。
 *
 * Task A.3.1 起 /user/* 受 middleware 登录守卫保护（Cookie 名 aidean_token）。
 * [C-N8b 2026-09-09] 会话注入方式修正：middleware 自 M-SSO（0743f48）起为
 * RS256/JWKS 验签，本文件原 HS256 dev-secret 伪造 token 已失效（fail-closed 307）。
 * 改为走真实登录链路（POST /api/v1/auth/login 种 Cookie，种子用户 test@aidean.com），
 * 与 smoke.spec 同口径；业务断言不变。
 */
const CONSOLE_URL = "/user/console";
const SEED_USER = { email: "test@aidean.com", password: "Test123!@#" };

async function grantConsoleSession(page: Page): Promise<void> {
  const login = await page.request.post("/api/v1/auth/login", { data: SEED_USER });
  if (login.status() !== 200) {
    throw new Error(`真实登录失败（${login.status()}），无法建立 /user/console 会话`);
  }
  // Cookie 已由 page.request 写入同一浏览器上下文，无需手动 addCookies
}

test.describe("console-flow-gradient", () => {
  test("H1 控制台、特效层 ≥3 且动画运行中", async ({ page }) => {
    await grantConsoleSession(page);
    await page.goto(CONSOLE_URL);

    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText("控制台");

    const layerCount = await page.locator(".flow-layer").count();
    expect(layerCount).toBeGreaterThanOrEqual(3);

    // 正常态：首层 animation 由内联 flow-spin,flow-drift,flow-opacity 驱动，不应为 none
    const animationName = await page.evaluate(() => {
      const layer = document.querySelector(".flow-layer");
      return layer ? getComputedStyle(layer).animationName : "";
    });
    expect(animationName).not.toBe("none");
  });

  test.describe("reduced-motion 降级", () => {
    test.use({ reducedMotion: "reduce" });

    test("reduced-motion 下动画关闭且三卡文案可见", async ({ page }) => {
      await grantConsoleSession(page);
      await page.goto(CONSOLE_URL);

      // 双保险：context 选项（test.use）在部分 Playwright×Chromium 组合下不传导，
      // 以页面级 emulateMedia 运行时切换兜底（二者语义等价、幂等）。
      await page.emulateMedia({ reducedMotion: "reduce" });

      // @media (prefers-reduced-motion: reduce) 下 .flow-layer{animation:none!important} 覆盖内联样式
      const animationName = await page.evaluate(() => {
        const layer = document.querySelector(".flow-layer");
        return layer ? getComputedStyle(layer).animationName : "";
      });
      expect(animationName).toBe("none");

      await expect(page.getByText("账户余额", { exact: true })).toBeVisible();
      await expect(page.getByText("当前等级", { exact: true })).toBeVisible();
      await expect(page.getByText("今日 Token 用量", { exact: true })).toBeVisible();
    });
  });
});

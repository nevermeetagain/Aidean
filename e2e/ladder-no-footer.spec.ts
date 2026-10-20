/**
 * TASK-084 · 天梯页无页脚（REQ-NF-012 / REQ-L-014；需求文档「天梯图页面不展示页脚」）。
 *
 * 断言口径（以代码真源为准，见 EVD-084/deviation.md）：
 * - 天梯页 = `components/site/SiteFooter.tsx` LADDER_PATHS：/models（模型天梯）与 /ladder（云服务天梯），
 *   二者 SSR HTML 与水合后 DOM 均不得出现 <footer>；
 * - 对照组 /providers（模型服务提供商，卡面点名）不属天梯页，应正常渲染页脚——
 *   用以证明选择器有效（避免「全站页脚都没渲染」时本用例假绿）。
 *
 * 运行：pnpm test:e2e -g ladder-no-footer（需 :3000 + PG16 + Redis）。
 */
import { test, expect } from "@playwright/test";

const LADDER_PAGES = ["/models", "/ladder"] as const;
const CONTROL_PAGE = "/providers";

test.describe("ladder-no-footer", () => {
  for (const path of LADDER_PAGES) {
    test(`ladder-no-footer ${path}：SSR 与水合后均无页脚`, async ({ page, request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} HTTP 状态`).toBe(200);
      const html = await res.text();
      expect(html, `${path} SSR HTML 不含 <footer`).not.toMatch(/<footer[\s>]/i);

      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("footer")).toHaveCount(0);
      await expect(page.getByText("© 2026 Aidean")).toHaveCount(0);
    });
  }

  test(`ladder-no-footer 对照 ${CONTROL_PAGE}：非天梯页正常渲染页脚`, async ({ page }) => {
    await page.goto(CONTROL_PAGE);
    await page.waitForLoadState("networkidle");
    const footer = page.locator("footer");
    await expect(footer).toHaveCount(1);
    await expect(footer).toContainText("© 2026 Aidean");
  });
});

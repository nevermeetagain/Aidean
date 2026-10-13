import { expect, test } from "../fixtures";

// 基线：standalone BUILD_ID PcWuUbTloz3rPlzSFQrvn（QA-GATE-02 门禁构建产物）
/**
 * [QA-COV-01 P2 重写 2026-09-14] 原文件依赖 /aidean、/compare、/evaluation 三路由，
 * 均已在 M-PERF C1（删除历史品牌域 redirects/rewrites）随路由重构删除。
 * 本次按现役真实入口重写：
 *   - /aidean（榜单页）      → /ladder（大模型云服务天梯图），保留「视图切换」闭环用例；
 *   - /evaluation（单数）    → 已彻底删除，现役为 /evaluations（复数，另开页面）；
 *   - /compare（对比页）     → 已彻底删除，对比能力降级为 compareStore 侧边对比篮（无独立路由），
 *                             故「加入对比 → 跳转 /compare」这一步无现役入口，保留 skip + 新理由。
 * 原路由级证据链以本注释留存，未删除任何用例。
 */

test.describe("Aidean 阶段一主闭环", () => {
  test("天梯榜支持表格/柱状图双视图切换且详情入口可达", async ({ page }) => {
    // /aidean（榜单页）现役入口 = /ladder
    await page.goto("/ladder");
    await page.waitForLoadState("networkidle");

    // 视图切换组（LadderBoard 工具栏 role=group aria-label="视图切换"）
    const viewGroup = page.getByRole("group", { name: "视图切换" });
    await expect(viewGroup).toBeVisible();

    // 默认「天梯图」视图激活；/ladder 页 H1 =「大模型云服务平台」（§7.17 英雄卡改版后
    // 「模型性能天梯图」h1 仅存在于 /models——2026-10-08 e2e 复现轮修正 spec 漂移）
    const tableBtn = viewGroup.getByRole("button", { name: "天梯图" });
    const chartBtn = viewGroup.getByRole("button", { name: "柱状图" });
    await expect(tableBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "大模型云服务平台" })).toBeVisible();

    // 切到柱状图视图（零请求同源渲染）
    await chartBtn.click();
    await expect(chartBtn).toHaveAttribute("aria-pressed", "true");
    await expect(tableBtn).toHaveAttribute("aria-pressed", "false");

    // 切回天梯矩阵图
    await tableBtn.click();
    await expect(tableBtn).toHaveAttribute("aria-pressed", "true");

    // 详情入口归属 models 榜：/ladder 为 stations 榜（卡片为非导航 div，WP-FE01 死链修复），
    // 模型详情 Link 只在 /models（pageType="models"）渲染，故详情入口断言改到 /models 验证。
    await page.goto("/models");
    await page.waitForLoadState("networkidle");
    // 「模型性能天梯图」h1 归属 /models（自 /ladder 断言迁移至此）
    await expect(page.getByRole("heading", { name: "模型性能天梯图" })).toBeVisible();
    const modelEntry = page.locator('a[href^="/models/"]').first();
    await expect(modelEntry).toBeVisible();
    const href = await modelEntry.getAttribute("href");
    expect(href).toMatch(/^\/models\//);
  });

  test("详情 -> 对比篮 -> 测评入口 -> 充值入口链路可达（EVAL-01 现役口径）", async ({ page }) => {
    /**
     * RW-3 重写（2026-09-16）：原为 skip（依赖已删的 /compare 与 /evaluation 单数路由，
     * 且「加入对比」点击不跳路由 → 原 URL 断言不可实现）。EVAL-01 交付后按**现役设计**
     * 还原链路语义，逐跳可验收：
     *   /models → 详情 →「+ 加入对比」→ Dock 计数（本地 store，不跳路由）→
     *   Dock 直达 /evaluations/new → /evaluations 测评面 → /user/balance 充值入口守卫。
     * 原「URL 命中 /compare$」改为断言 Dock 计数 + 直达链接 href（对比篮刻意不做路由跳转，
     * 见 CompareAddButton/CompareDock 注释）；/compare 死链已由 /evaluations 取代。
     */
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    const modelEntry = page.locator('a[href^="/models/"]').first();
    const href = await modelEntry.getAttribute("href");
    expect(href).toMatch(/^\/models\//);

    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("navigation", { name: "页面目录" })).toBeVisible();

    // ① 加入对比篮 → Dock 浮现计数（sm:flex 需 ≥640px 视口）
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "+ 加入对比", exact: true }).click();
    const dock = page.locator("div.fixed.bottom-5.right-5");
    await expect(dock.getByText("对比篮（1/6）", { exact: true })).toBeVisible();
    await expect(dock.getByRole("link", { name: /开始对比测评/ })).toHaveAttribute("href", "/evaluations/new");

    // ② 测评面入口可达：/evaluations 列表页标题恒渲染「对比测评」（h1 不随登录态变；
    //    guest 态另显「请先登录」引导卡）。此处断言标题这一稳定锚。
    await page.goto("/evaluations");
    await expect(page.getByRole("heading", { name: "对比测评", exact: true })).toBeVisible();

    // ③ 充值入口：/user/balance 受 middleware 守卫（未登录 307→/login?redirect，登录态 200）
    const bal = await page.request.get("/user/balance", { maxRedirects: 0 });
    expect([200, 307]).toContain(bal.status());

    // 复原：移出对比篮（compareStore 落 localStorage，避免污染后续用例）
    await page.goto(href!);
    await page.getByRole("button", { name: "✓ 已加入对比", exact: true }).click();
    await expect(page.locator("div.fixed.bottom-5.right-5")).toHaveCount(0);
  });
});

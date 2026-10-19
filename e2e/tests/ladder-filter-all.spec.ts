import { expect, test } from "@playwright/test";

/**
 * TASK-079 e2e：天梯筛选「全选/全不选」三态 + 价格页充值档位与 shared 常量一致。
 *
 * 落地说明（证据链）：
 * - `test:e2e` = `playwright test --config e2e/playwright.config.ts`，该配置 `testDir: "./tests"`，
 *   故本 spec 必须位于 `e2e/tests/` 才会被收集执行（任务书原写 `e2e/ladder-filter-all.spec.ts`
 *   位于 e2e/ 根，不属任何 project 的 testDir，`test:e2e -g` 会「no tests found」）。
 * - 验收 `-g ladder-filter-all` 匹配测试标题：本 describe 名含 `ladder-filter-all`，其下用例均被选中。
 * - `node_modules/@aidean/shared` 未在 e2e 解析域链接（root 无该 workspace 软链），故档位期望值内联，
 *   数值 = `RECHARGE_TIERS.amountMinor / 100`（billing.constants.ts:42-48：1000n/5500n/11500n/60000n/250000n
 *   → 10/55/115/600/2500，需求文档 §3.5 五档），与 TASK-078 价格页读取口径一致。
 *
 * 依赖真实组件源码定位（勿改 apps/**，仅断言）：
 * - LadderFilterBar.tsx：触发按钮 aria-expanded + 文本「协议」；面板 role="group" aria-label「筛选：协议」；
 *   全选框 data-testid="ladder-filter-all-protocol"（三态：checked/indeterminate）；协议五选项 label 文本。
 * - pricing/page.tsx：#recharge-tiers 区块 ul>li 五档，金额 <p class="text-primary">，档位名取 tier.label。
 *
 * 数据容忍：/models 无种子→空态不影响筛选栏客户端三态；/pricing 充值档位来自常量（非库），空库仍渲染。
 */

// 协议组五个可过滤值（与 LadderFilterBar GROUPS.protocol.options 对齐；无伪标签，全选=5）
const PROTOCOL_VALUES = ["ANTHROPIC", "OPENAI", "RESPONSES", "GOOGLE", "CUSTOM"] as const;

// 充值五档（元）：RECHARGE_TIERS.amountMinor ÷ 100，顺序 trial→basic→standard→pro→enterprise
const RECHARGE_TIER_AMOUNTS_YUAN = ["10", "55", "115", "600", "2500"];
const RECHARGE_TIER_LABELS = ["体验", "基础", "标准", "专业", "企业"];

test.describe("ladder-filter-all：天梯全选/全不选与价格档位一致", () => {
  test("全选：协议组点击「全选」→ 五个协议选项全部选中并同步 URL", async ({ page }) => {
    await page.goto("/models");

    await page.getByRole("button", { name: /^协议/ }).click();
    const panel = page.getByRole("group", { name: "筛选：协议" });
    await expect(panel).toBeVisible();

    const allBox = page.getByTestId("ladder-filter-all-protocol");
    await expect(allBox).toBeVisible();
    await expect(allBox).not.toBeChecked();

    await allBox.click();

    // 全选框进入选中态
    await expect(allBox).toBeChecked();

    // 五个协议选项复选框全部选中（排除「全选」行本身：仅它带 ladder-filter-all- 前缀 testid）
    const optionBoxes = panel.locator(
      'label:not(:has([data-testid^="ladder-filter-all-"])) input[type="checkbox"]',
    );
    await expect(optionBoxes).toHaveCount(PROTOCOL_VALUES.length);
    for (let i = 0; i < PROTOCOL_VALUES.length; i += 1) {
      await expect(optionBoxes.nth(i)).toBeChecked();
    }

    // URL 写回有防抖（≈200ms）；五值按 GROUPS 顺序 CSV 进 query（逗号编码为 %2C，解码后整体比对）
    await expect
      .poll(() => decodeURIComponent(page.url()), { timeout: 5_000 })
      .toContain(`protocol=${PROTOCOL_VALUES.join(",")}`);
  });

  test("三态·半选：仅勾选单个协议选项 → 全选框呈 indeterminate（部分选中）", async ({ page }) => {
    await page.goto("/models");
    await page.getByRole("button", { name: /^协议/ }).click();
    const panel = page.getByRole("group", { name: "筛选：协议" });
    const allBox = page.getByTestId("ladder-filter-all-protocol");
    await expect(allBox).not.toBeChecked();

    // 勾选五选项之一：既非「全不选」也非「全选」→ 全选框半选（三态中间态）
    await panel.getByRole("checkbox", { name: /Anthropic/ }).check();
    // 版本兼容：以 DOM indeterminate 属性判定「部分选中」（不依赖较新 matcher toBePartiallyChecked）
    await expect
      .poll(() =>
        allBox.evaluate((el) => (el as unknown as HTMLInputElement).indeterminate),
      )
      .toBe(true);
    await expect(allBox).not.toBeChecked();
  });

  test("全不选：全选态再次点击「全选」→ 清空该组并移除 URL 参数", async ({ page }) => {
    await page.goto("/models");

    await page.getByRole("button", { name: /^协议/ }).click();
    const panel = page.getByRole("group", { name: "筛选：协议" });
    const allBox = page.getByTestId("ladder-filter-all-protocol");

    // 先全选（保证从「全部选中」态出发）
    await allBox.click();
    await expect(allBox).toBeChecked();
    // 确认 protocol= 已真实写入 URL；否则下方「移除」断言会因参数从未出现而平凡通过（假绿）
    await expect
      .poll(() => page.url(), { timeout: 5_000 })
      .toContain("protocol=");

    // 再次点击 → 全不选
    await allBox.click();
    await expect(allBox).not.toBeChecked();

    const optionBoxes = panel.locator(
      'label:not(:has([data-testid^="ladder-filter-all-"])) input[type="checkbox"]',
    );
    await expect(optionBoxes).toHaveCount(PROTOCOL_VALUES.length);
    for (let i = 0; i < PROTOCOL_VALUES.length; i += 1) {
      await expect(optionBoxes.nth(i)).not.toBeChecked();
    }

    // 协议组清空后，query 不再包含 protocol=（CSV join 空数组即省略该键）
    await expect
      .poll(() => page.url(), { timeout: 5_000 })
      .not.toContain("protocol=");
  });

  test("pricing：充值档位与 RECHARGE_TIERS 五档一致", async ({ page }) => {
    await page.goto("/pricing");

    const section = page.locator("#recharge-tiers");
    await expect(
      section.getByRole("heading", { name: "余额充值档位" }),
    ).toBeVisible();

    // 五张档位卡片（本区块仅一个 ul；产品权益 ul 属 #product-tiers，不落入此 section）
    const cards = section.locator("ul li");
    await expect(cards).toHaveCount(5);

    // 金额（去除货币符号/空白后）逐档等于常量 ÷100，且顺序一致
    // 注：`li p.text-primary` 依赖样式类作锚点（apps/** 禁改、无法加 data-testid）；若类名重构需同步此处
    const amountTexts = await section.locator("li p.text-primary").allInnerTexts();
    const amounts = amountTexts.map((t) => t.replace(/[^0-9.]/g, ""));
    expect(amounts).toEqual(RECHARGE_TIER_AMOUNTS_YUAN);

    // 档位名取自 tier.label（单一真源），逐档呈现
    const cardTexts = await cards.allInnerTexts();
    for (let i = 0; i < RECHARGE_TIER_LABELS.length; i += 1) {
      expect(cardTexts[i]).toContain(RECHARGE_TIER_LABELS[i]);
    }
  });
});

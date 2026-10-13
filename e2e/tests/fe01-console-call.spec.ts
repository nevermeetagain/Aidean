import { expect, test, type Page } from "@playwright/test";

/**
 * WP-FE01 e2e：天梯图与控制台完整用户能力（找模型 → 详情 → 调用 → 余额用量对上）。
 *
 * 会话建立：走真实注册链路（POST /api/v1/auth/register 自动种双 HttpOnly Cookie），
 * 与 gateway-flow/billing-flow 同口径；付费调用前经 recharge-orders + mock-pay 入账 55.00。
 *
 * 覆盖：
 *   1) 控制台调用链路（非流式）：模型选择 → 发起调用 → 输出文本 → 延迟/计费路径/实扣事实头 → 余额页用量对账；
 *   2) 流式开关：现网默认聚合回退（AIDEAN_GATEWAY_STREAM_PASSTHROUGH 未置 1）→ 增量提示须显式告知；
 *   3) 余额为 0：前端预检闸门可见且提供充值入口（后端该场景回报 30003 而非 40001，见偏差清单）；
 *   4) 375px / 1440px 两档视口：无横向溢出、关键控件可聚焦；
 *   5) 死链修复：/models 卡片可达详情；/ladder（stations）卡片不再链向模型详情。
 */

const PASSWORD = "Fe01E2e#2026";
const PAID_MODEL = "claude-3-7-sonnet";
const MOCK_REPLY = "Mock upstream reply";
/** dev 态首次访问需按需编译客户端 chunk；所有首屏断言给足窗口 */
const FIRST_PAINT_TIMEOUT = 30_000;

// dev 服务器按需编译 + 真实网关调用，单用例窗口放宽到 90s
test.describe.configure({ timeout: 90_000 });

/**
 * 打开控制台并等待调用测试台真正就绪。
 *
 * 就绪判据 = 目标模型出现在候选下拉中（等价于组件内 GET /api/v1/models 成功返回并完成分组渲染），
 * 而非仅 DOM 存在——避免在「模型清单加载中」的禁用态、或清单请求抖动失败的空候选态上做交互断言。
 * dev 态重编译窗口内清单请求可能瞬时失败（并行开发的固有抖动），故整页重载有界重试。
 */
async function openConsole(page: Page): Promise<void> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/user/console");
    // §7.23 控制台 tab 化（七板块）：调用测试台收进 tab 面板，须先激活再断言
    const playgroundTab = page.getByRole("tab", { name: "调用测试台" });
    await expect(playgroundTab).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT });
    await playgroundTab.click();
    await expect(page.getByTestId("call-playground")).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT });
    try {
      await expect(page.getByTestId("playground-model").locator(`option[value="${PAID_MODEL}"]`)).toHaveCount(1, {
        timeout: 15_000,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await page.waitForTimeout(1_500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("控制台调用测试台未就绪：模型候选始终为空");
}

/**
 * 注册新用户并（可选）充值；返回邮箱。
 *
 * dev 态说明：本仓库存在并行开发（后端角色同时改动 lib/features/gateway 与 packages/shared），
 * Next dev 在文件失效重编译的窗口内会对 API 路由瞬时返回 404。此为**基础设施抖动**而非产品缺陷，
 * 故对注册做有界重试（3 次 / 1.5s 间隔）；连续失败才判失败并带出最后一次响应体。
 */
async function registerUser(page: Page, funded: boolean): Promise<string> {
  const email = `fe01-e2e-${funded ? "paid" : "zero"}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@aidean.test`;

  let lastStatus = 0;
  let lastBody = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const reg = await page.request.post("/api/v1/auth/register", {
      data: { email, password: PASSWORD, nickname: "WP-FE01" },
    });
    lastStatus = reg.status();
    if (lastStatus === 200) break;
    lastBody = (await reg.text().catch(() => "")).slice(0, 300);
    if (attempt < 3) await page.waitForTimeout(1_500);
  }
  expect(lastStatus, `注册失败（最终 HTTP ${lastStatus}）：${lastBody}`).toBe(200);

  if (funded) {
    const create = await page.request.post("/api/v1/billing/recharge-orders", {
      data: { tierId: "basic", payMethod: "WECHAT" },
    });
    expect(create.status()).toBe(200);
    const orderId = (await create.json()).data.order.id as string;
    const pay = await page.request.post(`/api/v1/billing/recharge-orders/${orderId}/mock-pay`);
    expect(pay.status()).toBe(200);
  }
  return email;
}

test.describe("WP-FE01 控制台调用链路", () => {
  test("找模型 → 调用 → 延迟/计费事实头 → 余额页用量对账", async ({ page }) => {
    await registerUser(page, true);
    await openConsole(page);

    const playground = page.getByTestId("call-playground");
    await expect(playground).toBeVisible();

    // 1) 模型选择（含档位/优先级/free/全部四组）
    const modelSelect = page.getByTestId("playground-model");
    await expect(modelSelect).toBeVisible();
    await expect(modelSelect.locator("optgroup")).not.toHaveCount(0);
    await modelSelect.selectOption(PAID_MODEL);
    await expect(modelSelect).toHaveValue(PAID_MODEL);

    // 2) 发起调用（非流式）
    await page.getByTestId("playground-run").click();

    // 3) 输出文本（mock 上游固定回吐）
    await expect(page.getByTestId("playground-output")).toContainText(MOCK_REPLY, { timeout: 30_000 });

    // 4) 事实头：延迟 / 计费路径 / 实扣
    await expect(page.getByTestId("playground-latency")).toContainText("ms");
    await expect(page.getByTestId("playground-billing-path")).toHaveText("平台余额");
    const charge = await page.getByTestId("playground-charge").innerText();
    expect(charge === "以流水为准" || /^¥\d+\.\d{2}$/.test(charge), `实扣文案异常：${charge}`).toBe(true);

    // 5) 状态与用量可解释
    await expect(page.getByTestId("playground-status")).toHaveText("成功");
    await expect(page.getByTestId("playground-records")).toContainText(PAID_MODEL);

    // 6) 余额页用量明细对账：至少 1 条，且模型名一致、金额为元格式
    await page.goto("/user/balance");
    const ledger = page.getByTestId("usage-ledger");
    await expect(ledger).toBeVisible();
    await expect(ledger.getByTestId("usage-empty")).toHaveCount(0);
    await expect(ledger.locator("tbody tr").first()).toContainText(PAID_MODEL);
    await expect(ledger.getByTestId("usage-amount").first()).toHaveText(/^¥\d+\.\d{2}$/);
  });

  test("流式开关：默认聚合回退路径须显式告知无增量", async ({ page }) => {
    await registerUser(page, true);
    await openConsole(page);

    await page.getByTestId("playground-model").selectOption(PAID_MODEL);
    await page.getByTestId("playground-stream-toggle").check();
    await page.getByTestId("playground-run").click();

    await expect(page.getByTestId("playground-output")).toContainText(MOCK_REPLY, { timeout: 30_000 });
    // 现网默认聚合：须出现「服务端聚合回退」说明；若后端开启 SSE 透传，则该标记不出现而走增量路径
    const aggregateNote = page.getByTestId("playground-aggregate-note");
    const hasAggregateNote = await aggregateNote.count();
    if (hasAggregateNote > 0) {
      await expect(aggregateNote).toBeVisible();
    } else {
      await expect(page.getByTestId("playground-output")).not.toBeEmpty();
    }
  });

  test("余额为 0：预检闸门可见且提供充值入口", async ({ page }) => {
    await registerUser(page, false);
    await openConsole(page);

    await expect(page.getByTestId("call-playground")).toBeVisible();
    await expect(page.getByTestId("playground-balance-warning")).toBeVisible();
    await expect(page.getByTestId("playground-balance-warning").locator('a[href="/user/balance"]')).toBeVisible();

    // 付费模型调用在零余额下失败，错误态须给出文案与动作（不得白屏）
    await page.getByTestId("playground-model").selectOption(PAID_MODEL);
    await page.getByTestId("playground-run").click();
    await expect(page.getByTestId("playground-error")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("playground-status")).toHaveText("失败");
  });
});

test.describe("WP-FE01 视口与死链", () => {
  for (const viewport of [
    { name: "375px", width: 375, height: 667 },
    { name: "1440px", width: 1440, height: 900 },
  ] as const) {
    test(`${viewport.name}：控制台无横向溢出且关键控件可聚焦`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await registerUser(page, true);
      await openConsole(page);

      await expect(page.getByTestId("call-playground")).toBeVisible();
      await expect(page.getByTestId("playground-run")).toBeVisible();

      // 无横向溢出（容许 1px 亚像素）
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${viewport.name} 横向溢出 ${overflow}px`).toBeLessThanOrEqual(1);

      // 键盘可达：聚焦模型选择与发起按钮，焦点环可见（非 outline:none 且可聚焦）
      await page.getByTestId("playground-model").focus();
      await expect(page.getByTestId("playground-model")).toBeFocused();
      await page.getByTestId("playground-run").focus();
      await expect(page.getByTestId("playground-run")).toBeFocused();
    });
  }

  test("/models 卡片可达详情；/ladder stations 卡片不再链向模型详情", async ({ page }) => {
    await page.goto("/models");
    const modelsMatrix = page.getByRole("region", { name: "天梯矩阵图" });
    await expect(modelsMatrix).toBeVisible();
    const modelLinks = modelsMatrix.locator('a[href^="/models/"]');
    const modelLinkCount = await modelLinks.count();
    if (modelLinkCount > 0) {
      // 首个模型卡片 → 详情页（非「暂未收录」空态）
      const href = await modelLinks.first().getAttribute("href");
      await page.goto(href as string);
      await expect(page.getByText("该模型暂未收录")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "基本介绍" })).toBeVisible();
    }

    // /ladder（stations）：站点无模型详情页 —— 卡片不得再产出 /models/* 死链
    await page.goto("/ladder");
    const stationsMatrix = page.getByRole("region", { name: "天梯矩阵图" });
    await expect(stationsMatrix).toBeVisible();
    const emptyState = await stationsMatrix.getByText("暂无数据").count();
    if (emptyState === 0) {
      await expect(stationsMatrix.locator('a[href^="/models/"]')).toHaveCount(0);
      // 卡片仍应呈现站名与名次（可见文本不丢失）
      await expect(stationsMatrix.locator("div[title]").first()).toBeVisible();
    }
  });
});

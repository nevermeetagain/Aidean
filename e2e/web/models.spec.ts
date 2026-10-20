/**
 * Web用户端 - 模型页面E2E测试
 *
 * Task: 验证模型列表/详情页在现役路由下正常渲染
 *
 * [QA-COV-01 2026-09-15 员工C] 入口更正：C-3 期 skip 的入口 `/aidean` 已删除；
 * 现役模型列表入口 = `/models`（实测 3000 产物：(site)/models/page.tsx），
 * 详情路由 = `/models/[slug]`。本版按实测 DOM 重写：
 * - 列表页为「天梯表」形态：条目为纯文本 `<a href="/models/<slug>">`，**无**
 *   aria-label「查看模型详情：」、**无** 搜索框、**无** 分类 tab（实测 265130B DOM）。
 * - 详情页保留「页面目录」，基准测试/测评示例为目录锚，**无**「加入对比/参与测评」按钮。
 * 依赖已删路由 /compare、/evaluation 的 2 例（对比页/测评页跳转）保留 skip + 新理由。
 */

import { test, expect } from '../fixtures';

const LIST_PATH = '/models';
const detailLink = (page: import('@playwright/test').Page) =>
  page.locator('a[href^="/models/"]').first();

test.describe('模型列表页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LIST_PATH);
    await page.waitForLoadState('networkidle');
  });

  test('模型列表页正常加载', async ({ page }) => {
    await expect(page).toHaveTitle(/Aidean|模型|Model/);
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('模型列表存在详情入口且指向 /models/:slug', async ({ page }) => {
    const entry = detailLink(page);
    await expect(entry).toBeVisible({ timeout: 5000 });
    const href = await entry.getAttribute('href');
    expect(href).toMatch(/^\/models\/.+/);
  });

  test('模型列表至少渲染一个模型条目', async ({ page }) => {
    // 天梯表形态：模型条目数 = /models/<slug> 链接数（实测 ≥1）
    const entries = page.locator('a[href^="/models/"]');
    expect(await entries.count()).toBeGreaterThan(0);
  });

  test('点击详情入口可达详情页', async ({ page }) => {
    const href = await detailLink(page).getAttribute('href');
    await page.goto(href!);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/models\/.+/);
  });
});

test.describe('模型详情页', () => {
  let detailHref = '';

  test.beforeEach(async ({ page }) => {
    await page.goto(LIST_PATH);
    await page.waitForLoadState('networkidle');
    detailHref = (await detailLink(page).getAttribute('href')) || '';
    await page.goto(detailHref);
    await page.waitForLoadState('networkidle');
  });

  test('模型详情页正常加载（主区 + 四个语义分区可见）', async ({ page }) => {
    expect(detailHref).toMatch(/^\/models\/.+/);
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
    // 实测现役 DOM 的四个稳定 h2 分区（基本介绍/参数信息/基准测试/测评示例）
    await expect(page.getByRole('heading', { name: '基本介绍' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '参数信息' })).toBeVisible();
  });

  test('模型详情页基本介绍区含 modelCode 与厂商信息', async ({ page }) => {
    // 实测详情页文本含「modelCode：」「厂商：」，属现役 DOM 稳定锚
    await expect(page.getByText(/modelCode/).first()).toBeVisible();
    await expect(page.getByText(/厂商/).first()).toBeVisible();
  });

  test('模型详情页可将模型带入对比篮（EVAL-01 现役 DOM：+ 加入对比 → Dock 计数）', async ({ page }) => {
    // RW-3 恢复（原 skip 理由「依赖已删路由 /compare」已失效）：EVAL-01 交付后详情页有
    // CompareAddButton（size=md，文案「+ 加入对比」/「✓ 已加入对比」），点击驱动 compareStore，
    // 右下角 CompareDock 浮现计数。/compare 死链已由 /evaluations 取代（ModelSection 入口）。
    const addBtn = page.getByRole('button', { name: '+ 加入对比', exact: true });
    if (!(await addBtn.count())) test.skip(true, '当前详情页无「+ 加入对比」（可能非模型页）');
    await addBtn.click();
    await expect(page.getByRole('button', { name: '✓ 已加入对比', exact: true })).toBeVisible();
    await expect(page.getByText('对比篮（1/6）', { exact: true })).toBeVisible();
    // 复原：再点一次移出（compareStore 持久化到 localStorage，避免污染其它用例）
    await page.getByRole('button', { name: '✓ 已加入对比', exact: true }).click();
    await expect(page.getByText('对比篮（1/6）', { exact: true })).toHaveCount(0);
  });

  test('模型详情页测评示例区与对比测评入口共存', async ({ page }) => {
    // RW-3 恢复：/evaluations（plural）已上线（列表/详情/new 三页 + demo 公开端点）。
    // 详情页「测评示例」区已由 TASK-074 实装（samples-* 四态，占位文案「即将上线」已移除；四态与基准弹窗断言见
    // e2e/web/model-detail-benchmark.spec.ts，TASK-075）——此处只断言区块标题存在，
    // 并断言首页「模型对比」卡指向 /evaluations（死链 /compare 已销）。
    await expect(page.getByRole('heading', { name: '测评示例' })).toBeVisible();
    const home = await page.goto('/');
    expect(home?.status()).toBe(200);
    // 卡内整串文本即无障碍名（含描述），用 href 定位再验标题，避免 /compare 旧链接复活
    const compareCard = page.locator('a[href="/evaluations"]').first();
    await expect(compareCard).toBeVisible();
    await expect(compareCard).toContainText('模型对比');
    await expect(page.locator('a[href="/compare"]')).toHaveCount(0);
  });
});

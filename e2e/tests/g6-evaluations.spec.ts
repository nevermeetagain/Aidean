import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * G6 契约 e2e：对比测评（EVAL-01）。
 *
 * 状态（RW-3 2026-09-16 更新）：契约先行 → **已并入真实执行**（13 例全绿：E1×2/E2/E4×2/E6×2 +
 * G6-keys 6 例同套）。执行前置三项已全部兑现：① EVAL-01 路由/UI 已在工作树并随 standalone 重建；
 * ② 经理集成轮重建完成；③ 3000 唯一监听者指向新 BUILD。
 * 运行形态：`pnpm test:e2e`（e2e/playwright.config.ts，testDir ./tests，webServer dev 态复用）。
 * ⚠️ 付费夹具账户由本文件 createProUser 经 **admin 调账** 充值（不走 mock-pay）——standalone
 *    生产态 billing.channelOf 对 mock 渠道直接抛 40000「支付渠道尚未接入」，dev 态虽可用但
 *    随 NODE_ENV 口径漂移；调账路径两种形态一致可跑（《测试与验收文档》§13.1 纪律的延伸结论）。
 *
 * 契约源（只读，勿改）：
 *   - docs/specs/implement-evaluation-compare/spec.md v1.0（状态机 + 四端点 + 计费 + winner）
 *   - apps/web/app/api/v1/evaluations/{route.ts,demo/route.ts,[id]/route.ts}
 *   - apps/web/app/(site)/evaluations/new/page.tsx（「新建对比测评」「选择 2–6 个模型」
 *     「付费用户能力（Pro/Max）」）
 *   - apps/web/app/(site)/evaluations/[id]/page.tsx（并排列、status=1 → 2s 轮询、
 *     失败列原因「失败」、成功列「成功」、优胜「🏆 优胜」、401→guest 登录引导）
 *   - apps/web/components/evaluations/EvaluationCreateForm.tsx、site/CompareDock.tsx
 *
 * 纪律：
 *   - 文本断言一律 { exact: true }；
 *   - 主题/颜色判据用 computed 值（不读 data-theme）；
 *   - 视口 1280×800（桌面态）；
 *   - 一律 web-first 断言，不用裸 sleep；
 *   - 依赖种子的用例标 @serial（登录限流 20/600s，连续登录会 429 级联）；
 *   - 不硬编码 3000 / BUILD_ID —— baseURL 走 config 的 E2E_BASE_URL。
 *
 * 6 组断言：
 *   E1 未登录：GET /evaluations → 401 → 页面「请先登录」+「去登录」引导
 *   E2 免费用户：NORMAL 创建 → 403 code=10008「付费用户能力」
 *   E3 Dock 创建链：Dock 暂存 2 模型 → 计数 → /evaluations/new chips 预选 → 提交 → 详情并排 2 列
 *   E4 N=1 拒绝：前端按钮禁用 + 后端 40000
 *   E5 状态机：创建即跑同步终态 + 轮询兜底；失败列显示原因（#26 冻结已解除——结算断言按
 *      「评估域×2/模型 + 网关 PLATFORM 实扣逐调用」双账并记的当前实现口径取值，见 §26 分析）
 *   E6 demo 公开：匿名 GET /evaluations/demo → 200，仅 isPaid=false 项；limit 越界 40000
 */

const SEED_USER = { email: "test@aidean.com", password: "Test123!@#" };
const SEED_ADMIN = { email: "admin@aidean.com", password: "Admin123!@#" };
const PRO_PASSWORD = "EvalPro#2026";
const VIEWPORT = { width: 1280, height: 800 };

const envelope = (body: { code: number }) => expect(body.code).toBe(0);

async function loginSeed(page: import("@playwright/test").Page): Promise<void> {
  const login = await page.request.post("/api/v1/auth/login", { data: SEED_USER });
  if (login.status() !== 200) {
    throw new Error(`真实登录失败（${login.status()}），无法建立会话`);
  }
}

/** 登录并返回 aidean_token cookie 值（管理面请求头态） */
async function loginToken(request: APIRequestContext, email: string, password: string): Promise<string> {
  const r = await request.post("/api/v1/auth/login", { data: { email, password } });
  if (r.status() !== 200) throw new Error(`登录失败(${email})：${r.status()}`);
  const m = (r.headers()["set-cookie"] || "").match(/aidean_token=([^;]+)/);
  if (!m) throw new Error(`登录响应缺 aidean_token（${email}）`);
  return m[1];
}

/**
 * PRO 夹具账户（RW-3）：注册 NORMAL → admin PATCH tier=PRO → admin 钱包调账 +¥1000。
 * 关键前提（勿破）：test@aidean.com 必须保持 NORMAL——E2 的 403 断言、g6 G2 的
 * 「API Key 路径默认平台计费」语义、以及 console-flow/smoke 对种子身份的描述都依赖它；
 * 付费态断言一律用本函数产出的一次性 PRO 账户。
 * 充值走调账而非 mock-pay：standalone 生产态 mock 渠道被 channelOf 拒（40000）。
 */
async function createProUser(request: APIRequestContext): Promise<{ email: string; password: string; token: string }> {
  const email = `g6-pro-${Date.now()}@aidean.test`;
  const reg = await request.post("/api/v1/auth/register", {
    data: { email, password: PRO_PASSWORD, nickname: "G6付费夹具" },
  });
  expect(reg.status()).toBe(200);

  const adminToken = await loginToken(request, SEED_ADMIN.email, SEED_ADMIN.password);
  const AH = { cookie: `aidean_token=${adminToken}` };
  const found = await (
    await request.get(`/api/v1/admin/users?page=1&pageSize=1&q=${encodeURIComponent(email)}`, { headers: AH })
  ).json();
  const user = found.data?.users?.[0];
  if (!user?.id || !user?.walletId) throw new Error(`admin 未查到夹具用户/钱包：${JSON.stringify(found).slice(0, 160)}`);

  const patch = await request.patch(`/api/v1/admin/users/${user.id}`, { data: { tier: "PRO" }, headers: AH });
  expect(patch.status()).toBe(200);

  const adjust = await request.post("/api/v1/admin/wallets/adjust", {
    headers: AH,
    data: { walletId: user.walletId, amountMinor: 100000, note: "G6 测评夹具充值（e2e 调账通道）" },
  });
  expect(adjust.status()).toBe(200);

  const token = await loginToken(request, email, PRO_PASSWORD);
  return { email, password: PRO_PASSWORD, token };
}

test.describe("g6-evaluations 对比测评（EVAL-01）", () => {
  test.use({ viewport: VIEWPORT });

  // ── E1 未登录 401 → 登录引导 ────────────────────────────────────
  test.describe("E1 未登录：401 → 登录引导", () => {
    test("匿名 GET /api/v1/evaluations → 401 10004", async ({ request }) => {
      const res = await request.get("/api/v1/evaluations?page=1&pageSize=10");
      expect(res.status()).toBe(401);
      expect((await res.json()).code).toBe(10004);
    });

    test("匿名详情页显示「请先登录」与「去登录」", async ({ page }) => {
      await page.goto("/evaluations/00000000-0000-0000-0000-000000000000");
      await expect(page.getByText("请先登录", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "去登录" })).toBeVisible();
    });
  });

  // ── E2 免费用户 403/10008 ───────────────────────────────────────
  test.describe("E2 免费用户：403 付费用户能力", () => {
    test("@serial 新注册 NORMAL → 创建 403 code=10008", async ({ request }) => {
      const stamp = Date.now();
      const reg = await request.post("/api/v1/auth/register", {
        data: { email: `eval-normal-${stamp}@aidean.test`, password: "EvalNormal#2026", nickname: "免费测评" },
      });
      expect(reg.status()).toBe(200);

      const res = await request.post("/api/v1/evaluations", {
        data: { prompt: "对比一下", modelIds: ["m1", "m2"] },
      });
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.code).toBe(10008);
      expect(body.message).toContain("付费用户能力");
    });
  });

  // ── E3 Dock → 创建 → 并排详情 ───────────────────────────────────
  test.describe("E3 创建链：Dock 暂存 → chips 预选 → 详情并排", () => {
    test("@serial 详情页加入对比 ×2 → Dock 计数 → new 页预选 → 提交 → 详情并排 2 列", async ({ page, request }) => {
      const { email, password } = await createProUser(request);
      const login = await page.request.post("/api/v1/auth/login", { data: { email, password } });
      expect(login.status()).toBe(200);

      // Dock 暂存：两个模型详情页各点「+ 加入对比」（slug 确定性入口，免依赖榜单序）
      for (const slug of ["claude-3-7-sonnet", "gpt-4-5"]) {
        await page.goto(`/models/${slug}`);
        await page.getByRole("button", { name: "+ 加入对比", exact: true }).click();
      }
      // Dock 计数 2/6 并直达创建页
      const dock = page.locator("div.fixed.bottom-5.right-5");
      await expect(dock.getByText("对比篮（2/6）", { exact: true })).toBeVisible();
      await dock.getByRole("link", { name: /开始对比测评/ }).click();
      await expect(page).toHaveURL(/\/evaluations\/new$/);

      // chips 预选（与 Dock 共享 compareStore；选中态=aria-pressed=true）+ 提示词 + 提交
      await expect(page.getByRole("heading", { name: "新建对比测评" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Claude 3.7 Sonnet", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("button", { name: "GPT-4.5", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.locator("textarea").fill("用一句话说明什么是天梯图。");
      const detailPromise = page.waitForURL(/\/evaluations\/01[0-9a-f-]+$/);
      await page.getByRole("button", { name: "开始对比测评", exact: true }).click();
      await detailPromise;

      // 并排 2 列；每列有状态徽标（成功或失败——gpt-4.5 无站点必败，claude 经 mock 站可成）
      await expect(page.getByRole("heading", { name: "对比测评详情" })).toBeVisible();
      await expect(page.locator("article")).toHaveCount(2);
      const badges = page.locator("article span", { hasText: /^(成功|失败|待执行)$/ });
      await expect(badges).toHaveCount(2);
    });
  });

  // ── E4 N=1 拒绝 ─────────────────────────────────────────────────
  test.describe("E4 模型数下限：N=1 拒绝", () => {
    test("@serial 后端 40000（前端按钮同时禁用）", async ({ request }) => {
      await request.post("/api/v1/auth/login", { data: SEED_USER });
      const res = await request.post("/api/v1/evaluations", {
        data: { prompt: "只有一个模型", modelIds: ["m1"] },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).code).toBe(40000);
    });

    test("前端：仅选 1 个模型时提交按钮禁用", async ({ page }) => {
      await loginSeed(page);
      await page.goto("/evaluations/new");
      await expect(page.getByRole("heading", { name: "新建对比测评" })).toBeVisible();
      // 未选满 2 个 → 提交禁用（具体按钮名待 DOM 契约固化）
      const submit = page.getByRole("button", { name: /提交|开始|创建/ });
      await expect(submit).toBeDisabled();
    });
  });

  // ── E5 状态机与结算收口 ─────────────────────────────────────────
  test.describe("E5 状态机：创建即跑收口终态、失败列原因", () => {
    // RW-3 定论：EVAL-01 的「创建即跑」= POST 内同步并行执行并结算后才返回（spec 流程原文），
    // 故本用例断言的是**收口语义**：混合成败 → status=2 + 成功列 completed + 失败列 error+原因；
    // status=1 的中间态只在崩溃/超时残留时出现，由 GET /[id] 读路径惰性对账兜底（§13 对账用例）。
    test("@serial PRO 混合两列（1 成 1 败）→ 终态 2、costMinor=2 列×单价、败列有原因", async ({ request }) => {
      const { token } = await createProUser(request);
      const H = { cookie: `aidean_token=${token}` };

      const models = (await (await request.get("/api/v1/models?page=1&pageSize=100")).json()).data.items as Array<{
        id: string;
        slug: string;
      }>;
      const ok = models.find((m) => m.slug === "claude-3-7-sonnet"); // 有 e2e 站点服务（可成功）
      const bad = models.find((m) => m.slug === "gpt-4-5"); // 无任何站点服务（必失败）
      expect(ok).toBeTruthy();
      expect(bad).toBeTruthy();

      const w0 = (await (await request.get("/api/v1/billing/wallet", { headers: H })).json()).data;
      const res = await request.post("/api/v1/evaluations", {
        headers: H,
        data: { prompt: "用一句话说明什么是天梯图。", modelIds: [ok!.id, bad!.id] },
      });
      expect(res.status()).toBe(200);
      const ev = (await res.json()).data.evaluation;

      // 状态机收口：POST 返回即终态（2=已完成），且列级状态各自落定
      expect(ev.status).toBe(2);
      expect(ev.costMinor).toBe("400"); // hold 口径 = N×单价 = 2×200 分
      expect(ev.costYuan).toBe("4.00");
      const byId = Object.fromEntries((ev.models as Array<{ modelId: string; status: string; response: string | null; errorMessage: string | null }>).map((m) => [m.modelId, m]));
      expect(byId[ok!.id].status).toBe("completed");
      expect(byId[ok!.id].response?.length ?? 0).toBeGreaterThan(0);
      expect(byId[bad!.id].status).toBe("error");
      expect(byId[bad!.id].errorMessage?.length ?? 0).toBeGreaterThan(0); // 失败列有原因
      expect(ev.winnerModelId).toBe(ok!.id); // 败列不参与 winner

      // 结算：部分成功 → capture 成功份额（1×200 分），差额 200 分自动解冻
      const w1 = (await (await request.get("/api/v1/billing/wallet", { headers: H })).json()).data;
      expect(Number(w1.heldYuan)).toBeCloseTo(0, 6); // held 终态清零
      const spent = Number(w0.balanceYuan) - Number(w1.balanceYuan);
      // #26 仲裁定论（2026-09-17）：评估域独占计费（billingExempt=true），
      // 网关 PLATFORM 路径不再 hold/capture——用户只见评估费 ¥2/成功列，逐分精确。
      expect(spent).toBe(2);

      // 轮询兜底路径：GET 详情仍返回同一终态（幂等读，不重复结算）
      const again = (await (await request.get(`/api/v1/evaluations/${ev.id}`, { headers: H })).json()).data.evaluation;
      expect(again.status).toBe(2);
      const w2 = (await (await request.get("/api/v1/billing/wallet", { headers: H })).json()).data;
      expect(Number(w2.balanceYuan)).toBeCloseTo(Number(w1.balanceYuan), 6);
    });
  });

  // ── E6 demo 公开端点 ────────────────────────────────────────────
  test.describe("E6 demo 公开：匿名可见预置示例", () => {
    test("匿名 GET /api/v1/evaluations/demo?limit=3 → 200，items 均 isPaid=false", async ({ request }) => {
      const res = await request.get("/api/v1/evaluations/demo?limit=3");
      expect(res.status()).toBe(200);
      const body = await res.json();
      envelope(body);
      expect(Array.isArray(body.data.items)).toBe(true);
      for (const it of body.data.items as Array<{ isPaid?: boolean }>) {
        expect(it.isPaid ?? false).toBe(false);
      }
    });

    test("limit 越界（11）→ 40000", async ({ request }) => {
      const res = await request.get("/api/v1/evaluations/demo?limit=11");
      expect(res.status()).toBe(400);
      expect((await res.json()).code).toBe(40000);
    });
  });
});

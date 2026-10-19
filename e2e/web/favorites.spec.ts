import { test, expect } from "../fixtures";
import type { BrowserContext } from "@playwright/test";

/**
 * TASK-024 · S3 收藏端到端 e2e（REQ-F-13 / REQ-F-052 / SOL-S3）。
 *
 * 覆盖四行为（任务书「目标」）：
 *   ① 登录用户收藏模型 → 控制台「我的收藏」Tab 出现；
 *   ② 取消收藏 → 面板消失（回到 favs-empty）；
 *   ③ 未登录点击收藏 → 跳 /login?redirect=<站内回跳>；
 *   ④ 他人 DELETE 本人收藏行 → 40000（防枚举，越权即「不存在」）。
 *
 * 真实链路与契约证据链（逐点源码核对，禁止臆测）：
 *   - 受控面：GET /api/v1/system/features（API-002，PUBLIC，force-dynamic）读 favorites.enabled；
 *     当前 DB=true（见运行前 probe）。路由首行 requireFeature 先于鉴权（favorites/route.ts:18,25）。
 *   - 收藏端点（唯一源 packages/shared/src/schemas/favorites.schema.ts；API-005/006/007）：
 *       POST /api/v1/user/favorites {refType,refId,note?} → FavoriteItem（@@unique 幂等）；
 *       GET  /api/v1/user/favorites?page&pageSize → {items,total,page,pageSize,totalPages}；
 *       DELETE /api/v1/user/favorites/[id] → {deleted:true}；0 行（非本人）→ ApiError(BAD_REQUEST=40000)→HTTP400
 *       （service.ts:95 逐字对齐 api-keys DELETE 防枚举口径）。
 *   - 鉴权：requireUserApi 仅读 HttpOnly Cookie `aidean_token`（session.ts getSession 不接 Bearer）。
 *     注册即时签发双令牌、无邮箱验证码（auth/register/route.ts；对齐 walking-skeleton 既有范式）。
 *     dev 下 baseCookieOptions().secure=isProduction()=false → http://localhost 可回传（constants.ts:150）。
 *   - UI 受控状态机（FavoriteButton.tsx:45 / useFavorites.ts:61-119）：
 *       未登录→fav-login；已登录未收藏→fav-toggle；已收藏→fav-active；提交中→fav-pending。
 *       未登录点击 → gotoLogin → window.location.href = `/login?redirect=<encodeURIComponent(pathname+search)>`（FavoriteButton.tsx:31-34）。
 *   - 控制台（console/page.tsx requireUser 守卫；ConsoleWorkspace.tsx 深链 ?tab=favorites；FavoritesPanel 五态）：
 *       列表项「查看」链接 href = target.href = `/models/${aiModel.slug}`（repository.ts:40 投影，与 ladder slug 同源）。
 *
 * 定位锚（全部来自源码，非硬编码文本猜测）：
 *   fav-toggle / fav-active / fav-login（详情页 size=md 唯一实例）；
 *   console-panel-favorites / favs-list / favs-empty；a[href="/models/<slug>"]。
 *
 * 用例隔离：每 test 独立 context（storageState=web-guest 游客态不含 aidean_token）；
 *   越权用例用 browser.newContext() 双独立 Cookie 罐；注册产生的用户行随 walking-skeleton 既有口径保留，
 *   收藏行在 finally 中幂等删除，防跨次执行累积。
 */

const API_BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

/** 时间戳唯一后缀：邮箱跨用例/跨次执行互不冲突。 */
function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface LadderModel {
  modelId: string;
  slug: string;
}

/**
 * 运行时经天梯 API 取一个「存在且启用」的模型（避免硬编码 id/slug 漂移）。
 * GET /api/v1/ladder?type=models → {code,data:{entries[]}}，entry 含 modelId(AiModel PK)/slug。
 * 该 modelId 即详情页 FavoriteButton 的 refId（models/[slug]/page.tsx:188 model.id）与
 * 收藏 target 投影主键（repository.ts:36 按 id 命中），三者同表同键。
 */
async function pickLiveModel(request: BrowserContext["request"]): Promise<LadderModel> {
  const resp = await request.get(`${API_BASE}/api/v1/ladder?type=models`);
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  const entries = body?.data?.entries as LadderModel[] | undefined;
  expect(Array.isArray(entries)).toBe(true);
  expect(entries?.length ?? 0).toBeGreaterThan(0);
  const first = entries![0];
  expect(typeof first.modelId).toBe("string");
  expect(typeof first.slug).toBe("string");
  return { modelId: first.modelId, slug: first.slug };
}

/** 独立上下文注册并返回（Cookie 落该 context 罐；用于双用户越权断言）。 */
async function registerInContext(ctx: BrowserContext, email: string): Promise<void> {
  const resp = await ctx.request.post(`${API_BASE}/api/v1/auth/register`, {
    data: { email, password: "FavE2e123!", nickname: "收藏e2e" },
  });
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  expect(body.code).toBe(0);
}

test.describe("favorites：收藏→控制台可见→取消→未登录引导→他人越权", () => {
  test("① + ②：登录收藏模型→控制台出现→取消后消失", async ({ page }) => {
    const { slug } = await pickLiveModel(page.request);
    const email = `fav-ui-${uniqueSuffix()}@e2e.aidean.test`;

    // 注册即登录态：page.request 与 page.context 共享 aidean_token Cookie（walking-skeleton 已证范式）
    const reg = await page.request.post("/api/v1/auth/register", {
      data: { email, password: "FavE2e123!", nickname: "收藏e2e" },
    });
    expect(reg.status()).toBe(200);

    try {
      // 详情页：已登录未收藏 → fav-toggle；点击 → POST → fav-active
      await page.goto(`/models/${slug}`);
      const favBtn = page.getByTestId("fav-toggle");
      await expect(favBtn).toBeVisible();
      await favBtn.click();
      await expect(page.getByTestId("fav-active")).toBeVisible();

      // 控制台深链：我的收藏面板出现该模型（查看链接 href=/models/<slug>）
      await page.goto("/user/console?tab=favorites");
      const panel = page.getByTestId("console-panel-favorites");
      await expect(panel).toBeVisible();
      await expect(panel.getByTestId("favs-list")).toBeVisible();
      await expect(panel.locator(`a[href="/models/${slug}"]`)).toBeVisible();

      // 取消收藏：行「删除」→「确认删除」→ DELETE → 唯一项删空回落 favs-empty
      await panel.getByRole("button", { name: "删除", exact: true }).click();
      await panel.getByRole("button", { name: "确认删除" }).click();
      await expect(panel.getByTestId("favs-empty")).toBeVisible();
    } finally {
      // 幂等兜底清理：确保无残留收藏（面板删除已生效时此处吞 40000）
      await page.request
        .get("/api/v1/user/favorites?pageSize=50")
        .then(async (r) => (r.ok() ? ((await r.json())?.data?.items as Array<{ id: string }>) ?? [] : []))
        .then((items) =>
          Promise.all(items.map((it) => page.request.delete(`/api/v1/user/favorites/${it.id}`).catch(() => undefined)))
        )
        .catch(() => undefined);
    }
  });

  test("③：未登录点击收藏 → 跳 /login?redirect=<站内回跳>", async ({ page }) => {
    const { slug } = await pickLiveModel(page.request);
    // 真实匿名：清空游客快照 Cookie，杜绝任何登录态混入
    await page.context().clearCookies();

    await page.goto(`/models/${slug}`);
    const loginBtn = page.getByTestId("fav-login");
    await expect(loginBtn).toBeVisible();
    await loginBtn.click();

    await expect(page).toHaveURL(/\/login\?redirect=/);
    const redirect = new URL(page.url()).searchParams.get("redirect") ?? "";
    expect(redirect).toContain(`/models/${slug}`);
  });

  test("④：他人 DELETE 本人收藏行 → 40000（越权即『不存在』，防枚举）", async ({ browser }) => {
    // 双独立 Cookie 罐：context A 持收藏、context B 试图删除
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    let favoriteId: string | undefined;

    try {
      const { modelId } = await pickLiveModel(ctxA.request);
      await registerInContext(ctxA, `fav-a-${uniqueSuffix()}@e2e.aidean.test`);
      await registerInContext(ctxB, `fav-b-${uniqueSuffix()}@e2e.aidean.test`);

      // A 收藏目标模型
      const create = await ctxA.request.post(`${API_BASE}/api/v1/user/favorites`, {
        data: { refType: "MODEL", refId: modelId },
      });
      expect(create.status()).toBe(200);
      const created = await create.json();
      expect(created.code).toBe(0);
      favoriteId = created.data?.id as string;
      expect(typeof favoriteId).toBe("string");

      // B 越权 DELETE A 的收藏行 → HTTP 400 + code 40000（0 行 → 防枚举，与「不存在」同形）
      const cross = await ctxB.request.delete(`${API_BASE}/api/v1/user/favorites/${favoriteId}`);
      expect(cross.status()).toBe(400);
      const crossBody = await cross.json();
      expect(crossBody.code).toBe(40000);
      expect(crossBody.data).toBeNull();

      // A 本人删除 → 200 {deleted:true}（证明该行确属 A，越权失败非因「行不存在」）
      const own = await ctxA.request.delete(`${API_BASE}/api/v1/user/favorites/${favoriteId}`);
      expect(own.status()).toBe(200);
      expect((await own.json()).data?.deleted).toBe(true);
      favoriteId = undefined;
    } finally {
      if (favoriteId) {
        await ctxA.request.delete(`${API_BASE}/api/v1/user/favorites/${favoriteId}`).catch(() => undefined);
      }
      await ctxA.close();
      await ctxB.close();
    }
  });
});

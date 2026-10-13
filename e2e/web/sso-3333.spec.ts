import { expect, test } from "@playwright/test";

/**
 * [C-N29 2026-09-10 员工C] wechat-rag 3333 SSO 9 步真实浏览器闭环（3 用例）。
 *
 * 前置（已由管理者固化并归档 §10.6.16）：oidc_clients.wechat-rag.redirect_uris
 * = [https://wechat-rag.aidean.local/auth/aidean/callback,
 *    http://localhost:3333/auth/aidean/callback]（text[] 2 条）；
 * check-tables 6/6 non0:22 true。
 *
 * 真实链路（后端驱动）：
 * ① 3333 GET /api/v1/auth/login → 302 authorize（后端生成 state，redirect_uri 绑定
 *    https://wechat-rag.aidean.local）
 * ② 主平台 authorize 未登录 → 307 /login（302 Location 的 host.docker.internal 在宿主
 *    浏览器 502，故分段提取 Location 替换主机为 localhost:3000 后 goto）
 * ③ 邮箱登录（真实浏览器，Secure Cookie 生效）
 * ④ 登录后回跳 authorize → 307 白名单域名：该 https 域名宿主不可解析（TLS 建连被 RESET，
 *    且 page.route 对该顶层导航不可靠），故在登录提交前注册 authorize 响应拦截——
 *    route.fetch(maxRedirects:0) 取 307 Location（含 code），改写域名后以 302 fulfill，
 *    redirect_uri 绑定不变（code 兑换不 10003）
 * ⑤ 3333 callback?code&state → callback 页转发 /api/v1/auth/callback 兑换 → 会话 cookie
 *    → 3333 站内页 → /auth/me 200。
 *
 * 铁律：登录 Cookie 带 Secure，必须真实浏览器上下文；code 单次；全程无 3334。
 */

const SSO_ENTRY = "http://localhost:3333/api/v1/auth/login";
const ADMIN = { email: "admin@aidean.com", password: "Admin123!@#" };
const LOCAL_CALLBACK = "http://localhost:3333/auth/aidean/callback";

/** 登录提交前注册：authorize 307 → Location 改写（0.0.0.0→localhost；白名单域名→3333）。 */
async function interceptAuthorizeRedirect(page: import("@playwright/test").Page) {
  await page.route("**/oauth/authorize*", async (route) => {
    try {
      const resp = await route.fetch({ maxRedirects: 0 });
      let loc = resp.headers()["location"] || "";
      loc = loc.replace("http://0.0.0.0:3000", "http://localhost:3000");
      if (loc.includes("wechat-rag.aidean.local")) {
        loc = loc.replace("https://wechat-rag.aidean.local", "http://localhost:3333");
        return void route.fulfill({ status: 302, headers: { location: loc } });
      }
      return void route.fulfill({ status: resp.status(), headers: { location: loc } });
    } catch {
      return void route.continue();
    }
  });
}

/** 真实 9 步（分段导航）：返回落地后的 callback URL（含已消费 code）。 */
async function fullSsoFlow(page: import("@playwright/test").Page): Promise<string> {
  // 拦截器必须在首次 goto 前注册（已验证可通的做法）：覆盖未登录 307（0.0.0.0→localhost）
  // 与登录后二次 authorize（白名单域名→3333）两次响应
  await interceptAuthorizeRedirect(page);

  // ① 3333 发起（API 上下文取 302 Location；浏览器侧无 host.docker.internal 依赖）
  const entry = await page.request.get(SSO_ENTRY, { maxRedirects: 0 });
  expect(entry.status()).toBe(302);
  const authorizeUrlRaw = entry.headers()["location"];
  expect(authorizeUrlRaw).toContain("/oauth/authorize");
  expect(authorizeUrlRaw).toContain("state=");

  // ② 分段导航到主平台 authorize（主机替换 host.docker.internal→localhost）→ 307 /login
  const authorizeUrl = authorizeUrlRaw.replace(
    "http://host.docker.internal:3000",
    "http://localhost:3000"
  );
  await page.goto(authorizeUrl);
  await page.waitForURL(/\/login\?redirect=/, { timeout: 30_000 });

  // ③ 登录提交（真实浏览器，Secure Cookie 生效）
  await page.locator('input[type="email"]').first().fill(ADMIN.email);
  await page.locator('input[type="password"]').first().fill(ADMIN.password);
  await page.locator('button[type="submit"], button:has-text("登录")').first().click();

  // ④ 登录后回跳 authorize → 拦截改写 → 3333 callback?code&state
  await page.waitForURL(/auth\/aidean\/callback\?code=/, { timeout: 30_000 });
  const callbackUrl = page.url();
  expect(callbackUrl).toContain(LOCAL_CALLBACK);
  expect(callbackUrl).not.toContain(":3334");

  // ⑤ callback 页页内消费 code（GET /api/v1/auth/callback 种会话 cookie）——
  //    实测页面停留原 URL 不跳转，故以 /auth/me 轮询（≤15s）确认会话建立
  const deadline = Date.now() + 15_000;
  let meStatus = 0;
  while (Date.now() < deadline) {
    meStatus = (await page.request.get("http://localhost:3333/api/v1/auth/me")).status();
    if (meStatus === 200) break;
    await page.waitForTimeout(1000);
  }
  expect(meStatus, "callback 兑换后 3333 /auth/me 应 200").toBe(200);
  return callbackUrl;
}

test.describe("sso-3333", () => {
  test("[a] 已登录会话 GET /oauth/authorize → 307 Location 3333 callback 含 code+state", async ({
    page,
  }) => {
    const login = await page.request.post("/api/v1/auth/login", { data: ADMIN });
    expect(login.status()).toBe(200);

    const resp = await page.request.get(
      "/oauth/authorize?response_type=code&client_id=wechat-rag&redirect_uri=http%3A%2F%2Flocalhost%3A3333%2Fauth%2Faidean%2Fcallback&scope=openid&state=ssoE2E3333",
      { maxRedirects: 0 }
    );
    expect(resp.status()).toBe(307);
    const loc = resp.headers()["location"] || "";
    expect(loc).toContain("http://localhost:3333/auth/aidean/callback");
    expect(loc).toContain("code=");
    expect(loc).toContain("state=ssoE2E3333");
    expect(loc).not.toContain(":3334");
  });

  test("[b] 真实浏览器 9 步：3333 发起 → 主平台登录 → callback 兑换 → 会话落地 3333", async ({
    page,
  }) => {
    await fullSsoFlow(page);
    // 落地页正常渲染（非错误壳）
    await expect(page.locator("body")).not.toContainText("授权失败");
    await expect(page.locator("body")).not.toContainText("登录失败");
  });

  test("[c] 3333 /auth/me 200 + code 单次重放不 500 + 会话保持 + 无 3334", async ({
    page,
  }) => {
    const callbackUrl = await fullSsoFlow(page);

    // 3333 会话已建立：/auth/me 200（Secure Cookie 真实浏览器上下文回传）
    const me = await page.request.get("http://localhost:3333/api/v1/auth/me");
    expect(me.status()).toBe(200);
    const body = await me.json();
    expect(body.data?.user?.email).toBe(ADMIN.email);

    // code 单次：重放已消费的 callback URL → 允许 200（错误语义页）/302/307，禁止 500
    const replay = await page.request.get(callbackUrl, { maxRedirects: 0 });
    expect(replay.status()).not.toBe(500);

    // 会话未被破坏：me 仍 200
    const me2 = await page.request.get("http://localhost:3333/api/v1/auth/me");
    expect(me2.status()).toBe(200);
  });
});

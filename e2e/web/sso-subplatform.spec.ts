import { expect, test } from "@playwright/test";

/**
 * [T120-03 2026-10-23 外部助手] 子平台 SSO 九步真实浏览器闭环（3 用例）。由本目录
 * 旧版 sso 用例（文件名以已退役子平台端口命名，git mv 至此）迁移而来：原文件把该端口写死在
 * 断言里，而 P-1/P-2=A 裁决「旧端口不保留、子平台落 3200」已落到 seed
 * （seed.ts:365 wechat-rag.redirectUris = [https://wechat-rag.aidean.local/…, http://localhost:3200/…]），
 * 旧端口既不在白名单、本机也无服务 → 三条用例分别 400 / ECONNREFUSED。
 *
 * 本卡 Step 4 口径：子平台基址改为「读 seed 的子平台回调」= http://localhost:3200，
 * 并允许用 E2E_SSO_SUBPLATFORM_URL 覆盖（真实联调时指向实际子平台）。
 *
 * 门控（不再连死端口）：
 *   ① [a] 只打主平台 /oauth/authorize，不依赖子平台在线 → 恒跑（白名单命中 → 307 带 code）；
 *   ② [b]/[c] 的九步闭环要求子平台前端 callback 页与子平台后端 /api/v1/auth/* 真实存在
 *      （由子平台仓实现，不在本仓）→ beforeAll 探活，不可达即 skip 并注明原因。
 *
 * 真实链路（后端驱动，与 C-N29 一致，仅主机与端口由变量注入）：
 * ① 子平台 GET /api/v1/auth/login → 302 authorize（后端生成 state，redirect_uri 绑定白名单域名）
 * ② 主平台 authorize 未登录 → 307 /login（302 Location 的 host.docker.internal 在宿主 502，
 *    故分段提取 Location 替换主机为 localhost:3000 后 goto）
 * ③ 邮箱登录（真实浏览器，Secure Cookie 生效）
 * ④ 登录后回跳 authorize → 307 白名单域名：该 https 域名宿主不可解析（TLS 建连被 RESET，
 *    且 page.route 对该顶层导航不可靠），故在登录提交前注册 authorize 响应拦截——
 *    route.fetch(maxRedirects:0) 取 307 Location（含 code），改写域名后以 302 fulfill，
 *    redirect_uri 绑定不变（code 兑换不 10003）
 * ⑤ 子平台 callback?code&state → callback 页转发 /api/v1/auth/callback 兑换 → 会话 cookie
 *    → 子平台站内页 → /auth/me 200。
 *
 * 铁律：登录 Cookie 带 Secure，必须真实浏览器上下文；code 单次；全程不得落到历史遗留的 3334。
 */

const SUB_BASE = (process.env.E2E_SSO_SUBPLATFORM_URL ?? "http://localhost:3200").replace(/\/+$/, "");
const SSO_ENTRY = `${SUB_BASE}/api/v1/auth/login`;
const SUB_CALLBACK = `${SUB_BASE}/auth/aidean/callback`;
const WHITELIST_ORIGIN = "https://wechat-rag.aidean.local";
const ADMIN = { email: "admin@aidean.com", password: "Admin123!@#" };
const STATE = "ssoE2ESub";

/** 子平台是否在线：任一 HTTP 响应即视为在线，连接被拒/超时视为离线。 */
let subReachable = false;

test.beforeAll(async () => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 3_000);
  try {
    await fetch(SSO_ENTRY, { redirect: "manual", signal: ac.signal });
    subReachable = true;
  } catch {
    subReachable = false;
  } finally {
    clearTimeout(timer);
  }
});

/** [b]/[c] 的 skip 原因（子平台离线时逐条列出，见 EVD-T120-03）。 */
const SUB_OFFLINE = `子平台未在线：${SSO_ENTRY} 探活失败——九步闭环需子平台前端 callback 页与子平台后端 /api/v1/auth/*（非本仓实现）。可用 E2E_SSO_SUBPLATFORM_URL 注入真实地址。`;

/** 登录提交前注册：authorize 307 → Location 改写（0.0.0.0→localhost；白名单域名→子平台基址）。 */
async function interceptAuthorizeRedirect(page: import("@playwright/test").Page) {
  await page.route("**/oauth/authorize*", async (route) => {
    try {
      const resp = await route.fetch({ maxRedirects: 0 });
      let loc = resp.headers()["location"] || "";
      loc = loc.replace("http://0.0.0.0:3000", "http://localhost:3000");
      if (loc.includes(WHITELIST_ORIGIN)) {
        loc = loc.replace(WHITELIST_ORIGIN, SUB_BASE);
        return void route.fulfill({ status: 302, headers: { location: loc } });
      }
      return void route.fulfill({ status: resp.status(), headers: { location: loc } });
    } catch {
      return void route.continue();
    }
  });
}

/** 真实九步（分段导航）：返回落地后的 callback URL（含已消费 code）。 */
async function fullSsoFlow(page: import("@playwright/test").Page): Promise<string> {
  // 拦截器必须在首次 goto 前注册（已验证可通的做法）：覆盖未登录 307（0.0.0.0→localhost）
  // 与登录后二次 authorize（白名单域名→子平台基址）两次响应
  await interceptAuthorizeRedirect(page);

  // ① 子平台发起（API 上下文取 302 Location；浏览器侧无 host.docker.internal 依赖）
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

  // ④ 登录后回跳 authorize → 拦截改写 → 子平台 callback?code&state
  await page.waitForURL(/auth\/aidean\/callback\?code=/, { timeout: 30_000 });
  const callbackUrl = page.url();
  expect(callbackUrl).toContain(SUB_CALLBACK);
  expect(callbackUrl).not.toContain(":3334");

  // ⑤ callback 页页内消费 code（GET /api/v1/auth/callback 种会话 cookie）——
  //    实测页面停留原 URL 不跳转，故以 /auth/me 轮询（≤15s）确认会话建立
  const deadline = Date.now() + 15_000;
  let meStatus = 0;
  while (Date.now() < deadline) {
    meStatus = (await page.request.get(`${SUB_BASE}/api/v1/auth/me`)).status();
    if (meStatus === 200) break;
    await page.waitForTimeout(1000);
  }
  expect(meStatus, "callback 兑换后子平台 /auth/me 应 200").toBe(200);
  return callbackUrl;
}

test.describe("sso-subplatform", () => {
  test("[a] 已登录会话 GET /oauth/authorize → 307 Location 子平台 callback 含 code+state", async ({
    page,
  }) => {
    const login = await page.request.post("/api/v1/auth/login", { data: ADMIN });
    expect(login.status()).toBe(200);

    const resp = await page.request.get(
      `/oauth/authorize?response_type=code&client_id=wechat-rag&redirect_uri=${encodeURIComponent(SUB_CALLBACK)}&scope=openid&state=${STATE}`,
      { maxRedirects: 0 }
    );
    expect(resp.status()).toBe(307);
    const loc = resp.headers()["location"] || "";
    expect(loc).toContain(SUB_CALLBACK);
    expect(loc).toContain("code=");
    expect(loc).toContain(`state=${STATE}`);
    expect(loc).not.toContain(":3334");
  });

  test("[b] 真实浏览器九步：子平台发起 → 主平台登录 → callback 兑换 → 会话落地子平台", async ({
    page,
  }) => {
    test.skip(!subReachable, SUB_OFFLINE);
    await fullSsoFlow(page);
    // 落地页正常渲染（非错误壳）
    await expect(page.locator("body")).not.toContainText("授权失败");
    await expect(page.locator("body")).not.toContainText("登录失败");
  });

  test("[c] 子平台 /auth/me 200 + code 单次重放不 500 + 会话保持 + 无 3334", async ({
    page,
  }) => {
    test.skip(!subReachable, SUB_OFFLINE);
    const callbackUrl = await fullSsoFlow(page);

    // 子平台会话已建立：/auth/me 200（Secure Cookie 真实浏览器上下文回传）
    const me = await page.request.get(`${SUB_BASE}/api/v1/auth/me`);
    expect(me.status()).toBe(200);
    const body = await me.json();
    expect(body.data?.user?.email).toBe(ADMIN.email);

    // code 单次：重放已消费的 callback URL → 允许 200（错误语义页）/302/307，禁止 500
    const replay = await page.request.get(callbackUrl, { maxRedirects: 0 });
    expect(replay.status()).not.toBe(500);

    // 会话未被破坏：me 仍 200
    const me2 = await page.request.get(`${SUB_BASE}/api/v1/auth/me`);
    expect(me2.status()).toBe(200);
  });
});

import { expect, test } from "@playwright/test";

/**
 * G6 契约 e2e：平台 API Key 网关鉴权（GW-KEY-01）。
 *
 * 状态（RW-3 2026-09-16）：契约先行 → **已并入真实执行**，9 例全绿。
 *    执行前置已兑现：① 三组路由 6 操作在工作树（RW-2 补齐并确权）；②③ 经理集成轮
 *    standalone 重建、3000 单监听指向新 BUILD。运行：`pnpm test:e2e`（子配置 dev webServer
 *    复用）或对活体 3000 直接跑。
 *    RW-3 解阻三例：G5（permissions 直接经 API 造 ["other:perm"] Key）、G6（限流维度
 *    确权为 Key：`rl:apikey:<keyId>:min`，用 rpm=2 小阈值确定性触发）、G7（种子夹具
 *    「网关E2E自有Key站」入 prisma/seed.ts §3.9，零余额新注册用户直证免扣）。
 *
 * 契约源（只读，勿改）：
 *   - docs/architecture/API接口文档.md §5.4（GW-KEY-01 行 ×3 + 销账段）
 *   - apps/web/app/api/v1/gateway/chat/route.ts（x-aidean-* 计费事实头）
 *   - apps/web/lib/features/apikey/guard.ts（双通道主体判定顺序 401→403→429→免 cookie）
 *   - apps/web/lib/features/apikey/service.ts（authenticateApiKey / enforceKeyRateLimit / parseCreateKeyInput）
 *
 * 纪律：
 *   - 文本断言一律 { exact: true }（避免 strict mode violation）；
 *   - 断言颜色/主题用 computed 值（不读 data-theme）；
 *   - 视口 1280×800（ThemeSwitcher 与桌面态判据）；
 *   - 一律 web-first 断言（expect(locator)），不用裸 sleep；
 *   - 依赖种子的用例标 @serial（限流窗 20/600s，连续登录会 429 级联）；
 *   - 不硬编码 3000 / BUILD_ID —— baseURL 走 config 的 E2E_BASE_URL。
 *
 * 7 组断言：
 *   G1 签发：POST 创建 → 200 返回明文（aid_ak_<16hex>_<43char>）且仅此一次；GET 脱敏不回明文/hash
 *   G2 Bearer 通道：Authorization: Bearer aid_ak_… → 200 + x-aidean-billing-path=PLATFORM
 *   G3 x-api-key 通道：Anthropic 形态 x-api-key → 200（同主体）
 *   G4 无效凭据：伪造 / 已吊销 / 不存在的 id 吊销 → 401 code=10004 / 40000
 *   G5 越权：permissions 不含 gateway:chat → 403 code=10008（403 优先于限流）
 *   G6 限流：Key 级固定窗口（rl:apikey:<keyId>:min）超限 → 429 code=10006；他 Key 不受影响
 *   G7 自有渠道 UPSTREAM：录入 station-key 命中 → x-aidean-billing-path=UPSTREAM + 零余额钱包逐分不变
 */

const SEED_USER = { email: "test@aidean.com", password: "Test123!@#" };

const envelope = (body: { code: number }) => expect(body.code).toBe(0);

/** 创建请求体（真契约：permissions 必填非空数组，见 apikey/service.parseCreateKeyInput 与 ApiKeysPanel） */
const createBody = (name: string) => ({ name, permissions: ["gateway:chat"] });

test.describe("g6-openapi-keys 平台 API Key 网关鉴权（GW-KEY-01）", () => {
  // ── G1 签发与脱敏 ────────────────────────────────────────────────
  test.describe("G1 签发：明文仅一次、列表恒脱敏", () => {
    test("@serial 创建返回 aid_ak_ 明文，后续列表不含明文/哈希", async ({ request }) => {
      // 前置：已登录（cookie 走 request 上下文）
      await request.post("/api/v1/auth/login", { data: SEED_USER });

      const create = await request.post("/api/v1/user/api-keys", {
        data: createBody(`e2e-openapi-${Date.now()}`),
      });
      expect(create.status()).toBe(200);
      const created = await create.json();
      envelope(created);

      // 形态契约：aid_ak_<16hex>_<43char>；视图在 data.item（含 id/keyId）
      const plaintext = created.data.plaintext as string;
      expect(plaintext).toMatch(/^aid_ak_[0-9a-f]{16}_[A-Za-z0-9_-]{43}$/);
      const keyId = created.data.item.keyId as string;
      expect(keyId).toBeTruthy();

      // 列表脱敏：绝不回明文，也不回哈希（真契约：data.items）
      const list = await request.get("/api/v1/user/api-keys");
      expect(list.status()).toBe(200);
      const listBody = await list.json();
      envelope(listBody);
      const text = JSON.stringify(listBody);
      expect(text).not.toContain(plaintext);
      expect(listBody.data.items.some((k: { keyId: string }) => k.keyId === keyId)).toBe(true);
      for (const k of listBody.data.items as Array<Record<string, unknown>>) {
        expect(k).toHaveProperty("permissions");
        expect(k).toHaveProperty("rateLimit");
        expect(k).not.toHaveProperty("hash");
        expect(k).not.toHaveProperty("secret");
        expect(k).not.toHaveProperty("keyHash");
        // 明文键名不得出现
        expect(k).not.toHaveProperty("plaintext");
      }
    });
  });

  // ── G2 Bearer（OpenAI SDK 形态） ────────────────────────────────
  test.describe("G2 Bearer 通道：Authorization 头鉴权", () => {
    test("@serial Bearer aid_ak_… → 200 且 billing-path=PLATFORM", async ({ request }) => {
      await request.post("/api/v1/auth/login", { data: SEED_USER });
      const created = await (await request.post("/api/v1/user/api-keys", {
        data: createBody(`e2e-bearer-${Date.now()}`),
      })).json();

      const res = await request.post("/api/v1/gateway/chat", {
        headers: { Authorization: `Bearer ${created.data.plaintext}` },
        data: {
          model: "claude-3-7-sonnet",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 16,
        },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ object: "chat.completion" });
      // API Key 路径默认平台计费（未见 station-key 命中）
      expect(res.headers()["x-aidean-billing-path"]).toBe("PLATFORM");
      expect(res.headers()["x-aidean-quota-minor"]).toBeTruthy();
    });
  });

  // ── G3 x-api-key（Anthropic SDK 形态） ──────────────────────────
  test.describe("G3 x-api-key 通道：同主体等价", () => {
    test("@serial x-api-key aid_ak_… → 200", async ({ request }) => {
      await request.post("/api/v1/auth/login", { data: SEED_USER });
      const created = await (await request.post("/api/v1/user/api-keys", {
        data: createBody(`e2e-xkey-${Date.now()}`),
      })).json();

      const res = await request.post("/api/v1/gateway/chat", {
        headers: { "x-api-key": created.data.plaintext as string },
        data: {
          model: "claude-3-7-sonnet",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 16,
        },
      });
      expect(res.status()).toBe(200);
    });
  });

  // ── G4 无效凭据 401/10004 ───────────────────────────────────────
  test.describe("G4 无效凭据：401 / code 10004", () => {
    test("伪造 Key → 401 10004（且不回退 cookie）", async ({ request }) => {
      const res = await request.post("/api/v1/gateway/chat", {
        headers: { Authorization: "Bearer aid_ak_0000000000000000_FAKEfakeFAKEfakeFAKEfakeFAKEfakeFAKEfake1" },
        data: { model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }] },
      });
      expect(res.status()).toBe(401);
      expect((await res.json()).code).toBe(10004);
    });

    test("@serial 已吊销 Key → 401 10004", async ({ request }) => {
      await request.post("/api/v1/auth/login", { data: SEED_USER });
      const created = await (await request.post("/api/v1/user/api-keys", {
        data: createBody(`e2e-revoke-${Date.now()}`),
      })).json();
      const id = created.data.item.id as string; // 真契约：DELETE 按行 id（uuid），非 keyId

      const del = await request.delete(`/api/v1/user/api-keys/${id}`);
      expect(del.status()).toBe(200);

      const res = await request.post("/api/v1/gateway/chat", {
        headers: { Authorization: `Bearer ${created.data.plaintext}` },
        data: { model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }] },
      });
      expect(res.status()).toBe(401);
      expect((await res.json()).code).toBe(10004);
    });

    test("@serial 不存在的 id 吊销 → 40000（0 行）", async ({ request }) => {
      await request.post("/api/v1/auth/login", { data: SEED_USER });
      const del = await request.delete("/api/v1/user/api-keys/00000000-0000-0000-0000-000000000000");
      expect(del.status()).toBe(400);
      expect((await del.json()).code).toBe(40000);
    });
  });

  // ── G5 越权 403/10008 ───────────────────────────────────────────
  test.describe("G5 permissions 不足：403", () => {
    test("@serial permissions 不含 gateway:chat → 403 code=10008（且 403 优先于 429）", async ({ request }) => {
      // RW-3 解阻：创建端点本就接受任意 permissions（非空字符串数组 ≤16），
      // 故「无 gateway:chat 的 Key」可直接经 API 造出，无需数据侧夹具。
      await request.post("/api/v1/auth/login", { data: SEED_USER });
      const created = await (await request.post("/api/v1/user/api-keys", {
        data: { name: `e2e-noperm-${Date.now()}`, permissions: ["other:perm"] },
      })).json();
      expect(created.data.plaintext).toBeTruthy();

      const res = await request.post("/api/v1/gateway/chat", {
        headers: { Authorization: `Bearer ${created.data.plaintext}` },
        data: { model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }] },
      });
      expect(res.status()).toBe(403);
      expect((await res.json()).code).toBe(10008);
    });
  });

  // ── G6 限流 429/10006 ───────────────────────────────────────────
  test.describe("G6 频率限制：429", () => {
    test("@serial Key 级固定窗口超限 → 429 code=10006", async ({ request }) => {
      // RW-3 定论（阈值口径已确权）：限流键 = `rl:apikey:<keyId>:min`（60s 固定窗口，
      // apikey/service.enforceKeyRateLimit），**按 Key 维度**而非 IP；rateLimit.requestsPerMinute
      // 创建时可覆盖缺省 60。故本用例用 rpm=2 的专用 Key 连打 3 次即确定性触发——
      // 既不必打满 61 次（省 1 分钟与 59 次上游调用），也正向证明计数维度是 Key
      // （同一用户其它 Key 不受影响）。前置：Redis 可达（不可用时 checkFixedWindow fail-open）。
      await request.post("/api/v1/auth/login", { data: SEED_USER });
      const created = await (await request.post("/api/v1/user/api-keys", {
        data: { name: `e2e-ratelimit-${Date.now()}`, permissions: ["gateway:chat"], rateLimit: { requestsPerMinute: 2 } },
      })).json();
      const header = { Authorization: `Bearer ${created.data.plaintext}` };
      const body = { model: "claude-3-7-sonnet", messages: [{ role: "user", content: "x" }], max_tokens: 1 };

      expect((await request.post("/api/v1/gateway/chat", { headers: header, data: body })).status()).toBe(200);
      expect((await request.post("/api/v1/gateway/chat", { headers: header, data: body })).status()).toBe(200);
      const third = await request.post("/api/v1/gateway/chat", { headers: header, data: body });
      expect(third.status()).toBe(429);
      expect((await third.json()).code).toBe(10006);

      // 维度取证：同用户另一把缺省 rpm=60 的 Key 不受该窗口影响（Key 维度而非 IP 维度）
      const other = await (await request.post("/api/v1/user/api-keys", {
        data: createBody(`e2e-ratelimit-peer-${Date.now()}`),
      })).json();
      const peer = await request.post("/api/v1/gateway/chat", {
        headers: { Authorization: `Bearer ${other.data.plaintext}` },
        data: body,
      });
      expect(peer.status()).toBe(200);
    });
  });

  // ── G7 自有渠道 UPSTREAM 计费路径 ───────────────────────────────
  test.describe("G7 UPSTREAM：自有 Key 命中免扣平台余额", () => {
    test("@serial 录入 station-key → 命中 → billing-path=UPSTREAM 且钱包零变化", async ({ request }) => {
      // RW-3 解阻：种子站点夹具已就位（prisma/seed.ts §3.9「网关E2E自有Key站」
      // billingMode=UPSTREAM、rating 9.95 居首、baseUrl 指向本地 mock 上游、models 含 Claude 3.7 Sonnet）。
      // stationId 经公开面 /api/v1/models/{slug}/stations 发现（不硬编码 uuid、不直连 DB）。
      //
      // 刻意用**零余额**新注册用户：UPSTREAM 命中路径不 hold/capture——若误走 PLATFORM，
      // 0 余额必然 40001 降级 → 30003 失败；因此「200 + UPSTREAM + 余额仍 0」三连本身就是
      // 免扣平台余额的最强证据（也避免污染种子用户——station_user_keys 按 userId 维度生效）。
      const email = `g7-up-${Date.now()}@aidean.test`;
      const reg = await request.post("/api/v1/auth/register", {
        data: { email, password: "Upstream#2026", nickname: "G7自有Key" },
      });
      expect(reg.status()).toBe(200); // register 即种会话 Cookie

      const w0 = (await (await request.get("/api/v1/billing/wallet")).json()).data;
      expect(Number(w0.balanceYuan)).toBe(0);

      const stations = (
        await (await request.get("/api/v1/models/claude-3-7-sonnet/stations")).json()
      ).data.items as Array<{ stationId: string; name: string }>;
      const upstreamStation = stations.find((s) => s.name === "网关E2E自有Key站");
      expect(upstreamStation).toBeTruthy();

      const saved = await request.post("/api/v1/user/station-keys", {
        data: { stationId: upstreamStation!.stationId, apiKey: "sk-e2e-user-owned-0123456789", name: "e2e" },
      });
      expect(saved.status()).toBe(200);
      expect(JSON.stringify(await saved.json())).not.toContain("sk-e2e-user-owned-0123456789"); // 明文回显红线

      const hit = await request.post("/api/v1/gateway/chat", {
        data: { model: "claude-3-7-sonnet", messages: [{ role: "user", content: "ping" }], max_tokens: 16 },
      });
      expect(hit.status()).toBe(200);
      expect(hit.headers()["x-aidean-billing-path"]).toBe("UPSTREAM");
      expect(hit.headers()["x-aidean-quota-minor"]).toBe("0");

      const w1 = (await (await request.get("/api/v1/billing/wallet")).json()).data;
      expect(Number(w1.balanceYuan)).toBe(0); // 逐分不变
      expect(Number(w1.heldYuan)).toBe(0); // 无悬浮冻结

      // 清理：删自有 Key（防重跑间状态漂移；DELETE 按 stationId）
      const del = await request.delete("/api/v1/user/station-keys", {
        data: { stationId: upstreamStation!.stationId },
      });
      expect(del.status()).toBe(200);
    });
  });
});

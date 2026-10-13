import { expect, test } from "@playwright/test";

/**
 * Task G.5.1 e2e gateway-flow：MVP 统一计费网关端到端收口。
 *
 * 数据前提（seed 3.9 幂等块，isVerified=false 不进公开榜单）：
 *   - 网关E2E故障站 rating 9.9：baseUrl 指向永不可达端口 → 预扣后上游失败 voidHold + 换站降级
 *   - 网关E2E Mock站  rating 9.8：baseUrl 指向本地 catch-all mock 上游（AIDEAN_ENABLE_MOCK_UPSTREAM=1）
 *   - 两站 models 含 seed 模型 "Claude 3.7 Sonnet"（nameDisplay），modelCode=claude-3-7-sonnet（¥15/$75 每百万）
 *
 * 链路断言：
 *   1 未登录 401/10004
 *   2 注册 → 充值 55.00 → mock-pay 入账
 *   3 网关调用（OpenAI 格式）→ 200 直通响应 + x-aidean-* 计费事实头（PLATFORM）
 *     （链内验证：故障站 30004 → void 零账面副作用 → Mock 站按实捕获）
 *   4 usage 取证：1 条 PLATFORM，tokens/quota 与响应头一致
 *   5 钱包：balance = 55 − 实扣；available = balance（预扣全额释放，held=0）
 *   6 流水：TOPUP 55 + CONSUME 实扣（DEBIT）
 *   7 同 requestId 重放 → 40000 且余额/流水零变化
 */

const envelope = (body: { code: number }) => expect(body.code).toBe(0);

test.describe("gateway-flow", () => {
  test("未调用网关前未登录 → 401/10004", async ({ request }) => {
    const res = await request.post("/api/v1/gateway/chat", {
      data: { model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }] },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).code).toBe(10004);
  });

  test("充值→网关调用（故障降级→mock 成功）→按实扣费→usage/流水→重放幂等", async ({ request }) => {
    const stamp = Date.now();
    const email = `gateway-e2e-${stamp}@aidean.test`;

    // ---- 1 注册 + 充值 55.00 ----
    const reg = await request.post("/api/v1/auth/register", {
      data: { email, password: "GatewayE2e#2026", nickname: "网关E2E" },
    });
    expect(reg.status()).toBe(200);
    envelope(await reg.json());

    const create = await request.post("/api/v1/billing/recharge-orders", {
      data: { tierId: "basic", payMethod: "WECHAT" },
    });
    expect(create.status()).toBe(200);
    const orderId = (await create.json()).data.order.id as string;
    const pay = await request.post(`/api/v1/billing/recharge-orders/${orderId}/mock-pay`);
    expect(pay.status()).toBe(200);
    envelope(await pay.json());

    const wallet0 = await (await request.get("/api/v1/billing/wallet")).json();
    expect(wallet0.data.balanceYuan).toBe("55.00");

    // ---- 2 网关调用（OpenAI 格式；输入 ~1.4K chars → prompt≈350 tokens）----
    const promptText = "aidean".repeat(240); // 1440 chars
    const requestId = `e2e-gw-${stamp}`;
    const chat = await request.post("/api/v1/gateway/chat", {
      headers: { "x-request-id": requestId },
      data: {
        model: "claude-3-7-sonnet",
        messages: [{ role: "user", content: promptText }],
        max_tokens: 64,
      },
    });
    expect(chat.status()).toBe(200);
    const chatBody = await chat.json();
    // 入口同格式直通（OpenAI 形状，无统一信封）
    expect(chatBody).toMatchObject({ object: "chat.completion" });
    expect(chatBody.choices[0].message.role).toBe("assistant");
    // 计费事实头：平台路径 + 实扣分值；requestId 透传闭环
    expect(chat.headers()["x-request-id"]).toBe(requestId);
    const billingPath = chat.headers()["x-aidean-billing-path"];
    expect(billingPath).toBe("PLATFORM");
    const quotaMinor = Number(chat.headers()["x-aidean-quota-minor"]);
    expect(quotaMinor).toBeGreaterThan(0);
    expect(chat.headers()["x-aidean-model-id"]).toBeTruthy();
    expect(chat.headers()["x-aidean-station-id"]).toBeTruthy();

    // ---- 3 usage 取证：1 条 PLATFORM，金额/模型与响应头一致 ----
    const usage = await (await request.get("/api/v1/user/usage?page=1&pageSize=20")).json();
    envelope(usage);
    expect(usage.data.total).toBe(1);
    const item = usage.data.items[0];
    expect(item).toMatchObject({
      model: "claude-3-7-sonnet",
      billingPath: "PLATFORM",
      stationName: "网关E2E Mock站", // 故障站失败不落成功记录，最终成功站为 Mock
    });
    expect(item.promptTokens).toBeGreaterThan(0);
    expect(Number(item.quotaYuan) * 100).toBe(quotaMinor);

    // ---- 4 钱包：balance = 55 − 实扣；预扣全额释放（held=0）----
    const wallet = await (await request.get("/api/v1/billing/wallet")).json();
    envelope(wallet);
    const expectedBalance = 55 - quotaMinor / 100;
    expect(Number(wallet.data.balanceYuan)).toBeCloseTo(expectedBalance, 6);
    expect(Number(wallet.data.availableYuan)).toBeCloseTo(expectedBalance, 6);
    expect(Number(wallet.data.heldYuan)).toBe(0);

    // ---- 5 流水：TOPUP 55 + CONSUME 实扣 ----
    const ledger = await (await request.get("/api/v1/billing/ledger?page=1&pageSize=20")).json();
    envelope(ledger);
    const entries = ledger.data.groups.flatMap((g: { entries: Array<{ entryType: string; amountYuan: string; direction: string }> }) => g.entries);
    const topup = entries.find((e) => e.entryType === "TOPUP");
    expect(topup).toMatchObject({ direction: "CREDIT", amountYuan: "55.00" });
    const consume = entries.find((e) => e.entryType === "CONSUME");
    expect(consume).toBeTruthy();
    expect(consume.direction).toBe("DEBIT");
    expect(Number(consume.amountYuan) * 100).toBe(quotaMinor);

    // ---- 6 同 requestId 重放 → 40000 且账面零变化 ----
    const replay = await request.post("/api/v1/gateway/chat", {
      headers: { "x-request-id": requestId },
      data: {
        model: "claude-3-7-sonnet",
        messages: [{ role: "user", content: "replay" }],
        max_tokens: 8,
      },
    });
    expect(replay.status()).toBe(400);
    expect((await replay.json()).code).toBe(40000);

    const walletFinal = await (await request.get("/api/v1/billing/wallet")).json();
    expect(Number(walletFinal.data.balanceYuan)).toBeCloseTo(expectedBalance, 6);
    const usageFinal = await (await request.get("/api/v1/user/usage")).json();
    expect(usageFinal.data.total).toBe(1);
  });
});

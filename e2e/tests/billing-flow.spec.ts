import { expect, test } from "@playwright/test";

/**
 * Task B.5.1 e2e billing-flow：注册 → mock 充值 → 钱包 → 流水 TOPUP → 幂等/验签 → 余额正确。
 *
 * 覆盖 HTTP 可达链路（ envelopes 契约见 shared/billing.schema.ts ）：
 *   1 注册种双令牌 Cookie（request fixture 自动持久化会话）
 *   2 钱包零态 → 下单（basic 55.00，PENDING）→ 错误验签 40005 零副作用
 *   3 dev mock-pay → PAID → TOPUP 入账 → 钱包 55.00 → 流水日期分组出现 TOPUP
 *   4 重复 mock-pay 幂等（不重复入账）→ 订单列表 PAID
 * hold 预扣/捕获无公开 HTTP 面（服务层能力，供 implement-gateway-module 消费），
 * 生命周期正确性由 billing.spec.ts 16 用例单测保障，网关 e2e 再验端到端路径。
 */

const envelope = (body: { code: number }) => expect(body.code).toBe(0);

test.describe("billing-flow", () => {
  test("未登录访问受保护财务接口 → 401/10004", async ({ request }) => {
    const res = await request.get("/api/v1/billing/wallet");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(10004);
  });

  test("注册→mock 充值→钱包→流水 TOPUP→幂等与验签→余额正确", async ({ request }) => {
    const stamp = Date.now();
    const email = `billing-e2e-${stamp}@aidean.test`;

    // ---- 1 注册（成功信封 + 自动种 Cookie）----
    const reg = await request.post("/api/v1/auth/register", {
      data: { email, password: "BillingE2e#2026", nickname: "计费E2E" },
    });
    expect(reg.status()).toBe(200);
    envelope(await reg.json());

    // ---- 2 钱包零态 ----
    const wallet0 = await (await request.get("/api/v1/billing/wallet")).json();
    envelope(wallet0);
    expect(wallet0.data).toMatchObject({
      balanceYuan: "0.00",
      heldYuan: "0.00",
      availableYuan: "0.00",
    });

    // ---- 3 下单：basic 档 55.00 → PENDING ----
    const create = await request.post("/api/v1/billing/recharge-orders", {
      data: { tierId: "basic", payMethod: "WECHAT" },
    });
    expect(create.status()).toBe(200);
    const created = await create.json();
    envelope(created);
    expect(created.data.order).toMatchObject({ status: "PENDING", totalYuan: "55.00" });
    expect(String(created.data.payment.payUrl)).toContain("mockOrderId=");
    const orderId = created.data.order.id as string;

    // ---- 4 错误验签回调 → 401/40005，订单与钱包零副作用 ----
    const badNotify = await request.post(`/api/v1/billing/recharge-orders/${orderId}/notify`, {
      data: { payMethod: "WECHAT", sign: "deadbeef" },
    });
    expect(badNotify.status()).toBe(401);
    expect((await badNotify.json()).code).toBe(40005);
    const walletAfterBad = await (await request.get("/api/v1/billing/wallet")).json();
    expect(walletAfterBad.data.balanceYuan).toBe("0.00");

    // ---- 5 dev mock 支付 → PAID 入账 ----
    const pay = await request.post(`/api/v1/billing/recharge-orders/${orderId}/mock-pay`);
    expect(pay.status()).toBe(200);
    const paid = await pay.json();
    envelope(paid);
    expect(paid.data).toMatchObject({ status: "PAID" });

    // ---- 6 钱包余额 55.00（available = balance − held）----
    const wallet = await (await request.get("/api/v1/billing/wallet")).json();
    envelope(wallet);
    expect(wallet.data.balanceYuan).toBe("55.00");
    expect(wallet.data.availableYuan).toBe("55.00");

    // ---- 7 流水：日期分组出现 TOPUP 55.00 ----
    const ledger = await (await request.get("/api/v1/billing/ledger?page=1&pageSize=20")).json();
    envelope(ledger);
    expect(ledger.data.total).toBe(1);
    const group = ledger.data.groups[0];
    expect(group.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(group.entries[0]).toMatchObject({
      entryType: "TOPUP",
      direction: "CREDIT",
      amountYuan: "55.00",
    });

    // ---- 8 重复 mock-pay 幂等：不重复入账 ----
    const repay = await request.post(`/api/v1/billing/recharge-orders/${orderId}/mock-pay`);
    expect(repay.status()).toBe(200);
    const repaid = await repay.json();
    envelope(repaid);
    expect(repaid.data).toMatchObject({ status: "PAID", idempotent: true });

    const walletFinal = await (await request.get("/api/v1/billing/wallet")).json();
    expect(walletFinal.data.balanceYuan).toBe("55.00");
    const ledgerFinal = await (await request.get("/api/v1/billing/ledger")).json();
    expect(ledgerFinal.data.total).toBe(1);

    // ---- 9 订单列表：PAID ----
    const orders = await (await request.get("/api/v1/billing/recharge-orders")).json();
    envelope(orders);
    const mine = orders.data.orders.find((o: { id: string }) => o.id === orderId);
    expect(mine).toMatchObject({ status: "PAID", totalYuan: "55.00" });
  });
});

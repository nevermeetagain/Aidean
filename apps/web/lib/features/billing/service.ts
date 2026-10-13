/**
 * billing 计费域 service：资金变动唯一编排入口（B.2.2）。
 *
 * 设计口径（spec 六 Requirement）：
 * - 双录记账：任何资金变动 = 1 条不可变 LedgerEntry + 乐观锁单点更新 Wallet 聚合列，同事务完成；
 * - 幂等：walletId+idempotencyKey 唯一兜底，重放返回首次结果（不重复入账、不报错）；
 * - hold 生命周期：authorized → captured（按实扣、差额解冻）/ voided / expired（懒清理）；
 * - 乐观锁冲突（count=0）以哨兵异常内联重试（3 次），耗尽后向上抛 50000。
 * 跨 feature 只能经 billingService 调用；wallet 域读侧委托见 features/wallet。
 */
import { randomUUID } from "node:crypto";
import { createHmac, timingSafeEqual } from "node:crypto";

import {
  HOLD_TTL_MINUTES,
  RECHARGE_TIERS,
  fenToYuan,
  type LedgerPage,
} from "@aidean/shared";

import {
  ApiError,
  ERROR_CODES,
} from "../../../app/api/v1/_lib/errors";
import {
  billingRepository,
  type EntryInput,
  type Tx,
  type WalletRow,
} from "./repository";

// ==================== 内部工具 ====================

/** 乐观锁冲突哨兵：withOptimisticRetry 捕获重试，外部不可见 */
class OptimisticConflict extends Error {
  constructor() {
    super("wallet optimistic lock conflict");
    this.name = "OptimisticConflict";
  }
}

/** 乐观锁内联重试（3 次）；耗尽后收敛为 50000（并发冲突属系统侧瞬时故障） */
async function withOptimisticRetry<T>(fn: (attempt: number) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (err instanceof OptimisticConflict) continue;
      throw err;
    }
  }
  if (lastErr instanceof OptimisticConflict) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包并发冲突，请稍后重试");
  }
  throw lastErr;
}

function assertAdjusted(count: number): void {
  if (count === 0) throw new OptimisticConflict();
}

function assertPositiveAmount(amountMinor: bigint, message: string): void {
  if (amountMinor <= 0n) throw new ApiError(ERROR_CODES.BAD_REQUEST, message);
}

function assertWalletUsable(wallet: WalletRow): void {
  if (wallet.status !== "ACTIVE") {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "钱包不可用（已冻结或注销）");
  }
}

/**
 * 事务内组合记账：幂等写分录 + 乐观锁同步钱包聚合列。
 * 返回 null 表示幂等命中（已存在同键分录，钱包聚合不重复更新）。
 */
async function postEntryInTx(
  tx: Tx,
  input: EntryInput
): Promise<{ idempotent: boolean; entryId: string | null }> {
  const wallet = await billingRepository.findWalletById(tx, input.walletId);
  if (!wallet) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包不存在");
  assertWalletUsable(wallet);

  // 扣减路径余额守卫（hold 捕获路径数学上已保证，此处防御性断言）
  if (input.direction === "DEBIT") {
    const after = wallet.balanceMinor - input.amountMinor;
    if (after < 0n) throw new ApiError(ERROR_CODES.INSUFFICIENT_BALANCE, "余额不足");
  }

  const adj =
    input.direction === "CREDIT"
      ? {
          balanceDelta: input.amountMinor,
          postedCreditsDelta: input.amountMinor,
        }
      : {
          balanceDelta: -input.amountMinor,
          postedDebitsDelta: input.amountMinor,
        };

  const entryId = await billingRepository.createEntryIfAbsent(tx, input);
  if (entryId === null) return { idempotent: true, entryId: null }; // 幂等命中：聚合不重复更新
  assertAdjusted(await billingRepository.adjustWallet(tx, input.walletId, wallet.lockVersion, adj));
  return { idempotent: false, entryId };
}

/** 懒清理：解冻并置 EXPIRED 该钱包全部过期 AUTHORIZED holds（写路径开头调用） */
async function expireOverdueInTx(tx: Tx, wallet: WalletRow): Promise<number> {
  const overdue = await billingRepository.listOverdueHolds(tx, wallet.id, new Date());
  for (const h of overdue) {
    assertAdjusted(
      await billingRepository.adjustWallet(tx, wallet.id, wallet.lockVersion, {
        heldDelta: -h.amountMinor,
      })
    );
    wallet.heldMinor -= h.amountMinor; // 同步内存 held：后续可用额判定须用解冻后口径（防误拒 40001）
    wallet.lockVersion += 1; // 本事务内版本已推进，供后续继续使用
    await billingRepository.updateHold(tx, h.id, { status: "EXPIRED" });
  }
  return overdue.length;
}

// ==================== 视图映射（纯函数，可测） ====================

/** 本地时区自然日 YYYY-MM-DD（'sv-SE' 区域即此格式） */
export function fmtLocalDate(d: Date): string {
  return d.toLocaleDateString("sv-SE");
}

type LedgerRowForView = {
  id: string;
  txnId: string;
  direction: "DEBIT" | "CREDIT";
  entryType: EntryInput["entryType"];
  status: string;
  amountMinor: bigint;
  sourceType: string | null;
  sourceId: string | null;
  effectiveAt: Date;
};

export function toLedgerEntryView(row: LedgerRowForView) {
  return {
    id: row.id,
    txnId: row.txnId,
    direction: row.direction,
    entryType: row.entryType,
    status: row.status,
    amountYuan: fenToYuan(row.amountMinor),
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    effectiveAt: row.effectiveAt.toISOString(),
  };
}

/** 按 effectiveAt 自然日倒序分组（入参须已按倒序排列；同日合并保持顺序） */
export function groupLedgerByDate(rows: LedgerRowForView[]) {
  const groups: { date: string; entries: ReturnType<typeof toLedgerEntryView>[] }[] = [];
  let current: { date: string; entries: ReturnType<typeof toLedgerEntryView>[] } | null = null;
  for (const row of rows) {
    const date = fmtLocalDate(row.effectiveAt);
    if (!current || current.date !== date) {
      current = { date, entries: [] };
      groups.push(current);
    }
    current.entries.push(toLedgerEntryView(row));
  }
  return groups;
}

// ==================== 支付渠道抽象（B.2.2：MVP 仅 dev mock，真实渠道只增适配器） ====================

export interface PayChannel {
  readonly name: string;
  /** 渠道回调验签：orderId 为业务订单号 */
  verifyNotify(orderId: string, sign: string): boolean;
  /** 创建支付参数（MVP mock 返回内部提示 URL） */
  createPayment(orderId: string, totalMinor: bigint): { payUrl: string };
}

const notifySecret = process.env.BILLING_NOTIFY_SECRET ?? "aidean-dev-notify-secret";

/** dev mock 渠道：HMAC-SHA256(orderId) 十六进制验签；仅非生产注册 */
export const devMockChannel: PayChannel = {
  name: "dev-mock",
  verifyNotify(orderId, sign) {
    const expect = createHmac("sha256", notifySecret).update(orderId).digest("hex");
    const a = Buffer.from(sign);
    const b = Buffer.from(expect);
    // @types/node 22 下 Buffer 底层 ArrayBufferLike 与 timingSafeEqual 形参 Uint8Array<ArrayBuffer> 方变不兼容，此处拷贝为独立视图（仅类型层，运行时语义不变）
    return a.length === b.length && timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
  },
  createPayment(orderId) {
    return { payUrl: `/user/balance?mockOrderId=${orderId}` };
  },
};

function channelOf(payMethod: "WECHAT" | "ALIPAY"): PayChannel {
  if (process.env.NODE_ENV === "production") {
    // 真实微信/支付宝适配器待商户凭据下发后接入（见 checklist 遗留）
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "支付渠道尚未接入");
  }
  void payMethod; // mock 渠道不区分支付方式；真实渠道按此分发
  return devMockChannel;
}

// ==================== 服务主体 ====================

export interface WalletSnapshot {
  wallet: WalletRow;
}

export const billingService = {
  /** 充值档位视图（shared 常量单一来源） */
  listRechargeTiers() {
    type Tier = (typeof RECHARGE_TIERS)[number];
    return RECHARGE_TIERS.map((t: Tier) => ({
      id: t.id,
      label: t.label,
      amountYuan: fenToYuan(t.amountMinor),
      bonusYuan: fenToYuan(t.bonusMinor),
    }));
  },

  /** 钱包概览：balance/held/available（available = balance − held） */
  async getWalletView(userId: string) {
    const wallet = await billingRepository.findWalletByUserId(userId);
    const balanceMinor = wallet?.balanceMinor ?? 0n;
    const heldMinor = wallet?.heldMinor ?? 0n;
    return {
      balanceYuan: fenToYuan(balanceMinor),
      heldYuan: fenToYuan(heldMinor),
      availableYuan: fenToYuan(balanceMinor - heldMinor),
      currency: wallet?.currency ?? "CNY",
    };
  },

  /** 流水分页 + 日期分组视图（仅本人：经 userId 反查钱包） */
  // 返回类型显式锚定 shared 契约：消除双分支 union 推断（容器/本地 prisma 类型环境差异曾致隐式 any）
  async getLedgerPage(
    userId: string,
    query: { page: number; pageSize: number; entryType?: EntryInput["entryType"] }
  ): Promise<LedgerPage> {
    const wallet = await billingRepository.findWalletByUserId(userId);
    if (!wallet) {
      return { groups: [], total: 0, page: query.page, pageSize: query.pageSize };
    }
    const { rows, total } = await billingRepository.listLedgerPage({
      walletId: wallet.id,
      page: query.page,
      pageSize: query.pageSize,
      entryType: query.entryType,
    });
    return {
      groups: groupLedgerByDate(rows),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  },

  // ==================== hold 预扣生命周期（供测评/网关消费） ====================

  /**
   * 创建预扣：可用额（balance−held）不足抛 40001；requestId 幂等——
   * 已存在同 requestId 直接返回既有 hold（不重复冻结）。
   */
  async hold(
    userId: string,
    requestId: string,
    amountMinor: bigint,
    now: Date = new Date()
  ): Promise<{ holdId: string; idempotent: boolean }> {
    assertPositiveAmount(amountMinor, "预扣金额非法");
    return withOptimisticRetry(async () =>
      billingRepository.client.$transaction(async (tx) => {
        const existing = await billingRepository.findHoldByRequestId(tx, requestId);
        if (existing) return { holdId: existing.id, idempotent: true };

        const wallet = await billingRepository.findWalletByUserId(userId);
        if (!wallet) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包不存在");
        assertWalletUsable(wallet);
        await expireOverdueInTx(tx, wallet);

        if (wallet.balanceMinor - wallet.heldMinor < amountMinor) {
          throw new ApiError(ERROR_CODES.INSUFFICIENT_BALANCE, "余额不足");
        }
        assertAdjusted(
          await billingRepository.adjustWallet(tx, wallet.id, wallet.lockVersion, {
            heldDelta: amountMinor,
          })
        );
        const hold = await billingRepository.createHold(tx, {
          requestId,
          walletId: wallet.id,
          amountMinor,
          expiresAt: new Date(now.getTime() + HOLD_TTL_MINUTES * 60_000),
        });
        return { holdId: hold.id, idempotent: false };
      })
    );
  },

  /**
   * 捕获预扣：按实际额扣余额并写 CONSUME 流水，释放全部冻结（差额退还语义）。
   * 非 AUTHORIZED / 不存在 → 40004；actual > 预扣额 → 40000；requestId 幂等。
   */
  async captureHold(
    requestId: string,
    actualAmountMinor: bigint,
    now: Date = new Date()
  ): Promise<{ capturedMinor: bigint; idempotent: boolean }> {
    assertPositiveAmount(actualAmountMinor, "捕获金额非法");
    return withOptimisticRetry(async () =>
      billingRepository.client.$transaction(async (tx) => {
        const hold = await billingRepository.findHoldByRequestId(tx, requestId);
        if (!hold || hold.status !== "AUTHORIZED") {
          if (hold && hold.status === "CAPTURED") {
            return { capturedMinor: hold.capturedMinor, idempotent: true };
          }
          throw new ApiError(ERROR_CODES.HOLD_INVALID, "预扣不存在或已失效");
        }
        if (actualAmountMinor > hold.amountMinor) {
          throw new ApiError(ERROR_CODES.BAD_REQUEST, "捕获金额不可超过预扣额");
        }
        const wallet = await billingRepository.findWalletById(tx, hold.walletId);
        if (!wallet) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包不存在");
        await expireOverdueInTx(tx, wallet);
        // 过期清理可能已消化本 hold——重读状态
        const fresh = await billingRepository.findHoldByRequestId(tx, requestId);
        if (!fresh || fresh.status !== "AUTHORIZED") {
          throw new ApiError(ERROR_CODES.HOLD_INVALID, "预扣已过期失效");
        }
        // 防御守卫：解冻后 held 不得为负——冻结额须覆盖本 hold，违反即钱包状态不一致
        if (wallet.heldMinor < fresh.amountMinor) {
          throw new ApiError(ERROR_CODES.HOLD_INVALID, "预扣冻结与钱包状态不一致");
        }

        assertAdjusted(
          await billingRepository.adjustWallet(tx, hold.walletId, wallet.lockVersion, {
            balanceDelta: -actualAmountMinor,
            heldDelta: -fresh.amountMinor,
            postedDebitsDelta: actualAmountMinor,
          })
        );
        await billingRepository.createEntryIfAbsent(tx, {
          txnId: randomUUID(),
          walletId: hold.walletId,
          direction: "DEBIT",
          amountMinor: actualAmountMinor,
          entryType: "CONSUME",
          sourceType: "balance_hold",
          sourceId: fresh.id,
          idempotencyKey: `hold:${fresh.requestId}:capture`,
          effectiveAt: now,
        });
        await billingRepository.updateHold(tx, fresh.id, {
          status: "CAPTURED",
          capturedMinor: actualAmountMinor,
        });
        return { capturedMinor: actualAmountMinor, idempotent: false };
      })
    );
  },

  /** 作废预扣：全额解冻，无流水；非 AUTHORIZED → 40004（幂等：已 VOIDED/EXPIRED 视作成功） */
  async voidHold(requestId: string): Promise<{ idempotent: boolean }> {
    return withOptimisticRetry(() =>
      billingRepository.client.$transaction(async (tx) => {
        const hold = await billingRepository.findHoldByRequestId(tx, requestId);
        if (!hold) throw new ApiError(ERROR_CODES.HOLD_INVALID, "预扣不存在");
        if (hold.status === "VOIDED" || hold.status === "EXPIRED") return { idempotent: true };
        if (hold.status !== "AUTHORIZED") {
          throw new ApiError(ERROR_CODES.HOLD_INVALID, "预扣已捕获，不可作废");
        }
        const wallet = await billingRepository.findWalletById(tx, hold.walletId);
        if (!wallet) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包不存在");
        const released = await expireOverdueInTx(tx, wallet);
        // 懒清理可能已解冻并置 EXPIRED 本 hold——重读后再决策，防二次解冻致 held 变负
        if (released > 0) {
          const fresh = await billingRepository.findHoldByRequestId(tx, requestId);
          if (!fresh) throw new ApiError(ERROR_CODES.HOLD_INVALID, "预扣不存在");
          if (fresh.status === "EXPIRED" || fresh.status === "VOIDED") return { idempotent: true };
          if (fresh.status !== "AUTHORIZED") {
            throw new ApiError(ERROR_CODES.HOLD_INVALID, "预扣已捕获，不可作废");
          }
        }
        assertAdjusted(
          await billingRepository.adjustWallet(tx, hold.walletId, wallet.lockVersion, {
            heldDelta: -hold.amountMinor,
          })
        );
        await billingRepository.updateHold(tx, hold.id, { status: "VOIDED" });
        return { idempotent: false };
      })
    );
  },

  /** 主动过期释放（定时/读侧懒清理的显式入口）；返回释放条数 */
  async releaseExpiredHolds(userId: string): Promise<number> {
    return withOptimisticRetry(async () =>
      billingRepository.client.$transaction(async (tx) => {
        const wallet = await billingRepository.findWalletByUserId(userId);
        if (!wallet) return 0;
        return expireOverdueInTx(tx, wallet);
      })
    );
  },

  // ==================== 充值订单闭环 ====================

  /** 创建充值订单（PENDING）并返回 mock 支付参数；tierId 非法 → 40000 */
  async createRechargeOrder(userId: string, tierId: string, payMethod: "WECHAT" | "ALIPAY") {
    const tier = RECHARGE_TIERS.find((t) => t.id === tierId);
    if (!tier) throw new ApiError(ERROR_CODES.BAD_REQUEST, "充值档位不存在");

    const order = await billingRepository.client.$transaction(async (tx) => {
      const created = await billingRepository.createRechargeOrder(tx, {
        userId,
        amountMinor: tier.amountMinor,
        bonusAmountMinor: tier.bonusMinor,
        totalAmountMinor: tier.amountMinor + tier.bonusMinor,
        payMethod,
      });
      return created;
    });
    const channel = channelOf(payMethod);
    return {
      order: {
        id: order.id,
        status: order.status as string,
        amountYuan: fenToYuan(order.amountMinor),
        bonusYuan: fenToYuan(order.bonusAmountMinor),
        totalYuan: fenToYuan(order.totalAmountMinor),
        payMethod: order.payMethod as "WECHAT" | "ALIPAY",
        createdAt: order.createdAt.toISOString(),
        paidAt: null,
      },
      payment: channel.createPayment(order.id, order.totalAmountMinor),
    };
  },

  /** 我的充值订单列表（最近 limit 条） */
  async listRechargeOrders(userId: string, limit = 20) {
    const rows = await billingRepository.listRechargeOrders(userId, limit);
    type OrderRow = Awaited<ReturnType<typeof billingRepository.listRechargeOrders>>[number];
    return rows.map((o: OrderRow) => ({
      id: o.id,
      status: o.status as string,
      amountYuan: fenToYuan(o.amountMinor),
      bonusYuan: fenToYuan(o.bonusAmountMinor),
      totalYuan: fenToYuan(o.totalAmountMinor),
      payMethod: o.payMethod as "WECHAT" | "ALIPAY",
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    }));
  },

  /**
   * dev 模拟支付：服务端代拟渠道签名后走标准回调入账（仅非生产可用；
   * 订单须属于本人）。生产环境抛 40000「支付渠道尚未接入」。
   */
  async devMockPay(orderId: string, userId: string) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "支付渠道尚未接入");
    }
    const order = await billingRepository.client.rechargeOrder.findUnique({
      where: { id: orderId },
    });
    if (!order || order.userId !== userId) {
      throw new ApiError(ERROR_CODES.RECHARGE_ORDER_NOT_FOUND, "充值订单不存在");
    }
    return this.handleChannelNotify(orderId, {
      payMethod: order.payMethod as "WECHAT" | "ALIPAY",
      sign: createHmac("sha256", notifySecret).update(orderId).digest("hex"),
    });
  },

  /**
   * 渠道回调入账：验签 → 单事务「PENDING→PAID + TOPUP(+BONUS) 入账」。
   * 验签失败 40005；订单不存在 40002；重复回调幂等返回当前状态。
   */
  async handleChannelNotify(
    orderId: string,
    payload: { payMethod: "WECHAT" | "ALIPAY"; sign: string; tradeNo?: string }
  ): Promise<{ status: string; idempotent: boolean }> {
    const channel = channelOf(payload.payMethod);
    if (!channel.verifyNotify(orderId, payload.sign)) {
      throw new ApiError(ERROR_CODES.NOTIFY_SIGNATURE_INVALID, "回调验签失败");
    }

    return withOptimisticRetry(async () =>
      billingRepository.client.$transaction(async (tx) => {
        const order = await billingRepository.findRechargeOrder(tx, orderId);
        if (!order) throw new ApiError(ERROR_CODES.RECHARGE_ORDER_NOT_FOUND, "充值订单不存在");
        if (order.status !== "PENDING") {
          return { status: order.status as string, idempotent: true };
        }

        const wallet = await billingRepository.findWalletByUserId(order.userId);
        if (!wallet) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包不存在");

        const paid = await billingRepository.markOrderPaid(tx, orderId, payload.tradeNo ?? null);
        if (paid === 0) {
          const fresh = await billingRepository.findRechargeOrder(tx, orderId);
          return { status: (fresh?.status ?? "UNKNOWN") as string, idempotent: true };
        }

        await postEntryInTx(tx, {
          txnId: randomUUID(),
          walletId: wallet.id,
          direction: "CREDIT",
          amountMinor: order.amountMinor,
          entryType: "TOPUP",
          sourceType: "recharge_order",
          sourceId: orderId,
          idempotencyKey: `recharge:${orderId}`,
        });
        if (order.bonusAmountMinor > 0n) {
          await postEntryInTx(tx, {
            txnId: randomUUID(),
            walletId: wallet.id,
            direction: "CREDIT",
            amountMinor: order.bonusAmountMinor,
            entryType: "GRANT",
            sourceType: "recharge_order",
            sourceId: orderId,
            idempotencyKey: `recharge-bonus:${orderId}`,
          });
        }
        return { status: "PAID", idempotent: false };
      })
    );
  },

  // ==================== 财务合规调账（Task 3.6.1） ====================

  /**
   * 管理端余额调账：单条 ADJUST 分录（direction 视正负、amountMinor 恒正）+ 乐观锁推进。
   * FROZEN/CLOSED 钱包拒绝（postEntryInTx assertWalletUsable）；负向调账余额不为负
   * （DEBIT 守卫 → 40001）；幂等键唯一兜底，重放不重复入账。
   */
  async adjust(input: {
    walletId: string;
    /** 带符号金额（分）；正=入账 CREDIT，负=扣减 DEBIT；恒非 0（route 层校验） */
    amountMinor: bigint;
    idempotencyKey: string;
  }): Promise<{ idempotent: boolean; balanceMinor: bigint }> {
    return withOptimisticRetry(async () =>
      billingRepository.client.$transaction(async (tx) => {
        const wallet = await billingRepository.findWalletById(tx, input.walletId);
        if (!wallet) throw new ApiError(ERROR_CODES.BAD_REQUEST, "钱包不存在");

        const direction = input.amountMinor > 0n ? "CREDIT" : "DEBIT";
        const amount = input.amountMinor > 0n ? input.amountMinor : -input.amountMinor;
        const res = await postEntryInTx(tx, {
          txnId: randomUUID(),
          walletId: input.walletId,
          direction,
          amountMinor: amount,
          entryType: "ADJUST",
          sourceType: "admin",
          idempotencyKey: input.idempotencyKey,
          effectiveAt: new Date(),
        });
        const fresh = await billingRepository.findWalletById(tx, input.walletId);
        return {
          idempotent: res.idempotent,
          balanceMinor: (fresh as WalletRow).balanceMinor,
        };
      })
    );
  },

  /**
   * 充值订单冲正（S6.2 财务处置·REVERSAL，非删除）：仅 PAID 订单。
   * 单事务「CAS PAID→REFUNDED + 写 REVERSAL 反向 DEBIT 分录」，原 TOPUP/GRANT 分录保留不动；
   * 幂等键 recharge-reverse:{orderId}（bonus 追加 :bonus）；反向扣减受余额守卫
   * （用户已消费则 40001→交人工调账，事务回滚不改状态）。仅经本服务编排，路由不得直写分录。
   */
  async reverseRechargeOrder(
    orderId: string,
    opts: { idempotencyKey: string }
  ): Promise<{ reversedMinor: bigint; idempotent: boolean }> {
    return withOptimisticRetry(async () =>
      billingRepository.client.$transaction(async (tx) => {
        const order = await billingRepository.findRechargeOrder(tx, orderId);
        if (!order) throw new ApiError(ERROR_CODES.RECHARGE_ORDER_NOT_FOUND, "充值订单不存在");
        if (order.status === "REFUNDED") return { reversedMinor: 0n, idempotent: true };
        if (order.status !== "PAID") {
          throw new ApiError(ERROR_CODES.BAD_REQUEST, "仅已支付订单可冲正退款");
        }
        const wallet = await billingRepository.findWalletByUserId(order.userId);
        if (!wallet) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包不存在");

        // 状态机 CAS：仅 PAID→REFUNDED，并发重复冲正在此收敛为幂等（count=0 视同已处理）
        const marked = await tx.rechargeOrder.updateMany({
          where: { id: orderId, status: "PAID" },
          data: { status: "REFUNDED" },
        });
        if (marked.count === 0) return { reversedMinor: 0n, idempotent: true };

        const main = await postEntryInTx(tx, {
          txnId: randomUUID(),
          walletId: wallet.id,
          direction: "DEBIT",
          amountMinor: order.amountMinor,
          entryType: "REVERSAL",
          sourceType: "recharge_order",
          sourceId: orderId,
          idempotencyKey: opts.idempotencyKey,
          effectiveAt: new Date(),
        });
        let reversedMinor = order.amountMinor;
        if (order.bonusAmountMinor > 0n) {
          await postEntryInTx(tx, {
            txnId: randomUUID(),
            walletId: wallet.id,
            direction: "DEBIT",
            amountMinor: order.bonusAmountMinor,
            entryType: "REVERSAL",
            sourceType: "recharge_order",
            sourceId: orderId,
            idempotencyKey: `${opts.idempotencyKey}:bonus`,
            effectiveAt: new Date(),
          });
          reversedMinor += order.bonusAmountMinor;
        }
        return { reversedMinor, idempotent: main.idempotent };
      })
    );
  },

  /**
   * 调用方事务内入账（redemption 等域组合用）：在本域提供的 Tx 内写 GRANT 分录 +
   * 乐观锁同步聚合列，保证「核销 CAS 与入账」同事务原子完成。幂等键由调用方保证。
   */
  async creditInTx(
    tx: Tx,
    input: {
      userId: string;
      amountMinor: bigint;
      entryType: "GRANT";
      sourceType: string;
      sourceId: string;
      idempotencyKey: string;
      effectiveAt?: Date;
    }
  ): Promise<{ idempotent: boolean }> {
    const wallet = await billingRepository.findWalletByUserId(input.userId);
    if (!wallet) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包不存在");
    const res = await postEntryInTx(tx, {
      txnId: randomUUID(),
      walletId: wallet.id,
      direction: "CREDIT",
      amountMinor: input.amountMinor,
      entryType: input.entryType,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      effectiveAt: input.effectiveAt,
    });
    return { idempotent: res.idempotent };
  },

  // ==================== 对账 ====================

  /**
   * 钱包完整性对账：ΣSETTLED(CREDIT−DEBIT) == postedCredits−postedDebits，
   * 且活跃 holds 合计 == heldMinor。返回两项差异（0n 为自洽）。
   */
  async verifyWalletIntegrity(userId: string) {
    const wallet = await billingRepository.findWalletByUserId(userId);
    if (!wallet) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "钱包不存在");
    const { debit, credit } = await billingRepository.sumSettledByDirection(
      billingRepository.client,
      wallet.id
    );
    const activeHolds = await billingRepository.sumActiveHolds(billingRepository.client, wallet.id);
    const ledgerDiff =
      wallet.postedCreditsMinor - wallet.postedDebitsMinor - (credit - debit);
    const heldDiff = wallet.heldMinor - activeHolds;
    return { ok: ledgerDiff === 0n && heldDiff === 0n, ledgerDiff, heldDiff };
  },
};

/**
 * billing 计费域 repository：事务化数据访问薄封装；仅 service 可调用（B.2.1）。
 *
 * 并发与一致性口径（《数据库文档.md》账本三表）：
 * - 乐观锁仅用于可变状态表 wallets.lock_version：以 updateMany({where:{id,lockVersion}})
 *   条件写，返回 count=0 视为并发冲突，由 service 决策重试或抛错；
 * - ledger_entries 不可变（只 INSERT），幂等靠 @@unique([walletId, idempotencyKey]) 兜底；
 * - 金额全程 BigInt 分，恒为正。
 */
import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../db/prisma";

/** 事务客户端类型（交互式事务回调入参） */
export type Tx = Prisma.TransactionClient;

/** 钱包单行（含乐观锁版本与聚合列） */
export type WalletRow = {
  id: string;
  userId: string;
  currency: string;
  balanceMinor: bigint;
  heldMinor: bigint;
  postedDebitsMinor: bigint;
  postedCreditsMinor: bigint;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  lockVersion: number;
};

/** 钱包聚合列一次条件更新（乐观锁单点写：余额/冻结/累计收支 四增量任意组合） */
export interface WalletAdjustment {
  balanceDelta?: bigint; // 正=入账 负=扣减
  heldDelta?: bigint; // 正=冻结 负=解冻
  postedDebitsDelta?: bigint;
  postedCreditsDelta?: bigint;
}

/** 流水分录创建入参（amountMinor 恒正，方向由 direction 表达） */
export interface EntryInput {
  txnId: string;
  walletId: string;
  direction: "DEBIT" | "CREDIT";
  amountMinor: bigint;
  entryType: "TOPUP" | "CONSUME" | "REFUND" | "REVERSAL" | "GRANT" | "EXPIRE" | "ADJUST";
  status?: "PENDING" | "SETTLED" | "FAILED" | "VOIDED";
  sourceType?: string | null;
  sourceId?: string | null;
  idempotencyKey: string;
  effectiveAt?: Date;
}

export interface LedgerFilter {
  walletId: string;
  page: number;
  pageSize: number;
  entryType?: EntryInput["entryType"];
}

function toWalletRow(w: {
  id: string;
  userId: string;
  currency: string;
  balanceMinor: bigint;
  heldMinor: bigint;
  postedDebitsMinor: bigint;
  postedCreditsMinor: bigint;
  status: WalletRow["status"];
  lockVersion: number;
}): WalletRow {
  return w;
}

export const billingRepository = {
  /** 读单例 prisma（只读路径用；写路径必须走事务） */
  client: prisma as PrismaClient,

  /** 按用户取钱包（一人一钱包，schema @unique）；无行返回 null */
  async findWalletByUserId(userId: string): Promise<WalletRow | null> {
    const w = await prisma.wallet.findUnique({ where: { userId } });
    return w ? toWalletRow(w) : null;
  },

  /** 事务内按 id 取钱包 */
  async findWalletById(tx: Tx, walletId: string): Promise<WalletRow | null> {
    const w = await tx.wallet.findUnique({ where: { id: walletId } });
    return w ? toWalletRow(w) : null;
  },

  /**
   * 乐观锁条件更新钱包聚合列；count=0 表示 lockVersion 已漂移（并发冲突），
   * 返回 count 由 service 断言。
   */
  async adjustWallet(
    tx: Tx,
    walletId: string,
    expectedLockVersion: number,
    adj: WalletAdjustment
  ): Promise<number> {
    const res = await tx.wallet.updateMany({
      where: { id: walletId, lockVersion: expectedLockVersion },
      data: {
        ...(adj.balanceDelta !== undefined ? { balanceMinor: { increment: adj.balanceDelta } } : {}),
        ...(adj.heldDelta !== undefined ? { heldMinor: { increment: adj.heldDelta } } : {}),
        ...(adj.postedDebitsDelta !== undefined
          ? { postedDebitsMinor: { increment: adj.postedDebitsDelta } }
          : {}),
        ...(adj.postedCreditsDelta !== undefined
          ? { postedCreditsMinor: { increment: adj.postedCreditsDelta } }
          : {}),
        lockVersion: { increment: 1 },
      },
    });
    return res.count;
  },

  /**
   * 写入一条不可变流水；walletId+idempotencyKey 唯一冲突（P2002）时返回 null
   * —— 上层视为幂等命中（重复请求返回首次结果）。
   */
  async createEntryIfAbsent(tx: Tx, input: EntryInput): Promise<string | null> {
    try {
      const row = await tx.ledgerEntry.create({
        data: {
          txnId: input.txnId,
          walletId: input.walletId,
          direction: input.direction,
          amountMinor: input.amountMinor,
          entryType: input.entryType,
          status: input.status ?? "SETTLED",
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
          idempotencyKey: input.idempotencyKey,
          effectiveAt: input.effectiveAt ?? new Date(),
        },
        select: { id: true },
      });
      return row.id;
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        return null; // 幂等兜底：唯一键冲突
      }
      throw err;
    }
  },

  /** 按 idempotencyKey 取已有分录（幂等重放时回读首次结果） */
  async findEntryByKey(
    tx: Tx,
    walletId: string,
    idempotencyKey: string
  ): Promise<{ id: string; direction: "DEBIT" | "CREDIT"; amountMinor: bigint } | null> {
    return tx.ledgerEntry.findUnique({
      where: { walletId_idempotencyKey: { walletId, idempotencyKey } },
      select: { id: true, direction: true, amountMinor: true },
    });
  },

  // ==================== hold 预扣 ====================

  async createHold(
    tx: Tx,
    data: { requestId: string; walletId: string; amountMinor: bigint; expiresAt: Date }
  ): Promise<{ id: string }> {
    return tx.balanceHold.create({ data, select: { id: true } });
  },

  async findHoldByRequestId(tx: Tx, requestId: string) {
    return tx.balanceHold.findUnique({ where: { requestId } });
  },

  async updateHold(
    tx: Tx,
    id: string,
    data: { status?: "AUTHORIZED" | "CAPTURED" | "VOIDED" | "EXPIRED"; capturedMinor?: bigint }
  ): Promise<void> {
    await tx.balanceHold.update({ where: { id }, data });
  },

  /** 懒清理：取该钱包已过期仍 AUTHORIZED 的 holds */
  async listOverdueHolds(tx: Tx, walletId: string, now: Date) {
    return tx.balanceHold.findMany({
      where: { walletId, status: "AUTHORIZED", expiresAt: { lte: now } },
      select: { id: true, amountMinor: true },
    });
  },

  // ==================== 充值订单 ====================

  async createRechargeOrder(
    tx: Tx,
    data: {
      userId: string;
      amountMinor: bigint;
      bonusAmountMinor: bigint;
      totalAmountMinor: bigint;
      payMethod: "WECHAT" | "ALIPAY";
    }
  ) {
    return tx.rechargeOrder.create({ data });
  },

  async findRechargeOrder(tx: Tx, id: string) {
    return tx.rechargeOrder.findUnique({ where: { id } });
  },

  /** 订单状态机推进（PENDING→PAID），返回 count 供状态机断言 */
  async markOrderPaid(tx: Tx, id: string, externalTradeNo: string | null): Promise<number> {
    const res = await tx.rechargeOrder.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date(), externalTradeNo },
    });
    return res.count;
  },

  async listRechargeOrders(userId: string, take: number) {
    return prisma.rechargeOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  },

  // ==================== 对账与流水查询 ====================

  /** SETTLED 分录按方向聚合（对账口径：ΣCREDIT−ΣDEBIT = postedCredits−postedDebits） */
  async sumSettledByDirection(tx: Tx | PrismaClient, walletId: string) {
    const grouped = await tx.ledgerEntry.groupBy({
      by: ["direction"],
      where: { walletId, status: "SETTLED" },
      _sum: { amountMinor: true },
    });
    const debit = grouped.find((g) => g.direction === "DEBIT")?._sum.amountMinor ?? 0n;
    const credit = grouped.find((g) => g.direction === "CREDIT")?._sum.amountMinor ?? 0n;
    return { debit, credit };
  },

  /** 活跃（AUTHORIZED）holds 金额合计（对账口径：= heldMinor；CAPTURED 已全额解冻不占 held，不计入） */
  async sumActiveHolds(tx: Tx | PrismaClient, walletId: string): Promise<bigint> {
    const agg = await tx.balanceHold.aggregate({
      where: { walletId, status: "AUTHORIZED" },
      _sum: { amountMinor: true },
    });
    return agg._sum.amountMinor ?? 0n;
  },

  /** 流水分页（effectiveAt 倒序；金额与方向供视图映射） */
  async listLedgerPage(filter: LedgerFilter) {
    const where: Prisma.LedgerEntryWhereInput = {
      walletId: filter.walletId,
      ...(filter.entryType ? { entryType: filter.entryType } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);
    return { rows, total };
  },
};

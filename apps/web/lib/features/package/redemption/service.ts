/**
 * redemption 兑换码子域 service：业务编排层（SubTask 3.1.1 实现）。
 *
 * 核销口径（spec Requirement：并发核销不双花）：
 * - 单事务 CAS：updateMany status∈{ENABLED,ISSUED}→USED（count=0 即并发落败）；
 * - 余额码经 billingService.creditInTx 写 GRANT 分录（幂等键 redemption:{id}）同事务入账；
 * - 套餐码校验 ACTIVE 后创建 PackageOrder；
 * - 过期懒判定（expiresAt < now → EXPIRED）；DISABLED/USED/EXPIRED 拒绝。
 * 批次生成：12 位随机字母数字（去易混淆字符）+ 可选前缀；createMany skipDuplicates
 * + 实际插入数校验，不足自动补码（≤3 轮）。
 */
import { randomUUID, randomInt } from "node:crypto";

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { billingService } from "../../billing/service";
import { redemptionRepository, type Tx } from "./repository";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去 I/O/0/1 易混淆
const CODE_BODY_LEN = 12;

function randomCode(prefix: string): string {
  let body = "";
  for (let i = 0; i < CODE_BODY_LEN; i++) body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return prefix + body;
}

export interface BatchGenerateInput {
  name?: string | null;
  targetType: "BALANCE" | "PACKAGE";
  balanceMinor?: bigint;
  packageId?: string;
  count: number;
  prefix?: string;
  expiresAt?: Date | null;
  batchNo?: string;
}

export const redemptionService = {
  /**
   * 批次生成：返回 batchNo + 一次性明文码数组（服务端不另存明文副本——
   * 码明文本存 redemptions.code 列，属 one-api 同口径）。
   */
  async generateBatch(input: BatchGenerateInput): Promise<{ batchNo: string; codes: string[] }> {
    const prefix = input.prefix ?? "";
    const batchNo = input.batchNo ?? `B${new Date().toISOString().slice(0, 10).replaceAll("-", "")}${randomUUID().slice(0, 6).toUpperCase()}`;

    if (input.targetType === "PACKAGE" && input.packageId) {
      const pkg = await redemptionRepository.client.package.findUnique({
        where: { id: input.packageId },
        select: { status: true, deletedAt: true },
      });
      if (!pkg || pkg.deletedAt) throw new ApiError(ERROR_CODES.BAD_REQUEST, "绑定套餐不存在");
      if (pkg.status !== "ACTIVE") throw new ApiError(ERROR_CODES.BAD_REQUEST, "套餐已停用，不可生成兑换码");
    }

    let inserted = 0;
    const allCodes: string[] = [];
    for (let round = 0; round < 3 && inserted < input.count; round++) {
      const need = input.count - inserted;
      const codes = Array.from({ length: need }, () => randomCode(prefix));
      const created = await redemptionRepository.client.$transaction(async (tx) =>
        redemptionRepository.createMany(
          tx,
          codes.map((code) => ({
            code,
            targetType: input.targetType,
            balanceMinor: input.targetType === "BALANCE" ? (input.balanceMinor ?? null) : null,
            packageId: input.targetType === "PACKAGE" ? (input.packageId ?? null) : null,
            name: input.name ?? null,
            batchNo,
            status: "ENABLED",
            expiresAt: input.expiresAt ?? null,
          }))
        )
      );
      allCodes.push(...codes.slice(0, created));
      inserted += created;
    }
    if (inserted < input.count) {
      throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "兑换码生成冲突，请重试");
    }
    return { batchNo, codes: allCodes };
  },

  /** 核销（用户侧）：CAS + 同事务入账；返回 shared RedemptionResult 形状 */
  async redeem(
    code: string,
    userId: string,
    now: Date = new Date()
  ): Promise<{ kind: "balance"; balanceMinor: bigint } | { kind: "package"; packageTitle: string }> {
    return redemptionRepository.client.$transaction(async (tx) => {
      const r = await redemptionRepository.findByCode(tx, code);
      if (!r) throw new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码无效");

      // 懒过期：到期即置 EXPIRED（后续状态判定统一拒绝）
      if (r.expiresAt && r.expiresAt.getTime() < now.getTime() && (r.status === "ENABLED" || r.status === "ISSUED")) {
        await redemptionRepository.expireOverdue(tx, r.id, now);
      }

      if (r.status === "USED") throw new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码已被使用");
      if (r.status === "DISABLED") throw new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码已禁用");
      if (r.status === "EXPIRED" || (r.expiresAt && r.expiresAt.getTime() < now.getTime())) {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码已过期");
      }

      // CAS：并发双花时恰一单 count=1，另一单 count=0
      const changed = await redemptionRepository.casMarkUsed(tx, r.id, userId, now);
      if (changed === 0) throw new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码已被使用");

      if (r.targetType === "BALANCE") {
        const amount = r.balanceMinor ?? 0n;
        if (amount <= 0n) throw new ApiError(ERROR_CODES.INTERNAL_ERROR, "兑换码面额异常");
        await billingService.creditInTx(tx, {
          userId,
          amountMinor: amount,
          entryType: "GRANT",
          sourceType: "redemption",
          sourceId: r.id,
          idempotencyKey: `redemption:${r.id}`,
          effectiveAt: now,
        });
        return { kind: "balance" as const, balanceMinor: amount };
      }

      // 套餐码：校验 ACTIVE 后创建 PackageOrder
      const pkg = r.packageId
        ? await tx.package.findUnique({ where: { id: r.packageId }, select: { id: true, title: true, status: true, deletedAt: true, durationHours: true } })
        : null;
      if (!pkg || pkg.deletedAt) throw new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码绑定的套餐不存在");
      if (pkg.status !== "ACTIVE") throw new ApiError(ERROR_CODES.BAD_REQUEST, "套餐已停用，不可兑换");
      await tx.packageOrder.create({
        data: {
          userId,
          packageId: pkg.id,
          status: "ACTIVE",
          redeemedAt: now,
          expiresAt: pkg.durationHours ? new Date(now.getTime() + pkg.durationHours * 3_600_000) : null,
        },
      });
      return { kind: "package" as const, packageTitle: pkg.title };
    });
  },

  /** 管理端：单码禁用；返回是否生效（已用/已禁 → false） */
  async disableCode(id: string): Promise<boolean> {
    return redemptionRepository.client.$transaction(async (tx) => {
      const count = await redemptionRepository.disableById(tx, id);
      return count > 0;
    });
  },

  /** 管理端：整批禁用；返回禁用条数 */
  async disableBatch(batchNo: string): Promise<number> {
    return redemptionRepository.client.$transaction(async (tx) =>
      redemptionRepository.disableBatch(tx, batchNo)
    );
  },

  /**
   * 卡商取码：事务内挑码（ENABLED + 面额过滤）→ 置 ISSUED → 返回明文；
   * 候选不足时抛 40000（不出部分货，防卡商对账歧义）。
   */
  async issueToPartner(input: {
    targetType: "BALANCE" | "PACKAGE";
    balanceMinor?: bigint;
    count: number;
  }): Promise<{ codes: string[] }> {
    return redemptionRepository.client.$transaction(async (tx) => {
      const rows = await redemptionRepository.listIssuable(tx, {
        targetType: input.targetType,
        balanceMinor: input.targetType === "BALANCE" ? (input.balanceMinor ?? null) : null,
        count: input.count,
      });
      if (rows.length < input.count) {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, `库存不足（可用 ${rows.length} 枚）`);
      }
      await redemptionRepository.markIssued(tx, rows.map((r) => r.id));
      return { codes: rows.map((r) => r.code) };
    });
  },

  /** 卡商查码状态（对账）：仅返回状态面，不返回面额/归属 */
  async statusOf(code: string): Promise<{ code: string; status: string; targetType: string; redeemedAt: string | null } | null> {
    const r = await redemptionRepository.client.redemption.findUnique({
      where: { code },
      select: { code: true, status: true, targetType: true, redeemedAt: true },
    });
    if (!r) return null;
    return {
      code: r.code,
      status: r.status,
      targetType: r.targetType,
      redeemedAt: r.redeemedAt ? r.redeemedAt.toISOString() : null,
    };
  },
};

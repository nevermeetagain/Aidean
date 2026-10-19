/**
 * 限时优惠写侧共用校验（TASK-096，V0.10.0 审查缺陷 D2/D3/D10/D11 收口）。
 *
 * - assertPriceDecimal：小数位 ≤6（E9-11）+ 整数位 ≤13（Decimal(19,6) 上限，超出原先返回 500）→ 40000。
 * - promotionOverlapWhere：同模型 PROMOTION 窗口重叠判定，含开放式窗口（effectiveUntil IS NULL 的历史脏行）。
 *     重叠 ⟺ b.from < a.until ∧ (b.until IS NULL ∨ b.until > a.from)（半开区间 [from, until)）。
 * - runSerializable：重叠检查与写入放进同一 Serializable 事务；PG SSI 检出并发写冲突（Prisma P2034）时重试，
 *     最多 3 次，仍冲突 → 40000「并发写入冲突」。不用 advisory lock：业务代码禁止原生 SQL 调用
 *     （check-docs-facts queryraw-biz = 0）。
 */
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../../lib/db/prisma";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";

const MAX_SCALE = 6;
const MAX_INT_DIGITS = 13; // Decimal(19,6)：19 - 6

/** 非负十进制字符串（契约 DecimalStr 已保证形状）的位数校验；null/undefined 跳过。 */
export function assertPriceDecimal(field: string, val: string | null | undefined): void {
  if (typeof val !== "string") return;
  const [intPart, frac = ""] = val.split(".");
  if (frac.length > MAX_SCALE) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `${field} 小数位不能超过 ${MAX_SCALE} 位`);
  }
  const intDigits = intPart.replace(/^0+(?=\d)/, "").length;
  if (intDigits > MAX_INT_DIGITS) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `${field} 整数位不能超过 ${MAX_INT_DIGITS} 位`);
  }
}

export function promotionOverlapWhere(
  modelId: string,
  from: Date,
  until: Date,
  excludeId?: string,
): Prisma.ModelPriceWhereInput {
  return {
    modelId,
    sourceType: "PROMOTION",
    ...(excludeId ? { id: { not: excludeId } } : {}),
    effectiveFrom: { lt: until },
    OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: from } }],
  };
}

export type Tx = Prisma.TransactionClient;

function isSerializationFailure(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
}

export async function runSerializable<T>(fn: (tx: Tx) => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (e) {
      if (!isSerializationFailure(e)) throw e;
      if (i >= attempts) throw new ApiError(ERROR_CODES.BAD_REQUEST, "并发写入冲突，请稍后重试");
    }
  }
}

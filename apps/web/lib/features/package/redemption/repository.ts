/**
 * redemption 兑换码子域 repository：Prisma 数据访问层（SubTask 3.1.1 实现）。
 * 仅被本域 service 调用，禁止跨域直连；写路径一律在调用方事务内（tx 入参）。
 */
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../db/prisma";

export type Tx = Prisma.TransactionClient;

export type RedemptionRow = {
  id: string;
  code: string;
  targetType: "BALANCE" | "PACKAGE";
  balanceMinor: bigint | null;
  packageId: string | null;
  name: string | null;
  batchNo: string | null;
  status: "ENABLED" | "ISSUED" | "USED" | "DISABLED" | "EXPIRED";
  expiresAt: Date | null;
  redeemedBy: string | null;
  redeemedAt: Date | null;
  createdAt: Date;
};

function toRow(r: {
  id: string;
  code: string;
  targetType: string;
  balanceMinor: bigint | null;
  packageId: string | null;
  name: string | null;
  batchNo: string | null;
  status: string;
  expiresAt: Date | null;
  redeemedBy: string | null;
  redeemedAt: Date | null;
  createdAt: Date;
}): RedemptionRow {
  return r as unknown as RedemptionRow;
}

export const redemptionRepository = {
  client: prisma,

  /** 按码查单条（含绑定套餐） */
  async findByCode(tx: Tx, code: string): Promise<RedemptionRow | null> {
    const r = await tx.redemption.findUnique({
      where: { code },
      include: { package: { select: { id: true, title: true, status: true, deletedAt: true } } },
    });
    return r ? { ...toRow(r), } : null;
  },

  /** CAS 核销：status ∈ {ENABLED, ISSUED} → USED；count=0 即并发落败/状态漂移 */
  async casMarkUsed(tx: Tx, id: string, userId: string, now: Date): Promise<number> {
    return tx.redemption.updateMany({
      where: { id, status: { in: ["ENABLED", "ISSUED"] } },
      data: { status: "USED", redeemedBy: userId, redeemedAt: now },
    }).then((r) => r.count);
  },

  /** 懒过期：ENABLED/ISSUED 且 expiresAt < now → EXPIRED；返回受影响行数 */
  async expireOverdue(tx: Tx, id: string, now: Date): Promise<number> {
    return tx.redemption.updateMany({
      where: { id, status: { in: ["ENABLED", "ISSUED"] }, expiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    }).then((r) => r.count);
  },

  /** 批量插入（skipDuplicates 吸收批内/库内撞码）；返回实际插入数 */
  async createMany(tx: Tx, rows: { code: string; targetType: string; balanceMinor: bigint | null; packageId: string | null; name: string | null; batchNo: string; status: string; expiresAt: Date | null }[]): Promise<number> {
    const res = await tx.redemption.createMany({
      data: rows as Prisma.RedemptionCreateManyInput[],
      skipDuplicates: true,
    });
    return res.count;
  },

  /** 批次列表 + 分页（管理端） */
  async listPage(filter: {
    batchNo?: string;
    status?: string;
    page: number;
    pageSize: number;
  }): Promise<{ rows: RedemptionRow[]; total: number }> {
    const where: Prisma.RedemptionWhereInput = {
      ...(filter.batchNo ? { batchNo: filter.batchNo } : {}),
      ...(filter.status ? { status: { in: [filter.status as RedemptionRow["status"]] } } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.redemption.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { code: "asc" }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.redemption.count({ where }),
    ]);
    return { rows: rows.map(toRow), total };
  },

  /** 批次聚合（管理端批次表：批次号/数量/状态分布） */
  async listBatches(): Promise<
    { batchNo: string; name: string | null; targetType: string; total: number; used: number; enabled: number; disabled: number; issued: number; expired: number; expiresAt: Date | null; createdAt: Date }[]
  > {
    const rows = await prisma.redemption.groupBy({
      by: ["batchNo"],
      _count: { _all: true },
      where: { batchNo: { not: null } },
    });
    if (!rows.length) return [];
    const batchNos = rows.map((r) => r.batchNo as string);
    const sample = await prisma.redemption.findMany({
      where: { batchNo: { in: batchNos } },
      select: { batchNo: true, name: true, targetType: true, status: true, expiresAt: true, createdAt: true },
    });
    const meta = new Map<string, { name: string | null; targetType: string; expiresAt: Date | null; createdAt: Date; used: number; enabled: number; disabled: number; issued: number; expired: number }>();
    for (const s of sample) {
      const m = meta.get(s.batchNo as string) ?? {
        name: s.name,
        targetType: s.targetType,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        used: 0,
        enabled: 0,
        disabled: 0,
        issued: 0,
        expired: 0,
      };
      if (s.status === "USED") m.used++;
      else if (s.status === "ENABLED") m.enabled++;
      else if (s.status === "DISABLED") m.disabled++;
      else if (s.status === "ISSUED") m.issued++;
      else if (s.status === "EXPIRED") m.expired++;
      meta.set(s.batchNo as string, m);
    }
    return rows.map((r) => {
      const m = meta.get(r.batchNo as string)!;
      return {
        batchNo: r.batchNo as string,
        name: m.name,
        targetType: m.targetType,
        total: r._count._all,
        used: m.used,
        enabled: m.enabled,
        disabled: m.disabled,
        issued: m.issued,
        expired: m.expired,
        expiresAt: m.expiresAt,
        createdAt: m.createdAt,
      };
    });
  },

  /** 单码禁用（仅 ENABLED/ISSUED 可禁）；返回 count */
  async disableById(tx: Tx, id: string): Promise<number> {
    return tx.redemption.updateMany({
      where: { id, status: { in: ["ENABLED", "ISSUED"] } },
      data: { status: "DISABLED" },
    }).then((r) => r.count);
  },

  /** 整批禁用 */
  async disableBatch(tx: Tx, batchNo: string): Promise<number> {
    return tx.redemption.updateMany({
      where: { batchNo, status: { in: ["ENABLED", "ISSUED"] } },
      data: { status: "DISABLED" },
    }).then((r) => r.count);
  },

  /** 卡商取码：挑 count 枚 ENABLED 候选（余额码按面额过滤） */
  async listIssuable(tx: Tx, filter: { targetType: string; balanceMinor: bigint | null; count: number }): Promise<RedemptionRow[]> {
    const rows = await tx.redemption.findMany({
      where: {
        status: "ENABLED",
        targetType: filter.targetType as RedemptionRow["targetType"],
        ...(filter.balanceMinor !== null ? { balanceMinor: filter.balanceMinor } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: filter.count,
    });
    return rows.map(toRow);
  },

  /** 出库：ENABLED → ISSUED（事务内按 id 集合） */
  async markIssued(tx: Tx, ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    return tx.redemption.updateMany({
      where: { id: { in: ids }, status: "ENABLED" },
      data: { status: "ISSUED" },
    }).then((r) => r.count);
  },
};
